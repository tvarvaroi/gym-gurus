/**
 * Wearable Webhook Routes Tests — Sprint 4 BATCH 5a
 *
 * Replaces BATCH 2's hand-rolled HMAC tests with Svix-signed delivery
 * coverage:
 *
 *   1. Valid signed envelope + workout.created → 200 + ingestWorkoutCreated called
 *   2. Valid signed envelope + sleep.created → 200 + ingestSleepCreated called
 *   3. Valid signed envelope + connection.created → 200 + ingestConnectionCreated called
 *   4. Valid signed envelope + body_composition.created → 200 + ingestBodyCompositionCreated called
 *   5. Unknown event type → 200 ignored:true (forward-compat)
 *   6. Schema mismatch on per-event-type Zod parse → 200 schema_mismatch:true
 *      (Svix shouldn't retry malformed payload)
 *   7. Bad signature (svix.verify throws) → 401 (no body, no retry)
 *   8. Stale timestamp (svix.verify throws on >5min skew) → 401
 *   9. Replay (same svix-id twice within window) → 200 deduped:true; ingest fires once
 *  10. Ingest throws → 500 (Svix retries; idempotency layer dedupes)
 *  11. Missing OPEN_WEARABLES_WEBHOOK_SECRET → throws on first request (fail-fast)
 *
 * Strategy: use the real `svix` Webhook to sign in tests (whsec_<base64> format),
 * mock all four ingest functions, mock logger. Mount mirrors prod
 * (express.raw → router with route POST /wearables).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Webhook } from 'svix';

// ---------------------------------------------------------------------------
// Mocks for downstream services (tested elsewhere)
// ---------------------------------------------------------------------------

const { ingestMocks, loggerMock } = vi.hoisted(() => ({
  ingestMocks: {
    ingestWorkoutCreated: vi.fn(async () => ({ inserted: true })),
    ingestSleepCreated: vi.fn(async () => ({ inserted: true })),
    ingestConnectionCreated: vi.fn(async () => undefined),
    ingestBodyCompositionCreated: vi.fn(async () => ({ inserted_count: 1 })),
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
vi.mock('../../../logger', () => ({
  logger: loggerMock,
  log: vi.fn(),
}));

// ---------------------------------------------------------------------------
// AFTER mocks — the SUT module is dynamically imported per-test so the
// fail-fast getWebhook() reads the env var set by each test.
// ---------------------------------------------------------------------------

// whsec_<base64> per Svix's documented secret format. This is a literal Svix
// signing secret (the prefix is required by the Webhook constructor).
const SECRET = 'whsec_' + Buffer.from('test-webhook-secret-key-32-chars').toString('base64');

async function makeTestApp() {
  // Import after env is set, with module reset so the cached `_wh` resets.
  const mod = await import('../../../routes/webhooks/wearables');
  mod.__resetWebhookIdempotency();
  const wearableWebhookRouter = mod.default;

  const app = express();
  app.use('/webhooks', express.raw({ type: 'application/json' }), wearableWebhookRouter);
  return app;
}

function signEnvelope(envelope: object): {
  body: string;
  headers: { 'svix-id': string; 'svix-timestamp': string; 'svix-signature': string };
} {
  const body = JSON.stringify(envelope);
  const wh = new Webhook(SECRET);
  const svixId = `msg-${Math.random().toString(36).slice(2, 10)}`;
  const ts = new Date();
  const signature = wh.sign(svixId, ts, body);
  return {
    body,
    headers: {
      'svix-id': svixId,
      'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'svix-signature': signature,
    },
  };
}

const WORKOUT_DATA = {
  id: 'garmin-workout-1',
  user_id: 'user-A',
  type: 'running',
  start_time: '2026-05-06T07:00:00Z',
  end_time: '2026-05-06T07:45:00Z',
  source: { provider: 'garmin' },
};

const SLEEP_DATA = {
  id: 'garmin-sleep-1',
  user_id: 'user-A',
  start_time: '2026-05-05T23:00:00Z',
  end_time: '2026-05-06T07:00:00Z',
  source: { provider: 'garmin' },
};

const CONNECTION_DATA = {
  user_id: 'user-A',
  provider: 'garmin',
  connection_id: 'ow-conn-1',
  connected_at: '2026-05-06T06:55:00Z',
};

const BODY_COMP_DATA = {
  user_id: 'user-A',
  provider: 'garmin',
  series_type: 'body_composition',
  samples: [{ timestamp: '2026-05-06T07:00:00Z', type: 'weight', value: 75.5, unit: 'kg' }],
};

beforeEach(() => {
  process.env.OPEN_WEARABLES_WEBHOOK_SECRET = SECRET;
  vi.resetModules();
  ingestMocks.ingestWorkoutCreated.mockClear();
  ingestMocks.ingestSleepCreated.mockClear();
  ingestMocks.ingestConnectionCreated.mockClear();
  ingestMocks.ingestBodyCompositionCreated.mockClear();
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  loggerMock.info.mockClear();
});

afterEach(() => {
  delete process.env.OPEN_WEARABLES_WEBHOOK_SECRET;
});

// ===========================================================================
// 1-4. Type-dispatch happy paths
// ===========================================================================

describe('Svix webhook receiver — type-dispatch happy paths', () => {
  it('workout.created → 200 + ingestWorkoutCreated called', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'workout.created', data: WORKOUT_DATA });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(ingestMocks.ingestWorkoutCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'garmin-workout-1', user_id: 'user-A' })
    );
  });

  it('sleep.created → 200 + ingestSleepCreated called', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'sleep.created', data: SLEEP_DATA });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);
    expect(ingestMocks.ingestSleepCreated).toHaveBeenCalled();
  });

  it('connection.created → 200 + ingestConnectionCreated called', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'connection.created', data: CONNECTION_DATA });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);
    expect(ingestMocks.ingestConnectionCreated).toHaveBeenCalled();
  });

  it('body_composition.created → 200 + ingestBodyCompositionCreated called', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({
      type: 'body_composition.created',
      data: BODY_COMP_DATA,
    });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);
    expect(ingestMocks.ingestBodyCompositionCreated).toHaveBeenCalled();
  });
});

// ===========================================================================
// 5. Unknown event type — forward-compat
// ===========================================================================

describe('Svix webhook receiver — unknown event types', () => {
  it('unknown event type → 200 ignored:true', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({
      type: 'heart_rate.created',
      data: { user_id: 'user-A' },
    });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, ignored: true });
    // No ingest called
    expect(ingestMocks.ingestWorkoutCreated).not.toHaveBeenCalled();
    expect(ingestMocks.ingestSleepCreated).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 6. Schema mismatch — Zod safeParse failure → 200 schema_mismatch
// ===========================================================================

describe('Svix webhook receiver — per-event-type schema validation', () => {
  it('workout.created with missing required fields → 200 schema_mismatch:true (no retry)', async () => {
    const app = await makeTestApp();
    // Missing required fields like `id`, `user_id`, `start_time`
    const { body, headers } = signEnvelope({
      type: 'workout.created',
      data: { type: 'running' },
    });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, schema_mismatch: true });
    expect(ingestMocks.ingestWorkoutCreated).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'workout.created payload schema mismatch',
      expect.anything()
    );
  });
});

// ===========================================================================
// 7. Bad signature → 401
// ===========================================================================

describe('Svix webhook receiver — signature verification', () => {
  it('valid envelope but tampered signature → 401, no body', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'workout.created', data: WORKOUT_DATA });
    const tamperedSig = headers['svix-signature'].replace(/.$/, 'X');

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set('svix-id', headers['svix-id'])
      .set('svix-timestamp', headers['svix-timestamp'])
      .set('svix-signature', tamperedSig)
      .send(body);

    expect(res.status).toBe(401);
    expect(ingestMocks.ingestWorkoutCreated).not.toHaveBeenCalled();
  });

  it('tampered body (signature was over original) → 401', async () => {
    const app = await makeTestApp();
    const { body: original, headers } = signEnvelope({
      type: 'workout.created',
      data: WORKOUT_DATA,
    });
    // Tamper the body — same signature won't validate
    const tamperedBody = original.replace('user-A', 'user-attacker');
    expect(tamperedBody).not.toBe(original);

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(tamperedBody);

    expect(res.status).toBe(401);
    expect(ingestMocks.ingestWorkoutCreated).not.toHaveBeenCalled();
  });

  it('missing svix headers entirely → 401', async () => {
    const app = await makeTestApp();
    const { body } = signEnvelope({ type: 'workout.created', data: WORKOUT_DATA });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// 8. Stale timestamp — svix enforces 5-minute window inside .verify()
// ===========================================================================

describe('Svix webhook receiver — replay defense (timestamp window)', () => {
  it('stale timestamp (now - 10min) → 401 (svix.verify rejects)', async () => {
    const app = await makeTestApp();
    const body = JSON.stringify({ type: 'workout.created', data: WORKOUT_DATA });
    const wh = new Webhook(SECRET);
    const staleTs = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const svixId = 'msg-stale';
    const sig = wh.sign(svixId, staleTs, body);

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set('svix-id', svixId)
      .set('svix-timestamp', String(Math.floor(staleTs.getTime() / 1000)))
      .set('svix-signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(ingestMocks.ingestWorkoutCreated).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 9. Idempotency dedup on svix-id
// ===========================================================================

describe('Svix webhook receiver — idempotency dedup on svix-id', () => {
  it('same svix-id twice → second call returns deduped:true; ingest fires once', async () => {
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'workout.created', data: WORKOUT_DATA });

    const r1 = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);
    expect(r1.status).toBe(200);
    expect(r1.body).toEqual({ ok: true });

    const r2 = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);
    expect(r2.status).toBe(200);
    expect(r2.body).toEqual({ ok: true, deduped: true });

    expect(ingestMocks.ingestWorkoutCreated).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 10. Ingest throws → 500 (Svix retries)
// ===========================================================================

describe('Svix webhook receiver — ingest failure', () => {
  it('ingest function throws → 500 (Svix will retry)', async () => {
    ingestMocks.ingestWorkoutCreated.mockRejectedValueOnce(new Error('db crashed'));
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'workout.created', data: WORKOUT_DATA });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(500);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'webhook ingest failed',
      expect.objectContaining({ err: expect.stringContaining('db crashed') })
    );
  });
});

// ===========================================================================
// 11. Missing OPEN_WEARABLES_WEBHOOK_SECRET → throws (fail-fast)
// ===========================================================================

describe('Svix webhook receiver — missing secret', () => {
  it('OPEN_WEARABLES_WEBHOOK_SECRET unset → 401 (Webhook ctor throws inside getWebhook)', async () => {
    delete process.env.OPEN_WEARABLES_WEBHOOK_SECRET;
    const app = await makeTestApp();
    const body = JSON.stringify({ type: 'workout.created', data: WORKOUT_DATA });

    // No real signing — but the secret-missing branch trips before signature.
    // The route's try/catch around getWebhook() + verify catches the throw and
    // returns 401 with no body.
    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set('svix-id', 'x')
      .set('svix-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('svix-signature', 'v1,whatever')
      .send(body);

    expect(res.status).toBe(401);
  });
});
