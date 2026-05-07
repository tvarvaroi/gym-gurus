/**
 * Wearable Connections Service — Sprint 4 BATCH 2
 *
 * Lifecycle: disconnected → (initiateOAuth) → disconnected → (handleOAuthCallback)
 *            → connected → (markSyncError × 3) → expired → (initiateOAuth/handleOAuthCallback)
 *            → connected → (disconnect) → disconnected
 *
 * Tokens (when present) are AES-256-GCM encrypted at rest. Sprint 4 v1
 * primarily keeps tokens on the Open Wearables side; we encrypt-store any
 * passthrough copy that comes back. Decryption sites are the only places
 * that touch the raw token — never log decrypted tokens.
 *
 * IDOR-safety:
 *   - listConnections filters by userId.
 *   - disconnect filters by BOTH connectionId AND userId (load-bearing).
 *   - markSyncError + recordSuccessfulSync are called from internal flows
 *     (webhook ingest, sync monitor cron) where the connectionId is already
 *     scoped to the right user; they don't need a userId clause to be safe.
 *
 * Notification dispatch:
 *   - handleOAuthCallback fires `wearable_connected` after the row update.
 *   - markSyncError on count===1 fires `wearable_sync_failed` (soft warning).
 *   - markSyncError on count===3 + status==='connected' flips to 'expired'
 *     and fires `wearable_expired` (the actionable alert).
 *   - Counts 2 + 4+ are silent. Notification fatigue avoidance.
 */
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import {
  wearableConnections,
  type WearableProvider,
  DEFAULT_WEARABLE_SYNC_PREFERENCES,
} from '../../shared/schema';
import * as ow from './openWearablesClient';
import { dispatch } from './notificationDispatcher';
import { logger } from '../logger';

const SYNC_ERROR_EXPIRY_THRESHOLD = 3;

/**
 * List all wearable connections for a user. IDOR-safe via userId filter.
 */
export async function listConnections(userId: string) {
  const db = await getDb();
  return db.select().from(wearableConnections).where(eq(wearableConnections.userId, userId));
}

/**
 * Begin an OAuth flow. Atomic: INSERT or UPSERT the wearable_connections row
 * → call OW's createUser to get OW's UUID → UPDATE the row with that UUID
 * — all inside a single DB transaction. Returns the URL the user should be
 * redirected to in their browser.
 *
 * Atomicity rationale (Path B, Q2 spike close):
 *
 *   The connection.created webhook can fire as early as right after the
 *   user authorizes at the provider's OAuth page. If we INSERT the local
 *   row, then await createUser, then UPDATE the row with OW's UUID, a fast
 *   webhook can arrive between INSERT and UPDATE — and the bridge resolver
 *   (`resolveUserIdFromOwUserId` in wearableIngest.ts) would fail to find
 *   the row by `open_wearables_user_id` because the column is still null.
 *
 *   Wrapping INSERT + createUser + UPDATE in a transaction means the
 *   webhook handler's bridge resolver either sees no row (transaction
 *   uncommitted — webhook policy: log + 200 ack, Svix retries) OR sees the
 *   row WITH the UUID populated (transaction committed). Never the
 *   intermediate state.
 *
 *   The caveat: `ow.createUser` does HTTP I/O inside the transaction. This
 *   holds the row lock for the duration of the OW request. Acceptable at
 *   v1 scale (per-user OAuth-init rate is low). Mirrors the BATCH 2
 *   notification-dispatcher pattern of "row write before fanout" — keeps
 *   the bridge correct over keeping the txn short.
 *
 * Idempotent on re-init: ON CONFLICT (userId, provider) DO UPDATE re-runs
 * createUser and overwrites open_wearables_user_id with the latest OW
 * response. Re-OAuthing under the same (user, provider) is a valid flow
 * (e.g., user revoked at provider then reconnects).
 */
export async function initiateOAuth(
  userId: string,
  provider: WearableProvider
): Promise<{ connectUrl: string }> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    // Step 1: ensure the local row exists in 'disconnected' state. UPSERT on
    // UNIQUE(userId, provider) keeps re-init idempotent. open_wearables_user_id
    // remains null until step 3.
    await tx
      .insert(wearableConnections)
      .values({
        userId,
        provider,
        status: 'disconnected',
        syncPreferences: DEFAULT_WEARABLE_SYNC_PREFERENCES,
      })
      .onConflictDoNothing({
        target: [wearableConnections.userId, wearableConnections.provider],
      });

    // Step 2: create-or-fetch the OW user. The createUser endpoint accepts
    // external_user_id as a portal-debug convenience; the runtime-load-bearing
    // value is the returned `id` (OW's UUID).
    const owResponse = await ow.createUser({ external_user_id: userId });
    if (!owResponse?.id) {
      throw new Error('Open Wearables createUser returned no `id` — cannot persist OW UUID bridge');
    }

    // Step 3: persist OW's UUID onto the local row. After commit the bridge
    // resolver will find this row by open_wearables_user_id when webhooks
    // arrive carrying data.user_id = owResponse.id.
    await tx
      .update(wearableConnections)
      .set({ openWearablesUserId: owResponse.id })
      .where(
        and(eq(wearableConnections.userId, userId), eq(wearableConnections.provider, provider))
      );
  });
  const { connectUrl } = await ow.requestConnectUrl(provider, userId);
  return { connectUrl };
}

/**
 * Finalize an OAuth flow. Open Wearables holds the tokens; we update the
 * local row to status='connected', record any provider_user_id and
 * capabilities returned, fire `wearable_connected`, and trigger an initial
 * sync (async — don't await, let Open Wearables work at its pace).
 *
 * Throws if Open Wearables reports the user is NOT connected (e.g. user
 * cancelled the OAuth consent screen) OR if the local row has no OW UUID
 * (cannot trigger a sync without it — Path B requires OW's UUID at every
 * data-fetching call).
 */
export async function handleOAuthCallback(
  userId: string,
  provider: WearableProvider
): Promise<void> {
  const db = await getDb();
  const status = await ow.getConnectionStatus(provider, userId);
  if (!status.connected) {
    throw new Error(`Open Wearables reports ${provider} not connected for user ${userId}`);
  }
  await db
    .update(wearableConnections)
    .set({
      status: 'connected',
      providerUserId: status.providerUserId ?? null,
      capabilities: status.capabilities ?? [],
      connectedAt: new Date(),
      disconnectedAt: null,
      syncErrorCount: 0,
      lastSyncError: null,
    })
    .where(and(eq(wearableConnections.userId, userId), eq(wearableConnections.provider, provider)));

  await dispatch(userId, 'wearable_connected', { provider });

  // Resolve OW's UUID for the initial sync trigger. Path B (Q2 spike close):
  // OW's data-fetching endpoints require OW's UUID, not ours. The UUID was
  // persisted to wearable_connections.open_wearables_user_id during
  // initiateOAuth's atomic transaction.
  const [row] = await db
    .select({ owUserId: wearableConnections.openWearablesUserId })
    .from(wearableConnections)
    .where(and(eq(wearableConnections.userId, userId), eq(wearableConnections.provider, provider)));
  const owUserId = row?.owUserId ?? null;
  if (!owUserId) {
    logger.warn(
      'initial sync trigger skipped: no open_wearables_user_id on wearable_connections row',
      { userId, provider }
    );
    return;
  }

  // Async-fire initial sync. Failures are logged but don't bubble — the user's
  // OAuth completed successfully even if the first sync trigger errored;
  // they can retry sync from the UI.
  ow.triggerSync(provider, owUserId).catch((err) =>
    logger.error('initial sync trigger failed', {
      userId,
      provider,
      err: String(err),
    })
  );
}

/**
 * Disconnect a wearable. IDOR-safe: filters by BOTH connectionId AND userId
 * in the SELECT and the UPDATE WHERE clause. Removing the userId clause
 * would let any authenticated user disconnect any other user's wearables
 * by guessing UUIDs — this is the BATCH 11 mutation-test target.
 *
 * Best-effort revoke at Open Wearables: if Open Wearables is unreachable
 * we still flip the local row to disconnected (better to have local state
 * correct than to leave the user wondering why their UI says "connected"
 * when our DB says otherwise).
 */
export async function disconnect(userId: string, connectionId: string): Promise<void> {
  const db = await getDb();
  const [conn] = await db
    .select()
    .from(wearableConnections)
    .where(and(eq(wearableConnections.id, connectionId), eq(wearableConnections.userId, userId)));
  if (!conn) {
    throw new Error('Connection not found');
  }
  // Path B (Q2 spike close): OW's disconnect endpoint requires OW's UUID,
  // not ours. If the row has no open_wearables_user_id (OAuth-init never
  // completed), skip the OW call entirely — local-only disconnect is the
  // best we can do for an orphan row.
  const owUserId = conn.openWearablesUserId ?? null;
  if (owUserId) {
    try {
      await ow.revokeConnection(conn.provider as WearableProvider, owUserId);
    } catch (err) {
      logger.warn('Open Wearables revoke failed (continuing with local disconnect)', {
        connectionId,
        err: String(err),
      });
    }
  } else {
    logger.warn('Open Wearables revoke skipped: no open_wearables_user_id on row', {
      connectionId,
      userId,
      provider: conn.provider,
    });
  }
  await db
    .update(wearableConnections)
    .set({
      status: 'disconnected',
      disconnectedAt: new Date(),
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
    })
    .where(and(eq(wearableConnections.id, connectionId), eq(wearableConnections.userId, userId)));
}

/**
 * Record a sync failure. Increments syncErrorCount, captures the error
 * message (truncated), and on the 3-strike threshold flips status to
 * 'expired' AND fires `wearable_expired`. On the FIRST failure (count===1)
 * fires `wearable_sync_failed` as a soft warning.
 *
 * Notification cadence:
 *   - count===1 → wearable_sync_failed (soft "we noticed something")
 *   - count===2 → silent (transient failures often self-resolve)
 *   - count===3 → wearable_expired (actionable: "reconnect")
 *   - count===4+ → silent (avoid notification fatigue; user already knows)
 *
 * Idempotent at the "already expired" boundary: count keeps incrementing
 * past 3 (useful for diagnostics) but no further notifications fire because
 * the connection is no longer in 'connected' state.
 */
export async function markSyncError(connectionId: string, error: string): Promise<void> {
  const db = await getDb();
  const [conn] = await db
    .select()
    .from(wearableConnections)
    .where(eq(wearableConnections.id, connectionId));
  if (!conn) return;

  const newCount = conn.syncErrorCount + 1;
  const becomesExpired = newCount >= SYNC_ERROR_EXPIRY_THRESHOLD && conn.status === 'connected';

  await db
    .update(wearableConnections)
    .set({
      syncErrorCount: newCount,
      lastSyncError: error.slice(0, 500),
      status: becomesExpired ? 'expired' : conn.status,
    })
    .where(eq(wearableConnections.id, connectionId));

  if (becomesExpired) {
    await dispatch(conn.userId, 'wearable_expired', { provider: conn.provider });
  } else if (newCount === 1) {
    await dispatch(conn.userId, 'wearable_sync_failed', { provider: conn.provider });
  }
  // counts 2, 4+ — silent (no dispatch)
}

/**
 * Mark a successful sync. Clears syncErrorCount + lastSyncError, sets
 * lastSyncAt = NOW. Called by every wearableIngest function at the end of
 * its UPSERT path.
 */
export async function recordSuccessfulSync(connectionId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(wearableConnections)
    .set({ lastSyncAt: new Date(), syncErrorCount: 0, lastSyncError: null })
    .where(eq(wearableConnections.id, connectionId));
}
