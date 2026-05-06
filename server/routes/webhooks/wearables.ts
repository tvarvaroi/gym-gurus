/**
 * Wearable Webhook Routes — Sprint 4 BATCH 2
 *
 * Receives Open Wearables outbound webhooks. The HMAC + timestamp middleware
 * (verifyWearableSignature) authenticates the sender; from there we Zod-
 * validate the payload, dedupe via in-memory LRU on `webhookId`, and route
 * to the appropriate ingest function.
 *
 * Idempotency: every webhook payload includes a `webhookId` field. Dedupe
 * via in-memory LRU (24h TTL) for v1. Returns `{ ok: true, deduped: true }`
 * on duplicate within window. Server restart clears the LRU; a webhook that
 * arrives both before AND after a restart could ingest twice — but the
 * UPSERT layer (wearableIngest) ALSO handles idempotency via UNIQUE
 * (user_id, source, source_record_id). Two-layer defense: LRU dedup is the
 * fast path, UPSERT is the correctness floor.
 *
 * Failure handling: if ingest throws, we call markSyncError on the
 * connection (which will fire wearable_sync_failed at count===1 or
 * wearable_expired at count===3). The webhook returns 500 so Open Wearables
 * retries; idempotency layer dedupes the eventual successful delivery.
 *
 * Mount in server/index.ts BEFORE express.json() global middleware:
 *   app.use('/webhooks/wearables',
 *     express.raw({ type: 'application/json' }),
 *     (req, _res, next) => {
 *       (req as any).rawBody = req.body;
 *       try { req.body = JSON.parse(req.body.toString('utf8')); }
 *       catch { req.body = {}; }
 *       next();
 *     },
 *     wearableWebhookRouter);
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { verifyWearableSignature } from '../../middleware/verifyWearableSignature';
import * as ingest from '../../services/wearableIngest';
import { markSyncError } from '../../services/wearableConnections';
import { dispatch } from '../../services/notificationDispatcher';
import { getDb } from '../../db';
import { wearableConnections, type WearableStatus } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../logger';

const router = Router();

// ─── In-memory idempotency LRU ──────────────────────────────────────────────
const recentWebhookIds = new Map<string, number>();
const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isDuplicate(id: string): boolean {
  const now = Date.now();
  // Sweep stale entries inline (cheap; map size cap implicit via TTL).
  // Array.from snapshot avoids iterator-target compatibility issues on
  // older TS targets and is safe to mutate the underlying Map mid-iter.
  Array.from(recentWebhookIds.entries()).forEach(([k, t]) => {
    if (now - t > WEBHOOK_TTL_MS) recentWebhookIds.delete(k);
  });
  if (recentWebhookIds.has(id)) return true;
  recentWebhookIds.set(id, now);
  return false;
}

// Test-only reset hook. Not exported in production usage; keeps ingest tests
// independent of cross-test LRU bleed.
export function __resetWebhookIdempotency(): void {
  recentWebhookIds.clear();
}

// ─── Payload schemas ────────────────────────────────────────────────────────

const baseSchema = z.object({
  webhookId: z.string().min(1),
  userId: z.string().min(1),
  connectionId: z.string().min(1),
  source: z.string().min(1),
  payload: z.unknown(),
});

const connectionStatusSchema = z.object({
  webhookId: z.string().min(1),
  userId: z.string().min(1),
  connectionId: z.string().min(1),
  source: z.string().min(1),
  status: z.enum(['connected', 'disconnected', 'expired', 'revoked']),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.post('/sleep', verifyWearableSignature, async (req: Request, res: Response) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  if (isDuplicate(parsed.data.webhookId)) {
    return res.status(200).json({ ok: true, deduped: true });
  }
  try {
    await ingest.ingestSleepSession(
      parsed.data.userId,
      parsed.data.connectionId,
      parsed.data.source,
      parsed.data.payload
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('sleep webhook ingest failed', { err: String(err) });
    await markSyncError(parsed.data.connectionId, String(err)).catch(() => {});
    res.status(500).json({ error: 'ingest failed' });
  }
});

router.post('/vitals', verifyWearableSignature, async (req: Request, res: Response) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  if (isDuplicate(parsed.data.webhookId)) {
    return res.status(200).json({ ok: true, deduped: true });
  }
  try {
    await ingest.ingestDailyVitals(
      parsed.data.userId,
      parsed.data.connectionId,
      parsed.data.source,
      parsed.data.payload
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('vitals webhook ingest failed', { err: String(err) });
    await markSyncError(parsed.data.connectionId, String(err)).catch(() => {});
    res.status(500).json({ error: 'ingest failed' });
  }
});

router.post('/activity', verifyWearableSignature, async (req: Request, res: Response) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  if (isDuplicate(parsed.data.webhookId)) {
    return res.status(200).json({ ok: true, deduped: true });
  }
  try {
    await ingest.ingestActivity(
      parsed.data.userId,
      parsed.data.connectionId,
      parsed.data.source,
      parsed.data.payload
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('activity webhook ingest failed', { err: String(err) });
    await markSyncError(parsed.data.connectionId, String(err)).catch(() => {});
    res.status(500).json({ error: 'ingest failed' });
  }
});

/**
 * Provider-side connection-status events (revoke, re-auth required, etc.).
 * Open Wearables forwards these so we can keep our local wearable_connections
 * row in sync. This route does NOT call ingest — it just updates the status
 * and dispatches wearable_expired when the provider has flipped the connection
 * to 'expired' or 'revoked' (Sprint 4 BATCH 2 reviewer item 2 — original
 * implementation silently updated the DB without notifying the user, eroding
 * trust on provider-side revoke; the notification template already exists).
 */
router.post('/connection-status', verifyWearableSignature, async (req: Request, res: Response) => {
  const parsed = connectionStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  if (isDuplicate(parsed.data.webhookId)) {
    return res.status(200).json({ ok: true, deduped: true });
  }

  // The webhook's load-bearing responsibility is the DB row update — that's the
  // source-of-truth state change Open Wearables is reporting. The try/catch
  // protects ONLY that update; if it fails, we 500 so Open Wearables retries
  // (idempotency layer dedupes the eventual successful delivery).
  try {
    const db = await getDb();
    await db
      .update(wearableConnections)
      .set({
        status: parsed.data.status as WearableStatus,
        ...(parsed.data.status === 'disconnected' || parsed.data.status === 'revoked'
          ? { disconnectedAt: new Date() }
          : {}),
      })
      .where(
        and(
          eq(wearableConnections.id, parsed.data.connectionId),
          eq(wearableConnections.userId, parsed.data.userId)
        )
      );
  } catch (err) {
    logger.error('connection-status webhook update failed', { err: String(err) });
    return res.status(500).json({ error: 'update failed' });
  }

  // Fire-and-forget downstream notification. See _brain/notes/decisions.md
  // "Webhook → notification dispatch: fire-and-forget pattern (Sprint 4 BATCH 2)".
  // The dispatch must NOT 500 the webhook even if it throws — Open Wearables
  // would retry an already-applied DB update, causing a delivery storm.
  // Notifications are downstream consumers; the DB row is the contract.
  // 'disconnected' is the user's own action via the UI (they already know);
  // only 'expired' and 'revoked' are surprise events worth a notification.
  if (parsed.data.status === 'expired' || parsed.data.status === 'revoked') {
    dispatch(parsed.data.userId, 'wearable_expired', {
      provider: parsed.data.source,
    }).catch((err) => logger.warn('wearable_expired dispatch failed', { err: String(err) }));
  }

  res.status(200).json({ ok: true });
});

export default router;
