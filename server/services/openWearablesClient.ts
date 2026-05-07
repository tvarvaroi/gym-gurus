/**
 * Open Wearables Client — Sprint 4 BATCH 5a (rewrite — corrected auth + URL paths)
 *
 * Thin HTTP client for our self-hosted Open Wearables service. Open Wearables
 * owns OAuth flows with the providers (Garmin, Polar, Suunto in α — Whoop +
 * Oura deferred per the α pivot decision); GymGurus calls its v1 API to
 * trigger syncs, list connections, and revoke users.
 *
 * Auth model — TWO MODES (spike-confirmed lock):
 *
 *   Primary (production): API key from OW's developer-portal Credentials tab.
 *     Sent on the custom header `X-Open-Wearables-API-Key: <api-key>`.
 *     Format: `sk-<32-hex>` per backend/app/services/api_key_service.py:
 *     _generate_key_value. Enforced by FastAPI's `ApiKeyDep` dependency on
 *     ~all v1 routes (e.g. backend/app/api/routes/v1/connections.py).
 *     `OPEN_WEARABLES_AUTH_MODE=api_key` (default).
 *
 *   Fallback (defense-in-depth): JWT bearer via POST /api/v1/auth/login.
 *     Cached in memory, refreshed on expiry. NOT the production runtime path.
 *     `OPEN_WEARABLES_AUTH_MODE=jwt`. Reserved for routes (if any are
 *     discovered post-spike) NOT covered by ApiKeyDep.
 *
 * The header decision matters: ALL outbound calls must spread the
 * authHeaders() return value into request headers. Hardcoding
 * `Authorization: Bearer <api-key>` would be silently rejected by OW's
 * ApiKeyDep dependency — that's the spike-corrected mistake that BATCH 2
 * carried.
 *
 * URL paths — corrected to match OW upstream's v1 API:
 *
 *   POST   /api/v1/users                                          createUser
 *   GET    /api/v1/users/{ow_user_id}/connections                 getConnections
 *   POST   /api/v1/providers/{provider}/users/{ow_user_id}/sync   triggerSync
 *   DELETE /api/v1/providers/{provider}/users/{ow_user_id}        disconnectProvider
 *   POST   /api/v1/webhooks/endpoints                             registerWebhookEndpoint
 *
 *   Legacy preserved (for OAuth UX in wearableConnections.ts callers):
 *   GET    /api/v1/providers/{provider}/connect?user_id=...       requestConnectUrl
 *   GET    /api/v1/providers/{provider}/users/{ow_user_id}        getConnectionStatus
 *
 *   The legacy path strings differ from BATCH 2 (which used `/connect/{provider}`,
 *   `/connections/{provider}/{user_id}`, etc.) — those were placeholders. The
 *   BATCH 5a paths align with OW's actual route structure. Note: the spike
 *   may refine these once we verify against live OW; capture deviations there.
 *
 * OW user ID bridge — Path B locked at Q2 spike close (2026-05-07):
 *
 *   OW's `external_user_id` field is officially deprecated (Pydantic
 *   `deprecated=True`) and accepted only as a filter on `GET /users` — not
 *   on any data-fetching endpoint. Per OW's integration guide we MUST store
 *   the OW UUID returned by POST /users in our DB. This is Path B.
 *
 *   `createUser({external_user_id: <our user UUID>})` accepts the field as a
 *   debug-convenience (operators can find a Disciple in the OW portal by
 *   our internal UUID). It is NOT a runtime lookup mechanism; the response
 *   `id` (OW's UUID) MUST be persisted to
 *   `wearable_connections.open_wearables_user_id` (migration 015).
 *
 *   All data-fetching client methods (`getConnections`, `triggerSync`,
 *   `disconnectProvider`) take `owUserId` (OW's UUID) as their input. The
 *   caller resolves OW's UUID via the persisted column.
 *
 *   See `_brain/notes/decisions.md` "Sprint 4 BATCH 5 spike findings —
 *   Q2 LOCKED Path B" for full rationale.
 *
 * Failure model: when OW returns non-2xx, we LOG (with truncated body) then
 * THROW. Do not silently return defaults — the caller decides how to surface
 * the failure to the user.
 */
import { logger } from '../logger';

function getBaseUrl(): string {
  return process.env.OPEN_WEARABLES_BASE_URL ?? '';
}

function getApiKey(): string {
  return process.env.OPEN_WEARABLES_API_KEY ?? '';
}

function getAuthMode(): 'api_key' | 'jwt' {
  const m = process.env.OPEN_WEARABLES_AUTH_MODE;
  return m === 'jwt' ? 'jwt' : 'api_key';
}

function assertConfigured(): void {
  if (!getBaseUrl()) {
    throw new Error('OPEN_WEARABLES_BASE_URL must be set');
  }
  if (getAuthMode() === 'api_key' && !getApiKey()) {
    throw new Error('OPEN_WEARABLES_API_KEY required when OPEN_WEARABLES_AUTH_MODE=api_key');
  }
}

// Minimal structural fetch init — avoids depending on the DOM-typed global
// `RequestInit` (which the server-side ESLint config flags via no-undef).
type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

// ─── JWT cache (only used when OPEN_WEARABLES_AUTH_MODE=jwt) ────────────────
// In-process cache. Refresh on expiry (10s safety window before exp). The JWT
// fallback path is NOT the production runtime mode — kept here for any future
// route NOT covered by ApiKeyDep.

interface JwtState {
  token: string;
  expiresAt: number; // ms epoch
}
let _jwtCache: JwtState | null = null;

async function getOrRefreshJwt(): Promise<string> {
  const now = Date.now();
  if (_jwtCache && _jwtCache.expiresAt > now + 10_000) {
    return _jwtCache.token;
  }
  const email = process.env.OPEN_WEARABLES_ADMIN_EMAIL ?? '';
  const password = process.env.OPEN_WEARABLES_ADMIN_PASSWORD ?? '';
  if (!email || !password) {
    throw new Error(
      'OPEN_WEARABLES_ADMIN_EMAIL + OPEN_WEARABLES_ADMIN_PASSWORD required when OPEN_WEARABLES_AUTH_MODE=jwt'
    );
  }
  const res = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Open Wearables JWT login failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string; token?: string; expires_in?: number };
  const token = json.access_token ?? json.token ?? '';
  if (!token) {
    throw new Error('Open Wearables JWT login response missing access_token');
  }
  // expires_in is seconds-from-now per OAuth conventions; default 1h if absent.
  const ttlSec = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  _jwtCache = { token, expiresAt: now + ttlSec * 1000 };
  return token;
}

/**
 * Returns a headers object (NOT a single Authorization-header string), because
 * OW's API-key path uses a custom header `X-Open-Wearables-API-Key`, not the
 * standard Authorization-Bearer scheme. Spike-confirmed via OW source —
 * backend/app/services/api_key_service.py + ApiKeyDep dependency.
 *
 * Every outbound `fetch` MUST spread this into the request headers object.
 */
async function authHeaders(): Promise<Record<string, string>> {
  if (getAuthMode() === 'api_key') {
    return { 'X-Open-Wearables-API-Key': getApiKey() };
  }
  // JWT path
  const jwt = await getOrRefreshJwt();
  return { Authorization: `Bearer ${jwt}` };
}

// ─── Test-only helpers ──────────────────────────────────────────────────────
// Reset cached JWT between tests. Production code never calls this.
export function __resetAuthState(): void {
  _jwtCache = null;
}

// ─── HTTP wrapper ───────────────────────────────────────────────────────────

async function call<T = unknown>(path: string, init: FetchInit = {}): Promise<T> {
  assertConfigured();
  const baseHeaders = await authHeaders();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...baseHeaders,
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
  // Some OW endpoints return empty 204; default to {}.
  if (res.status === 204) return {} as T;
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ─── New methods (Sprint 4 BATCH 5a) ────────────────────────────────────────

/**
 * Create an OW user. Path B (locked at Q2 spike close, 2026-05-07).
 *
 * Called when a Disciple first initiates an OAuth flow. The returned `id`
 * is OW's internal UUID — it MUST be persisted to
 * `wearable_connections.open_wearables_user_id` for the bridge to function.
 *
 * `external_user_id` is set to our internal user UUID as a debug-convenience
 * (OW operators can grep a Disciple in the portal by it) but is NOT a
 * runtime lookup mechanism. The field name `external_user_id` matches OW's
 * actual User model — NOT `external_id` (the BATCH 5a misname, corrected
 * here).
 */
export async function createUser(opts: {
  external_user_id: string;
}): Promise<{ id: string; external_user_id?: string }> {
  return call('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({ external_user_id: opts.external_user_id }),
  });
}

/**
 * List all of an OW user's connections. Used by the connection-list polling
 * cron (server/jobs/wearableSyncMonitor.ts) to detect provider-side state
 * changes (expired, disconnected on OW side, error).
 *
 * Returns the OW UserConnectionWithCapabilities schema shape; we type the
 * fields we use and accept index-extras for forward compat.
 */
export interface OwUserConnection {
  id: string;
  user_id: string;
  provider: string;
  status: 'connected' | 'expired' | 'error' | 'disconnected' | string;
  last_synced_at: string | null;
  // sync_error_count is NOT exposed by current OW (spike Q6.5). The cron's
  // determineSyncErrorState abstraction handles its absence.
  [k: string]: unknown;
}

export async function getConnections(
  owUserId: string
): Promise<{ connections: OwUserConnection[] }> {
  return call(`/api/v1/users/${encodeURIComponent(owUserId)}/connections`);
}

/**
 * Trigger a manual sync on the OW side. OW will fetch any new data from the
 * provider and POST webhooks to us as it lands. Returns immediately — the
 * actual ingest is async.
 *
 * URL signature: POST /api/v1/providers/{provider}/users/{ow_user_id}/sync
 *
 * Argument: `owUserId` is OW's internal UUID (NOT our internal user UUID).
 * Callers MUST resolve our user → OW UUID via
 * `wearable_connections.open_wearables_user_id` before calling. Path B
 * (locked at Q2 spike close).
 */
export async function triggerSync(provider: string, owUserId: string): Promise<{ ok: boolean }> {
  return call(
    `/api/v1/providers/${encodeURIComponent(provider)}/users/${encodeURIComponent(owUserId)}/sync`,
    { method: 'POST' }
  );
}

/**
 * Disconnect a provider for an OW user. Called best-effort during user-
 * initiated disconnect (the local wearable_connections row is updated
 * separately so local state stays correct even if OW is unreachable).
 *
 * URL signature: DELETE /api/v1/providers/{provider}/users/{ow_user_id}
 */
export async function disconnectProvider(
  provider: string,
  owUserId: string
): Promise<{ ok: boolean }> {
  return call(
    `/api/v1/providers/${encodeURIComponent(provider)}/users/${encodeURIComponent(owUserId)}`,
    { method: 'DELETE' }
  );
}

/**
 * Register GymGurus's webhook endpoint with OW. Called once at deploy time
 * (typically by a one-shot script in BATCH 5b, not at runtime). OW returns
 * an `ep_` id and a `whsec_` per-endpoint signing secret that we store as
 * OPEN_WEARABLES_WEBHOOK_SECRET.
 *
 * URL signature: POST /api/v1/webhooks/endpoints
 *
 * `filter_types`: subscribe to specific event types. v1 list:
 *   ['workout.created', 'sleep.created', 'connection.created', 'body_composition.created']
 */
export async function registerWebhookEndpoint(opts: {
  url: string;
  filter_types: string[];
}): Promise<{ id: string; secret?: string }> {
  return call('/api/v1/webhooks/endpoints', {
    method: 'POST',
    body: JSON.stringify({ url: opts.url, filter_types: opts.filter_types }),
  });
}

// ─── Legacy methods (preserved for wearableConnections OAuth callers) ──────
// These pre-date BATCH 5a but stay for the OAuth UX path. The caller signature
// stays the same; only the internal URL path is corrected to match OW v1.

/**
 * Request a provider OAuth connect URL from OW. The returned URL is what the
 * user is redirected to in their browser to authorize the provider.
 *
 * Spike target: confirm OW exposes a "connect URL" endpoint (vs requiring
 * the consumer to construct OAuth URLs directly with provider redirects). If
 * not, this function migrates to the createUser + provider-init flow.
 */
export async function requestConnectUrl(
  provider: string,
  userId: string
): Promise<{ connectUrl: string; state: string }> {
  return call(
    `/api/v1/providers/${encodeURIComponent(provider)}/connect?user_id=${encodeURIComponent(userId)}`
  );
}

/**
 * Poll the current connection status for a (provider, user) pair on the OW
 * side. Returns whether the OAuth flow completed and what capabilities the
 * provider granted (e.g. ['sleep', 'hrv', 'activity']).
 */
export async function getConnectionStatus(
  provider: string,
  userId: string
): Promise<{
  connected: boolean;
  providerUserId?: string;
  capabilities?: string[];
}> {
  return call(
    `/api/v1/providers/${encodeURIComponent(provider)}/users/${encodeURIComponent(userId)}`
  );
}

/**
 * Revoke the (provider, user) connection on the OW side. Wraps
 * disconnectProvider to preserve the existing wearableConnections caller
 * signature; new code should call disconnectProvider directly.
 */
export async function revokeConnection(provider: string, userId: string): Promise<{ ok: boolean }> {
  return disconnectProvider(provider, userId);
}
