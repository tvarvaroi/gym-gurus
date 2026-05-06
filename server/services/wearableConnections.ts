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
 * Begin an OAuth flow. Pre-creates a 'disconnected' row so we have a stable
 * id to attach the eventual callback to (idempotent on re-init via
 * onConflictDoNothing on UNIQUE(userId, provider)). Returns the URL the
 * user should be redirected to in their browser.
 */
export async function initiateOAuth(
  userId: string,
  provider: WearableProvider
): Promise<{ connectUrl: string }> {
  const db = await getDb();
  await db
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
 * cancelled the OAuth consent screen).
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

  // Async-fire initial sync. Failures are logged but don't bubble — the user's
  // OAuth completed successfully even if the first sync trigger errored;
  // they can retry sync from the UI.
  ow.triggerSync(provider, userId).catch((err) =>
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
  try {
    await ow.revokeConnection(conn.provider as WearableProvider, userId);
  } catch (err) {
    logger.warn('Open Wearables revoke failed (continuing with local disconnect)', {
      connectionId,
      err: String(err),
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
