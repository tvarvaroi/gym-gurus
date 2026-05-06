/**
 * Open Wearables Client — Sprint 4 BATCH 2
 *
 * Thin HTTP client for our self-hosted Open Wearables service. The service
 * owns OAuth flows with the 5 providers (Whoop, Oura, Garmin, Strava,
 * Withings); we call its internal API to:
 *   - request a connect URL  (GET    /connect/<provider>?user_id=<gymgurus_user_id>)
 *   - poll connection status (GET    /connections/<provider>/<gymgurus_user_id>)
 *   - request a manual sync  (POST   /sync/<provider>/<gymgurus_user_id>)
 *   - revoke a connection    (DELETE /connections/<provider>/<gymgurus_user_id>)
 *
 * Auth: bearer token shared between this service and Open Wearables, env var
 * OPEN_WEARABLES_INTERNAL_TOKEN. Open Wearables' webhook signing key is
 * SEPARATE — see middleware/verifyWearableSignature.ts.
 *
 * Failure model: when Open Wearables returns non-2xx, we LOG (with truncated
 * body) then THROW. Do not silently return defaults — the caller must decide
 * how to surface the failure to the user.
 */
import { logger } from '../logger';

function getBaseUrl(): string {
  return process.env.OPEN_WEARABLES_BASE_URL ?? '';
}

function getToken(): string {
  return process.env.OPEN_WEARABLES_INTERNAL_TOKEN ?? '';
}

function assertConfigured(): void {
  if (!getBaseUrl() || !getToken()) {
    throw new Error('OPEN_WEARABLES_BASE_URL + OPEN_WEARABLES_INTERNAL_TOKEN must be set');
  }
}

// Minimal structural fetch init — avoids depending on the DOM-typed global
// `RequestInit` (which the server-side ESLint config flags via no-undef).
type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function call<T = unknown>(path: string, init: FetchInit = {}): Promise<T> {
  assertConfigured();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error('Open Wearables API call failed', {
      path,
      status: res.status,
      body: body.slice(0, 500),
    });
    throw new Error(`Open Wearables API ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/**
 * Request a provider OAuth connect URL from Open Wearables. The returned URL
 * is what the user is redirected to in their browser to authorize the
 * provider. `state` is provider-side correlation handled by Open Wearables.
 */
export async function requestConnectUrl(
  provider: string,
  userId: string
): Promise<{ connectUrl: string; state: string }> {
  return call(`/connect/${provider}?user_id=${encodeURIComponent(userId)}`);
}

/**
 * Poll the current connection status for a (provider, user) pair on the
 * Open Wearables side. Returns whether the OAuth flow completed and what
 * capabilities the provider granted (e.g. ['sleep', 'hrv', 'activity']).
 */
export async function getConnectionStatus(
  provider: string,
  userId: string
): Promise<{
  connected: boolean;
  providerUserId?: string;
  capabilities?: string[];
}> {
  return call(`/connections/${provider}/${encodeURIComponent(userId)}`);
}

/**
 * Trigger a manual sync on the Open Wearables side. Open Wearables will
 * fetch any new data from the provider and POST webhooks to us as it lands.
 * Returns immediately — the actual ingest is async.
 */
export async function triggerSync(provider: string, userId: string): Promise<{ ok: boolean }> {
  return call(`/sync/${provider}/${encodeURIComponent(userId)}`, { method: 'POST' });
}

/**
 * Revoke the (provider, user) connection on the Open Wearables side. After
 * this, the provider will no longer accept refresh-token exchanges for this
 * user. The local wearable_connections row should be marked disconnected
 * separately by the caller (so the local row stays correct even if Open
 * Wearables itself is unreachable at revoke-time).
 */
export async function revokeConnection(provider: string, userId: string): Promise<{ ok: boolean }> {
  return call(`/connections/${provider}/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}
