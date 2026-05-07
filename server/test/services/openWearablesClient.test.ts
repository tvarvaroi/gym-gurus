/**
 * Open Wearables Client Tests — Sprint 4 BATCH 5a
 *
 * Coverage of the dual auth-mode + 5 new methods + 3 legacy methods:
 *
 *   1. api_key mode → outbound request carries `X-Open-Wearables-API-Key` header
 *      (NOT `Authorization: Bearer`). MUTATION TARGET: hardcoding Bearer breaks this.
 *   2. jwt mode → POST /api/v1/auth/login first, then `Authorization: Bearer <token>`
 *      on the actual call. Cached: second call within ttl skips re-login.
 *   3. createUser → POST /api/v1/users with {external_id} body
 *   4. getConnections → GET /api/v1/users/{ow_user_id}/connections, returns
 *      {connections: [...]}
 *   5. triggerSync → POST /api/v1/providers/{provider}/users/{ow_user_id}/sync
 *   6. disconnectProvider → DELETE /api/v1/providers/{provider}/users/{ow_user_id}
 *   7. registerWebhookEndpoint → POST /api/v1/webhooks/endpoints with filter_types
 *   8. revokeConnection → wraps disconnectProvider (legacy compat)
 *   9. getConnectionStatus → GET /api/v1/providers/{provider}/users/{user_id}
 *  10. Non-2xx response → throws (caller decides surface)
 *  11. Missing OPEN_WEARABLES_API_KEY in api_key mode → throws on call
 *  12. Missing OPEN_WEARABLES_BASE_URL → throws on call
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
  log: vi.fn(),
}));

import {
  createUser,
  getConnections,
  triggerSync,
  disconnectProvider,
  registerWebhookEndpoint,
  revokeConnection,
  getConnectionStatus,
  requestConnectUrl,
  __resetAuthState,
} from '../../services/openWearablesClient';

// Capture fetch calls for inspection
let fetchSpy: ReturnType<typeof vi.fn>;

function mockFetchOk(payload: unknown, status = 200) {
  fetchSpy.mockResolvedValueOnce({
    ok: true,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });
}

function mockFetchFail(status = 500, body = 'oops') {
  fetchSpy.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
    json: async () => ({}),
  });
}

beforeEach(() => {
  fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  __resetAuthState();
  process.env.OPEN_WEARABLES_BASE_URL = 'https://ow.example.test';
  process.env.OPEN_WEARABLES_API_KEY = 'sk-test-32-hex';
  delete process.env.OPEN_WEARABLES_AUTH_MODE;
  delete process.env.OPEN_WEARABLES_ADMIN_EMAIL;
  delete process.env.OPEN_WEARABLES_ADMIN_PASSWORD;
});

afterEach(() => {
  delete process.env.OPEN_WEARABLES_BASE_URL;
  delete process.env.OPEN_WEARABLES_API_KEY;
  delete process.env.OPEN_WEARABLES_AUTH_MODE;
  delete process.env.OPEN_WEARABLES_ADMIN_EMAIL;
  delete process.env.OPEN_WEARABLES_ADMIN_PASSWORD;
});

// ===========================================================================
// 1. api_key mode → custom header, NOT Authorization: Bearer
// ===========================================================================

describe('Open Wearables auth — api_key mode (default)', () => {
  it('outbound request carries X-Open-Wearables-API-Key header (NOT Authorization)', async () => {
    mockFetchOk({ ok: true });

    await triggerSync('garmin', 'user-A');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0]!;
    const init = call[1] as { headers?: Record<string, string> };
    expect(init.headers).toMatchObject({
      'X-Open-Wearables-API-Key': 'sk-test-32-hex',
    });
    // Critical: must NOT have Authorization: Bearer
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('explicit OPEN_WEARABLES_AUTH_MODE=api_key uses custom header', async () => {
    process.env.OPEN_WEARABLES_AUTH_MODE = 'api_key';
    mockFetchOk({ ok: true });

    await triggerSync('garmin', 'user-A');

    const init = fetchSpy.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(init.headers['X-Open-Wearables-API-Key']).toBe('sk-test-32-hex');
  });
});

// ===========================================================================
// 2. jwt mode → POST /auth/login first, then Authorization: Bearer
// ===========================================================================

describe('Open Wearables auth — jwt mode (fallback)', () => {
  beforeEach(() => {
    process.env.OPEN_WEARABLES_AUTH_MODE = 'jwt';
    process.env.OPEN_WEARABLES_ADMIN_EMAIL = 'admin@test';
    process.env.OPEN_WEARABLES_ADMIN_PASSWORD = 'pw';
  });

  it('first call posts to /auth/login then carries Authorization: Bearer on the actual call', async () => {
    // 1st fetch: login response
    mockFetchOk({ access_token: 'jwt-abc123', expires_in: 3600 });
    // 2nd fetch: the triggerSync call itself
    mockFetchOk({ ok: true });

    await triggerSync('garmin', 'user-A');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const loginCall = fetchSpy.mock.calls[0]!;
    expect(loginCall[0]).toContain('/api/v1/auth/login');

    const apiCall = fetchSpy.mock.calls[1]!;
    const init = apiCall[1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer jwt-abc123');
    // Critical: must NOT have X-Open-Wearables-API-Key in jwt mode
    expect(init.headers['X-Open-Wearables-API-Key']).toBeUndefined();
  });

  it('cached jwt: second call within ttl skips re-login', async () => {
    mockFetchOk({ access_token: 'jwt-cached', expires_in: 3600 });
    mockFetchOk({ ok: true }); // first triggerSync call
    mockFetchOk({ ok: true }); // second triggerSync call

    await triggerSync('garmin', 'user-A');
    await triggerSync('garmin', 'user-A');

    // Only 3 fetch calls total (1 login + 2 syncs), NOT 4 (would be if re-login happened)
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

// ===========================================================================
// 3-9. New + legacy methods — URL paths + body shapes
// ===========================================================================

describe('OpenWearablesClient — method URL/body shape', () => {
  it('createUser POST /api/v1/users with {external_id} body', async () => {
    mockFetchOk({ id: 'ow-uuid', external_id: 'gg-uuid' });

    await createUser({ external_id: 'gg-uuid' });

    const [url, init] = fetchSpy.mock.calls[0]! as [string, { method?: string; body?: string }];
    expect(url).toBe('https://ow.example.test/api/v1/users');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body!)).toEqual({ external_id: 'gg-uuid' });
  });

  it('getConnections GET /api/v1/users/{ow_user_id}/connections', async () => {
    mockFetchOk({ connections: [{ id: 'c1', provider: 'garmin', status: 'connected' }] });

    const r = await getConnections('ow-uuid');

    expect(r.connections).toHaveLength(1);
    const [url, init] = fetchSpy.mock.calls[0]! as [string, { method?: string }];
    expect(url).toBe('https://ow.example.test/api/v1/users/ow-uuid/connections');
    // GET — no method specified means default GET
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('triggerSync POST /api/v1/providers/{provider}/users/{ow_user_id}/sync', async () => {
    mockFetchOk({ ok: true });

    await triggerSync('garmin', 'ow-uuid');

    const [url, init] = fetchSpy.mock.calls[0]! as [string, { method?: string }];
    expect(url).toBe('https://ow.example.test/api/v1/providers/garmin/users/ow-uuid/sync');
    expect(init.method).toBe('POST');
  });

  it('disconnectProvider DELETE /api/v1/providers/{provider}/users/{ow_user_id}', async () => {
    mockFetchOk({ ok: true });

    await disconnectProvider('garmin', 'ow-uuid');

    const [url, init] = fetchSpy.mock.calls[0]! as [string, { method?: string }];
    expect(url).toBe('https://ow.example.test/api/v1/providers/garmin/users/ow-uuid');
    expect(init.method).toBe('DELETE');
  });

  it('registerWebhookEndpoint POST /api/v1/webhooks/endpoints with filter_types', async () => {
    mockFetchOk({ id: 'ep_abc', secret: 'whsec_xyz' });

    await registerWebhookEndpoint({
      url: 'https://gym-gurus.test/webhooks/wearables',
      filter_types: ['workout.created', 'sleep.created'],
    });

    const [url, init] = fetchSpy.mock.calls[0]! as [string, { method?: string; body?: string }];
    expect(url).toBe('https://ow.example.test/api/v1/webhooks/endpoints');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body!)).toEqual({
      url: 'https://gym-gurus.test/webhooks/wearables',
      filter_types: ['workout.created', 'sleep.created'],
    });
  });

  it('revokeConnection wraps disconnectProvider (same URL + DELETE method)', async () => {
    mockFetchOk({ ok: true });

    await revokeConnection('garmin', 'ow-uuid');

    const [url, init] = fetchSpy.mock.calls[0]! as [string, { method?: string }];
    expect(url).toBe('https://ow.example.test/api/v1/providers/garmin/users/ow-uuid');
    expect(init.method).toBe('DELETE');
  });

  it('getConnectionStatus GET /api/v1/providers/{provider}/users/{user_id}', async () => {
    mockFetchOk({ connected: true, capabilities: ['workouts', 'sleep'] });

    const r = await getConnectionStatus('garmin', 'user-A');

    expect(r.connected).toBe(true);
    const [url] = fetchSpy.mock.calls[0]! as [string];
    expect(url).toBe('https://ow.example.test/api/v1/providers/garmin/users/user-A');
  });

  it('requestConnectUrl encodes user_id query param', async () => {
    mockFetchOk({ connectUrl: 'https://garmin.example.test/oauth?...', state: 's1' });

    await requestConnectUrl('garmin', 'user with spaces');

    const [url] = fetchSpy.mock.calls[0]! as [string];
    expect(url).toBe(
      'https://ow.example.test/api/v1/providers/garmin/connect?user_id=user%20with%20spaces'
    );
  });
});

// ===========================================================================
// 10-12. Failure modes
// ===========================================================================

describe('OpenWearablesClient — failure modes', () => {
  it('non-2xx response → throws with status + truncated body', async () => {
    mockFetchFail(503, 'service unavailable');

    await expect(triggerSync('garmin', 'user-A')).rejects.toThrow(/503/);
  });

  it('OPEN_WEARABLES_API_KEY missing in api_key mode → throws on call', async () => {
    delete process.env.OPEN_WEARABLES_API_KEY;

    await expect(triggerSync('garmin', 'user-A')).rejects.toThrow(/OPEN_WEARABLES_API_KEY/);
  });

  it('OPEN_WEARABLES_BASE_URL missing → throws on call', async () => {
    delete process.env.OPEN_WEARABLES_BASE_URL;

    await expect(triggerSync('garmin', 'user-A')).rejects.toThrow(/OPEN_WEARABLES_BASE_URL/);
  });
});
