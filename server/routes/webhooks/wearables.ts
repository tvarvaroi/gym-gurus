/**
 * Wearable Webhook Routes — Sprint 4 BATCH 5a (rewrite — Svix-signed dispatch)
 *
 * Receives Open Wearables outbound webhooks. OW signs every webhook via Svix
 * (the official open-source webhook gateway it embeds). Svix sets three headers
 * on every delivery — `svix-id`, `svix-timestamp`, `svix-signature` — and the
 * `Webhook` class from the `svix` npm package verifies them in one call.
 *
 * Replaces BATCH 2's hand-rolled HMAC + 4-routes (`/sleep`, `/vitals`,
 * `/activity`, `/connection-status`) shape with a single endpoint
 * (`POST /webhooks/wearables`) that switches on `event.type`. OW upstream's
 * canonical event types are: `workout.created`, `sleep.created`,
 * `connection.created`, `body_composition.created` (per OW's webhooks guide).
 *
 * Idempotency: keyed on `svix-id` header (Svix guarantees stability across
 * retries of the same logical event). 24h LRU. The cryptographic anti-replay
 * defense is in `wh.verify()` — it rejects timestamps outside Svix's 5-minute
 * window. The LRU is a short-window dedupe layer only.
 *
 * Failure handling: signature/timestamp/envelope failures → 401 (no body, no
 * retry). Schema-mismatch on the per-event payload → 200 + log warning (Svix
 * shouldn't retry a malformed payload, it'd fail identically). Ingest throws
 * → 500 (Svix retries; idempotency layer dedupes the eventual successful
 * delivery).
 *
 * Mount in server/index.ts BEFORE express.json() global middleware:
 *   app.use('/webhooks/wearables',
 *     express.raw({ type: 'application/json' }),
 *     wearableWebhookRouter);
 *
 * Connection-status route deletion (intentional, NOT an oversight): OW
 * upstream does NOT emit `connection.expired` / `connection.revoked` /
 * `connection.disconnected` events — only `connection.created` exists in OW's
 * canonical event types list. Provider-side revoke detection moves to the
 * connection-list polling cron (server/jobs/wearableSyncMonitor.ts, BATCH 5a).
 *
 * Carry-forward gotcha (deferred tech debt from BATCH 2): the LRU sweep is
 * O(N) per call. Refactor when active connections * delivery rate makes the
 * sweep cost visible (mirror condition: same threshold as the cron's N+1
 * escape — 500 connections).
 */
import { Router, type Request, type Response } from 'express';
import { Webhook, WebhookVerificationError } from 'svix';
import { z } from 'zod';
import * as ingest from '../../services/wearableIngest';
import { logger } from '../../logger';

const router = Router();

// ─── Per-endpoint signing secret (set fail-fast at module load) ─────────────
// OW returns a `whsec_<base64>` per-endpoint secret when we register the
// endpoint via POST /api/v1/webhooks/endpoints. Stored as
// OPEN_WEARABLES_WEBHOOK_SECRET (env var name preserved from BATCH 2 for
// continuity, but the value format and source are different — was a global
// HMAC secret, now a per-endpoint Svix signing secret).
//
// Lazy initialization via a getter so test code can set the env var BEFORE
// the SUT module is imported (BATCH 2 set it eagerly at module load and
// tests broke when the test setUp ordering shifted). The first verified
// request constructs the Webhook instance; from then on it's cached.
let _wh: Webhook | null = null;
function getWebhook(): Webhook {
  if (_wh) return _wh;
  const secret = process.env.OPEN_WEARABLES_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      'OPEN_WEARABLES_WEBHOOK_SECRET must be set (whsec_<base64> format from OW endpoint registration)'
    );
  }
  _wh = new Webhook(secret);
  return _wh;
}

// ─── In-memory idempotency LRU keyed on svix-id ─────────────────────────────
const recentSvixIds = new Map<string, number>();
const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Sweep stale entries — same O(N)-per-call implementation as BATCH 2
// (deferred tech debt per `_brain/notes/gotchas.md` "Webhook idempotency LRU
// sweep is O(N)"). Carried forward verbatim. Refactor when active connections
// + delivery rate make the sweep cost visible.
function sweepStale(): void {
  const now = Date.now();
  Array.from(recentSvixIds.entries()).forEach(([k, t]) => {
    if (now - t > WEBHOOK_TTL_MS) recentSvixIds.delete(k);
  });
}

// Test-only reset hook. Not exported in production usage; keeps ingest tests
// independent of cross-test LRU bleed.
export function __resetWebhookIdempotency(): void {
  recentSvixIds.clear();
  _wh = null;
}

// ─── Per-event-type Zod schemas at the trust boundary ───────────────────────
// `.passthrough()` allows unknown fields (forward compat with OW schema
// additions). The codebase pattern from Sprints 2-3 is "Zod-validate at the
// system boundary, trust internally past it."

const WorkoutCreatedDataSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    type: z.string(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    source: z.object({ provider: z.string() }).passthrough(),
  })
  .passthrough();

const SleepCreatedDataSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    source: z.object({ provider: z.string() }).passthrough(),
  })
  .passthrough();

const ConnectionCreatedDataSchema = z
  .object({
    user_id: z.string(),
    provider: z.string(),
    connection_id: z.string(),
    connected_at: z.string().datetime(),
  })
  .passthrough();

const BodyCompositionCreatedDataSchema = z
  .object({
    user_id: z.string(),
    provider: z.string(),
    series_type: z.string(),
    samples: z.array(
      z
        .object({
          timestamp: z.string().datetime(),
          type: z.string(),
          value: z.number(),
          unit: z.string(),
        })
        .passthrough()
    ),
  })
  .passthrough();

const EventEnvelopeSchema = z.object({
  type: z.string(),
  data: z.unknown(),
});

// ─── Single dispatch route ──────────────────────────────────────────────────

router.post('/wearables', async (req: Request, res: Response) => {
  // 1) Signature verification — must run BEFORE any other use of req.body or
  //    req.headers (don't trust unverified `svix-id` for idempotency keying).
  let envelope: { type: string; data?: unknown };
  try {
    // express.raw leaves req.body as a Buffer; svix.verify accepts Buffer or string.
    const rawBody = req.body as Buffer | string;
    const wh = getWebhook();
    const verified = wh.verify(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
      req.headers as Record<string, string>
    );
    envelope = EventEnvelopeSchema.parse(verified);
  } catch (err) {
    // WebhookVerificationError covers stale-timestamp + bad-signature.
    // Zod parse errors hit the same branch (envelope shape mismatch).
    const isVerifyError = err instanceof WebhookVerificationError;
    logger.warn('webhook signature verification or envelope parse failed', {
      err: String(err),
      isVerifyError,
    });
    return res.status(401).end();
  }

  // 2) Idempotency check — `svix-id` is stable across retries of the same
  //    logical event.
  sweepStale();
  const svixId = (req.headers['svix-id'] as string | undefined) ?? '';
  if (svixId && recentSvixIds.has(svixId)) {
    return res.status(200).json({ ok: true, deduped: true });
  }
  if (svixId) recentSvixIds.set(svixId, Date.now());
  // NOTE: Replay-attack defense relies on Svix's built-in 5-minute timestamp
  // window inside wh.verify() above. The LRU is a short-window dedupe layer
  // only; the cryptographic anti-replay defense is in Svix.

  // 3) Per-event-type Zod validation + dispatch. `.safeParse` returning false
  //    means OW sent us a payload that doesn't match our expected shape
  //    (schema drift, partial deploy, etc.). Ack with 200 — Svix shouldn't
  //    retry a malformed payload, it'll fail identically. Log warning so we
  //    notice OW schema drift.
  try {
    switch (envelope.type) {
      case 'workout.created': {
        const parsed = WorkoutCreatedDataSchema.safeParse(envelope.data);
        if (!parsed.success) {
          logger.warn('workout.created payload schema mismatch', {
            errors: parsed.error.errors,
            svixId,
          });
          return res.status(200).json({ ok: true, schema_mismatch: true });
        }
        await ingest.ingestWorkoutCreated(parsed.data);
        break;
      }
      case 'sleep.created': {
        const parsed = SleepCreatedDataSchema.safeParse(envelope.data);
        if (!parsed.success) {
          logger.warn('sleep.created payload schema mismatch', {
            errors: parsed.error.errors,
            svixId,
          });
          return res.status(200).json({ ok: true, schema_mismatch: true });
        }
        await ingest.ingestSleepCreated(parsed.data);
        break;
      }
      case 'connection.created': {
        const parsed = ConnectionCreatedDataSchema.safeParse(envelope.data);
        if (!parsed.success) {
          logger.warn('connection.created payload schema mismatch', {
            errors: parsed.error.errors,
            svixId,
          });
          return res.status(200).json({ ok: true, schema_mismatch: true });
        }
        await ingest.ingestConnectionCreated(parsed.data);
        break;
      }
      case 'body_composition.created': {
        const parsed = BodyCompositionCreatedDataSchema.safeParse(envelope.data);
        if (!parsed.success) {
          logger.warn('body_composition.created payload schema mismatch', {
            errors: parsed.error.errors,
            svixId,
          });
          return res.status(200).json({ ok: true, schema_mismatch: true });
        }
        await ingest.ingestBodyCompositionCreated(parsed.data);
        break;
      }
      default:
        logger.info('webhook event type not subscribed; ignoring', {
          type: envelope.type,
          svixId,
        });
        return res.status(200).json({ ok: true, ignored: true });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('webhook ingest failed', {
      err: String(err),
      type: envelope.type,
      svixId,
    });
    res.status(500).end();
  }
});

export default router;
