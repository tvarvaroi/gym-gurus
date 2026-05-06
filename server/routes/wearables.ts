/**
 * Wearable Routes — Sprint 4 BATCH 3
 *
 * 12 user-facing endpoints for the wearable integration layer.
 *
 * Mount: app.use('/api/wearables', secureAuth, apiRateLimit, wearableRouter).
 * secureAuth populates req.user. Every handler defensively re-checks
 * `req.user?.id` and returns 401 if missing — matches the wellness routes
 * pattern, lets tests exercise the unauth path without re-mounting auth
 * middleware.
 *
 * Route ordering (Express matches in declaration order — gotchas.md):
 *   1. Specific paths first  : /, /connect, /oauth-callback, /sleep, /vitals,
 *                              /activity
 *   2. Trainer-side specific : /client/:clientId/sleep | /vitals | /activity
 *   3. Parameterised last    : /:id (DELETE), /:id/preferences (PATCH),
 *                              /:id/sync (POST)
 *
 * IDOR safety: every read filters by req.user.id; every parameterised
 * mutation goes through the wearableConnections service (which filters by
 * BOTH connectionId AND userId). The mutation tests in the matching test
 * file prove the userId clause is load-bearing — removing it from any of
 * these handlers fails the column-aware expectOwnershipClause assertion.
 *
 * Trainer routes follow a 4-state response shape (TRAINER_ONLY /
 * NOT_YOURS / CONSENT_NOT_GRANTED / NOT_REGISTERED) — see
 * `getClientUserIdForTrainer` below.
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import { getDb } from '../db';
import {
  wearableConnections,
  sleepSessions,
  dailyVitals,
  activitySessions,
  clients,
  WEARABLE_PROVIDERS,
  type WearableProvider,
  type WearableSyncPreferences,
} from '../../shared/schema';
import * as wc from '../services/wearableConnections';
import * as ow from '../services/openWearablesClient';
import { logger } from '../logger';
import { getRequestId } from '../middleware/requestLogger';

const router = Router();

// ─── Validation schemas ─────────────────────────────────────────────────────
const connectBodySchema = z.object({ provider: z.enum(WEARABLE_PROVIDERS) });
const oauthCallbackQuerySchema = z.object({ provider: z.enum(WEARABLE_PROVIDERS) });
const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(90),
});
const idParamSchema = z.object({ id: z.string().uuid() });
const prefsPatchSchema = z.object({
  sleep: z.boolean().optional(),
  hrv: z.boolean().optional(),
  workouts: z.boolean().optional(),
  body: z.boolean().optional(),
  activity: z.boolean().optional(),
});

// ─── Trainer-side guard helper ──────────────────────────────────────────────
// Returns the Disciple's userId on success. On any gate failure, sends a
// status response and returns null. Caller must check `res.headersSent` or
// the null return before continuing.
//
// 4-state response shape (matches BATCH 3 plan + Sprint 4 trainer-route brief):
//   - 403 TRAINER_ONLY        — caller is not a trainer
//   - 404 NOT_YOURS           — client doesn't exist or doesn't belong to caller
//   - 403 CONSENT_NOT_GRANTED — Disciple has revoked the specific data type
//   - 404 NOT_REGISTERED      — clients.user_id IS NULL (Disciple not registered yet)
async function getClientUserIdForTrainer(
  req: Request,
  res: Response,
  consentField: 'shareSleepWithTrainer' | 'shareHrvWithTrainer' | 'shareActivityWithTrainer'
): Promise<string | null> {
  if (req.user?.role !== 'trainer') {
    res.status(403).json({ error: 'Trainer-only', code: 'TRAINER_ONLY' });
    return null;
  }
  const clientId = req.params.clientId;
  const db = await getDb();
  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(eq(clients.id, clientId), eq(clients.trainerId, req.user!.id), isNull(clients.deletedAt))
    );
  if (!client) {
    res.status(404).json({ error: 'Client not found or not yours', code: 'NOT_YOURS' });
    return null;
  }
  if (!client[consentField]) {
    res.status(403).json({
      error: 'Client has not consented to sharing this data type',
      code: 'CONSENT_NOT_GRANTED',
    });
    return null;
  }
  if (!client.userId) {
    res.status(404).json({
      error: 'Client has not registered as a Disciple yet',
      code: 'NOT_REGISTERED',
    });
    return null;
  }
  return client.userId;
}

// ─── 1. GET /api/wearables — list current user's connections ────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await wc.listConnections(userId);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /] failed', error);
    res.status(500).json({ error: 'Failed to list wearable connections' });
  }
});

// ─── 2. POST /api/wearables/connect — initiate OAuth flow ───────────────────
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parsed = connectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid provider', details: parsed.error.errors });
    }
    const result = await wc.initiateOAuth(userId, parsed.data.provider);
    res.json(result);
  } catch (error) {
    logger.error('[wearables/POST /connect] failed', error);
    res.status(502).json({ error: 'Failed to initiate OAuth' });
  }
});

// ─── 3. GET /api/wearables/oauth-callback — provider redirects user here ────
// Returns a 302 redirect into the SPA settings panel rather than JSON,
// because the user's browser is the consumer here, not a fetch client.
router.get('/oauth-callback', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parsed = oauthCallbackQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid provider', details: parsed.error.errors });
    }
    await wc.handleOAuthCallback(userId, parsed.data.provider);
    res.redirect(`/settings?tab=integrations&connected=${parsed.data.provider}`);
  } catch (error) {
    logger.error('[wearables/GET /oauth-callback] failed', error);
    res.status(502).json({ error: 'Failed to finalize OAuth callback' });
  }
});

// ─── 4. GET /api/wearables/sleep — own sleep data, date-range query ─────────
router.get('/sleep', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { from, to, limit } = dateRangeSchema.parse(req.query);
    const db = await getDb();
    const conditions = [eq(sleepSessions.userId, userId)];
    if (from) conditions.push(gte(sleepSessions.date, from.toISOString().slice(0, 10)));
    if (to) conditions.push(lte(sleepSessions.date, to.toISOString().slice(0, 10)));
    const rows = await db
      .select()
      .from(sleepSessions)
      .where(and(...conditions))
      .orderBy(desc(sleepSessions.date))
      .limit(limit);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /sleep] failed', error);
    res.status(500).json({ error: 'Failed to load sleep sessions' });
  }
});

// ─── 5. GET /api/wearables/vitals — own daily vitals (HRV, RHR, etc.) ───────
router.get('/vitals', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { from, to, limit } = dateRangeSchema.parse(req.query);
    const db = await getDb();
    const conditions = [eq(dailyVitals.userId, userId)];
    if (from) conditions.push(gte(dailyVitals.date, from.toISOString().slice(0, 10)));
    if (to) conditions.push(lte(dailyVitals.date, to.toISOString().slice(0, 10)));
    const rows = await db
      .select()
      .from(dailyVitals)
      .where(and(...conditions))
      .orderBy(desc(dailyVitals.date))
      .limit(limit);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /vitals] failed', error);
    res.status(500).json({ error: 'Failed to load daily vitals' });
  }
});

// ─── 6. GET /api/wearables/activity — own activity sessions ─────────────────
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { from, to, limit } = dateRangeSchema.parse(req.query);
    const db = await getDb();
    const conditions = [eq(activitySessions.userId, userId)];
    if (from) conditions.push(gte(activitySessions.startedAt, from));
    if (to) conditions.push(lte(activitySessions.startedAt, to));
    const rows = await db
      .select()
      .from(activitySessions)
      .where(and(...conditions))
      .orderBy(desc(activitySessions.startedAt))
      .limit(limit);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /activity] failed', error);
    res.status(500).json({ error: 'Failed to load activity sessions' });
  }
});

// ─── 7-9. Trainer-side data reads (gated by per-data-type consent) ──────────
// IMPORTANT: declared BEFORE /:id parameterised routes so Express matches
// /client/:clientId/sleep correctly instead of treating "client" as an :id.

router.get('/client/:clientId/sleep', async (req: Request, res: Response) => {
  try {
    const targetUserId = await getClientUserIdForTrainer(req, res, 'shareSleepWithTrainer');
    if (!targetUserId) return; // response already sent
    const { from, to, limit } = dateRangeSchema.parse(req.query);
    const db = await getDb();
    const conditions = [eq(sleepSessions.userId, targetUserId)];
    if (from) conditions.push(gte(sleepSessions.date, from.toISOString().slice(0, 10)));
    if (to) conditions.push(lte(sleepSessions.date, to.toISOString().slice(0, 10)));
    const rows = await db
      .select()
      .from(sleepSessions)
      .where(and(...conditions))
      .orderBy(desc(sleepSessions.date))
      .limit(limit);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /client/:clientId/sleep] failed', error);
    res.status(500).json({ error: 'Failed to load client sleep sessions' });
  }
});

router.get('/client/:clientId/vitals', async (req: Request, res: Response) => {
  try {
    // HRV lives in dailyVitals — gated by shareHrvWithTrainer (the brief's
    // intent: "vitals" exposes HRV/RHR/SpO2 etc., the most sensitive of the
    // three streams Sprint 4 surfaces to trainers).
    const targetUserId = await getClientUserIdForTrainer(req, res, 'shareHrvWithTrainer');
    if (!targetUserId) return;
    const { from, to, limit } = dateRangeSchema.parse(req.query);
    const db = await getDb();
    const conditions = [eq(dailyVitals.userId, targetUserId)];
    if (from) conditions.push(gte(dailyVitals.date, from.toISOString().slice(0, 10)));
    if (to) conditions.push(lte(dailyVitals.date, to.toISOString().slice(0, 10)));
    const rows = await db
      .select()
      .from(dailyVitals)
      .where(and(...conditions))
      .orderBy(desc(dailyVitals.date))
      .limit(limit);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /client/:clientId/vitals] failed', error);
    res.status(500).json({ error: 'Failed to load client daily vitals' });
  }
});

router.get('/client/:clientId/activity', async (req: Request, res: Response) => {
  try {
    const targetUserId = await getClientUserIdForTrainer(req, res, 'shareActivityWithTrainer');
    if (!targetUserId) return;
    const { from, to, limit } = dateRangeSchema.parse(req.query);
    const db = await getDb();
    const conditions = [eq(activitySessions.userId, targetUserId)];
    if (from) conditions.push(gte(activitySessions.startedAt, from));
    if (to) conditions.push(lte(activitySessions.startedAt, to));
    const rows = await db
      .select()
      .from(activitySessions)
      .where(and(...conditions))
      .orderBy(desc(activitySessions.startedAt))
      .limit(limit);
    res.json(rows);
  } catch (error) {
    logger.error('[wearables/GET /client/:clientId/activity] failed', error);
    res.status(500).json({ error: 'Failed to load client activity sessions' });
  }
});

// ─── 10-12. Parameterised routes (must come LAST per Express ordering) ──────

// DELETE /api/wearables/:id — disconnect. IDOR-safe via the service layer
// (wc.disconnect filters by BOTH connectionId AND userId in WHERE).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid connection id' });
    }
    await wc.disconnect(userId, parsed.data.id);
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Connection not found') {
      // Cross-user IDOR attempt OR genuinely-missing — both 404. The service
      // layer's where(eq(id) AND eq(userId)) returns no row in both cases;
      // we deliberately don't distinguish so attackers can't probe for
      // connection ID existence.
      return res.status(404).json({ error: 'Connection not found' });
    }
    logger.error('[wearables/DELETE /:id] failed', error);
    res.status(500).json({ error: 'Failed to disconnect wearable' });
  }
});

// PATCH /api/wearables/:id/preferences — update sync_preferences. Audit-log
// per-changed flag (mirrors Sprint 1.5 BATCH 3 + Sprint 2 BATCH 5 pattern).
router.patch('/:id/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) return res.status(400).json({ error: 'Invalid connection id' });
    const patchParsed = prefsPatchSchema.safeParse(req.body);
    if (!patchParsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid preferences', details: patchParsed.error.errors });
    }

    const db = await getDb();
    // SELECT-existing first — captures previousValue for the audit log AND
    // proves ownership. The IDOR ownership clause `eq(userId)` is load-bearing.
    const [existing] = await db
      .select()
      .from(wearableConnections)
      .where(
        and(eq(wearableConnections.id, idParsed.data.id), eq(wearableConnections.userId, userId))
      );
    if (!existing) return res.status(404).json({ error: 'Connection not found' });

    const previous = existing.syncPreferences as WearableSyncPreferences;
    const merged: WearableSyncPreferences = { ...previous, ...patchParsed.data };

    await db
      .update(wearableConnections)
      .set({ syncPreferences: merged })
      .where(
        and(eq(wearableConnections.id, idParsed.data.id), eq(wearableConnections.userId, userId))
      );

    // Audit log per changed flag — mirrors biometrics-sharing pattern.
    const auditCommon = {
      userId,
      connectionId: idParsed.data.id,
      provider: existing.provider,
      ts: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: getRequestId(req),
    };
    for (const key of Object.keys(patchParsed.data) as (keyof WearableSyncPreferences)[]) {
      const newVal = patchParsed.data[key];
      const prevVal = previous[key];
      if (newVal !== undefined && prevVal !== newVal) {
        logger.audit('wearable.sync_preference_changed', {
          ...auditCommon,
          flag: key,
          previousValue: prevVal,
          value: newVal,
        });
      }
    }

    res.json({ ok: true, syncPreferences: merged });
  } catch (error) {
    logger.error('[wearables/PATCH /:id/preferences] failed', error);
    res.status(500).json({ error: 'Failed to update sync preferences' });
  }
});

// POST /api/wearables/:id/sync — manually trigger sync. Best-effort: on Open
// Wearables outage we 502 immediately rather than tying up the request.
router.post('/:id/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid connection id' });

    const db = await getDb();
    const [conn] = await db
      .select()
      .from(wearableConnections)
      .where(
        and(eq(wearableConnections.id, parsed.data.id), eq(wearableConnections.userId, userId))
      );
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    try {
      await ow.triggerSync(conn.provider as WearableProvider, userId);
    } catch (err) {
      logger.warn('[wearables/POST /:id/sync] Open Wearables triggerSync failed', {
        connectionId: parsed.data.id,
        err: String(err),
      });
      return res.status(502).json({ error: 'Open Wearables unavailable', code: 'OW_UNAVAILABLE' });
    }
    res.json({ ok: true });
  } catch (error) {
    logger.error('[wearables/POST /:id/sync] failed', error);
    res.status(500).json({ error: 'Failed to trigger manual sync' });
  }
});

export default router;
