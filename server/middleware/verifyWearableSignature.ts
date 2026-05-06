/**
 * Wearable Webhook Signature Verification — Sprint 4 BATCH 2
 *
 * Open Wearables (our self-hosted bridge to the 5 wearable providers) signs
 * every outbound webhook with HMAC-SHA256 over `<unix-ts>.<raw-body>` using
 * a shared secret (env var OPEN_WEARABLES_WEBHOOK_SECRET — separate from
 * the internal API token).
 *
 * Validation pipeline:
 *   1. Parse X-Webhook-Timestamp (unix seconds). Reject if missing/non-numeric.
 *   2. Reject if |now - timestamp| > 5 minutes (replay window). This absorbs
 *      clock skew between hosts but rejects captured-and-replayed payloads.
 *   3. Parse X-Webhook-Signature (hex). Recompute HMAC over <ts>.<raw-body>.
 *   4. Compare via crypto.timingSafeEqual — NEVER `===` (string-compare leaks
 *      bytes through timing differences). Lengths MUST be equal first
 *      (timingSafeEqual throws on length mismatch — the explicit pre-check is
 *      the guard).
 *
 * Provider header abstraction: Open Wearables receives provider-specific
 * signature headers (Whoop's X-Whoop-Signature, Strava's X-Hub-Signature-256,
 * etc.) on its inbound side and converts them to the unified
 * X-Webhook-Signature + X-Webhook-Timestamp on its outbound webhook to
 * GymGurus. We ONLY handle the unified Open Wearables headers.
 *
 * The raw body must be available as `req.rawBody` (Buffer). The route mount
 * uses `express.raw({ type: 'application/json' })` and a small middleware
 * that copies the buffer to `req.rawBody` before JSON-parsing for handlers.
 */
import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

const REPLAY_WINDOW_SECONDS = 300; // ±5 min

export function verifyWearableSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const secret = process.env.OPEN_WEARABLES_WEBHOOK_SECRET ?? '';
  if (!secret) {
    return res.status(500).json({ error: 'webhook signature secret not configured' });
  }

  const tsHeader = req.header('X-Webhook-Timestamp') ?? '';
  // parseInt('') === NaN, parseInt('abc') === NaN — both caught by isNaN
  const tsNum = parseInt(tsHeader, 10);
  if (!tsHeader || Number.isNaN(tsNum)) {
    return res.status(401).json({ error: 'missing or invalid timestamp' });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > REPLAY_WINDOW_SECONDS) {
    return res.status(401).json({ error: 'stale timestamp (outside replay window)' });
  }

  const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
  if (!raw) {
    return res.status(400).json({ error: 'raw body unavailable' });
  }

  const sig = req.header('X-Webhook-Signature') ?? '';
  // Sign over `<timestamp>.<raw-body>`, NOT just the body. Using the
  // timestamp in the signed string makes captured-signature replay
  // impossible without the secret (the attacker would need to recompute).
  const signed = `${tsHeader}.${raw.toString('utf8')}`;
  const expected = createHmac('sha256', secret).update(signed).digest('hex');

  // timingSafeEqual: constant-time comparison. Both buffers MUST be equal
  // length first — timingSafeEqual throws on length mismatch, so the explicit
  // pre-check is the guarded fast-path.
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  next();
}
