/**
 * Wearable Webhook Routes Tests — Sprint 4 BATCH 2
 *
 * 10 cases covering HMAC + timestamp + replay defense:
 *   1. Valid timestamp + valid signature + valid payload → 200 ok:true
 *   2. Stale timestamp (now - 600s) → 401 stale timestamp
 *   3. Future timestamp (now + 600s) → 401 stale timestamp
 *   4. Missing X-Webhook-Timestamp → 401 missing or invalid timestamp
 *   5. Non-numeric X-Webhook-Timestamp → 401 missing or invalid timestamp
 *   6. Valid timestamp + invalid signature → 401 invalid signature
 *   7. Valid timestamp + tampered body → 401 invalid signature
 *   8. Replay (same webhookId twice within window) → 200 deduped:true
 *   9. Missing OPEN_WEARABLES_WEBHOOK_SECRET → 500 webhook signature secret not configured
 *  10. timingSafeEqual length mismatch (extra char in signature) → 401 invalid signature
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHmac } from 'node:crypto';

// ---------------------------------------------------------------------------
// Mocks for downstream services (tested elsewhere)
// ---------------------------------------------------------------------------

const { ingestMocks, markSyncErrorMock, dispatchMock, dbMock, loggerMock } = vi.hoisted(() => ({
  ingestMocks: {
    ingestSleepSession: vi.fn(async () => ({ inserted: true, recordId: 'r' })),
    ingestDailyVitals: vi.fn(async () => ({ inserted: true, recordId: 'r' })),
    ingestActivity: vi.fn(async () => ({ inserted: true, recordId: 'r' })),
  },
  markSyncErrorMock: vi.fn(async () => undefined),
  dispatchMock: vi.fn(async () => undefined),
  dbMock: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  },
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
}));

vi.mock('../../../services/wearableIngest', () => ingestMocks);
vi.mock('../../../services/wearableConnections', () => ({
  markSyncError: markSyncErrorMock,
}));
vi.mock('../../../services/notificationDispatcher', () => ({
  dispatch: dispatchMock,
}));
vi.mock('../../../db', () => ({
  getDb: vi.fn(async () => dbMock),
  db: dbMock,
  getPool: vi.fn(),
  pool: null,
}));
vi.mock('../../../logger', () => ({
  logger: loggerMock,
  log: vi.fn(),
}));

// ---------------------------------------------------------------------------
// AFTER mocks — import the SUT
// ---------------------------------------------------------------------------

import wearableWebhookRouter, {
  __resetWebhookIdempotency,
} from '../../../routes/webhooks/wearables';

// ---------------------------------------------------------------------------
// Test app factory mirrors the production mount
// ---------------------------------------------------------------------------

const SECRET = 'test-webhook-secret-key';

function makeTestApp() {
  const app = express();
  app.use(
    '/webhooks/wearables',
    express.raw({ type: 'application/json' }),
    (req, _res, next) => {
      // Mirror server/index.ts mount: copy raw buffer, then JSON-parse for
      // handler convenience. The raw buffer is what HMAC is computed over.
      (req as unknown as { rawBody: Buffer }).rawBody = req.body as Buffer;
      try {
        req.body = JSON.parse((req.body as Buffer).toString('utf8'));
      } catch {
        req.body = {};
      }
      next();
    },
    wearableWebhookRouter
  );
  return app;
}

function signPayload(timestampSec: number, body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(`${timestampSec}.${body}`).digest('hex');
}

function makeSleepPayload(webhookId = 'wh-test-1') {
  return {
    webhookId,
    userId: 'user-A',
    connectionId: 'conn-1',
    source: 'whoop',
    payload: {
      date: '2026-05-06',
      sourceRecordId: 'whoop-sleep-1',
      totalSleepMinutes: 420,
    },
  };
}

beforeEach(() => {
  process.env.OPEN_WEARABLES_WEBHOOK_SECRET = SECRET;
  __resetWebhookIdempotency();
  ingestMocks.ingestSleepSession.mockClear();
  ingestMocks.ingestDailyVitals.mockClear();
  ingestMocks.ingestActivity.mockClear();
  markSyncErrorMock.mockClear();
});

afterEach(() => {
  delete process.env.OPEN_WEARABLES_WEBHOOK_SECRET;
});

// ===========================================================================
// 1. Valid timestamp + valid signature + valid payload → 200
// ===========================================================================

describe('HMAC webhook receiver — happy path', () => {
  it('valid timestamp + valid signature + valid sleep payload → 200 ok:true', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload());
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(ingestMocks.ingestSleepSession).toHaveBeenCalledWith(
      'user-A',
      'conn-1',
      'whoop',
      expect.objectContaining({ date: '2026-05-06' })
    );
  });

  it('vitals route mirror: valid timestamp + signature + payload → 200', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      ...makeSleepPayload('wh-vitals-1'),
      payload: { date: '2026-05-06', restingHeartRate: 58 },
    });
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/vitals')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(ingestMocks.ingestDailyVitals).toHaveBeenCalled();
  });

  it('activity route mirror: valid timestamp + signature + payload → 200', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      ...makeSleepPayload('wh-activity-1'),
      payload: { startedAt: '2026-05-06T10:00:00Z', durationMinutes: 30 },
    });
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/activity')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(ingestMocks.ingestActivity).toHaveBeenCalled();
  });
});

// ===========================================================================
// 2-3. Replay defense: stale and future timestamps
// ===========================================================================

describe('HMAC webhook receiver — replay defense (timestamp window)', () => {
  it('stale timestamp (now - 600s) → 401 stale timestamp', async () => {
    const ts = Math.floor(Date.now() / 1000) - 600;
    const body = JSON.stringify(makeSleepPayload());
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/stale timestamp/);
    expect(ingestMocks.ingestSleepSession).not.toHaveBeenCalled();
  });

  it('future timestamp (now + 600s) → 401 stale timestamp', async () => {
    const ts = Math.floor(Date.now() / 1000) + 600;
    const body = JSON.stringify(makeSleepPayload());
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/stale timestamp/);
  });
});

// ===========================================================================
// 4-5. Missing / non-numeric timestamp
// ===========================================================================

describe('HMAC webhook receiver — timestamp parsing', () => {
  it('missing X-Webhook-Timestamp → 401 missing or invalid timestamp', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload());
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing or invalid timestamp/);
  });

  it('non-numeric X-Webhook-Timestamp → 401 missing or invalid timestamp', async () => {
    const body = JSON.stringify(makeSleepPayload());
    const sig = signPayload(0, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', 'abc-not-a-number')
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing or invalid timestamp/);
  });
});

// ===========================================================================
// 6-7. Invalid signature, tampered body
// ===========================================================================

describe('HMAC webhook receiver — signature verification', () => {
  it('valid timestamp + invalid signature → 401 invalid signature', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload());
    // Wrong signature — same length as a valid hex digest, but not the real one
    const fakeSig = 'a'.repeat(64);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', fakeSig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid signature/);
  });

  it('valid timestamp + tampered body (signature was over original) → 401 invalid signature', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const original = JSON.stringify(makeSleepPayload());
    const sig = signPayload(ts, original);
    // Send a DIFFERENT body with the signature for the original. HMAC fails.
    const tamperedBody = JSON.stringify({
      ...makeSleepPayload(),
      userId: 'user-attacker',
    });

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(tamperedBody);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid signature/);
    expect(ingestMocks.ingestSleepSession).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 8. Replay (same webhookId twice within window) → deduped
// ===========================================================================

describe('HMAC webhook receiver — idempotency dedup', () => {
  it('replay (same webhookId twice within window) → second call returns deduped:true; ingest fires only once', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload('wh-replay-1'));
    const sig = signPayload(ts, body);

    const app = makeTestApp();
    const r1 = await request(app)
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);
    expect(r1.status).toBe(200);
    expect(r1.body).toEqual({ ok: true });

    const r2 = await request(app)
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);
    expect(r2.status).toBe(200);
    expect(r2.body).toEqual({ ok: true, deduped: true });

    // Ingest should fire exactly once across both calls.
    expect(ingestMocks.ingestSleepSession).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 9. Missing webhook secret → 500
// ===========================================================================

describe('HMAC webhook receiver — secret configuration', () => {
  it('OPEN_WEARABLES_WEBHOOK_SECRET unset → 500 webhook signature secret not configured', async () => {
    delete process.env.OPEN_WEARABLES_WEBHOOK_SECRET;
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload());

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', 'a'.repeat(64))
      .send(body);

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/webhook signature secret not configured/);
  });
});

// ===========================================================================
// 10. timingSafeEqual length mismatch guard
// ===========================================================================

describe('HMAC webhook receiver — length-mismatch guard', () => {
  it('signature with wrong length (extra char) → 401 invalid signature, no thrown error', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload());
    const sig = signPayload(ts, body) + 'X'; // 65 chars instead of 64

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid signature/);
  });

  it('signature missing entirely → 401 invalid signature', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(makeSleepPayload());

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/sleep')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid signature/);
  });
});

// ===========================================================================
// 11. Connection-status webhook (provider-side revoke)
// ===========================================================================

describe('connection-status webhook', () => {
  it('valid signed revoke event → 200 + DB update + dispatch wearable_expired', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      webhookId: 'wh-cs-1',
      userId: 'user-A',
      connectionId: 'conn-1',
      source: 'whoop',
      status: 'revoked',
    });
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/connection-status')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_expired', {
      provider: 'whoop',
    });
  });

  // ─── Fire-and-forget regression net ────────────────────────────────────────
  // Per _brain/notes/decisions.md "Webhook → notification dispatch:
  // fire-and-forget pattern (Sprint 4 BATCH 2)". Webhook ack is the load-
  // bearing contract; notification is a downstream side-effect. If dispatch
  // fails, the webhook MUST still 200 so Open Wearables doesn't retry an
  // already-applied DB update (delivery storm). This test prevents future
  // refactors from re-coupling dispatch into the route's main try/catch.
  it('dispatch rejects → webhook still 200, warning logged (fire-and-forget regression net)', async () => {
    dispatchMock.mockRejectedValueOnce(new Error('dispatch boom'));

    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      webhookId: 'wh-cs-2',
      userId: 'user-A',
      connectionId: 'conn-1',
      source: 'whoop',
      status: 'expired',
    });
    const sig = signPayload(ts, body);

    const res = await request(makeTestApp())
      .post('/webhooks/wearables/connection-status')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', String(ts))
      .set('X-Webhook-Signature', sig)
      .send(body);

    // 1. Webhook acks 200 despite dispatch failure — load-bearing contract
    expect(res.status).toBe(200);
    // 2. Dispatch was called with correct args (proving the call SITE fires)
    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_expired', {
      provider: 'whoop',
    });
    // 3. Warning was logged (proving the .catch handler runs).
    //    Wait one microtask tick so the unawaited promise rejection has
    //    settled and the .catch handler has executed before assertion.
    await new Promise((r) => setImmediate(r));
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'wearable_expired dispatch failed',
      expect.objectContaining({ err: expect.stringContaining('dispatch boom') })
    );
  });
});
