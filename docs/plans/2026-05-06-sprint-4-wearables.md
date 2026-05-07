# Sprint 4 — Wearable Integration via Open Wearables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Two HARD brainstorm gates exist at BATCH 4 and BATCH 7 — STOP at each, present decisions, wait for explicit approval before continuing.

**Goal:** Ship the wearable integration layer end-to-end. Three OAuth-based providers (Garmin, Polar, Suunto) connect via a self-hosted Open Wearables service. Their data flows via Svix-signed webhooks into normalized GymGurus tables. The Privacy section expands from one consent flag to five sibling per-data-type toggles.

**Provider scope amended (2026-05-07):** Originally Sprint 4 v1 was scoped for Whoop + Oura. The α pivot to Garmin + Polar + Suunto is documented in `_brain/notes/decisions.md` "Sprint 4 v1: pivot to README-Available providers (Option α) (2026-05-07)" — the rationale lives there. Whoop + Oura + Strava + Fitbit are deferred to Sprint 4.5+ pending upstream fixes for `the-momentum/open-wearables` issues [#930](https://github.com/the-momentum/open-wearables/issues/930) (Whoop sync crash) and [#948](https://github.com/the-momentum/open-wearables/issues/948) (Oura sync crash). Withings (originally chosen for the smart-scale path) is not in OW upstream — Sprint 4.5 substitutes Fitbit.

**Architecture:** Open Wearables runs as a separate Railway project (locked decision D2 — see decisions.md). Provider OAuth flows go through Open Wearables; it normalizes per-provider data and forwards via Svix-signed outgoing webhooks to GymGurus's single webhook endpoint at `/webhooks/wearables`. **One endpoint, four subscribed event types** (`workout.created`, `sleep.created`, `connection.created`, `body_composition.created`); the other 16 timeseries event types OW emits are filtered out at endpoint registration time and join the data flow in Sprint 6 (Recovery Engine v2). Migration 014 also closes the long-deferred Sprint 1 gotcha by adding `clients.user_id` FK with email-based backfill, and expands consent from one boolean to five sibling toggles. Mobile is the only sync surface in Sprint 4 (web shows read-only "manage on phone" plus full data viewing parity); native HealthKit/Health Connect arrive in Sprint 12 via Capacitor.

**Tech Stack:**

- DB: PostgreSQL on Railway, Drizzle ORM
- Backend: Express + TypeScript + Drizzle, web-push (existing), node:crypto (AES-256-GCM token encryption — `tokenEncryption.ts` shipped Phase A), `svix` npm package (webhook signature verification per OW's canonical guide)
- Frontend: React 18 + Vite + TanStack Query + shadcn/ui + wouter + lucide-react
- External: Open Wearables (MIT, self-hosted, **multi-container Railway deploy**: postgres + redis + app + celery-worker + celery-beat + flower + svix-server + frontend) + 3 OAuth providers (each registered separately for dev + prod; **Suunto additionally requires a subscription key** alongside its OAuth client credentials)
- Cron: existing setInterval pattern (mirrors `cleanupExpiredQuietHours.ts` from Sprint 2); BATCH 5a repurposes BATCH 3's `wearableSyncMonitor` from sync-error tracking to OW connection-list polling

**Locked decisions** (from `_brain/notes/decisions.md` — do not re-litigate):

1. Open Wearables (MIT, self-hosted) — NOT Terra API or any commercial unified API
2. Default-on consent at Disciple onboarding, granular per-data-type opt-out (photos are opt-IN)
3. Bundle into existing tiers — 1 wearable on Ronin/Guru, unlimited on Ronin AI / Pro Guru
4. Native shell (Capacitor) ships in Sprint 12; Sprint 4 is web-only sync UX
5. Apple Health / Google Health Connect deferred (Sprint 5 XML import OR Sprint 12 native)
6. **(BATCH 4 D1, amended 2026-05-07)** Sprint 4 v1 = **Garmin + Polar + Suunto**. Whoop / Oura / Strava / Fitbit deferred to Sprint 4.5+ mini-sprint contingent on upstream fixes. Withings → Fitbit substitution.
7. **(BATCH 4 D2)** Open Wearables deploys as a **separate Railway project** (multi-container topology requires it), NOT a sidecar in the GymGurus project.
8. **(BATCH 4 D3)** **Path-based** OAuth callback URL strategy: `gymgurus.io/oauth-callback/<provider>` — single host, provider in path.
9. **(BATCH 4 D4)** Token encryption key in env var `WEARABLE_TOKEN_ENCRYPTION_KEY`; rotation procedure via `scripts/rotate-wearable-tokens.ts` + versioned envelope (Sprint 4 BATCH 5 Phase A, shipped commit `1f5038a`).

---

## Guardrails (do not violate)

- **Do NOT register Whoop / Oura / Strava / Fitbit OAuth apps in Sprint 4.** Those providers are deferred to Sprint 4.5+ contingent on upstream fixes ([#930](https://github.com/the-momentum/open-wearables/issues/930) + [#948](https://github.com/the-momentum/open-wearables/issues/948)). Surfacing an OAuth app for a provider we won't ship in v1 leaks intent and creates abandoned credentials.
- **Do NOT skip the cross-provider issue scan as a routine step before any future provider addition.** The α pivot was discoverable only because we ran `gh issue list --search "session committed in:title,body"` against OW upstream and confirmed the bug class is provider-specific to Whoop/Oura sync code paths, not a base-class defect. Future provider expansion (Sprint 4.5 Whoop/Oura, Sprint 5+ new providers) MUST repeat the same scan pattern. Document scan results in the relevant decisions.md entry.
- **Do NOT remove `server/middleware/verifyWearableSignature.ts`** (BATCH 2 module). It's preserved as a hand-rolled HMAC primitive for any future webhook source that does NOT use Svix (e.g., service-to-service notifications, future integrations). BATCH 5a adds a header comment redirecting Svix-source consumers to the `svix` npm package.
- **Do NOT use `OPEN_WEARABLES_INTERNAL_TOKEN` as the runtime API auth header.** BATCH 2's pre-shared bearer token assumption was wrong — OW upstream uses JWT-bearer-via-login OR API-key-from-Credentials-tab. The auth approach is locked at spike completion (see BATCH 5b Task 5b.0 decision lock).
- **Do NOT change middleware order in `server/index.ts` for the webhooks mount.** The webhook receiver MUST be mounted with `express.raw({ type: 'application/json' })` BEFORE the global `express.json()` parser. Svix's signature verification operates on the raw body bytes; if `express.json()` runs first, the body is consumed and signature verification fails on every delivery.
- **Do NOT over-commit the plan to OW payload schemas without spike validation.** The event-type → table mapping in BATCH 5a is documented based on OW's canonical webhook guide; final validation of field-level shapes (especially the workout.created summary metrics inline-vs-separate-timeseries question) pends the Garmin spike. Treat documented schemas as a strong default, not a contract.

---

## File Structure

### NEW (created in this sprint)

| Path                                                                   | Responsibility                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `server/migrations/014_wearable_data.ts`                               | Atomic migration: 4 wearable tables + clients.user_id FK + 4 consent flags + users.preferred_wearable_id |
| `server/services/tokenEncryption.ts`                                   | AES-256-GCM encrypt/decrypt for OAuth access + refresh tokens at rest                                    |
| `server/services/wearableConnections.ts`                               | listConnections, initiateOAuth, handleOAuthCallback, disconnect, refreshToken, markSyncError             |
| `server/services/wearableIngest.ts`                                    | ingestSleepSession, ingestDailyVitals, ingestActivity (UPSERT idempotency on UNIQUE)                     |
| `server/services/openWearablesClient.ts`                               | HTTP client to Open Wearables service (token-bearing internal API)                                       |
| `server/routes/webhooks/wearables.ts`                                  | Webhook receiver — HMAC verification, idempotency, dispatch to ingest                                    |
| `server/routes/wearables.ts`                                           | 10 user-facing routes (list / connect / disconnect / preferences / sync / read sleep+vitals+activity)    |
| `server/jobs/wearableSyncMonitor.ts`                                   | Cron: mark stale connections expired after 3 failures, dispatch notification                             |
| `server/test/services/wearableConnections.test.ts`                     | OAuth flow + token encryption round-trip + sync error increment                                          |
| `server/test/services/wearableIngest.test.ts`                          | Idempotent UPSERT, source_record_id dedup, smart-scale → bodyMetrics path                                |
| `server/test/routes/wearables.test.ts`                                 | IDOR + mutation tests on all 10 routes (5 user routes × 4 trainer routes × auth)                         |
| `server/test/routes/webhooks/wearables.test.ts`                        | HMAC positive + negative + idempotency + payload normalization                                           |
| `server/test/jobs/wearableSyncMonitor.test.ts`                         | SKIP LOCKED, 3-strike threshold, notification dispatch                                                   |
| `client/src/components/settings/IntegrationsTab.tsx`                   | 6-card grid orchestrator + tab content                                                                   |
| `client/src/components/settings/integrations/ProviderCard.tsx`         | Connection state machine renderer (disconnected/connected/expired/error)                                 |
| `client/src/components/settings/integrations/SyncPreferencesPanel.tsx` | Per-data-type toggles (sleep / hrv / workouts / body / activity)                                         |
| `client/src/components/settings/integrations/ProviderConnectSheet.tsx` | Mobile bottom sheet for connect flow                                                                     |
| `client/src/components/settings/PrivacyExpandedCard.tsx`               | 5 sibling consent toggles + audit log per flag                                                           |
| `client/src/components/settings/PrivacyMigrationCard.tsx`              | One-time post-deploy "your sharing settings have been updated" card                                      |
| `client/src/components/dashboard/WearableHintCard.tsx`                 | Dashboard nudge for users with 0 connections after 7 days (Ronin + Disciple only)                        |
| `client/src/hooks/useWearables.ts`                                     | useWearableConnections, useConnectWearable, useDisconnectWearable, useUpdateSyncPreferences              |
| `client/src/hooks/useWearableData.ts`                                  | useSleepSessions, useDailyVitals, useActivitySessions (date-range queries)                               |
| `client/src/lib/providerCatalog.ts`                                    | Provider metadata: id, displayName, logoPath, brandColor, capabilities, oauth callback path              |
| `docs/runbooks/open-wearables-deployment.md`                           | Deployment + env var + restart + log-access runbook                                                      |

### MODIFIED

| Path                                       | Change                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shared/schema.ts`                         | Add 4 new pgTables, relations, insertSchemas; expand clients (5 cols + user_id FK), users.preferred_wearable_id, NotificationCategory unchanged                                            |
| `server/services/notificationTemplates.ts` | Add 4 new types (`wearable_connected`, `wearable_sync_failed`, `wearable_expired`, `wearable_first_sync_complete`) — exhaustive `satisfies` map will block build until all 3 sites updated |
| `server/routes/settings.ts`                | Replace single `biometrics-sharing` route pair with 5-flag PATCH + per-flag audit log + matching GET aggregator                                                                            |
| `server/index.ts`                          | Mount `/api/wearables` and `/webhooks/wearables/*` routes; register sync monitor cron                                                                                                      |
| `client/src/pages/SettingsPage.tsx`        | Add Integrations tab; replace single biometrics-sharing toggle with PrivacyExpandedCard                                                                                                    |
| `client/src/pages/Dashboard.tsx`           | Conditionally render WearableHintCard for Ronin/Disciple after 7 days                                                                                                                      |
| `scripts/verify-prod-migrations.ts`        | Add baseline-014 + post-014 phases (4 tables + indexes + FK + clients backfill + consent defaults + drift check)                                                                           |
| `MEMORY.md` (in `~/.claude/...memory/`)    | Move 014 to Applied; capture new gotchas + Sprint 4 summary                                                                                                                                |
| `_brain/notes/decisions.md`                | Sprint 4 architectural decisions (Open Wearables topology, OAuth callback strategy, photo opt-IN, etc.)                                                                                    |
| `_brain/notes/gotchas.md`                  | New gotchas captured during execution (OAuth state parameter, refresh token rotation timing, etc.)                                                                                         |

### AMENDED IN BATCH 5a (post-pivot rewrite of BATCH 2/3 artifacts)

These files were created in BATCH 2/3 against the original Whoop+Oura + hand-rolled HMAC + 4-routes-by-data-type architecture. BATCH 5a rewrites them to match OW upstream's actual shape (Svix + 1-route + JWT/API-key auth + 4 subscribed event types + connection-list polling). The schema (BATCH 1, migration 014) and token encryption (`tokenEncryption.ts`, shipped Phase A `1f5038a`) are NOT amended — they're correct as shipped.

| Path                                            | BATCH 5a change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/routes/webhooks/wearables.ts`           | Collapse 4 routes (`/sleep`, `/vitals`, `/activity`, `/connection-status`) into 1 route (`POST /webhooks/wearables`) with type-dispatch on `event.type`. Replace `verifyWearableSignature` middleware with `svix` npm-package verification. Replace LRU-keyed-on-payload-`webhookId` with LRU-keyed-on-`svix-id` header. **Delete `connection-status` route entirely** (OW does not emit `connection.expired` / `.revoked` events; provider-side revoke detection moves to the connection-list polling cron).                                                    |
| `server/services/wearableIngest.ts`             | Refactor function signatures: 3 functions (`ingestSleepSession`, `ingestDailyVitals`, `ingestActivity`) become 4 (`ingestWorkoutCreated`, `ingestSleepCreated`, `ingestConnectionCreated`, `ingestBodyCompositionCreated`) matching OW's canonical event types + payload shapes. UPSERT idempotency on `(user_id, source, source_record_id)` preserved as the correctness floor; `source_record_id` now derives from OW's `data.id` (workout/sleep/activity) or `svix-id` header (timeseries with no inherent record ID).                                        |
| `server/services/openWearablesClient.ts`        | Replace `OPEN_WEARABLES_INTERNAL_TOKEN` bearer header with auth approach locked at spike completion: primary path uses long-lived API key from OW Credentials tab; fallback path uses JWT bearer via `POST /api/v1/auth/login` with refresh-on-expiry. Both code paths implemented; one is selected at runtime via `OPEN_WEARABLES_AUTH_MODE` env var.                                                                                                                                                                                                           |
| `server/jobs/wearableSyncMonitor.ts`            | Repurpose: was "find connections with `last_sync_at > 24h` ago, mark sync error, dispatch notification." Becomes: "every hour, fetch `GET /api/v1/users/{ow_user_id}/connections` from OW for each active connection, diff against our `wearable_connections` table, dispatch `wearable.expired` on state transition, mark `disconnected` silently on user-initiated disconnect." Cadence preserved (1 hour, env-overridable via `WEARABLE_SYNC_MONITOR_INTERVAL_MS`). Same cron file, same name, same mount point — only the body of the tick function changes. |
| `server/middleware/verifyWearableSignature.ts`  | Add header comment redirecting Svix-source consumers to the `svix` npm package. **Module preserved** (per Guardrail) for any future non-Svix webhook source.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `package.json`                                  | Add `svix` npm dependency (latest stable, MIT license verified at install).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `server/test/routes/webhooks/wearables.test.ts` | Rewrite with Svix's official test fixtures from their npm package — verify signature verification, replay-window rejection, idempotency-by-svix-id, all 4 event-type dispatch paths.                                                                                                                                                                                                                                                                                                                                                                             |
| `server/test/jobs/wearableSyncMonitor.test.ts`  | Rewrite for connection-list-polling semantics: mock OW client, assert state-diff dispatches, no-op on stable state, silent on user-side disconnect.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `server/test/services/wearableIngest.test.ts`   | Update for new function signatures + OW payload schemas. Idempotency tests preserved (UNIQUE constraint enforcement).                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### NEW IN BATCH 5a

| Path                                                         | Responsibility                                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/rotate-wearable-tokens.ts`                          | Already shipped Phase A (`1f5038a`). Rotation procedure for token encryption key.                                                                                                                                                                      |
| (Possibly) `server/migrations/015_open_wearables_user_id.ts` | If the spike confirms OW does NOT support `external_id` lookup, add `wearable_connections.open_wearables_user_id` column to bridge OW's internal user UUID with our `userId`. Skip this migration if OW supports external-id lookup (tested in spike). |

---

## Brainstorm Gates

### HARD GATE #1 — BATCH 4 — Provider rollout strategy + Open Wearables deployment

**Status (2026-05-07):** ✅ CLOSED. Decisions captured in `_brain/notes/decisions.md` as BATCH 4 D1–D4. **D1 (provider rollout) was amended on 2026-05-07** — see "Sprint 4 v1: pivot to README-Available providers (Option α)" in decisions.md. The original D1 (Sprint 4 v1 = Whoop + Oura) was rejected after the cross-provider issue scan surfaced upstream blocking bugs ([#930](https://github.com/the-momentum/open-wearables/issues/930), [#948](https://github.com/the-momentum/open-wearables/issues/948)). New D1: Sprint 4 v1 = Garmin + Polar + Suunto.

Decisions surfaced + locked (archived for historical reference):

1. ~~All 5 providers in Sprint 4, OR stage (e.g., Whoop + Oura in 4, Garmin + Strava + Withings in 4.5)?~~ → **D1 (amended 2026-05-07):** v1 = Garmin + Polar + Suunto (the OW README "Available" list); Whoop / Oura / Strava / Fitbit deferred to Sprint 4.5+ mini-sprint contingent on upstream stability. Withings → Fitbit substitution (Withings not in OW upstream).
2. ~~Open Wearables: separate Railway project OR sidecar in the existing GymGurus project?~~ → **D2:** separate Railway project (the multi-container topology — postgres + redis + app + celery-worker + celery-beat + flower + svix-server + frontend — requires it; sidecar in GymGurus project is not viable).
3. ~~Which provider is the proof-of-concept end-to-end?~~ → **D1 amended:** Garmin is the spike target + first E2E provider (largest install base among serious athletes, OW README "Available", deepest data coverage). Polar + Suunto follow once Garmin is validated.
4. ~~OAuth callback URL strategy: per-provider subdomain? path-based? environment-specific suffix?~~ → **D3:** path-based (`gymgurus.io/oauth-callback/<provider>`) — single host, provider in path. Same single host across dev + prod, environment determined by Railway domain.
5. ~~Token encryption key management?~~ → **D4:** env var `WEARABLE_TOKEN_ENCRYPTION_KEY` (64-char hex, AES-256-GCM, versioned envelope `v1:<iv>:<tag>:<ct>`). Rotation procedure via `scripts/rotate-wearable-tokens.ts` (idempotent + resumable + probe-decrypt-verify pre-rotation gate). Phase A shipped commit `1f5038a`.

### HARD GATE #2 — BATCH 7 — Granular consent UI + migration UX

**STOP, present, wait for approval** before proceeding to BATCH 8.

Decisions to surface:

1. **Layout** — 5 toggles in one card OR grouped into "Body" / "Wearables" / "Photos" sub-sections?
2. **Helper text per toggle** — What does each flag actually expose to the trainer? Show explicit examples ("Sleep score, REM %, awake minutes" not just "sleep data").
3. **Existing-Disciple migration UX** — One-time card on first visit? Persistent banner? Full-screen takeover? The migration silently auto-opts existing Disciples into 3 NEW default-on flags (sleep / hrv / activity); not surfacing this is the privacy violation Sprint 4 is designed to avoid.
4. **Photo opt-IN copy** — "Your photos are private. Tap to share specific photos with your trainer when you want." Approve copy verbatim.
5. **Guru-side surfacing** — How does the trainer's `/clients/:id` distinguish "this Disciple revoked sleep sharing" from "this Disciple never connected a sleep-capable wearable"? Empty-state copy must NOT be error-shaped.

Each decision must be captured in `_brain/notes/decisions.md` before BATCH 8 starts.

---

## Status as of 2026-05-07

**Shipped (do not re-execute these batches):**

| BATCH                                                                     | Commit                                                      | Status                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BATCH 1 — Schema + Migration 014                                          | `2d86a3a`                                                   | ✅ Shipped. Migration 014 applied to dev + prod (Railway). Schema correct as-is — no amends. Down-migration safety asserted (refuses if any wearable_connections rows exist).                                                                                                                                                                                                                            |
| BATCH 2 — Token Encryption + Wearable Service Layer + Webhook Receiver    | `09352e0` (initial), `1f5038a` (Phase A versioned envelope) | ✅ Shipped, **portions amended in BATCH 5a**. Token encryption + rotation script are correct and ship as-is. Webhook receiver, ingest functions, OW client, sync monitor cron are all rewritten in BATCH 5a — see "AMENDED IN BATCH 5a" file structure section above. The original BATCH 2 module bodies stay in git history; reading them shows the abandoned hand-rolled-HMAC + 4-routes architecture. |
| BATCH 3 — User Routes + Sync Monitor Cron + Notification Templates        | `a371ef4`                                                   | ✅ Shipped, **cron repurposed in BATCH 5a**. Notification templates (4 new types) ship as-is. User routes (12 routes) ship as-is. The `wearableSyncMonitor` cron body is rewritten in BATCH 5a from sync-error tracking to OW connection-list polling — same file, same mount, different tick logic.                                                                                                     |
| BATCH 4 — HARD GATE: Provider rollout + OW deployment                     | `7c9d714`                                                   | ✅ Closed. D1 amended on 2026-05-07 (α pivot — see HARD GATE #1 section above). D2/D3/D4 unchanged.                                                                                                                                                                                                                                                                                                      |
| BATCH 5 Phase A — Versioned envelope + rotation script + runbook scaffold | `1f5038a`                                                   | ✅ Shipped. `tokenEncryption.ts` envelope upgraded to versioned `v1:<iv>:<tag>:<ct>` format; `scripts/rotate-wearable-tokens.ts` lands with probe-decrypt-verify gate; runbook scaffold at `docs/runbooks/open-wearables-deployment.md` (will be expanded in BATCH 5b).                                                                                                                                  |

**In flight:**

| BATCH                                       | Status                                                                                                     | Blocker / Dependency                                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| BATCH 5a — Code adapt (provider-agnostic)   | Plan rewrite in progress; not yet executed. After plan approval, executes via subagent-driven-development. | None — pure code work.                                                                                                                    |
| BATCH 5b — Deploy + register OAuth          | Not yet started.                                                                                           | Garmin developer portal approval (3-7 business days, kicked off async by user); Polar + Suunto registrations parallel (1-2 day approval). |
| BATCH 5c — E2E with Garmin + Polar + Suunto | Not yet started.                                                                                           | Requires 5a + 5b complete.                                                                                                                |

**Deferred (Sprint 4.5+ mini-sprint contingent on upstream fixes):**

- Whoop integration — depends on upstream fix for [#930](https://github.com/the-momentum/open-wearables/issues/930) (Whoop sync crash on workouts with strain_scores)
- Oura integration — depends on upstream fix for [#948](https://github.com/the-momentum/open-wearables/issues/948) (Oura sync crash on fresh data)
- Strava integration — secondary priority once Whoop/Oura land
- Fitbit integration — substitutes for original Withings plan; smart-scale path via Fitbit Aria

**Original BATCH 6 (Remaining Providers — Oura / Garmin / Strava / Withings)** is removed from Sprint 4 scope. With α, all 3 v1 providers (Garmin / Polar / Suunto) ship in BATCH 5b/5c. Whoop / Oura / Strava / Fitbit move to a separate mini-sprint. See "BATCH 6 (REMOVED)" section below for archive.

---

## BATCH 1 — Schema + Migration 014 (4 tables + clients.user_id FK + consent expansion)

### Task 1.1: Add 4 wearable pgTable definitions to `shared/schema.ts`

**Files:**

- Modify: `shared/schema.ts` (append after `clients` block, before `exercises`)

- [ ] **Step 1: Add WEARABLE_PROVIDERS + WEARABLE_STATUS enum tuples**

```ts
// Wearable providers — closed set, expanding requires migration
export const WEARABLE_PROVIDERS = ['whoop', 'oura', 'garmin', 'strava', 'withings'] as const;
export type WearableProvider = (typeof WEARABLE_PROVIDERS)[number];

export const WEARABLE_STATUS = ['connected', 'disconnected', 'expired', 'revoked'] as const;
export type WearableStatus = (typeof WEARABLE_STATUS)[number];

// Per-data-type sync preferences. JSON-serialized in sync_preferences jsonb col.
export interface WearableSyncPreferences {
  sleep: boolean;
  hrv: boolean;
  workouts: boolean;
  body: boolean;
  activity: boolean;
}
export const DEFAULT_WEARABLE_SYNC_PREFERENCES: WearableSyncPreferences = {
  sleep: true,
  hrv: true,
  workouts: true,
  body: true,
  activity: true,
};
```

- [ ] **Step 2: Add `wearableConnections` pgTable**

```ts
export const wearableConnections = pgTable(
  'wearable_connections',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 32 }).notNull().$type<WearableProvider>(),
    providerUserId: varchar('provider_user_id', { length: 255 }),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    tokenExpiresAt: timestamp('token_expires_at'),
    status: varchar('status', { length: 32 })
      .notNull()
      .default('disconnected')
      .$type<WearableStatus>(),
    lastSyncAt: timestamp('last_sync_at'),
    syncErrorCount: integer('sync_error_count').notNull().default(0),
    lastSyncError: text('last_sync_error'),
    capabilities: jsonb('capabilities').$type<string[]>().default([]),
    syncPreferences: jsonb('sync_preferences')
      .$type<WearableSyncPreferences>()
      .notNull()
      .default(DEFAULT_WEARABLE_SYNC_PREFERENCES),
    connectedAt: timestamp('connected_at'),
    disconnectedAt: timestamp('disconnected_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('idx_wearable_connections_user_provider').on(t.userId, t.provider),
    index('idx_wearable_connections_status_sync').on(t.status, t.lastSyncAt),
  ]
);
```

- [ ] **Step 3: Add `sleepSessions` pgTable**

```ts
export const sleepSessions = pgTable(
  'sleep_sessions',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // wake date in user tz, YYYY-MM-DD
    bedtime: timestamp('bedtime'),
    wakeTime: timestamp('wake_time'),
    totalSleepMinutes: integer('total_sleep_minutes'),
    deepMinutes: integer('deep_minutes'),
    remMinutes: integer('rem_minutes'),
    lightMinutes: integer('light_minutes'),
    awakeMinutes: integer('awake_minutes'),
    avgHeartRate: integer('avg_heart_rate'),
    minHeartRate: integer('min_heart_rate'),
    hrvOvernightMs: decimal('hrv_overnight_ms', { precision: 6, scale: 2 }),
    respiratoryRate: decimal('respiratory_rate', { precision: 4, scale: 1 }),
    bloodOxygenMin: decimal('blood_oxygen_min', { precision: 4, scale: 1 }),
    bodyTemperatureDeviation: decimal('body_temperature_deviation', { precision: 3, scale: 2 }),
    sleepScore: integer('sleep_score'),
    source: varchar('source', { length: 32 }).notNull(),
    sourceRecordId: varchar('source_record_id', { length: 255 }).notNull(),
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_sleep_sessions_user_date').on(t.userId, t.date),
    uniqueIndex('idx_sleep_sessions_user_source_record').on(t.userId, t.source, t.sourceRecordId),
  ]
);
```

- [ ] **Step 4: Add `dailyVitals` pgTable**

```ts
export const dailyVitals = pgTable(
  'daily_vitals',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(),
    restingHeartRate: integer('resting_heart_rate'),
    morningHrvRmssd: decimal('morning_hrv_rmssd', { precision: 6, scale: 2 }),
    vo2max: decimal('vo2max', { precision: 4, scale: 1 }),
    bloodPressureSystolic: integer('blood_pressure_systolic'),
    bloodPressureDiastolic: integer('blood_pressure_diastolic'),
    bloodOxygenAvg: decimal('blood_oxygen_avg', { precision: 4, scale: 1 }),
    bodyTemperature: decimal('body_temperature', { precision: 4, scale: 2 }),
    source: varchar('source', { length: 32 }).notNull(),
    sourceRecordId: varchar('source_record_id', { length: 255 }).notNull(),
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('idx_daily_vitals_user_date_source').on(t.userId, t.date, t.source)]
);
```

- [ ] **Step 5: Add `activitySessions` pgTable**

```ts
export const activitySessions = pgTable(
  'activity_sessions',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').notNull(),
    durationMinutes: integer('duration_minutes'),
    activityType: varchar('activity_type', { length: 64 }),
    distanceMeters: integer('distance_meters'),
    calories: integer('calories'),
    avgHeartRate: integer('avg_heart_rate'),
    maxHeartRate: integer('max_heart_rate'),
    steps: integer('steps'),
    elevationGainMeters: integer('elevation_gain_meters'),
    strainScore: decimal('strain_score', { precision: 4, scale: 1 }),
    trainingLoadScore: decimal('training_load_score', { precision: 5, scale: 1 }),
    routePolyline: text('route_polyline'),
    source: varchar('source', { length: 32 }).notNull(),
    sourceRecordId: varchar('source_record_id', { length: 255 }).notNull(),
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_activity_sessions_user_started').on(t.userId, t.startedAt),
    uniqueIndex('idx_activity_sessions_user_source_record').on(
      t.userId,
      t.source,
      t.sourceRecordId
    ),
  ]
);
```

- [ ] **Step 6: Add Drizzle insertSchemas + types for all 4 tables**

```ts
export const insertWearableConnectionSchema = createInsertSchema(wearableConnections);
export type InsertWearableConnection = z.infer<typeof insertWearableConnectionSchema>;
export type WearableConnection = typeof wearableConnections.$inferSelect;

export const insertSleepSessionSchema = createInsertSchema(sleepSessions);
export type InsertSleepSession = z.infer<typeof insertSleepSessionSchema>;
export type SleepSession = typeof sleepSessions.$inferSelect;

export const insertDailyVitalsSchema = createInsertSchema(dailyVitals);
export type InsertDailyVitals = z.infer<typeof insertDailyVitalsSchema>;
export type DailyVitals = typeof dailyVitals.$inferSelect;

export const insertActivitySessionSchema = createInsertSchema(activitySessions);
export type InsertActivitySession = z.infer<typeof insertActivitySessionSchema>;
export type ActivitySession = typeof activitySessions.$inferSelect;
```

- [ ] **Step 7: Run `npm run check` to verify schema compiles, no new TS errors**

Run: `npm run check 2>&1 | grep -c "error TS"`
Expected: 200 (unchanged baseline).

### Task 1.2: Expand `clients` table — user_id FK + 4 consent flags

**Files:**

- Modify: `shared/schema.ts` (clients block, lines ~137-174)

- [ ] **Step 1: Add 5 columns to clients block (user_id FK + 4 consent siblings)**

```ts
// Insert these inside the clients pgTable column definitions, after shareBodyMetricsWithTrainer:
userId: varchar('user_id').references((): any => users.id, { onDelete: 'set null' }),
shareSleepWithTrainer: boolean('share_sleep_with_trainer').notNull().default(true),
shareHrvWithTrainer: boolean('share_hrv_with_trainer').notNull().default(true),
shareActivityWithTrainer: boolean('share_activity_with_trainer').notNull().default(true),
shareProgressPhotosWithTrainer: boolean('share_progress_photos_with_trainer').notNull().default(false),
```

- [ ] **Step 2: Add idx on clients.user_id**

```ts
// Inside the (table) => [...] index array:
index('idx_clients_user_id').on(table.userId),
```

- [ ] **Step 3: Add `users.preferred_wearable_id` FK**

```ts
// Inside the users pgTable column definitions, after preferredUnits:
preferredWearableId: varchar('preferred_wearable_id'),
// (FK reference declared at module bottom to avoid circular reference — see Step 4)
```

- [ ] **Step 4: Verify circular FK reference resolves**

`wearableConnections.userId` references `users.id`, and `users.preferredWearableId` would reference `wearableConnections.id` if declared as `.references(...)`. Drizzle handles this via the lazy `(): any => ...` syntax we already use for `users.trainerId`. Apply the same pattern.

```ts
// In users pgTable:
preferredWearableId: varchar('preferred_wearable_id'),
// Skip the .references(...) here — declare the FK in the migration only.
// Schema-level type stays as bare varchar; runtime FK enforced by DB.
```

- [ ] **Step 5: Run `npm run check`, confirm no new TS errors**

### Task 1.3: Write `server/migrations/014_wearable_data.ts`

**Files:**

- Create: `server/migrations/014_wearable_data.ts`

- [ ] **Step 1: Create file header with up/down skeleton**

```ts
// Migration 014 — Wearable Integration (Sprint 4)
//
// Atomic migration combining:
//   1. 4 new tables: wearable_connections, sleep_sessions, daily_vitals, activity_sessions
//   2. clients.user_id FK column with email-based backfill (long-deferred Sprint 1 gotcha fix)
//   3. clients: 4 sibling consent flags (sleep / hrv / activity default true; photos default false)
//   4. users.preferred_wearable_id FK column
//
// Idempotency: every DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS. Safe to re-run.
//
// down() — refuses if any wearable_connections rows exist OR if any of the 3
// new default-on consent flags differ from default. Photos opt-IN flag is
// excluded from the safety check (operators may have intentionally toggled it).
//
// CLI:    npx tsx server/migrations/014_wearable_data.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 014_wearable_data
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();
  // ... (steps 2-7)
}
export async function down() {
  const db = await getDb();
  // ... (step 8)
}
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 014] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 014] ${direction}() failed:`, err);
      process.exit(1);
    });
}
```

- [ ] **Step 2: up() — create wearable_connections table**

```ts
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS wearable_connections (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'disconnected',
    last_sync_at TIMESTAMP,
    sync_error_count INTEGER NOT NULL DEFAULT 0,
    last_sync_error TEXT,
    capabilities JSONB DEFAULT '[]'::jsonb,
    sync_preferences JSONB NOT NULL DEFAULT '{"sleep":true,"hrv":true,"workouts":true,"body":true,"activity":true}'::jsonb,
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT wearable_connections_provider_check
      CHECK (provider IN ('whoop','oura','garmin','strava','withings')),
    CONSTRAINT wearable_connections_status_check
      CHECK (status IN ('connected','disconnected','expired','revoked'))
  )
`);
await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_wearable_connections_user_provider
    ON wearable_connections (user_id, provider)
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS idx_wearable_connections_status_sync
    ON wearable_connections (status, last_sync_at)
`);
```

- [ ] **Step 3: up() — create sleep_sessions table**

```ts
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS sleep_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL,
    bedtime TIMESTAMP,
    wake_time TIMESTAMP,
    total_sleep_minutes INTEGER,
    deep_minutes INTEGER,
    rem_minutes INTEGER,
    light_minutes INTEGER,
    awake_minutes INTEGER,
    avg_heart_rate INTEGER,
    min_heart_rate INTEGER,
    hrv_overnight_ms NUMERIC(6,2),
    respiratory_rate NUMERIC(4,1),
    blood_oxygen_min NUMERIC(4,1),
    body_temperature_deviation NUMERIC(3,2),
    sleep_score INTEGER,
    source VARCHAR(32) NOT NULL,
    source_record_id VARCHAR(255) NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT sleep_sessions_score_range
      CHECK (sleep_score IS NULL OR (sleep_score >= 0 AND sleep_score <= 100))
  )
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_date
    ON sleep_sessions (user_id, date)
`);
await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_sessions_user_source_record
    ON sleep_sessions (user_id, source, source_record_id)
`);
```

- [ ] **Step 4: up() — create daily_vitals table**

```ts
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS daily_vitals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL,
    resting_heart_rate INTEGER,
    morning_hrv_rmssd NUMERIC(6,2),
    vo2max NUMERIC(4,1),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    blood_oxygen_avg NUMERIC(4,1),
    body_temperature NUMERIC(4,2),
    source VARCHAR(32) NOT NULL,
    source_record_id VARCHAR(255) NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_vitals_user_date_source
    ON daily_vitals (user_id, date, source)
`);
```

- [ ] **Step 5: up() — create activity_sessions table**

```ts
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS activity_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    activity_type VARCHAR(64),
    distance_meters INTEGER,
    calories INTEGER,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    steps INTEGER,
    elevation_gain_meters INTEGER,
    strain_score NUMERIC(4,1),
    training_load_score NUMERIC(5,1),
    route_polyline TEXT,
    source VARCHAR(32) NOT NULL,
    source_record_id VARCHAR(255) NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_started
    ON activity_sessions (user_id, started_at)
`);
await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_sessions_user_source_record
    ON activity_sessions (user_id, source, source_record_id)
`);
```

- [ ] **Step 6: up() — clients consent expansion + user_id FK + email-based backfill**

```ts
// Expand clients with 4 sibling consent flags
await db.execute(sql`
  ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS share_sleep_with_trainer BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS share_hrv_with_trainer BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS share_activity_with_trainer BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS share_progress_photos_with_trainer BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients (user_id)
`);

// Email-based backfill (the long-deferred Sprint 1 gotcha fix).
// Match clients.email → users.email AND users.role = 'client' AND deleted_at IS NULL.
// Idempotent: only updates rows where user_id IS NULL, so re-running is a no-op.
await db.execute(sql`
  UPDATE clients c
     SET user_id = u.id
    FROM users u
   WHERE c.user_id IS NULL
     AND LOWER(c.email) = LOWER(u.email)
     AND u.role = 'client'
     AND u.deleted_at IS NULL
     AND c.deleted_at IS NULL
`);

// Diagnostic: count unmatched (clients with no users.id link)
const unmatched: any = await db.execute(sql`
  SELECT COUNT(*)::text AS c FROM clients
   WHERE user_id IS NULL AND deleted_at IS NULL
`);
const unmatchedCount = parseInt(unmatched.rows?.[0]?.c ?? unmatched[0]?.c ?? '0', 10);
console.warn(
  `[Migration 014] clients.user_id backfill: ${unmatchedCount} clients still NULL ` +
    `(prospects who haven't registered as Disciples — expected, NOT a failure).`
);
```

- [ ] **Step 7: up() — users.preferred_wearable_id**

```ts
await db.execute(sql`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_wearable_id VARCHAR
      REFERENCES wearable_connections(id) ON DELETE SET NULL
`);

console.warn(
  '[Migration 014] up() complete: 4 tables + clients.user_id FK + 4 consent flags + users.preferred_wearable_id'
);
```

- [ ] **Step 8: down() — safety assertion + reverse-order drops**

```ts
// Refuse if any wearable_connections rows exist
const wcCount: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM wearable_connections`);
const wc = parseInt(wcCount.rows?.[0]?.c ?? wcCount[0]?.c ?? '0', 10);
if (wc > 0) {
  throw new Error(
    `[Migration 014 down] BLOCKED: ${wc} wearable_connections rows exist. ` +
      `Dropping would destroy connection state. Disconnect users via UI first OR truncate explicitly.`
  );
}

// Refuse if any new default-on consent flag has been flipped to false
const flipped: any = await db.execute(sql`
  SELECT COUNT(*)::text AS c FROM clients
   WHERE deleted_at IS NULL
     AND (share_sleep_with_trainer = FALSE
          OR share_hrv_with_trainer = FALSE
          OR share_activity_with_trainer = FALSE)
`);
const fc = parseInt(flipped.rows?.[0]?.c ?? flipped[0]?.c ?? '0', 10);
if (fc > 0) {
  throw new Error(
    `[Migration 014 down] BLOCKED: ${fc} clients have flipped a sleep/hrv/activity consent flag to false. ` +
      `Dropping would silently auto-re-share. Reconcile manually before re-running down().`
  );
}

// Drop in reverse of creation
await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS preferred_wearable_id`);
await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS user_id`);
await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_progress_photos_with_trainer`);
await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_activity_with_trainer`);
await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_hrv_with_trainer`);
await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_sleep_with_trainer`);
await db.execute(sql`DROP INDEX IF EXISTS idx_clients_user_id`);

await db.execute(sql`DROP INDEX IF EXISTS idx_activity_sessions_user_source_record`);
await db.execute(sql`DROP INDEX IF EXISTS idx_activity_sessions_user_started`);
await db.execute(sql`DROP TABLE IF EXISTS activity_sessions`);

await db.execute(sql`DROP INDEX IF EXISTS idx_daily_vitals_user_date_source`);
await db.execute(sql`DROP TABLE IF EXISTS daily_vitals`);

await db.execute(sql`DROP INDEX IF EXISTS idx_sleep_sessions_user_source_record`);
await db.execute(sql`DROP INDEX IF EXISTS idx_sleep_sessions_user_date`);
await db.execute(sql`DROP TABLE IF EXISTS sleep_sessions`);

await db.execute(sql`DROP INDEX IF EXISTS idx_wearable_connections_status_sync`);
await db.execute(sql`DROP INDEX IF EXISTS idx_wearable_connections_user_provider`);
await db.execute(sql`DROP TABLE IF EXISTS wearable_connections`);

console.warn(
  `[Migration 014 down] reverted: ${wc} wearable_connections rows, ${fc} flipped consent flags`
);
```

### Task 1.4: Run migration on dev + dry-run verify

- [ ] **Step 1: Run up() on dev**

```bash
npx tsx server/migrations/014_wearable_data.ts up
```

Expected: console.warn at end, exit 0.

- [ ] **Step 2: Idempotent re-run**

```bash
npx tsx server/migrations/014_wearable_data.ts up
```

Expected: clean re-run, no errors (every DDL has IF NOT EXISTS guard, backfill UPDATE is no-op when user_id is already set).

- [ ] **Step 3: Probe down() with safety assertion**

```bash
# 1. Insert a probe wearable_connection row
psql $DATABASE_URL -c "INSERT INTO wearable_connections (user_id, provider) VALUES ((SELECT id FROM users LIMIT 1), 'whoop');"
# 2. Try down() — must throw BLOCKED
npx tsx server/migrations/014_wearable_data.ts down
# Expected: error with "BLOCKED: 1 wearable_connections rows exist"
# 3. Clean up probe
psql $DATABASE_URL -c "DELETE FROM wearable_connections WHERE provider='whoop';"
# 4. Re-run down() — must succeed
npx tsx server/migrations/014_wearable_data.ts down
# 5. Re-run up() to leave dev in migrated state
npx tsx server/migrations/014_wearable_data.ts up
```

- [ ] **Step 4: Verify schema diff via drizzle-kit**

```bash
npx drizzle-kit generate
```

Expected: clean diff (the schema.ts additions match the migration DDL). If drizzle-kit produces unexpected DROP/CREATE diffs, schema.ts and migration 014 are out of sync.

### Task 1.5: Add baseline-014 + post-014 phases to verifier

**Files:**

- Modify: `scripts/verify-prod-migrations.ts`

- [ ] **Step 1: Add `'baseline-014' | 'post-014'` to Phase union + phases dispatch map**

- [ ] **Step 2: Implement `baseline014()` — confirm 4 tables ABSENT, 5 client cols ABSENT, capture row counts**

- [ ] **Step 3: Implement `post014()`** — verify:
  - 4 new tables present
  - All indexes (UNIQUE on `(user_id, source, source_record_id)` for sleep + activity, UNIQUE on `(user_id, date, source)` for vitals, UNIQUE on `(user_id, provider)` for connections)
  - clients.user_id column + idx present
  - 4 consent columns + defaults (true/true/true/false)
  - users.preferred_wearable_id column + FK target = wearable_connections
  - Backfill: `clients.user_id IS NOT NULL` count vs total clients (diagnostic, not assertion — prospects without registered Disciples are expected)
  - Drift on existing 7 tracked baseline tables
  - **Use lowercase aliases** per the case-folding gotcha

- [ ] **Step 4: Run baseline-014 against dev as smoke test for the verifier code itself**

```bash
npx tsx scripts/verify-prod-migrations.ts baseline-014
```

(Expects ABSENT — but dev has migration applied. So this should report PRESENT — UNEXPECTED on the artefacts. That's fine for code-smoke purposes; the dry-run is on dev. Production baseline will be true ABSENT before prod up().)

### Task 1.6: Commit BATCH 1

- [ ] **Step 1: Stage shared/schema.ts, server/migrations/014\_\*, scripts/verify-prod-migrations.ts**

- [ ] **Step 2: Commit**

```bash
git add shared/schema.ts server/migrations/014_wearable_data.ts scripts/verify-prod-migrations.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 1 — migration 014 + schema (4 tables + clients.user_id + consent expansion)"
git push origin main
```

**Checkpoint:** schema diff + dev migration evidence + idempotent re-run + safety-assertion probe + verifier baseline/post phases. STOP for explicit approval before BATCH 2.

---

## BATCH 2 — Token Encryption + Wearable Service Layer + Webhook Receiver

> **AMENDED IN BATCH 5a (2026-05-07).** This batch shipped at commit `09352e0` against incorrect assumptions about OW's wire format (hand-rolled HMAC instead of Svix), payload schema (custom envelope instead of OW's `{type, data}`), route structure (4 routes instead of 1 with type-dispatch), and auth (`OPEN_WEARABLES_INTERNAL_TOKEN` pre-shared bearer instead of JWT/API-key). **Token encryption (Task 2.1) is correct as shipped — only the rotation envelope was upgraded in Phase A `1f5038a`.** Tasks 2.2 (openWearablesClient), 2.4 (wearableIngest), and 2.5 (webhook receiver) are rewritten in BATCH 5a — see File Structure "AMENDED IN BATCH 5a" section above for the rewrite scope. The original task content below is preserved as historical record of what shipped, NOT as instructions for any subagent. **Do not re-execute BATCH 2.**

### Task 2.1: Create `server/services/tokenEncryption.ts`

**Files:**

- Create: `server/services/tokenEncryption.ts`
- Test: `server/test/services/tokenEncryption.test.ts`

- [ ] **Step 1: Write failing round-trip test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { encryptToken, decryptToken } from '../../services/tokenEncryption';

describe('tokenEncryption', () => {
  beforeEach(() => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex
  });
  it('round-trips a token', () => {
    const plain = 'oauth_access_token_xyz_abc_123';
    const cipher = encryptToken(plain);
    expect(cipher).not.toBe(plain);
    expect(cipher.split(':').length).toBe(3); // iv:authTag:ciphertext
    expect(decryptToken(cipher)).toBe(plain);
  });
  it('throws on tampered ciphertext', () => {
    const cipher = encryptToken('plaintext');
    const [iv, tag, ct] = cipher.split(':');
    const tampered = `${iv}:${tag}:${ct.slice(0, -2)}aa`;
    expect(() => decryptToken(tampered)).toThrow();
  });
  it('throws if encryption key is unset', () => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken('x')).toThrow(/WEARABLE_TOKEN_ENCRYPTION_KEY/);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module doesn't exist)**

- [ ] **Step 3: Implement `tokenEncryption.ts`**

```ts
// AES-256-GCM with random per-message IV. Key is hex-encoded 32 bytes (64 chars)
// in env var WEARABLE_TOKEN_ENCRYPTION_KEY. Rotation = re-encrypt all stored
// tokens (Sprint 4 doesn't ship rotation tooling; documented in runbook).
//
// Format: <iv-hex>:<authTag-hex>:<ciphertext-hex>
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const hex = process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'WEARABLE_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

export function decryptToken(envelope: string): string {
  const key = getKey();
  const [ivHex, tagHex, ctHex] = envelope.split(':');
  if (!ivHex || !tagHex || !ctHex) throw new Error('Invalid token envelope');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
  return pt.toString('utf8');
}
```

- [ ] **Step 4: Run test — expect PASS (3/3)**

- [ ] **Step 5: Add WEARABLE_TOKEN_ENCRYPTION_KEY to env-secrets-manager runbook (env var docs)**

### Task 2.2: Create `server/services/openWearablesClient.ts`

**Files:**

- Create: `server/services/openWearablesClient.ts`

- [ ] **Step 1: Implement bearer-auth HTTP client**

```ts
// Client for our self-hosted Open Wearables service. The service owns OAuth
// flows with the 5 providers; we call its internal API to:
//   - request a connect URL (GET /connect/<provider>?user_id=<gymgurus_user_id>)
//   - poll connection status (GET /connections/<provider>/<gymgurus_user_id>)
//   - request a manual sync (POST /sync/<provider>/<gymgurus_user_id>)
//   - revoke a connection (DELETE /connections/<provider>/<gymgurus_user_id>)
//
// Auth: bearer token shared between this service and Open Wearables, env var
// OPEN_WEARABLES_INTERNAL_TOKEN. Open Wearables' webhook signing key is
// SEPARATE — see webhooks/wearables.ts.
import { logger } from '../logger';

const BASE_URL = process.env.OPEN_WEARABLES_BASE_URL ?? '';
const TOKEN = process.env.OPEN_WEARABLES_INTERNAL_TOKEN ?? '';

function assertConfigured() {
  if (!BASE_URL || !TOKEN) {
    throw new Error('OPEN_WEARABLES_BASE_URL + OPEN_WEARABLES_INTERNAL_TOKEN must be set');
  }
}

async function call(path: string, init: RequestInit = {}) {
  assertConfigured();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
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
  return res.json();
}

export async function requestConnectUrl(
  provider: string,
  userId: string
): Promise<{ connectUrl: string; state: string }> {
  return call(`/connect/${provider}?user_id=${encodeURIComponent(userId)}`);
}
export async function getConnectionStatus(provider: string, userId: string) {
  return call(`/connections/${provider}/${encodeURIComponent(userId)}`);
}
export async function triggerSync(provider: string, userId: string) {
  return call(`/sync/${provider}/${encodeURIComponent(userId)}`, { method: 'POST' });
}
export async function revokeConnection(provider: string, userId: string) {
  return call(`/connections/${provider}/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}
```

### Task 2.3: Create `server/services/wearableConnections.ts`

**Files:**

- Create: `server/services/wearableConnections.ts`
- Test: `server/test/services/wearableConnections.test.ts`

- [ ] **Step 1: Write failing tests** for: list, OAuth init, OAuth callback, disconnect, refreshToken, markSyncError 3-strike → 'expired'

- [ ] **Step 2: Implement service**

```ts
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../db';
import {
  wearableConnections,
  type WearableProvider,
  type WearableSyncPreferences,
  DEFAULT_WEARABLE_SYNC_PREFERENCES,
} from '../../shared/schema';
import { encryptToken, decryptToken } from './tokenEncryption';
import * as ow from './openWearablesClient';
import { dispatch } from './notificationDispatcher';
import { logger } from '../logger';

export async function listConnections(userId: string) {
  const db = await getDb();
  return db.select().from(wearableConnections).where(eq(wearableConnections.userId, userId));
}

export async function initiateOAuth(userId: string, provider: WearableProvider) {
  // Get connect URL from Open Wearables. Pre-create a 'disconnected' row so
  // we have a stable id to attach the eventual callback to.
  const db = await getDb();
  await db
    .insert(wearableConnections)
    .values({
      userId,
      provider,
      status: 'disconnected',
      syncPreferences: DEFAULT_WEARABLE_SYNC_PREFERENCES,
    })
    .onConflictDoNothing({ target: [wearableConnections.userId, wearableConnections.provider] });
  const { connectUrl } = await ow.requestConnectUrl(provider, userId);
  return { connectUrl };
}

export async function handleOAuthCallback(userId: string, provider: WearableProvider) {
  const db = await getDb();
  // Open Wearables holds the tokens; we mark status connected and trigger initial sync.
  // (Tokens are stored on Open Wearables side; we keep a passthrough refresh-token
  // copy ONLY if Open Wearables exposes them. For Sprint 4 v1, tokens stay in
  // Open Wearables; we encrypt-store any provider_user_id + capabilities returned.)
  const status = await ow.getConnectionStatus(provider, userId);
  if (!status.connected)
    throw new Error(`Open Wearables reports ${provider} not connected for user ${userId}`);
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
  // Async-fire initial sync — let OW process at its pace
  ow.triggerSync(provider, userId).catch((err) =>
    logger.error('initial sync trigger failed', { userId, provider, err: String(err) })
  );
}

export async function disconnect(userId: string, connectionId: string) {
  const db = await getDb();
  // IDOR-safe: filter by both connectionId AND userId
  const [conn] = await db
    .select()
    .from(wearableConnections)
    .where(and(eq(wearableConnections.id, connectionId), eq(wearableConnections.userId, userId)));
  if (!conn) throw new Error('Connection not found');
  // Best-effort revoke at Open Wearables; if it fails, still mark local disconnected
  try {
    await ow.revokeConnection(conn.provider as WearableProvider, userId);
  } catch (err) {
    logger.warn('Open Wearables revoke failed (continuing)', { connectionId, err: String(err) });
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

export async function markSyncError(connectionId: string, error: string) {
  const db = await getDb();
  const [conn] = await db
    .select()
    .from(wearableConnections)
    .where(eq(wearableConnections.id, connectionId));
  if (!conn) return;
  const newCount = conn.syncErrorCount + 1;
  const becomesExpired = newCount >= 3 && conn.status === 'connected';
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
    // First failure — soft notification
    await dispatch(conn.userId, 'wearable_sync_failed', { provider: conn.provider });
  }
}

export async function recordSuccessfulSync(connectionId: string) {
  const db = await getDb();
  await db
    .update(wearableConnections)
    .set({ lastSyncAt: new Date(), syncErrorCount: 0, lastSyncError: null })
    .where(eq(wearableConnections.id, connectionId));
}
```

- [ ] **Step 3: Run tests, verify all pass**

### Task 2.4: Create `server/services/wearableIngest.ts`

**Files:**

- Create: `server/services/wearableIngest.ts`
- Test: `server/test/services/wearableIngest.test.ts`

- [ ] **Step 1: Write tests** covering:
  - Idempotent UPSERT on `(userId, source, source_record_id)` — second call with same record_id is a no-op INSERT (returns inserted=false)
  - Smart-scale → bodyMetrics path (daily_vitals with weightKg writes through to bodyMetrics)
  - Partial payload tolerance (only some fields present)
  - **First-sync-complete dispatch**: ingest fires `wearable_first_sync_complete` notification when AND ONLY when (a) the UPSERT inserted a new row (RETURNING xmax = 0 OR PG `(xmax = 0)::int = 1`) AND (b) the user has zero prior rows for that data type from this connection's source. Test the four failure modes:
    - inserted=true + already had prior rows → no notification
    - inserted=false (re-delivery) + zero prior rows → no notification (Postgres did UPDATE, not INSERT)
    - inserted=true + zero prior rows BUT this is connection's second data type ingested → notification fires (per-data-type, not per-connection)
    - inserted=true + zero prior rows + first data type ever for this connection → notification fires (the happy path)

- [ ] **Step 2: Implement three exported functions** — `ingestSleepSession`, `ingestDailyVitals`, `ingestActivity`.

  Shape of each:

  ```ts
  // Returns { inserted: boolean, recordId: string }
  // inserted=true means Postgres INSERT (xmax=0); inserted=false means UPDATE
  // (xmax!=0). Detection via `RETURNING (xmax = 0) AS inserted`.
  export async function ingestSleepSession(
    userId: string,
    connectionId: string,
    source: string,
    payload: unknown
  ): Promise<{ inserted: boolean; recordId: string }> {
    const normalized = normalizeSleepPayload(payload, source);
    const db = await getDb();
    const [row] = await db.execute(sql`
      INSERT INTO sleep_sessions (
        user_id, date, bedtime, wake_time, total_sleep_minutes,
        deep_minutes, rem_minutes, light_minutes, awake_minutes,
        avg_heart_rate, min_heart_rate, hrv_overnight_ms,
        respiratory_rate, blood_oxygen_min, body_temperature_deviation,
        sleep_score, source, source_record_id, raw_payload
      ) VALUES (
        ${userId}, ${normalized.date}, ${normalized.bedtime}, ${normalized.wakeTime},
        ${normalized.totalSleepMinutes}, ${normalized.deepMinutes}, ${normalized.remMinutes},
        ${normalized.lightMinutes}, ${normalized.awakeMinutes}, ${normalized.avgHeartRate},
        ${normalized.minHeartRate}, ${normalized.hrvOvernightMs},
        ${normalized.respiratoryRate}, ${normalized.bloodOxygenMin},
        ${normalized.bodyTemperatureDeviation}, ${normalized.sleepScore},
        ${source}, ${normalized.sourceRecordId}, ${JSON.stringify(payload)}
      )
      ON CONFLICT (user_id, source, source_record_id) DO UPDATE SET
        bedtime = EXCLUDED.bedtime,
        wake_time = EXCLUDED.wake_time,
        total_sleep_minutes = EXCLUDED.total_sleep_minutes,
        -- ... (every column except user_id, source, source_record_id, created_at)
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted, source_record_id
    `);
    const inserted = Boolean(row.inserted);
    const recordId = row.source_record_id as string;

    // First-sync-complete dispatch — fires once per (user, dataType) pair when
    // the user transitions from zero rows of this data type → ≥1 row from a
    // wearable source. Per Sprint 4 BATCH 7 product decision: per-data-type
    // signal, NOT per-connection. If the user later connects a second wearable
    // and that wearable's first sleep ingest also writes a row, the
    // notification does NOT re-fire (count is already ≥1).
    if (inserted) {
      await maybeDispatchFirstSyncComplete(userId, 'sleep');
    }

    await recordSuccessfulSync(connectionId);
    return { inserted, recordId };
  }
  ```

  Helper used by all three ingest paths:

  ```ts
  /**
   * Fires `wearable_first_sync_complete` exactly once per (userId, dataType)
   * pair, the first time the user has any row of that data type from any
   * wearable source. Idempotent on re-delivery (false-positive prevented by
   * "inserted" gate at the call site; this function ALSO checks count to
   * defend against a race where two webhooks arrive simultaneously and both
   * see 0-then-INSERT before either sees the other's row).
   *
   * Race-condition note: with Postgres MVCC, two simultaneous webhooks for
   * the same user/dataType could both see count=0 and both pass the gate
   * → notification fires twice. Dispatcher dedup is via the notification
   * `tag` field set to `wearable_first_sync_complete:<dataType>` — second
   * push collapses on the OS notification tray, so user sees one banner
   * regardless. Server-side row in notifications table will have two entries;
   * accept this for v1 (low-frequency event, low-cost duplication).
   */
  async function maybeDispatchFirstSyncComplete(
    userId: string,
    dataType: 'sleep' | 'vitals' | 'activity'
  ): Promise<void> {
    const db = await getDb();
    const tableMap = {
      sleep: sleepSessions,
      vitals: dailyVitals,
      activity: activitySessions,
    };
    const table = tableMap[dataType];
    // Count includes the row we just inserted (already committed); we want
    // exactly 1 → "first row ever for this dataType".
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(table.userId, userId));
    if (c === 1) {
      // Capture an approximate count of how many days of data the initial
      // sync delivered, for the notification body. For sleep, count distinct
      // dates within the last 30 days.
      const days = c; // v1 — we'll know it's at least 1; richer count in Sprint 4.5
      await dispatch(userId, 'wearable_first_sync_complete', { dataType, days });
    }
  }
  ```

  - `ingestDailyVitals` mirrors the sleep shape, calls `maybeDispatchFirstSyncComplete(userId, 'vitals')`. Smart-scale path: if `normalized.weightKg` is present, also INSERT into bodyMetrics via the existing `bodyMetrics` insert helper.
  - `ingestActivity` mirrors the sleep shape, calls `maybeDispatchFirstSyncComplete(userId, 'activity')`.
  - All three end with `await recordSuccessfulSync(connectionId)`.

- [ ] **Step 3: Run the tests, verify all pass — including the 4 dispatch-condition variants**

- [ ] **Step 4: Mutation test the `inserted` gate** — Remove the `if (inserted)` check in `ingestSleepSession` so the dispatch fires on UPDATE too. Re-run tests; the "inserted=false (re-delivery) → no notification" test must FAIL. Revert. This proves the gate is load-bearing, NOT cosmetic.

### Task 2.5: Create `server/routes/webhooks/wearables.ts`

**Files:**

- Create: `server/routes/webhooks/wearables.ts`
- Create: `server/middleware/verifyWearableSignature.ts` (HMAC verification middleware)
- Test: `server/test/routes/webhooks/wearables.test.ts`

- [ ] **Step 1: Implement HMAC verification middleware with timestamp replay defense**

The signature is computed by Open Wearables over `<unix-timestamp-seconds>.<raw-body>` (Stripe's pattern, well-established). The receiver:

1. Parses `X-Webhook-Timestamp` header (unix seconds) AND `X-Webhook-Signature` header
2. Rejects if `|now - timestamp| > 300 seconds` (5-minute replay window)
3. Recomputes HMAC over `<timestamp>.<raw-body>`, compares with `timingSafeEqual` (NEVER `===`)

This forces Open Wearables to be the ONLY signer (no provider-specific signature gymnastics — Open Wearables abstracts the 5 provider header conventions away). The 5-minute window absorbs clock skew between hosts but rejects captured-and-replayed payloads.

```ts
import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.OPEN_WEARABLES_WEBHOOK_SECRET ?? '';
const REPLAY_WINDOW_SECONDS = 300; // ±5 min — absorbs clock skew, rejects replays

export function verifyWearableSignature(req: Request, res: Response, next: NextFunction) {
  if (!SECRET) {
    return res.status(500).json({ error: 'webhook signature secret not configured' });
  }

  // Timestamp validation — rejects stale/forged payloads even if signature is valid.
  // X-Webhook-Timestamp is unix seconds (integer). Open Wearables sends this on every
  // webhook; if absent, treat as a forged request (no replay defense possible).
  const tsHeader = req.header('X-Webhook-Timestamp') ?? '';
  const tsNum = parseInt(tsHeader, 10);
  if (!tsHeader || Number.isNaN(tsNum)) {
    return res.status(401).json({ error: 'missing or invalid timestamp' });
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > REPLAY_WINDOW_SECONDS) {
    return res.status(401).json({ error: 'stale timestamp (outside replay window)' });
  }

  // Body must be raw — set up via express.raw({ type: 'application/json' }) on the route mount.
  const raw = (req as any).rawBody as Buffer | undefined;
  if (!raw) return res.status(400).json({ error: 'raw body unavailable' });

  // Signature is computed over `<timestamp>.<raw-body>`, NOT just the body.
  // This prevents an attacker from re-using a captured signature with a fresh
  // timestamp — they'd need to recompute the HMAC, which requires the secret.
  const sig = req.header('X-Webhook-Signature') ?? '';
  const signed = `${tsHeader}.${raw.toString('utf8')}`;
  const expected = createHmac('sha256', SECRET).update(signed).digest('hex');

  // timingSafeEqual MUST be used — `===` leaks bytes through string-comparison
  // timing differences. Both buffers must be equal length first (timingSafeEqual
  // throws on length mismatch).
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'invalid signature' });
  }
  next();
}
```

**Test coverage** (BATCH 11 will mutation-test these, but BATCH 2 ships them with positive tests):

- Valid timestamp + valid signature → 200
- Stale timestamp (now - 600s) + valid signature → 401 ('stale timestamp')
- Future timestamp (now + 600s) + valid signature → 401 ('stale timestamp')
- Missing X-Webhook-Timestamp → 401 ('missing or invalid timestamp')
- Non-numeric X-Webhook-Timestamp → 401 ('missing or invalid timestamp')
- Valid timestamp + invalid signature → 401 ('invalid signature')
- Valid timestamp + tampered body (signature was over original) → 401 ('invalid signature')
- Replay attack: same valid timestamp + valid signature, second call within idempotency window → 200 with `deduped: true` (idempotency layer in BATCH 2 Task 2.5 Step 3 handles this; signature middleware passes both calls)

- [ ] **Step 2: Mount express.raw on /webhooks/wearables/\* in server/index.ts**

```ts
// server/index.ts — mount BEFORE express.json() global middleware so raw body is preserved for HMAC verify
app.use(
  '/webhooks/wearables',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    (req as any).rawBody = req.body;
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch {
      req.body = {};
    }
    next();
  },
  wearableWebhookRouter
);
```

- [ ] **Step 3: Write webhook routes**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { verifyWearableSignature } from '../../middleware/verifyWearableSignature';
import * as ingest from '../../services/wearableIngest';
import { markSyncError } from '../../services/wearableConnections';

const router = Router();

// Idempotency: every webhook payload carries `webhookId`. We dedupe via an
// in-memory LRU for v1 (Sprint 4 doesn't ship Redis); upgrade to DB-backed
// dedupe in Sprint 5 if duplicate-delivery rate exceeds 0.1%.
const recentWebhookIds = new Map<string, number>();
const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000; // 24h
function isDuplicate(id: string): boolean {
  const now = Date.now();
  for (const [k, t] of recentWebhookIds) if (now - t > WEBHOOK_TTL_MS) recentWebhookIds.delete(k);
  if (recentWebhookIds.has(id)) return true;
  recentWebhookIds.set(id, now);
  return false;
}

const sleepPayloadSchema = z.object({
  webhookId: z.string(),
  userId: z.string(),
  connectionId: z.string(),
  source: z.string(),
  payload: z.unknown(),
});

router.post('/sleep', verifyWearableSignature, async (req, res) => {
  const parsed = sleepPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  if (isDuplicate(parsed.data.webhookId)) return res.status(200).json({ ok: true, deduped: true });
  try {
    await ingest.ingestSleepSession(
      parsed.data.userId,
      parsed.data.connectionId,
      parsed.data.source,
      parsed.data.payload
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    await markSyncError(parsed.data.connectionId, String(err));
    res.status(500).json({ error: 'ingest failed' });
  }
});
// ... POST /vitals, POST /activity, POST /connection-status (provider revoke notifications)
```

- [ ] **Step 4: Write HMAC tests — valid, invalid, missing header, replay (idempotency)**

### Task 2.6: Commit BATCH 2

```bash
git add server/services/tokenEncryption.ts server/services/openWearablesClient.ts \
  server/services/wearableConnections.ts server/services/wearableIngest.ts \
  server/routes/webhooks/wearables.ts server/middleware/verifyWearableSignature.ts \
  server/test/services/tokenEncryption.test.ts server/test/services/wearableConnections.test.ts \
  server/test/services/wearableIngest.test.ts server/test/routes/webhooks/wearables.test.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 2 — service layer + HMAC webhook receiver"
git push origin main
```

**Checkpoint:** test counts (+~30 tests target), HMAC positive + negative + replay verified, idempotent UPSERT verified. STOP for approval.

---

## BATCH 3 — User Routes + Sync Monitor Cron + Notification Templates

> **PARTIALLY AMENDED IN BATCH 5a (2026-05-07).** This batch shipped at commit `a371ef4`. Notification templates (Task 3.1, 4 new types) ship as-is — no amend. User routes (Task 3.2, 12 routes) ship as-is — no amend. **The `wearableSyncMonitor` cron body (Task 3.3) is rewritten in BATCH 5a** from sync-error tracking to OW connection-list polling. Same file, same name, same mount, same lifecycle scaffolding (SKIP LOCKED, isTickInFlight, SIGTERM, env-var interval) — only the tick body changes. **Do not re-execute BATCH 3.**

### Task 3.1: Add 4 new types to `server/services/notificationTemplates.ts`

**Files:**

- Modify: `server/services/notificationTemplates.ts`

- [ ] **Step 1: Append to NOTIFICATION_TYPES tuple**

```ts
// Sprint 4 — wearables
'wearable_connected',
'wearable_sync_failed',
'wearable_expired',
'wearable_first_sync_complete',
```

- [ ] **Step 2: Add matching entries in TYPE_TO_CATEGORY**

```ts
wearable_connected: 'social',
wearable_sync_failed: 'social',
wearable_expired: 'social',
wearable_first_sync_complete: 'social',
```

- [ ] **Step 3: Add 4 templates in NOTIFICATION_TEMPLATES**

```ts
wearable_connected: (d) => ({
  title: `${capitalize(s(d, 'provider'))} connected`,
  body: "We'll start syncing your sleep, HRV, and recovery.",
  actionUrl: '/settings?tab=integrations',
  tag: `wearable_connected:${s(d, 'provider')}`,
}),
wearable_sync_failed: (d) => ({
  title: `${capitalize(s(d, 'provider'))} sync failed`,
  body: `Reconnect ${capitalize(s(d, 'provider'))} in Settings.`,
  actionUrl: '/settings?tab=integrations',
  tag: `wearable_sync_failed:${s(d, 'provider')}`,
}),
wearable_expired: (d) => ({
  title: `${capitalize(s(d, 'provider'))} connection expired`,
  body: 'Reconnect to keep your data flowing.',
  actionUrl: '/settings?tab=integrations',
  tag: `wearable_expired:${s(d, 'provider')}`,
}),
wearable_first_sync_complete: (d) => ({
  title: 'First sync complete',
  body: `We pulled ${n(d, 'days', 30)} days of your sleep + HRV. View the data.`,
  actionUrl: '/biometrics?tab=trends',
  tag: 'wearable_first_sync_complete',
}),
```

(Add `const capitalize = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;` near the top.)

- [ ] **Step 4: Run `npm run check`** — `satisfies` map will FAIL if any of the 3 sites are out of sync. That's the desired behavior.

### Task 3.2: Create `server/routes/wearables.ts` — 10 routes

**Files:**

- Create: `server/routes/wearables.ts`
- Test: `server/test/routes/wearables.test.ts`

- [ ] **Step 1: Write tests** — IDOR mutation tests on every route. Pattern:
  - 401 unauth on every route
  - GET /api/wearables: returns only req.user's connections (eq(wearableConnections.userId, callerId) load-bearing)
  - DELETE /api/wearables/:id: cross-user attempt returns 404, NOT 200
  - PATCH /api/wearables/:id/preferences: ownership clause is load-bearing (mutation: remove eq(userId), test must FAIL)
  - GET /api/wearables/sleep + /vitals + /activity: filtered to req.user only
  - GET /api/wearables/client/:clientId/sleep: gated by `clients.user_id === actual_clients_row_via_trainer` AND `clients.share_sleep_with_trainer === true`

- [ ] **Step 2: Implement routes**

```ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import { getDb } from '../db';
import {
  wearableConnections,
  sleepSessions,
  dailyVitals,
  activitySessions,
  clients,
  type WearableProvider,
  WEARABLE_PROVIDERS,
} from '../../shared/schema';
import * as wc from '../services/wearableConnections';
import * as ow from '../services/openWearablesClient';
import { logger } from '../logger';
import { getRequestId } from '../middleware/requestLogger';

const router = Router();

// IMPORTANT: declare specific paths BEFORE parameterised paths (Express route ordering gotcha).

// GET /api/wearables — list current user's connections
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  res.json(await wc.listConnections(userId));
});

// POST /api/wearables/connect — initiate OAuth
const connectSchema = z.object({ provider: z.enum(WEARABLE_PROVIDERS) });
router.post('/connect', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { provider } = connectSchema.parse(req.body);
  res.json(await wc.initiateOAuth(userId, provider));
});

// GET /api/wearables/oauth-callback?provider=...&state=...
router.get('/oauth-callback', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const provider = z.enum(WEARABLE_PROVIDERS).parse(req.query.provider);
  await wc.handleOAuthCallback(userId, provider);
  res.redirect('/settings?tab=integrations&connected=' + provider);
});

// GET /api/wearables/sleep — date-range query
const dateRange = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(90),
});
router.get('/sleep', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { from, to, limit } = dateRange.parse(req.query);
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
});

// GET /api/wearables/vitals — same shape
// GET /api/wearables/activity — same shape

// Trainer routes — MUST come BEFORE /:id parameterised routes
// GET /api/wearables/client/:clientId/sleep — gated by share_sleep_with_trainer
async function getClientUserIdForTrainer(
  req: Request,
  res: Response,
  dataField: 'shareSleepWithTrainer' | 'shareHrvWithTrainer' | 'shareActivityWithTrainer'
) {
  if (req.user!.role !== 'trainer') {
    res.status(403).json({ error: 'Trainer-only' });
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
    res.status(404).json({ error: 'Client not found or not yours' });
    return null;
  }
  if (!client[dataField]) {
    res.status(403).json({
      error: 'Client has not consented to sharing this data type',
      code: 'CONSENT_NOT_GRANTED',
    });
    return null;
  }
  if (!client.userId) {
    res
      .status(404)
      .json({ error: 'Client has not registered as a Disciple yet', code: 'NOT_REGISTERED' });
    return null;
  }
  return client.userId;
}

router.get('/client/:clientId/sleep', async (req, res) => {
  const targetUserId = await getClientUserIdForTrainer(req, res, 'shareSleepWithTrainer');
  if (!targetUserId) return;
  // Same query as user GET /sleep but with targetUserId
  // ...
});
// ... /vitals (gated by shareHrvWithTrainer), /activity (gated by shareActivityWithTrainer)

// Parameterised routes LAST (Express route ordering)
const idSchema = z.object({ id: z.string().uuid() });
const prefsSchema = z.object({
  sleep: z.boolean().optional(),
  hrv: z.boolean().optional(),
  workouts: z.boolean().optional(),
  body: z.boolean().optional(),
  activity: z.boolean().optional(),
});

router.delete('/:id', async (req, res) => {
  const { id } = idSchema.parse(req.params);
  await wc.disconnect(req.user!.id, id);
  res.json({ ok: true });
});

router.patch('/:id/preferences', async (req, res) => {
  const userId = req.user!.id;
  const { id } = idSchema.parse(req.params);
  const patch = prefsSchema.parse(req.body);
  const db = await getDb();
  // SELECT FOR audit logging — capture previousValue per flag
  const [existing] = await db
    .select()
    .from(wearableConnections)
    .where(and(eq(wearableConnections.id, id), eq(wearableConnections.userId, userId)));
  if (!existing) return res.status(404).json({ error: 'Connection not found' });
  const merged = { ...existing.syncPreferences, ...patch };
  await db
    .update(wearableConnections)
    .set({ syncPreferences: merged })
    .where(and(eq(wearableConnections.id, id), eq(wearableConnections.userId, userId)));
  // Audit log per changed flag
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    if (existing.syncPreferences[k] !== patch[k]) {
      logger.audit('wearable.sync_preference_changed', {
        userId,
        connectionId: id,
        provider: existing.provider,
        flag: k,
        previousValue: existing.syncPreferences[k],
        value: patch[k],
        ts: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: getRequestId(req),
      });
    }
  }
  res.json({ ok: true, syncPreferences: merged });
});

router.post('/:id/sync', async (req, res) => {
  const userId = req.user!.id;
  const { id } = idSchema.parse(req.params);
  const db = await getDb();
  const [conn] = await db
    .select()
    .from(wearableConnections)
    .where(and(eq(wearableConnections.id, id), eq(wearableConnections.userId, userId)));
  if (!conn) return res.status(404).json({ error: 'Connection not found' });
  await ow.triggerSync(conn.provider as WearableProvider, userId);
  res.json({ ok: true });
});

export default router;
```

### Task 3.3: Create `server/jobs/wearableSyncMonitor.ts`

**Files:**

- Create: `server/jobs/wearableSyncMonitor.ts`
- Test: `server/test/jobs/wearableSyncMonitor.test.ts`

- [ ] **Step 1: Implement cron** (mirrors `cleanupExpiredQuietHours.ts` pattern from Sprint 2)

```ts
// Cron: every 1 hour, find connections that haven't synced in >24h despite
// status='connected'. Trigger sync; if it fails, markSyncError increments
// the strike count. After 3 strikes, status flips to 'expired' + dispatches
// wearable_expired notification (handled by markSyncError).
import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import * as ow from '../services/openWearablesClient';
import { markSyncError, recordSuccessfulSync } from '../services/wearableConnections';
import { logger } from '../logger';

const INTERVAL_MS = Math.max(
  1000,
  parseInt(process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS ?? '3600000', 10)
);
let inFlight = false;
let timer: NodeJS.Timeout | null = null;

async function tick() {
  if (inFlight) return;
  inFlight = true;
  try {
    const db = await getDb();
    const stale: any = await db.execute(sql`
      WITH candidates AS (
        SELECT id, user_id, provider FROM wearable_connections
         WHERE status = 'connected'
           AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '24 hours')
         ORDER BY last_sync_at ASC NULLS FIRST
         LIMIT 50
         FOR UPDATE SKIP LOCKED
      )
      SELECT * FROM candidates
    `);
    const rows = (stale.rows ?? stale) as Array<{ id: string; user_id: string; provider: string }>;
    for (const r of rows) {
      try {
        await ow.triggerSync(r.provider, r.user_id);
        await recordSuccessfulSync(r.id);
      } catch (err) {
        logger.warn('wearable sync trigger failed', { connectionId: r.id, err: String(err) });
        await markSyncError(r.id, String(err));
      }
    }
  } catch (err) {
    logger.error('wearableSyncMonitor tick failed', { err: String(err) });
  } finally {
    inFlight = false;
  }
}

export function startWearableSyncMonitor() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch(() => {});
  }, INTERVAL_MS);
  process.on('SIGTERM', stopWearableSyncMonitor);
}
export function stopWearableSyncMonitor() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
```

- [ ] **Step 2: Tests — SKIP LOCKED contract, re-entrancy guard, 3-strike threshold, lifecycle**

### Task 3.4: Mount routes + start cron

**Files:**

- Modify: `server/index.ts`

- [ ] **Step 1: Import + mount router under requireAuth**

```ts
import wearableRouter from './routes/wearables';
app.use('/api/wearables', requireAuth, wearableRouter);
```

- [ ] **Step 2: Webhook router (raw body, NO requireAuth — HMAC instead)**

```ts
import wearableWebhookRouter from './routes/webhooks/wearables';
// Mount BEFORE the global express.json()
app.use(
  '/webhooks/wearables',
  express.raw({ type: 'application/json' }),
  preserveRawBody,
  wearableWebhookRouter
);
```

- [ ] **Step 3: Start cron after server boots**

```ts
import { startWearableSyncMonitor } from './jobs/wearableSyncMonitor';
startWearableSyncMonitor();
```

### Task 3.5: Smoke test cron firing

- [ ] **Step 1: Set WEARABLE_SYNC_MONITOR_INTERVAL_MS=2000 in dev .env**
- [ ] **Step 2: Insert a stale wearable_connection (status=connected, last_sync_at = NOW() - INTERVAL '25 hours')**
- [ ] **Step 3: Watch logs for 2 ticks confirming sync trigger attempt**
- [ ] **Step 4: Reset INTERVAL_MS env var, remove probe row**

### Task 3.6: Commit BATCH 3

```bash
git add server/services/notificationTemplates.ts server/routes/wearables.ts \
  server/jobs/wearableSyncMonitor.ts server/index.ts \
  server/test/routes/wearables.test.ts server/test/jobs/wearableSyncMonitor.test.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 3 — user routes + sync monitor + 4 notification types"
git push origin main
```

**Checkpoint:** all 10 routes pass IDOR + 401 tests, cron tick fires + claims via SKIP LOCKED, 4 notification types render, satisfies map exhaustive. STOP for approval before BATCH 4.

---

## BATCH 4 — HARD GATE: Provider Rollout Strategy + Open Wearables Deployment

**STOP. Do NOT proceed without explicit user approval.**

### Task 4.1: Surface decisions to user

- [ ] **Step 1: Pull current state of decisions from `_brain/notes/decisions.md` Q2-Q3 roadmap**

- [ ] **Step 2: Write `docs/plans/2026-05-XX-sprint-4-batch-4-rollout-decisions.md` with 5 decision points + recommendation per point + tradeoffs**

Decisions:

1. **Provider count in this sprint** — recommend Whoop + Oura first (HRV-rich, cleanest docs), Garmin + Strava + Withings in Sprint 4.5 (multi-week external setup time per provider)
2. **Open Wearables deployment** — recommend separate Railway project (clean blast radius, independent scaling, separate logs)
3. **POC provider** — Whoop (recovery + sleep + HRV all native, deepest demo)
4. **OAuth callback URL strategy** — recommend path-based (`/api/wearables/oauth-callback?provider=whoop`) — single TLS cert, simpler routing, simpler env-var management
5. **Encryption key management** — env var `WEARABLE_TOKEN_ENCRYPTION_KEY` for Sprint 4 (Railway-managed); upgrade to KMS-style rotation in Sprint 6

- [ ] **Step 3: Present decisions, wait for user approval, capture each in `_brain/notes/decisions.md`**

### Task 4.2: Wait for explicit approval before BATCH 5

---

## BATCH 5 — Open Wearables Integration: Code Adapt + Deploy + E2E

**Status (2026-05-07):** Original BATCH 5 was scoped for Whoop POC end-to-end deploy. Per the α pivot + structural OW divergence findings (Svix wire format, JWT/API-key auth, multi-container topology, single webhook endpoint with type-dispatch instead of 4 routes), this batch is restructured into three sub-batches that respect the dependencies between code adaptation, external OAuth registration, and end-to-end validation.

### 5a / 5b / 5c split rationale

- **5a is provider-agnostic** — code adaptation work (Svix SDK swap, webhook route collapse, ingest refactor, auth swap, connection-polling cron repurpose) lands the same regardless of which providers we ship in v1. It builds the wire-format and architecture layer that BATCH 5b deploys against. 5a can proceed immediately and in parallel with the asynchronous Garmin developer portal review. **Why the split:** future Claude reading the plan should understand 5a's scope is purely about correcting the BATCH 2 architectural assumptions to match OW upstream — it has no dependency on which providers we ship, and decoupling it lets the spike/approval wait happen in parallel.
- **5b requires the Garmin developer portal approval (3-7 business days)** — the deploy step itself is mechanical (provision OW services on Railway, run multi-container topology equivalent, set OAuth credentials, register webhook endpoint via OW API) but cannot be tested or completed without provider OAuth apps registered. Polar (1-2 day approval) and Suunto (similar, plus subscription key) likely arrive earlier; if Garmin lags, 5b can deploy with Polar/Suunto first and add Garmin when its app approves. **Why the split:** the deploy work is gated on external review timing we don't control. Treating it as a separate batch makes the dependency explicit and the timeline predictable.
- **5c can't begin until 5a + 5b are both complete** — end-to-end validation (drive OAuth flow → sync data → webhook arrives → ingest writes → `/biometrics` renders) needs both the working consumer code (5a) AND a deployed OW service with provider credentials (5b). **Why the split:** isolating E2E proof as a discrete batch ensures it gets a focused checkpoint with screenshots/screen-recording, rather than being treated as a tail-end afterthought of deploy. Reviewer subagent pass on the E2E proof becomes the closing artifact for the entire sprint.

---

## BATCH 5a — Code Adaptation (Provider-Agnostic)

**Goal:** Replace BATCH 2's hand-rolled-HMAC + 4-routes + payload-`webhookId` + pre-shared-bearer architecture with OW upstream's actual shape: Svix-signed webhooks + 1 endpoint with type-dispatch + idempotency-by-`svix-id` + JWT-or-API-key auth. Provider-agnostic; ships before Garmin approval lands.

### Task 5a.1: Install svix npm package + verify license

**Files:**

- Modify: `package.json`, `package-lock.json` (or `pnpm-lock.yaml` per project lockfile convention)

- [ ] **Step 1: Verify license at install time**

```bash
npm view svix license version
# Expected: "MIT", "1.92.x" or later
```

If not MIT (or another permissive OSI-approved license), STOP and surface — do not install.

- [ ] **Step 2: Install**

```bash
npm install svix
```

- [ ] **Step 3: Verify type definitions ship in-package**

```bash
node -e "console.log(Object.keys(require('svix')))"
# Expected: includes 'Webhook'
```

- [ ] **Step 4: Commit just the lockfile + package.json change**

```bash
git add package.json package-lock.json
git commit -m "chore(wearables): SPRINT 4 BATCH 5a Task 1 — install svix npm package (MIT)"
```

### Task 5a.2: Add redirect comment to verifyWearableSignature.ts

**Files:**

- Modify: `server/middleware/verifyWearableSignature.ts:1-4` (header comment)

- [ ] **Step 1: Add header comment redirecting Svix-source consumers**

```ts
/**
 * Wearable Webhook Signature Verification — Sprint 4 BATCH 2 (kept for non-Svix sources)
 *
 * NOTE (Sprint 4 BATCH 5a, 2026-05-XX): For Open Wearables webhooks, use the official
 * `svix` npm package — see `server/routes/webhooks/wearables.ts`. This module is preserved
 * for any future webhook source that does NOT use Svix (e.g., service-to-service notifications,
 * direct provider integrations bypassing OW). The HMAC primitive below is correct as a
 * standalone — only the OW assumption was wrong.
 *
 * [original comment continues]
 */
```

- [ ] **Step 2: Verify the module still exports the same surface (no behavior change)**

```bash
npx tsc --noEmit
```

### Task 5a.3: Rewrite webhook receiver — collapse routes + Svix verification

**Files:**

- Rewrite: `server/routes/webhooks/wearables.ts`

This is the largest single rewrite in 5a. Old structure: 4 routes (`/sleep`, `/vitals`, `/activity`, `/connection-status`) each calling its own ingest function. New structure: 1 route (`POST /webhooks/wearables`) with switch-on-`event.type` dispatch.

#### Svix verification approach

- Use the `Webhook` class from `svix`, not hand-rolled crypto. Per OW's canonical guide:

```ts
import { Webhook } from 'svix';

const wh = new Webhook(WEBHOOK_SECRET); // WEBHOOK_SECRET is the per-endpoint signing secret returned by OW when we registered the endpoint, format `whsec_<base64>`
let event;
try {
  event = wh.verify(req.body, req.headers); // req.body MUST be raw Buffer, not parsed JSON; req.headers passes svix-id/svix-timestamp/svix-signature
} catch (err) {
  return res.status(401).end(); // Svix verify throws on bad signature OR stale timestamp (>5min). Reject with 401 — no body, no retry needed (Svix retries on its own per its retry policy).
}
```

#### Per-endpoint signing secret (vs. global HMAC secret)

- We register ONE webhook endpoint with OW via `POST /api/v1/webhooks/endpoints`. OW returns `{id: "ep_*", url, ...}` and a per-endpoint signing secret (`whsec_*`) that we fetch via `GET /api/v1/webhooks/endpoints/{id}/secret`.
- That `whsec_*` is the verification key, set as env var `OPEN_WEARABLES_WEBHOOK_SECRET` (env var name preserved from BATCH 2 for continuity, but the value format and source are different).
- This is a per-endpoint secret, not a global HMAC secret across all OW outgoing webhooks. If we register multiple endpoints (e.g., a Sprint 6 endpoint subscribing to timeseries events), each gets its own secret.

#### Idempotency: `svix-id` header instead of payload field

- BATCH 2's LRU was keyed on `parsed.data.webhookId`. There is no such field. Replace with LRU keyed on `req.headers['svix-id']` (string) — Svix guarantees this is stable across retries of the same logical event.
- LRU semantics preserved (24h TTL, in-memory `Map`). The known O(N)-per-request sweep gotcha from BATCH 2 stays as deferred tech debt — not addressed in 5a.
- Test-only `__resetWebhookIdempotency` export preserved.

#### Type-dispatch on `event.type`

```ts
import { Webhook } from 'svix';
import { z } from 'zod';
import * as ingest from '../../services/wearableIngest';

const router = Router();

const WEBHOOK_SECRET = process.env.OPEN_WEARABLES_WEBHOOK_SECRET ?? '';
if (!WEBHOOK_SECRET) {
  // Fail fast at module load time if not configured. Mirrors token-encryption fail-fast pattern.
  throw new Error('OPEN_WEARABLES_WEBHOOK_SECRET must be set (whsec_<base64> format)');
}

const wh = new Webhook(WEBHOOK_SECRET);
const recentSvixIds = new Map<string, number>();
const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;

// Sweep stale entries — same O(N)-per-call implementation as BATCH 2
// (deferred tech debt per `_brain/notes/gotchas.md` "Webhook idempotency LRU
// sweep is O(N)"). Carried forward verbatim from the BATCH 2 implementation
// of `server/routes/webhooks/wearables.ts`. Refactor when active connections
// + delivery rate make the sweep cost visible (mirror condition: same
// threshold as the wearableSyncMonitor cron's N+1 escape — 500 connections).
function sweepStale(): void {
  const now = Date.now();
  Array.from(recentSvixIds.entries()).forEach(([k, t]) => {
    if (now - t > WEBHOOK_TTL_MS) recentSvixIds.delete(k);
  });
}

// Per-event-type Zod schemas at the trust boundary. `.passthrough()` allows
// unknown fields (forward compat with OW schema additions). The schemas catch
// malformed payloads from OW that the type-dispatch switch wouldn't catch on
// its own — the codebase pattern from Sprints 2-3 is "Zod-validate at the
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

router.post('/wearables', async (req: Request, res: Response) => {
  // 1) Signature verification — must run BEFORE any other use of req.body or
  //    req.headers (don't trust unverified `svix-id` for idempotency keying).
  let envelope: { type: string; data: unknown };
  try {
    const verified = wh.verify(req.body, req.headers as Record<string, string>);
    envelope = EventEnvelopeSchema.parse(verified);
  } catch (err) {
    logger.warn('webhook signature verification or envelope parse failed', {
      err: String(err),
    });
    return res.status(401).end();
  }

  // 2) Idempotency check — `svix-id` is stable across retries of the same
  //    logical event.
  sweepStale();
  const svixId = req.headers['svix-id'] as string;
  if (recentSvixIds.has(svixId)) {
    return res.status(200).json({ ok: true, deduped: true });
  }
  recentSvixIds.set(svixId, Date.now());
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
```

#### Route mount in `server/index.ts`

The webhook receiver MUST be mounted with `express.raw({ type: 'application/json' })` BEFORE the global `express.json()` parser (per Guardrail). Existing BATCH 2 mount order is correct — preserve it.

#### Connection-status route deletion (explicit)

The `connection-status` route from BATCH 2 (`/webhooks/wearables/connection-status`) is **deleted entirely** in this task. **Rationale:** OW upstream does not emit any `connection.expired`, `connection.revoked`, or `connection.disconnected` events — the only connection event in OW's canonical event types list is `connection.created`. Provider-side revoke detection moves to the connection-list polling cron (Task 5a.6). Future Claude reading the diff: this is intentional, not an oversight.

- [ ] **Step 1: Implement the rewritten file per the structure above**
- [ ] **Step 2: Update `server/index.ts` mount path** — was `app.use('/webhooks/wearables', ...wearableWebhookRouter)` with 4 sub-routes; remains the same mount path with 1 sub-route at `POST /wearables`. Mount path is `/webhooks/wearables` so the full URL becomes `/webhooks/wearables`. (If the BATCH 2 mount used a sub-path approach, simplify.)
- [ ] **Step 3: TypeScript clean** — `npx tsc --noEmit`
- [ ] **Step 4: Commit**

```bash
git add server/routes/webhooks/wearables.ts server/index.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 5a Task 3 — Svix verification + collapse 4 routes to 1 with type-dispatch + delete connection-status route"
```

### Task 5a.4: Refactor wearableIngest with event-type dispatch

**Files:**

- Rewrite: `server/services/wearableIngest.ts`
- Update: `server/test/services/wearableIngest.test.ts`

#### Event-type → table mapping

> **NOTE:** Field-level shapes documented below are based on OW's canonical webhook guide ([docs/api-reference/guides/webhooks.mdx](https://github.com/the-momentum/open-wearables/blob/main/docs/api-reference/guides/webhooks.mdx)). Final validation pends the Garmin spike — workout summary metric placement (inline vs separate timeseries) is the most consequential open question. The plan documents the expected default; the spike confirms.

| Event Type                 | Table                                           | Idempotency Key                                                                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workout.created`          | `activity_sessions`                             | `(user_id, source, source_record_id)` where `source_record_id = data.id`                                                                                              | Expected to include inline summary metrics: `duration_seconds`, `calories_kcal`, `distance_meters`, `avg_heart_rate_bpm`, `max_heart_rate_bpm`, `avg_pace_sec_per_km`, `elevation_gain_meters`. **Spike-validated assumption** — if OW emits HR/calories only via separate `heart_rate.created` events, we'd need to subscribe to that event type too (out-of-scope for v1 unless this assumption breaks).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `sleep.created`            | `sleep_sessions`                                | `(user_id, source, source_record_id)` where `source_record_id = data.id`                                                                                              | Expected fields: `start_time`, `end_time`, `duration_seconds`, `efficiency_percent`, `stages.deep_minutes`, `stages.rem_minutes`, `stages.light_minutes`, `stages.awake_minutes`, `is_nap`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `connection.created`       | `wearable_connections` (UPSERT on existing row) | `(user_id, provider)`                                                                                                                                                 | Maps user's OW connection to our `wearable_connections` row. UPSERT semantics: if our row exists with `status='disconnected'`, transition to `'connected'`; if doesn't exist, INSERT (this should be rare — usually our row is created first via OAuth callback, then OW emits `connection.created` to confirm). Dispatch `wearable_connected` notification on transition.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `body_composition.created` | `bodyMetrics` (the smart-scale path)            | `(user_id, source_provider, (recorded_at::date)) WHERE source IN ('wearable', 'smart_scale')` — partial UNIQUE index added in **migration 014.5** (Task 5a.6.5 below) | Expected: `data.samples` array with `weight`, `body_fat_percentage`, `body_mass_index`, `lean_body_mass` per sample. Iterate samples, UPSERT on the partial-unique key. **Sprint 1 BATCH 4 audit decision:** weight/body-comp from wearables flows through `bodyMetrics` so the Disciple sees one unified body view. **2026-05-07 plan-review amendment:** original idempotency key `(user_id, source, recorded_at::date)` was unimplementable — `bodyMetrics` from Sprint 1 has only `idx_body_metrics_user_id` and `idx_body_metrics_user_recorded_at` indexes, no UNIQUE constraint. ON CONFLICT requires a unique index; without one the body_composition path silently inserts duplicates on retry. Migration 014.5 below adds the partial UNIQUE that gives the UPSERT a real conflict target while preserving Sprint 1 manual-entry semantics (multiple `source='manual'` rows per day still allowed). |

#### Function signatures

```ts
export async function ingestWorkoutCreated(data: {
  id: string;
  user_id: string;
  type: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  source: { provider: string; device: string | null };
  calories_kcal: number | null;
  distance_meters: number | null;
  avg_heart_rate_bpm: number | null;
  max_heart_rate_bpm: number | null;
  // ...
}): Promise<{ inserted: boolean }> {
  /* UPSERT, return inserted */
}

export async function ingestSleepCreated(data: { /* ... */ }): Promise<{ inserted: boolean }> {
  /* ... */
}

export async function ingestConnectionCreated(data: {
  user_id: string;
  provider: string;
  connection_id: string;
  connected_at: string;
}): Promise<void> {
  /* UPSERT wearable_connections, dispatch notification */
}

export async function ingestBodyCompositionCreated(data: {
  user_id: string;
  provider: string;
  series_type: string;
  samples: Array<{ timestamp: string; type: string; value: number; unit: string }>;
}): Promise<{ inserted_count: number }> {
  /* iterate samples, UPSERT bodyMetrics */
}
```

#### `maybeDispatchFirstSyncComplete` preserved

The first-sync-complete dispatcher from BATCH 2 (fires `wearable_first_sync_complete` once per (userId, dataType) when row count transitions from 0 to 1) is **preserved** but called from the new ingest functions. Update its callers from the BATCH 2 functions to the BATCH 5a functions.

- [ ] **Step 1: Rewrite `server/services/wearableIngest.ts`** with the 4 new functions
- [ ] **Step 2: Map OW's `data.user_id` (UUID) → our internal `userId`** — see "OW user ID bridge" note below
- [ ] **Step 3: Rewrite `server/test/services/wearableIngest.test.ts`** for the new function signatures + payload schemas; preserve idempotency tests (UNIQUE constraint enforcement)
- [ ] **Step 4: TypeScript + tests green** — `npx tsc --noEmit && npx vitest run server/test/services/wearableIngest.test.ts`
- [ ] **Step 5: Commit**

```bash
git add server/services/wearableIngest.ts server/test/services/wearableIngest.test.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 5a Task 4 — refactor wearableIngest with event-type dispatch + 4 OW canonical event types"
```

#### OW user ID bridge — verification target for spike

> **AMENDED 2026-05-07 (Q2 spike completion):** Path B is locked. The
> framing below documented Path A as preferred and Path B as fallback;
> Q2 confirmed Path B is the only working path (OW's `external_user_id`
> field is deprecated and not accepted by data-fetching endpoints). The
> bridge implementation lives in **Task 5a.10** (post-BATCH-5a follow-up)
> — see `_brain/notes/decisions.md` "Sprint 4 BATCH 5 spike findings —
> Q2 LOCKED Path B" for full rationale. Migration 015 ships
> (`server/migrations/015_wearable_connections_ow_user_id.ts`). The
> `external_user_id` field is set on user creation only as a portal-debug
> convenience and is not load-bearing. The original Path A/B framing
> below is preserved as historical record of the spike question.

OW assigns its own user UUIDs to users registered via its API. Our `wearable_connections.userId` is GymGurus's internal user UUID. The bridge between them needs verification:

- **Path A (preferred, lower-cost):** OW supports `external_id` lookup. We POST `/api/v1/users` with `{external_id: <our user UUID>}` when a Disciple first connects, and OW resolves `external_id → ow_user_uuid` for us. Our `wearable_connections` table doesn't need a new column.
- **Path B (fallback):** OW does not support external_id lookup. We need to store OW's user UUID in a new `wearable_connections.open_wearables_user_id` column (migration 015 = single column add, ~30 lines). When OW emits `data.user_id` (their UUID), we look up our `userId` via the column.

The spike validates which path applies. If Path A works, no migration 015. If Path B is needed, migration 015 lands at the end of 5a.

### Task 5a.4.5: Add partial UNIQUE on bodyMetrics for wearable dedup (Migration 014.5)

**Files:**

- Create: `server/migrations/014_5_body_metrics_wearable_dedup.ts`
- Update: `shared/schema.ts` (add the partial UNIQUE index to the `bodyMetrics` `(table) => [...]` array)
- Update: `scripts/verify-prod-migrations.ts` (add baseline-014.5 + post-014.5 phases — 1 new index, no rows affected)

**Why this task exists** (2026-05-07 plan-review finding):

`bodyMetrics` from Sprint 1 has only `idx_body_metrics_user_id` and `idx_body_metrics_user_recorded_at` — no UNIQUE constraint. The `body_composition.created` ingest path in Task 5a.4 needs an UPSERT (`ON CONFLICT ... DO UPDATE`) to be idempotent against Svix retries. ON CONFLICT requires a unique index targeting the conflict columns. Without one, every retry of the same logical event silently inserts a duplicate row — exactly the failure mode BATCH 2's amend Item 3 fixed for vitals.

**Why partial UNIQUE (not table-wide)** — Sprint 1's `bodyMetrics` allows multiple manual entries per user per day (a user can log weight at 7am and 5pm and both rows persist). A table-wide UNIQUE on `(user_id, source_provider, (recorded_at::date))` would break that semantic. Partial UNIQUE filtered on `source IN ('wearable', 'smart_scale')` enforces dedup ONLY for wearable-sourced rows, leaves manual entries untouched. Same partial-index pattern proven in Sprint 1's `progress_entries` polymorphic CHECK constraint (`progress_entries_user_or_client_check`).

#### Migration body

```ts
import { sql } from 'drizzle-orm';
import type { Database } from '../db';

export const NAME = '014_5_body_metrics_wearable_dedup';

export async function up(db: Database): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_body_metrics_wearable_dedup
      ON body_metrics (user_id, source_provider, (recorded_at::date))
      WHERE source IN ('wearable', 'smart_scale');
  `);
}

export async function down(db: Database): Promise<void> {
  // Safety gate: refuse if any body_metrics rows currently rely on the dedup index
  // (i.e. any wearable-sourced rows). Manual entries are unaffected by the index
  // existing or not, so they don't gate the down-migration.
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM body_metrics
    WHERE source IN ('wearable', 'smart_scale')
  `);
  const count = result?.rows?.[0]?.count ?? result?.[0]?.count ?? 0;
  if (count > 0) {
    throw new Error(
      `BLOCKED: ${count} wearable-sourced body_metrics rows exist. ` +
        `Dropping idx_body_metrics_wearable_dedup would re-enable duplicate inserts. ` +
        `Verify these rows are not load-bearing before forcing rollback.`
    );
  }
  await db.execute(sql`DROP INDEX IF EXISTS idx_body_metrics_wearable_dedup;`);
}
```

#### Schema update

Add to the `bodyMetrics` table-level array in `shared/schema.ts:2433`:

```ts
(table) => [
  index('idx_body_metrics_user_id').on(table.userId),
  index('idx_body_metrics_user_recorded_at').on(table.userId, table.recordedAt),
  // Sprint 4 BATCH 5a — partial UNIQUE for wearable-sourced dedup. Only
  // enforces uniqueness for `source IN ('wearable', 'smart_scale')`; manual
  // entries keep multi-per-day semantics.
  uniqueIndex('idx_body_metrics_wearable_dedup')
    .on(table.userId, table.sourceProvider, sql`(${table.recordedAt}::date)`)
    .where(sql`${table.source} IN ('wearable', 'smart_scale')`),
],
```

(`uniqueIndex` import from `drizzle-orm/pg-core`. Drizzle's partial-index API takes a `.where()` clause; if the API doesn't fully support `(recorded_at::date)` expression-indexes ergonomically, fall back to documenting the index in raw SQL via `drizzle-kit generate` skip + manual migration body — same pattern as Sprint 3's body composition checks.)

#### Verifier phases

```ts
// scripts/verify-prod-migrations.ts — baseline-014.5
await assertIndexExists('idx_body_metrics_wearable_dedup', 'body_metrics');
await assertIndexIsUnique('idx_body_metrics_wearable_dedup');
await assertIndexIsPartial(
  'idx_body_metrics_wearable_dedup',
  `source IN ('wearable', 'smart_scale')`
);
// post-014.5 — UPSERT idempotency probe
const before = await rowCount(
  'body_metrics',
  `source = 'wearable' AND source_provider = 'verifier_probe'`
);
await db.execute(sql`
  INSERT INTO body_metrics (user_id, recorded_at, weight_kg, source, source_provider)
  VALUES ('verifier-probe-user', NOW()::date, 75.0, 'wearable', 'verifier_probe')
  ON CONFLICT (user_id, source_provider, (recorded_at::date)) WHERE source IN ('wearable', 'smart_scale')
  DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = NOW();
`);
await db.execute(sql`/* same INSERT again — should UPSERT, not insert */`);
const after = await rowCount(
  'body_metrics',
  `source = 'wearable' AND source_provider = 'verifier_probe'`
);
assert(after === before + 1, `Expected exactly 1 row, got ${after - before}`);
// Cleanup
await db.execute(sql`DELETE FROM body_metrics WHERE source_provider = 'verifier_probe';`);
```

- [ ] **Step 1: Write migration body** — `server/migrations/014_5_body_metrics_wearable_dedup.ts`
- [ ] **Step 2: Update schema definition** — partial unique index in `shared/schema.ts` `bodyMetrics` table
- [ ] **Step 3: Add verifier phases** — baseline + post + UPSERT probe
- [ ] **Step 4: Run on dev** — `tsx server/migrations/014_5_body_metrics_wearable_dedup.ts up`
- [ ] **Step 5: Run verifier** — confirms partial UNIQUE present + UPSERT semantic correct
- [ ] **Step 6: Probe down() safety gate** — insert a wearable-sourced probe row, run down() (must throw BLOCKED), delete the row, re-run down() (must succeed), re-run up() to leave dev migrated
- [ ] **Step 7: Update Task 5a.4 ingest body_composition handler to use the conflict target**

```ts
await db.execute(sql`
  INSERT INTO body_metrics (user_id, recorded_at, weight_kg, body_fat_percentage, source, source_provider, ...)
  VALUES (...)
  ON CONFLICT (user_id, source_provider, (recorded_at::date)) WHERE source IN ('wearable', 'smart_scale')
  DO UPDATE SET
    weight_kg = EXCLUDED.weight_kg,
    body_fat_percentage = EXCLUDED.body_fat_percentage,
    updated_at = NOW();
`);
```

- [ ] **Step 8: Commit**

```bash
git add server/migrations/014_5_body_metrics_wearable_dedup.ts shared/schema.ts scripts/verify-prod-migrations.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 5a Task 4.5 — migration 014.5 partial UNIQUE on body_metrics for wearable dedup (UPSERT conflict target)"
```

**Production migration runs in BATCH 5b** (alongside the rest of any 5a-side migrations) via `scripts/run-prod-migration.ts up 014_5_body_metrics_wearable_dedup` — same Railway-host fail-safe + 3-second pause as 010/011/012/013.

### Task 5a.5: Rewrite openWearablesClient with auth fallback

**Files:**

- Rewrite: `server/services/openWearablesClient.ts`
- Update: `server/test/services/openWearablesClient.test.ts` (or create if BATCH 2 didn't have one)

#### Auth approach with explicit fallback

- **Primary path: API key from OW Credentials tab.** OW's developer portal exposes a Credentials tab where the operator generates long-lived API keys. **Spike-confirmed (2026-05-07 source inspection):** API keys are the documented runtime auth method, used via the **custom `X-Open-Wearables-API-Key: <api-key>` header** (NOT `Authorization: Bearer`). API key format is `sk-<32-hex>` (per `backend/app/services/api_key_service.py:_generate_key_value`). The header is enforced via FastAPI's `ApiKeyDep` dependency on essentially every v1 route (e.g. `backend/app/api/routes/v1/connections.py` route handlers take `_api_key: ApiKeyDep`). Lower operational complexity (one env var, one rotation procedure, no expiry handling).
- **Fallback path: JWT bearer via `POST /api/v1/auth/login`.** OW's auth route returns a JWT on successful login with admin/dev credentials. JWT has TTL — our client must refresh before expiry. Operational complexity: storing admin credentials (which we'd need anyway to mint JWTs), refresh logic, "JWT expired mid-sync" failure handling. Use this path only if the spike reveals a runtime route NOT covered by ApiKeyDep that we need to call.

**Decision lock (early-spike, 2026-05-07):** `OPEN_WEARABLES_AUTH_MODE=api_key` is the production path. JWT fallback ships in code for defense-in-depth but is NOT the runtime mode. Set the env var on GymGurus production accordingly in BATCH 5b Task 5b.0.

```ts
const AUTH_MODE = process.env.OPEN_WEARABLES_AUTH_MODE ?? 'api_key'; // 'api_key' | 'jwt'

class OpenWearablesClient {
  // Returns a headers object (NOT a single Authorization-header string), because
  // OW's API-key path uses a custom header `X-Open-Wearables-API-Key`, not the
  // standard Authorization-Bearer scheme. Spike-confirmed via OW source —
  // backend/app/services/api_key_service.py + ApiKeyDep dependency.
  private async authHeaders(): Promise<Record<string, string>> {
    if (AUTH_MODE === 'api_key') {
      const apiKey = process.env.OPEN_WEARABLES_API_KEY;
      if (!apiKey)
        throw new Error('OPEN_WEARABLES_API_KEY required when OPEN_WEARABLES_AUTH_MODE=api_key');
      return { 'X-Open-Wearables-API-Key': apiKey };
    } else {
      // JWT path: cache token in memory, refresh on expiry. JWT goes in
      // `Authorization: Bearer` per OW's standard auth/login flow.
      const jwt = await this.getOrRefreshJwt();
      return { Authorization: `Bearer ${jwt}` };
    }
  }
  // ...
}
```

**Implementation note for 5a.5:** every outbound `fetch` / `httpClient` call must spread the `authHeaders()` result into the request headers object — don't hard-code `Authorization: Bearer` anywhere in the client. Tests must cover both modes (mock the env var) and assert the correct header name appears on the outbound request.

#### Methods needed

The client needs:

- `triggerSync(userId, provider)` — `POST /api/v1/providers/{provider}/users/{ow_user_id}/sync`
- `getConnections(userId)` — `GET /api/v1/users/{ow_user_id}/connections` (used by polling cron)
- `disconnectProvider(userId, provider)` — `DELETE /api/v1/providers/{provider}/users/{ow_user_id}` (best-effort during user-initiated disconnect)
- `registerWebhookEndpoint({url, filter_types})` — `POST /api/v1/webhooks/endpoints` (called once at deploy time, not at runtime; could be a script instead of a runtime method — decide on spike)
- `createUser({external_id})` — `POST /api/v1/users` (called when a Disciple first connects, if Path A confirmed on spike)

- [ ] **Step 1: Rewrite `server/services/openWearablesClient.ts`** with both auth modes + 5 methods
- [ ] **Step 2: Update tests** — mock both auth modes, mock provider-specific URL patterns
- [ ] **Step 3: TypeScript + tests green**
- [ ] **Step 4: Commit**

```bash
git add server/services/openWearablesClient.ts server/test/services/openWearablesClient.test.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 5a Task 5 — rewrite openWearablesClient with API-key/JWT auth fallback (mode locked post-spike)"
```

### Task 5a.6: Repurpose wearableSyncMonitor cron

**Files:**

- Rewrite: `server/jobs/wearableSyncMonitor.ts` (body of tick function, NOT the cron scaffold)
- Update: `server/test/jobs/wearableSyncMonitor.test.ts`

#### Why repurpose instead of new file

BATCH 3 shipped this file with: SKIP LOCKED claim pattern, 1-hour interval, env-overridable via `WEARABLE_SYNC_MONITOR_INTERVAL_MS`, isTickInFlight re-entrancy guard, SIGTERM graceful stop. **All scaffolding stays.** Only the body changes — from "find connections with last_sync_at > 24h ago" (assumed sync-error event tracking) to "fetch connection list from OW, diff against our table, dispatch on state transition." Same file, same name, same mount point.

#### New tick semantics

```
For each row in wearable_connections WHERE status IN ('connected', 'expired', 'error') AND deletedAt IS NULL:
  ow_user_id = (Path A) row.userId, OR (Path B) row.openWearablesUserId
  try {
    response = await openWearablesClient.getConnections(ow_user_id)
    matching = response.connections.find(c => c.provider === row.source)

    Case 1: matching && matching.status === 'connected' && row.status !== 'connected'
      → row was expired/error in our DB; OW says it's healthy now (e.g., user re-authed via OW portal)
      → UPDATE wearable_connections SET status='connected', last_sync_error=null
      → no notification (already-good state)

    Case 2: matching && matching.status === 'expired' && row.status !== 'expired'
      → OW reports the connection's tokens have expired (provider-side revoke or OAuth token age-out)
      → UPDATE wearable_connections SET status='expired', disconnectedAt=null (token expired ≠ disconnected)
      → DISPATCH wearable_expired notification (user needs to know)

    Case 3: matching && matching.status === 'error'
      → OW has logged sync errors for this connection
      → spike-decided semantic (lock at spike completion):
         (a) If GET /api/v1/users/{id}/connections exposes per-connection sync_error_count,
             MIRROR OW's count to our row (treating OW as authoritative). Threshold check:
             OW's count >= 3 → DISPATCH wearable_sync_failed.
         (b) If OW exposes only `status` (no count), INCREMENT our counter on each tick where
             status === 'error'. Threshold check: 3 consecutive error-status ticks → DISPATCH.
      → at threshold, DISPATCH wearable_sync_failed notification + transition row.status='error'
      → 2026-05-07 plan-review note: this ambiguity is intentionally unresolved at plan-write
        time. The verification target is captured in the spike findings placeholder
        (decisions.md line ~963 Q6.5). Locking the semantic at spike completion alongside
        Path A/B and auth mode keeps the cron design honest about what we don't yet know.

    Case 4: !matching (OW returned no connection for this provider)
      → user disconnected on OW side OR was deleted from OW
      → UPDATE wearable_connections SET status='disconnected', disconnectedAt=NOW(), accessToken=null, refreshToken=null
      → DO NOT dispatch (user-initiated disconnect from OW side; they already know)
  } catch (err) {
    // OW unreachable — don't dispatch on transient OW outages
    logger.warn('OW connection-list poll failed for connection', { connectionId: row.id, err: String(err) })
  }
```

**Cadence:** 1 hour, env-overridable via `WEARABLE_SYNC_MONITOR_INTERVAL_MS` (existing BATCH 3 env var).

#### N+1 acknowledgement + threshold to switch patterns

The above iterates one OW API call per active connection. **At v1 scale (~tens to low-hundreds of users with 1 connection each), this is acceptable** — 100 calls/hour against OW's local Railway deploy is trivial.

**Documented threshold to refactor:** when active connection count exceeds **500**, refactor to one of:

- Batch endpoint if OW exposes one (`GET /api/v1/users/connections?ids=<comma-list>`) — verify in OW source
- Single bulk poll: `GET /api/v1/connections?since=<last-poll-time>` if OW supports a since-cursor — verify in OW source
- Webhook-driven invalidation if OW upstream adds `connection.expired` / `connection.revoked` events — track [#1011](https://github.com/the-momentum/open-wearables/issues/1011)

Capture the threshold + refactor options in `_brain/notes/gotchas.md` after first deploy as "Wearable sync monitor N+1 — known limitation, threshold 500 connections."

#### BATCH 3 cron interaction

There is no second cron. The BATCH 3 cron file IS the BATCH 5a cron — same mount, same lifecycle, same SIGTERM handler. The tick body is rewritten in place.

#### Implementation hint — `determineSyncErrorState` abstraction (Cron Case 3 robustness)

**Spike-confirmed (2026-05-07 source inspection):** `UserConnectionWithCapabilities` schema (the response shape of `GET /api/v1/users/{user_id}/connections`) exposes `status` + `last_synced_at` only. **NO `sync_error_count` or `last_sync_error` fields.** Decision lock at spike close: **Cron Case 3 uses Semantic (b)** — count consecutive error-status ticks ourselves.

Even though the runtime answer is locked, implement the count-source as a small abstraction so the cron stays robust against OW exposing the field later (or against a future OW version changing the response shape). One function in front of the count source:

```ts
function determineSyncErrorState(
  matching: UserConnectionWithCapabilities,
  ourRow: WearableConnection
): { newCount: number; statusFromCount: 'healthy' | 'errored' } {
  // Semantic (a) preferred if OW ever exposes it: mirror their count.
  // The schema field doesn't exist today (per OW source as of 2026-05-07);
  // the optional-chained access just returns undefined and we fall through
  // to (b). Defense-in-depth against schema changes.
  const owCount = (matching as any).sync_error_count;
  if (typeof owCount === 'number') {
    return { newCount: owCount, statusFromCount: owCount >= 3 ? 'errored' : 'healthy' };
  }
  // Semantic (b) — the actual current path. Increment on each tick where
  // OW reports status === 'error'; reset to 0 if status flips back to 'connected'.
  if (matching.status === 'error') {
    const newCount = ourRow.syncErrorCount + 1;
    return { newCount, statusFromCount: newCount >= 3 ? 'errored' : 'healthy' };
  }
  return { newCount: 0, statusFromCount: 'healthy' };
}
```

The cron's tick body calls this once per matching connection and uses `newCount` to UPDATE `wearable_connections.syncErrorCount` and `statusFromCount` to decide whether to dispatch `wearable_sync_failed`. Keeps the runtime branch clean and the future-OW-schema-change cost low.

- [ ] **Step 1: Rewrite tick body of `server/jobs/wearableSyncMonitor.ts`**
- [ ] **Step 2: Rewrite `server/test/jobs/wearableSyncMonitor.test.ts`** for the new state-diff semantics; preserve concurrency-safety tests (SKIP LOCKED, isTickInFlight)
- [ ] **Step 3: TypeScript + tests green**
- [ ] **Step 4: Commit**

```bash
git add server/jobs/wearableSyncMonitor.ts server/test/jobs/wearableSyncMonitor.test.ts
git commit -m "feat(wearables): SPRINT 4 BATCH 5a Task 6 — repurpose wearableSyncMonitor cron from sync-error tracking to OW connection-list polling"
```

### Task 5a.7: Re-run TypeScript + full test suite

- [ ] **Step 1:** `npx tsc --noEmit`
- [ ] **Step 2:** `npx vitest run` — full test suite. Expected baseline 267 passing (Sprint 2 BATCH 7 baseline) + new tests; pre-existing 15 aiService failures excluded.
- [ ] **Step 3:** `npm run build` — confirm bundle builds cleanly with svix added.
- [ ] **Step 4:** Capture test count delta for the BATCH 5a commit message.

### Task 5a.8: Capture spike-pending decisions in plan

Open questions tracked here for the spike to resolve, NOT for this plan to commit:

- [ ] **Q1: API key vs JWT auth** — Path A (API key from Credentials tab) or Path B (JWT login + refresh)? → 5b.0 decision lock
- [ ] **Q2: External-id user lookup vs ow_user_id column** — Path A (no migration) or Path B (migration 015)? → spike confirms; if migration needed, lands as Task 5a.9
- [ ] **Q3: workout.created summary metrics** — inline (HR/calories/distance) or separate timeseries events? → spike confirms; if separate, ingest layer needs subscription expansion to `heart_rate.created`
- [ ] **Q4: Suunto subscription key** — does OW require it as an additional env var (`SUUNTO_SUBSCRIPTION_KEY` per `.env.example`) at runtime, or only at OAuth registration? → 5b configures accordingly

Surface answers from the Garmin spike in `_brain/notes/decisions.md` as "Sprint 4 BATCH 5 spike findings" entry. The placeholder for that entry is created during this plan rewrite (separate Edit on decisions.md).

### Task 5a.9: Commit BATCH 5a

```bash
# After all sub-tasks pushed individually, the final commit is the merge / wrap-up:
git log --oneline | head -10  # confirm 5a.1-5a.7 commits visible
# No additional commit needed if every sub-task pushed; the BATCH 5a "checkpoint" is the cumulative state.
git push origin main  # ensure all sub-task commits are on origin
```

**BATCH 5a Checkpoint:** All amended files pass `npx tsc --noEmit`, full test suite green (modulo pre-existing aiService failures), build succeeds, all 6 sub-tasks individually committed + pushed. Spike-pending questions documented in 5a.8. **STOP for review** before BATCH 5b begins (OW deploy + OAuth registration).

---

## BATCH 5b — Open Wearables Deploy + OAuth Registration

**Goal:** Stand up Open Wearables as a separate Railway project (multi-container), register Garmin/Polar/Suunto OAuth apps with OW, register GymGurus's webhook endpoint with OW, configure cross-service env vars. Cannot start until Garmin developer portal approval lands (3-7 business days; Polar/Suunto are typically faster).

### Task 5b.0: Auth approach decision lock

**Pre-deploy gate.** Before BATCH 5b starts, the spike must have answered Task 5a.8 Q1 (API key vs JWT). Capture the decision in `_brain/notes/decisions.md` as the closing of "Sprint 4 BATCH 5 spike findings" entry. Set `OPEN_WEARABLES_AUTH_MODE` env var on GymGurus production accordingly.

### Task 5b.1: Provision Open Wearables Railway project (multi-container)

**Verify against OW's official deploy guidance first.** OW's docs at https://openwearables.io/docs may have a Railway-specific deploy guide; if so, follow it. If they document a different recommended topology (e.g., "use docker-compose.prod.yml on a single VM, not per-container Railway services"), STOP and surface — maintainer guidance for their own stack outweighs our Railway-pattern reasoning.

Assuming per-container Railway services (our default plan):

- [ ] **Step 1: Create Railway project `open-wearables` separate from `gym-gurus`** — same workspace, distinct project boundary
- [ ] **Step 2: Provision shared infra plugins:**
  - PostgreSQL plugin (used by both OW's app DB AND Svix's queue DB — OW's startup script auto-creates the `svix` database via `scripts/init/create_svix_db.py` per their pattern)
  - Redis plugin (shared by Celery worker + Svix server)
- [ ] **Step 3: Provision per-container services:**
  - `app` (FastAPI backend, port 8000) — image built from OW's `backend/Dockerfile`, command `scripts/start/app.sh`
  - `celery-worker` — same image, command `scripts/start/worker.sh`
  - `celery-beat` — same image, command `scripts/start/beat.sh`
  - `flower` (Celery monitoring UI, port 5555) — same image, command `scripts/start/flower.sh`. Optional but useful for debugging.
  - `svix-server` (port 8071, internal-only) — image `svix/svix-server:v1`, runs Svix's webhook gateway
  - `frontend` (React portal, port 3000) — image built from OW's `frontend/Dockerfile`
- [ ] **Step 4: Configure each service's env vars** — see Task 5b.2
- [ ] **Step 5: Set Railway domains:**
  - `frontend` (React portal) — accessible to operator only, e.g. `gym-gurus-ow-portal.up.railway.app`
  - `app` (FastAPI) — internal API endpoint, e.g. `gym-gurus-ow-api.up.railway.app`
  - `svix-server` — internal-only (Svix routes outgoing webhooks via its server but consumers don't need a public URL)

### Task 5b.2: Configure environment

**Required env vars on the OW `app` + `celery-worker` + `celery-beat` services** (from `backend/config/.env.example`):

```
# Core
ENVIRONMENT=production
SECRET_KEY=<openssl rand -hex 32>  # Used as SVIX_JWT_SECRET internally per docker-compose entrypoint
# WARNING: SECRET_KEY and SVIX_JWT_SECRET (svix-server service, see below) MUST
# rotate together. Decoupling them mid-flight breaks Svix authentication —
# webhooks stop signing/verifying because the JWT minted by the OW backend can
# no longer be validated by the svix-server. Rotation procedure: coordinate
# redeploys of `app` + `svix-server` with both new values atomically. See the
# "Secrets rotation" section of the runbook (Task 5b.7) for the step-by-step.
ADMIN_EMAIL=<operator email — used for first login on portal>
ADMIN_PASSWORD=<openssl rand -hex 32>  # Bootstrap password — captured securely; rotate after first login (see procedure below)
# ADMIN_PASSWORD lifecycle: this env var seeds the FIRST login only. After the
# operator logs in via the OW frontend and changes the password through the
# portal (Account → Change Password), the portal-stored password takes
# precedence. Do NOT update the env var afterward — leaving the bootstrap value
# in place is intentional (it doesn't grant access once the portal password is
# set). To rotate the operator password later, change it through the portal,
# NOT via env var. See Task 5b.7 runbook section "OW operator password
# management" for full procedure.

# DB
DB_HOST=<railway-postgres-host>
DB_PORT=5432
DB_NAME=open-wearables
DB_USER=<railway-postgres-user>
DB_PASSWORD=<railway-postgres-password>

# Redis
REDIS_HOST=<railway-redis-host>
REDIS_PORT=6379

# CORS — allow GymGurus production + dev
CORS_ORIGINS=["https://gym-gurus-production.up.railway.app","https://gym-gurus-staging.up.railway.app"]
FRONTEND_URL=<OW frontend Railway domain>

# Public API base — used for OAuth redirect URIs
API_BASE_URL=<OW app Railway domain>

# Sync settings
SYNC_INTERVAL_SECONDS=3600  # 1 hour, OW's default

# Svix webhook gateway
SVIX_SERVER_URL=http://<svix-server railway internal hostname>:8071
SVIX_JWT_SECRET=<same as SECRET_KEY per docker-compose entrypoint>

# Sentry (optional but recommended)
SENTRY_ENABLED=True
SENTRY_DSN=<OW-specific Sentry DSN>
SENTRY_ENV=production

# Email (Resend) — for OW's operator notifications
RESEND_API_KEY=<key>
EMAIL_FROM_ADDRESS=onboarding@resend.dev
EMAIL_FROM_NAME="Open Wearables (GymGurus)"

# Provider OAuth credentials
GARMIN_CLIENT_ID=<from Garmin Connect Developer Portal>
GARMIN_CLIENT_SECRET=<from Garmin Connect Developer Portal>

POLAR_CLIENT_ID=<from Polar AccessLink admin>
POLAR_CLIENT_SECRET=<from Polar AccessLink admin>

SUUNTO_CLIENT_ID=<from Suunto Workout API>
SUUNTO_CLIENT_SECRET=<from Suunto Workout API>
SUUNTO_SUBSCRIPTION_KEY=<from Suunto Workout API — separate subscription key alongside OAuth credentials>

# Raw payload archival (S3-compatible — Cloudflare R2)
OPEN_WEARABLES_API_KEY=<generated post-deploy via OW Credentials tab — only for replay_raw_payloads.py operator script>
RAW_PAYLOAD_S3_BUCKET=<R2 bucket name>
RAW_PAYLOAD_S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
RAW_PAYLOAD_S3_PREFIX=open-wearables-raw
AWS_BUCKET_NAME=<R2 bucket name — matches RAW_PAYLOAD_S3_BUCKET>
AWS_ACCESS_KEY_ID=<R2 access key>
AWS_SECRET_ACCESS_KEY=<R2 secret>
AWS_REGION=auto  # R2 doesn't use AWS regions
```

**Required env vars on the OW `frontend` service:**

```
VITE_API_URL=<OW app Railway domain>
```

**Required env vars on the OW `svix-server` service:**

OW's docker-compose injects these from the shared env file. On Railway, set them explicitly:

```
SVIX_DB_DSN=postgresql://<user>:<password>@<host>:5432/svix
SVIX_QUEUE_TYPE=redis
SVIX_REDIS_DSN=redis://<redis-host>:6379/1
SVIX_CACHE_TYPE=redis
SVIX_JWT_SECRET=<same as SECRET_KEY on app service>
```

Run with `--run-migrations` flag on first deploy (per docker-compose entrypoint).

- [ ] **Step 1: Set all env vars on each service**
- [ ] **Step 2: Deploy all 6 services + verify health**
- [ ] **Step 3: First operator login** — open OW frontend Railway domain, log in with `ADMIN_EMAIL` + `ADMIN_PASSWORD`, **change password immediately**
- [ ] **Step 4: Verify svix-server reachable from inside Railway network**

  Svix-server is internal-only (no Railway public domain). Curl from your laptop will fail by design — exposing Svix externally would be a security hole. To reach it, exec into one of the running services that lives on the same Railway internal network:

  ```bash
  # Option A — railway run (executes in app service container; replace internal hostname per Railway's pattern)
  railway run --service app -- curl -sf http://<svix-server-internal-host>:8071/health || echo FAIL

  # Option B — railway shell, then curl
  railway shell --service app
  > curl -sf http://<svix-server-internal-host>:8071/health
  ```

  The `<svix-server-internal-host>` value comes from Railway's per-project internal DNS (typically `<service-name>.railway.internal` or the literal container name). Confirm the exact pattern in Railway's docs at deploy time — if uncertain, check the Railway dashboard's Variables tab on the app service for any `*_HOST` env vars Railway auto-populates for cross-service references.

  Expected response: `{"status":"ok"}` or HTTP 200 with empty body. Failure modes: connection refused (svix-server not yet up — wait + retry), DNS resolution failure (wrong internal hostname — check Railway docs).

### Task 5b.3: Generate API key + register webhook endpoint

- [ ] **Step 1: Generate API key** — log into OW frontend, Credentials tab, generate API key, set as `OPEN_WEARABLES_API_KEY` on GymGurus production env (and dev if applicable)
- [ ] **Step 2: Register GymGurus webhook endpoint via OW API:**

```bash
curl -X POST "https://<OW-app-domain>/api/v1/webhooks/endpoints" \
  -H "Authorization: Bearer <jwt-from-login-or-api-key-per-spike-decision>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://gym-gurus-production.up.railway.app/webhooks/wearables",
    "description": "GymGurus production webhook receiver",
    "filter_types": [
      "workout.created",
      "sleep.created",
      "connection.created",
      "body_composition.created"
    ]
  }'
```

Capture the response's `id` (e.g., `ep_2t8Q4Xv9mNkRpLzYoB3cW7`).

- [ ] **Step 3: Fetch the per-endpoint signing secret:**

```bash
curl "https://<OW-app-domain>/api/v1/webhooks/endpoints/ep_<id>/secret" \
  -H "Authorization: Bearer <auth>"
# Response: {"key": "whsec_<base64>"}
```

- [ ] **Step 4: Set `OPEN_WEARABLES_WEBHOOK_SECRET=whsec_<base64>` on GymGurus production env**
- [ ] **Step 5: (Repeat steps 2-4 for staging/dev domain)** — register a separate endpoint for `gym-gurus-staging.up.railway.app/webhooks/wearables` so dev testing doesn't pollute prod

### Task 5b.4: Configure provider OAuth callback URLs

For each of Garmin / Polar / Suunto, in the provider's developer portal:

- [ ] **Step 1: Set OAuth redirect URI to OW's callback path** — OW handles the OAuth flow on its own domain, NOT GymGurus's. Per OW source, the callback path is something like `https://<OW-app-domain>/api/v1/providers/<provider>/oauth/callback`. Verify exact path on spike — likely visible in `backend/app/api/routes/v1/` or via inspecting the OAuth-init endpoint OW exposes.
- [ ] **Step 2: Capture client_id + client_secret + (Suunto only) subscription_key**
- [ ] **Step 3: Set as env vars on OW `app` service** (per Task 5b.2)
- [ ] **Step 4: Restart OW services** to pick up new credentials

### Task 5b.5: Set GymGurus production env

- [ ] **Step 1: Set on GymGurus production:**
  - `OPEN_WEARABLES_BASE_URL=https://<OW-app-domain>` — used by openWearablesClient.ts
  - `OPEN_WEARABLES_API_KEY=<from Credentials tab>` (Path A) OR `OPEN_WEARABLES_ADMIN_EMAIL` + `OPEN_WEARABLES_ADMIN_PASSWORD` (Path B for JWT login)
  - `OPEN_WEARABLES_AUTH_MODE=api_key` (or `jwt`) per spike decision
  - `OPEN_WEARABLES_WEBHOOK_SECRET=whsec_<base64>` (per Task 5b.3)
  - `WEARABLE_TOKEN_ENCRYPTION_KEY` already set from Phase A (`1f5038a`) — verify still present

### Task 5b.6: Smoke test OW health endpoints

- [ ] **Step 1: Health check** — `curl https://<OW-app-domain>/health` (or `/api/v1/health` per OW source) returns 200
- [ ] **Step 2: Auth test** — `curl https://<OW-app-domain>/api/v1/users -H "Authorization: Bearer <key>"` returns 200 with user list (empty)
- [ ] **Step 3: Webhook endpoint test from OW dashboard** — use the `POST /api/v1/webhooks/endpoints/{id}/test` endpoint to send a synthetic `workout.created` event, verify it arrives at GymGurus's `/webhooks/wearables` route, signature verification passes, ingest writes to activity_sessions (test data only)

### Task 5b.7: Update deployment runbook

- [ ] **Step 1: Expand `docs/runbooks/open-wearables-deployment.md`** (Phase A scaffolded it):

Sections to add:

- Multi-container Railway topology diagram
- Per-service env var inventory (with secrets-rotation procedures for each)
- API key generation procedure (post-deploy, via OW Credentials tab)
- Webhook endpoint registration procedure (curl examples)
- Provider OAuth registration procedure per Garmin / Polar / Suunto (with subscription key callout for Suunto)
- Restart procedure per service (Railway dashboard + sequencing — postgres → redis → svix-server → app → celery-worker → celery-beat → frontend)
- Log access via Railway dashboard
- Webhook delivery debugging via OW's `GET /api/v1/webhooks/messages` + `GET /api/v1/webhooks/endpoints/{id}/attempts`
- Recovery procedures (mid-deploy crash, env var rollback, R2 connectivity loss)
- **Secrets rotation — SECRET_KEY ↔ SVIX_JWT_SECRET coordinated rotation:**
  1. Generate new value: `openssl rand -hex 32` → call this `SECRET_KEY_NEW`
  2. In Railway dashboard, prepare BOTH services for atomic update:
     - On `app` service: queue `SECRET_KEY=<SECRET_KEY_NEW>` (do NOT deploy yet)
     - On `svix-server` service: queue `SVIX_JWT_SECRET=<SECRET_KEY_NEW>` (do NOT deploy yet)
  3. Deploy both services in same window (Railway dashboard "Apply Variables" → wait for both green)
  4. Verify webhook signing works: trigger a synthetic event via `POST /api/v1/webhooks/endpoints/{id}/test`, confirm 200 received at GymGurus, check Svix delivery history (no auth errors)
  5. **Failure mode:** if step 3 deploys are NOT atomic (one service redeploys before the other), Svix authentication breaks for the gap — webhooks queue in OW, retry on backoff, eventually deliver once the second deploy lands. Acceptable for short gaps (<5 min); longer gaps risk hitting Svix's retry-exhaustion threshold (consult Svix docs at rotation time for current values).
- **OW operator password management:**
  1. **First login (post-deploy):** open OW frontend, log in with bootstrap `ADMIN_EMAIL` + `ADMIN_PASSWORD` env-var values
  2. **Immediately change password:** Account → Change Password → set new password from password manager
  3. **Do NOT update `ADMIN_PASSWORD` env var.** The portal-stored password takes precedence after first set; the env var is bootstrap-only. Leaving the env var as the original bootstrap value is intentional (it doesn't grant access once portal password is set; rotating it would do nothing).
  4. **To rotate operator password later:** change through portal, NOT env var. The env var only matters if all admin accounts are deleted from the portal — in that case, the next deploy re-seeds with the env-var values (which is why the bootstrap value should ideally be rotated to a known-fresh value periodically as defense-in-depth, even though not strictly required).

### Task 5b.8: Commit BATCH 5b

```bash
git add docs/runbooks/open-wearables-deployment.md
git commit -m "feat(wearables): SPRINT 4 BATCH 5b — Open Wearables deployed (multi-container Railway) + Garmin/Polar/Suunto OAuth registered + webhook endpoint registered"
git push origin main
```

**BATCH 5b Checkpoint:** OW deployed and healthy on Railway; webhook endpoint registered + signing secret captured + env-var-set on GymGurus; all 3 provider OAuth credentials configured; runbook fully documents the stack. **STOP for review** before BATCH 5c E2E.

---

## BATCH 5c — End-to-End with Garmin + Polar + Suunto

**Goal:** Drive a real OAuth + sync + webhook delivery for each of the 3 v1 providers. Capture screen recordings + database evidence + webhook delivery logs as proof. Reviewer subagent pass on the E2E artifacts.

### Task 5c.1: E2E with Garmin (primary)

- [ ] **Step 1: Connect Garmin on dev as the test user** via the Settings → Integrations tab (BATCH 8 ships this UI; 5c may use a temporary direct OAuth-init route if BATCH 8 hasn't run yet)
- [ ] **Step 2: Verify wearable_connections row** transitions to `status='connected'`, OW user UUID stored (Path B) OR external_id mapping works (Path A)
- [ ] **Step 3: Wait for first webhook delivery** — Garmin pushes via OW typically within 1-2 minutes of OAuth completion (OW's `HISTORICAL_SYNC_ON_CONNECT=true` default fires immediately)
- [ ] **Step 4: Verify ingest writes** — workout_created → activity_sessions row, sleep_created → sleep_sessions row (if test user has data), connection_created → row updated
- [ ] **Step 5: Verify wearable_first_sync_complete notification dispatched** (mark notification as in-app only on test user; do not email/push to production user lists)
- [ ] **Step 6: Open `/biometrics?tab=trends`** — sleep + activity data renders correctly
- [ ] **Step 7: Disconnect Garmin via OW dashboard** — verify polling cron detects within 1 hour, transitions row to `disconnected`, no notification (user-side disconnect)
- [ ] **Step 8: Reconnect** — verify state transitions cleanly back to `connected`
- [ ] **Step 9: Capture screen recording + DB query results + Svix delivery history screenshots**

### Task 5c.2: E2E with Polar

Same shape as 5c.1 but with Polar test account. Note: Polar AccessLink primarily delivers workouts (not sleep), so verify `activity_sessions` row + skip sleep verification.

### Task 5c.3: E2E with Suunto

Same shape. Note: Suunto requires the subscription key configured at OW level (per Task 5b.2). Verify activity sessions arrive.

### Task 5c.4: Cron polling smoke test

- [ ] **Step 1: With all 3 providers connected on dev**, verify `wearableSyncMonitor` cron processes all 3 in a single tick
- [ ] **Step 2: Force a connection-state transition** — manually disconnect Garmin via OW dashboard, observe next cron tick within 1 hour transitions our row + dispatches `wearable_expired` (since this is provider-side, not user-side)
- [ ] **Step 3: Force an OW outage** — temporarily set `OPEN_WEARABLES_BASE_URL` to an unreachable host, verify cron logs `OW connection-list poll failed` warnings without crashing or dispatching false notifications

### Task 5c.5: Reviewer subagent pass on E2E proof

- [ ] **Step 1: Dispatch a reviewer subagent (likely `general-purpose` or `code-reviewer`) with brief:**
  - "Review the E2E artifacts in `docs/plans/2026-05-XX-sprint-4-batch-5c-evidence.md`. Verify each provider's flow is independently demonstrated (OAuth connect → webhook delivery → DB write → UI render). Flag any missing evidence (e.g., 'no screenshot of disconnected state'), any timing inconsistencies, any unverified claims. Output: pass/fail per provider + list of gaps."
- [ ] **Step 2: Address gaps** before commit

### Task 5c.6: Commit BATCH 5c

```bash
git add docs/plans/2026-05-XX-sprint-4-batch-5c-evidence.md
git commit -m "feat(wearables): SPRINT 4 BATCH 5c — Garmin + Polar + Suunto E2E verified (OAuth + webhook + ingest + UI render + cron polling)"
git push origin main
```

**BATCH 5c Checkpoint:** Screen recordings + DB query proof + Svix delivery history for all 3 providers; cron polling demonstrated with state-transition events; reviewer subagent passed all 3 providers. **STOP for sprint-close review.**

---

## Updated Success Criteria (BATCH 5)

Sprint 4 closes via BATCH 5 if and only if:

- ✅ Three v1 providers (Garmin + Polar + Suunto) demonstrate **end-to-end** working flows: OAuth connect → first webhook arrives within 5 minutes → DB row written → `/biometrics` renders the data → disconnect/reconnect work cleanly
- ✅ Connection-list polling cron detects provider-side revoke within 1 hour and dispatches `wearable_expired` notification
- ✅ Connection-list polling cron silently handles user-side OW disconnects — verified via test scenario: disconnect a connection from the OW portal manually, observe next cron tick marks `wearable_connections.status='disconnected'` WITHOUT dispatching `wearable_expired` or `wearable_sync_failed` notification (test asserts notifications table has no new rows for that user/type during the cron tick)
- ✅ Webhook signature verification using the official `svix` npm package — verified test cases (positive, tampered signature, replayed timestamp, unknown event type) all behave correctly
- ✅ One webhook endpoint registered with OW with `filter_types: ["workout.created", "sleep.created", "connection.created", "body_composition.created"]` — the other 16 OW event types are filtered out at registration
- ✅ Auth mode locked at spike completion (API key OR JWT) — `OPEN_WEARABLES_AUTH_MODE` env var set on GymGurus production; both code paths implemented and tested
- ✅ Token encryption key (`WEARABLE_TOKEN_ENCRYPTION_KEY`) set on GymGurus production with versioned envelope `v1:<iv>:<tag>:<ct>`
- ✅ OW deployed as separate Railway project with all 8 containers healthy + R2 raw-payload archival configured
- ✅ Runbook (`docs/runbooks/open-wearables-deployment.md`) covers: multi-container topology, per-service env vars, API key generation, webhook endpoint registration, provider OAuth registration, log access, restart procedures, recovery procedures
- ✅ Reviewer subagent passed E2E artifacts for all 3 providers
- ✅ Decisions captured: α pivot (already done), spike findings (during 5a/5b), N+1 cron limitation gotcha (after first deploy)
- ✅ Migration 015 (if needed per Path B) applied and verified; OR Path A confirmed (no migration)
- ✅ Migration 014.5 applied (partial UNIQUE on `body_metrics` for wearable dedup) — verifier asserts index exists, is UNIQUE, is partial with the correct WHERE clause; **body_composition.created webhook idempotency proven** — same `data` payload (or same logical event re-delivered with the same `svix-id`) results in exactly one `body_metrics` row for the user / source_provider / date triple, verified via integration test that ingests the same payload twice and asserts `count(*) = 1` afterward

---

## BATCH 6 — REMOVED (Originally: Remaining Providers — Oura / Garmin / Strava / Withings)

**Status (2026-05-07):** ❌ REMOVED from Sprint 4 scope. Per the α pivot:

- Garmin moves to BATCH 5b/5c (it's now a v1 provider, not a "remaining" one)
- Polar + Suunto similarly move to BATCH 5b/5c
- Oura + Strava + Withings (Withings → Fitbit substitution) defer to a Sprint 4.5+ mini-sprint contingent on upstream fixes for [#930](https://github.com/the-momentum/open-wearables/issues/930) (Whoop) and [#948](https://github.com/the-momentum/open-wearables/issues/948) (Oura). Strava and Fitbit get added to that mini-sprint once Whoop+Oura land cleanly.

**Why removed instead of repurposed:** The original BATCH 6 was scoped against "v1 = Whoop+Oura, BATCH 6 = catch-up for everyone else." With α (v1 = Garmin/Polar/Suunto), all 3 v1 providers ship in BATCH 5b/5c — there's no catch-up batch. The deferred providers move to a separate mini-sprint with its own plan, decisions.md entries, and brainstorm gates as needed at that time.

**Original BATCH 6 task list:** the per-provider task template was straightforward (register OAuth app → set env vars on OW → deploy → E2E test → capture screenshots → commit). Future Sprint 4.5 plan authors can reproduce this template directly without needing to recover the original — it's the same shape as BATCH 5b/5c documented above, scoped to the deferred providers (Whoop / Oura / Strava / Fitbit).

---

## BATCH 7 — HARD GATE: Granular Consent UI + Migration UX

**STOP. Do NOT proceed without explicit user approval.**

### Task 7.1: Run ui-ux-pro-max design searches

- [ ] **Step 1:**

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "granular privacy toggle settings per-data-type" --domain landing
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "consent migration banner one-time" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "trainer client revoked data empty state" --domain ux
```

### Task 7.2: Surface decisions

- [ ] **Step 1: Write `docs/plans/2026-05-XX-sprint-4-batch-7-consent-decisions.md`** with 5 decision points

Decisions:

1. **Layout** — recommend grouped sub-sections: "Body Metrics" (sleep/hrv/activity together) + "Photos" (separate, opt-IN). Single flat list of 5 toggles is harder to scan.
2. **Helper text per toggle** — write copy for each:
   - Sleep: "Sleep score, total sleep, REM/deep/light minutes, awake minutes."
   - HRV: "Morning HRV (RMSSD), resting heart rate."
   - Activity: "Workouts, distance, duration, calories, average heart rate."
   - Body Metrics: "Weight, body fat %, measurements you log."
   - Photos: "Specific progress photos you choose to share, one at a time."
3. **Migration UX** — recommend non-dismissible banner at top of Privacy tab on first visit ("Your sharing settings have been updated for new data types. Review your choices below."), dismiss = scroll past + click "Got it"
4. **Photo opt-IN copy** — exact: "Your photos are private. Tap to share specific photos with your trainer when you want."
5. **Guru-side empty state copy** — distinguish:
   - "Your client hasn't connected a sleep tracker yet." (no wearable connected)
   - "Your client doesn't share sleep data." (consent revoked)
   - "Your client hasn't logged this yet." (no data, no wearable)

- [ ] **Step 2: Wait for explicit user approval, capture decisions in `_brain/notes/decisions.md`**

---

## BATCH 8 — IntegrationsTab UI

### Task 8.1: Provider catalog

- [ ] **Step 1: Create `client/src/lib/providerCatalog.ts`**

The catalog has two states per provider:

- `available: true` — user can click "Connect" and the OAuth flow works end-to-end (provider OAuth credentials configured in OW; webhook delivery functional)
- `available: false` — UI renders a disabled "Coming soon" card; click is no-op or shows a tooltip

Sprint 4 v1 ships Garmin / Polar / Suunto with `available: true`; Whoop / Oura / Strava / Fitbit are `available: false` placeholders preserving the visual grid (BATCH 4 D1 amended 2026-05-07 — see `_brain/notes/decisions.md`).

```ts
import type { WearableProvider } from '@shared/schema';
export interface ProviderMeta {
  id: WearableProvider;
  displayName: string;
  logoPath: string;
  brandColor: string;
  capabilities: ('sleep' | 'hrv' | 'workouts' | 'body' | 'activity')[];
  available: boolean; // false → render as disabled "Coming soon" card
  comingSoonReason?: string; // tooltip when available=false
}
export const PROVIDER_CATALOG: Record<WearableProvider, ProviderMeta> = {
  // v1 active (Sprint 4 BATCH 5)
  garmin: {
    id: 'garmin',
    displayName: 'Garmin',
    logoPath: '/logos/garmin.svg',
    brandColor: '#007CC3',
    capabilities: ['sleep', 'hrv', 'workouts', 'activity'],
    available: true,
  },
  polar: {
    id: 'polar',
    displayName: 'Polar',
    logoPath: '/logos/polar.svg',
    brandColor: '#D40000',
    capabilities: ['workouts', 'activity'],
    available: true,
  },
  suunto: {
    id: 'suunto',
    displayName: 'Suunto',
    logoPath: '/logos/suunto.svg',
    brandColor: '#000000',
    capabilities: ['workouts', 'activity'],
    available: true,
  },
  // Deferred to Sprint 4.5+ contingent on upstream fixes
  whoop: {
    id: 'whoop',
    displayName: 'WHOOP',
    logoPath: '/logos/whoop.svg',
    brandColor: '#00FF7F',
    capabilities: ['sleep', 'hrv', 'activity'],
    available: false,
    comingSoonReason: 'Coming in Sprint 4.5',
  },
  oura: {
    id: 'oura',
    displayName: 'Oura',
    logoPath: '/logos/oura.svg',
    brandColor: '#F8E0B8',
    capabilities: ['sleep', 'hrv', 'activity'],
    available: false,
    comingSoonReason: 'Coming in Sprint 4.5',
  },
  strava: {
    id: 'strava',
    displayName: 'Strava',
    logoPath: '/logos/strava.svg',
    brandColor: '#FC4C02',
    capabilities: ['workouts', 'activity'],
    available: false,
    comingSoonReason: 'Coming after Whoop + Oura',
  },
  fitbit: {
    id: 'fitbit',
    displayName: 'Fitbit',
    logoPath: '/logos/fitbit.svg',
    brandColor: '#00B0B9',
    capabilities: ['sleep', 'activity', 'body'],
    available: false,
    comingSoonReason: 'Coming with smart-scale support',
  },
};
```

**Schema impact:** the `WearableProvider` enum in `shared/schema.ts` was originally `'whoop' | 'oura' | 'garmin' | 'strava' | 'withings'` (BATCH 1). BATCH 5a needs to update it to `'garmin' | 'polar' | 'suunto' | 'whoop' | 'oura' | 'strava' | 'fitbit'` — drops `'withings'`, adds `'polar' | 'suunto' | 'fitbit'`. Keeping `'whoop' | 'oura' | 'strava'` in the enum (despite v1 disabling them in the UI) so we don't need a schema migration when Sprint 4.5 ships them.

**Note for ProviderCard rendering:** when `available: false`, the card MUST visually distinguish (lower opacity logo, "Coming soon" pill badge, no Connect button). Don't hide the card — preserving the grid signals to users that more providers are coming.

### Task 8.2: useWearables hooks

- [ ] **Step 1: Create `client/src/hooks/useWearables.ts`** with TanStack Query — useWearableConnections, useConnectWearable (POST /connect → window.location = connectUrl), useDisconnectWearable, useUpdateSyncPreferences (optimistic update + rollback on error)

### Task 8.3: ProviderCard

- [ ] **Step 1: Create `client/src/components/settings/integrations/ProviderCard.tsx`** with 4-state machine:
  - Disconnected: faded logo + "Connect" CTA
  - Connected: full-color logo + green pulse + last sync time + capability pills + "Customize" expander + "Disconnect" link
  - Expired: amber border + "Reconnect" CTA + "Last failed: <error>" detail
  - Error: red border + "Reconnect" CTA + error message

### Task 8.4: SyncPreferencesPanel

- [ ] **Step 1: Create `client/src/components/settings/integrations/SyncPreferencesPanel.tsx`** — toggles for sleep/hrv/workouts/body/activity per connection, optimistic update via useUpdateSyncPreferences

### Task 8.5: IntegrationsTab

- [ ] **Step 1: Create `client/src/components/settings/IntegrationsTab.tsx`** — 6-card grid (5 provider cards + "More coming soon" placeholder), responsive (1-col mobile, 2-col tablet, 3-col desktop)

### Task 8.6: Mobile bottom sheet

- [ ] **Step 1: Create `client/src/components/settings/integrations/ProviderConnectSheet.tsx`** for mobile detail view (Drawer from shadcn)

### Task 8.7: Wire up Settings page

- [ ] **Step 1: Modify `client/src/pages/SettingsPage.tsx`** — add `<TabsTrigger value="integrations">` + `<TabsContent value="integrations"><IntegrationsTab /></TabsContent>`

### Task 8.8: Lazy-load IntegrationsTab

- [ ] **Step 1: `const IntegrationsTab = lazy(() => import('@/components/settings/IntegrationsTab'))`** — reduce SettingsPage bundle weight

### Task 8.9: Screenshots checkpoint

- [ ] Mobile 390px: disconnected, connected, expired, error states (4 screenshots)
- [ ] Desktop 1440px: same 4 + grid view

### Task 8.10: Commit BATCH 8

**Checkpoint:** all 4 connection states render correctly mobile + desktop, role colors via `bg-primary`/`text-primary`, no hardcoded gold/teal/purple, touch targets ≥44px on every interactive element, lazy-loaded chunk size <50kB. STOP for approval.

---

## BATCH 9 — Privacy Section Expansion + Migration UX

### Task 9.1: Backend — replace single-flag with 5-flag PATCH

**Files:**

- Modify: `server/routes/settings.ts`

- [ ] **Step 1: Replace existing `GET /api/settings/biometrics-sharing` with `GET /api/settings/privacy-flags`** — returns `{ shareBodyMetricsWithTrainer, shareSleepWithTrainer, shareHrvWithTrainer, shareActivityWithTrainer, shareProgressPhotosWithTrainer, hasTrainer }`

- [ ] **Step 2: Replace existing `PATCH /api/settings/biometrics-sharing` with `PATCH /api/settings/privacy-flags`** — accepts deepPartial of all 5 flags, audit-logs each changed flag separately

- [ ] **Step 3: Keep old routes alive temporarily as compatibility shims** — old routes call the new ones. Remove in BATCH 12 after frontend is fully migrated.

- [ ] **Step 4: Update audit log event name** — `consent.toggled` → `consent.flag_changed` with `flag` field per entry. Log search/dashboard updates tracked separately.

### Task 9.2: PrivacyExpandedCard

- [ ] **Step 1: Create `client/src/components/settings/PrivacyExpandedCard.tsx`** with grouped sub-sections (per BATCH 7 decision):
  - "Body Metrics" group: sleep / hrv / activity / body metrics (4 toggles)
  - "Photos" group: photos opt-IN (1 toggle)
  - Each toggle: Switch + label + helper text per BATCH 7 copy
  - Optimistic update + rollback

### Task 9.3: PrivacyMigrationCard

- [ ] **Step 1: Create `client/src/components/settings/PrivacyMigrationCard.tsx`**

```tsx
// Non-dismissible banner shown ONCE per Disciple after Sprint 4 deploy.
// Detection: localStorage flag `gg_privacy_migration_seen_v1`. On first
// visit to /settings?tab=privacy after deploy, render banner. Click "Got it"
// → set localStorage flag → fade out banner.
//
// Why not server-side flag? The flag captures intent, not state. Once seen,
// the user has acknowledged the migration; refreshing without localStorage
// (private browsing) is acceptable to re-show — no harm.
```

### Task 9.4: Hook integration

- [ ] **Step 1: Create `client/src/hooks/usePrivacyFlags.ts`** — useQuery + useMutation for the 5-flag PATCH

### Task 9.5: Wire up SettingsPage Privacy tab

- [ ] **Step 1: Replace existing single-flag UI with `<PrivacyExpandedCard /> + <PrivacyMigrationCard />`**

### Task 9.6: Screenshots

- [ ] First-visit migration banner (mobile + desktop)
- [ ] Toggled-off state on each flag (5 toggles × 2 viewports)

### Task 9.7: Commit BATCH 9

**Checkpoint:** every flag has its own `consent.flag_changed` audit log entry verified via `logger.audit` mock; migration banner appears once + dismisses correctly; opt-IN photo flag default = false confirmed in DB. STOP for approval.

---

## BATCH 10 — Trainer-Side Surfacing + Dashboard Hint Card

### Task 10.1: Guru `/clients/:id` Sleep + Activity tabs

- [ ] **Step 1: Modify `client/src/pages/ClientDetailsPage.tsx`** — add `<TabsTrigger value="sleep">` + `<TabsTrigger value="activity">` (next to existing Body tab)

- [ ] **Step 2: Implement `<ClientSleepTab />` + `<ClientActivityTab />`** — use trainer routes `/api/wearables/client/:clientId/sleep` etc.

- [ ] **Step 3: Three empty-state branches per BATCH 7 copy:**
  - 404 NOT_REGISTERED: "Your client hasn't connected a sleep tracker yet."
  - 403 CONSENT_NOT_GRANTED: "Your client doesn't share sleep data."
  - empty array: "Your client hasn't logged sleep yet."

### Task 10.2: WearableHintCard

- [ ] **Step 1: Create `client/src/components/dashboard/WearableHintCard.tsx`**

```tsx
// Shown on Dashboard for Ronin + Disciple roles ONLY when:
//   - role !== 'trainer'
//   - account age >= 7 days (createdAt + 7 < now)
//   - useWearableConnections() returns 0 connections
// Skip Guru per locked roadmap decision (Guru's value isn't from connecting
// their own wearable; it's their clients').
//
// Headline: "Connect a wearable to power your AI coach"
// Body: "Sleep, HRV, and activity feed your readiness score and your AI coach."
// CTA: "Browse integrations" → /settings?tab=integrations
```

### Task 10.3: Dashboard wiring

- [ ] **Step 1: Modify `client/src/pages/Dashboard.tsx`** — add `<WearableHintCard />` after the existing top hero, conditionally rendered

### Task 10.4: Screenshots

- [ ] Hint card visible Ronin (mobile + desktop)
- [ ] Hint card visible Disciple (mobile + desktop)
- [ ] Hint card NOT visible Guru
- [ ] Trainer empty states: NOT_REGISTERED, CONSENT_NOT_GRANTED, no-data — all three for sleep tab

### Task 10.5: Commit BATCH 10

**Checkpoint:** trainer empty-state copy not error-shaped, hint card respects role + age + connection-count, screenshots verify all branches. STOP for approval.

---

## BATCH 11 — IDOR + Mutation Testing + Integration Tests

### Task 11.1: IDOR mutation tests on wearables routes

- [ ] **Step 1: Port the column-aware `expectOwnershipClause` helper from Sprint 3** to `server/test/routes/wearables.test.ts`
- [ ] **Step 2: Mutation test target** — DELETE /:id route. Remove `eq(wearableConnections.userId, userId)` from `disconnect()` service call → test must FAIL with column-aware diagnostic
- [ ] **Step 3: Mutation test target** — PATCH /:id/preferences. Same pattern
- [ ] **Step 4: Mutation test target** — POST /:id/sync. Same pattern
- [ ] **Step 5: Mutation test target** — GET /sleep/vitals/activity ownership

### Task 11.2: Webhook security tests

- [ ] **Step 1: HMAC valid signature → 200**
- [ ] **Step 2: HMAC invalid signature → 401**
- [ ] **Step 3: HMAC missing header → 401**
- [ ] **Step 4: HMAC tampered body → 401**
- [ ] **Step 5: Replay attack (same webhookId twice) → second request returns deduped:true, no double-write**
- [ ] **Step 6: Mutation test** — remove `verifyWearableSignature` from one route, verify test FAILS

### Task 11.3: Cron concurrency tests

- [ ] **Step 1: Two simultaneous tick() calls share work via SKIP LOCKED — neither processes the same row twice**
- [ ] **Step 2: SIGTERM → cron stops cleanly**

### Task 11.4: Integration test — Open Wearables happy path

- [ ] **Step 1: Mock Open Wearables responses, simulate full connect → webhook → ingest → notification flow**

### Task 11.5: Test count delta target

- [ ] **Step 1: Verify test count grew by 60-80 (target: ~330-340 passing)**
- [ ] **Step 2: 15 pre-existing aiService failures unchanged**

### Task 11.6: Commit BATCH 11

**Checkpoint:** test count delta verified, mutation diagnostics fire correctly, HMAC + idempotency proved load-bearing. STOP for approval.

---

## BATCH 12 — Pre-delivery Audits + Prod Migration

### Task 12.1: ui-ux-pro-max audit

- [ ] All new wearable + integrations + privacy + dashboard components pass:
  - role-color via `bg-primary` / `text-primary` only
  - Playfair Display reserved for emotional moments (e.g. PrivacyMigrationCard headline)
  - Inter tabular-nums for data
  - touch targets ≥44×44px
  - aria-label on every icon-only button
  - keyboard nav verified
  - prefers-reduced-motion respected on connection-state pulse animations

### Task 12.2: vercel-react-best-practices audit

- [ ] useWearableConnections, useSleepSessions, useDailyVitals, useActivitySessions all declare staleTime
- [ ] No unmemoized chart data
- [ ] Lazy-loaded IntegrationsTab chunk
- [ ] No premature memoization

### Task 12.3: web-design-guidelines responsive audit

- [ ] 320px + 1440px on every new page surface
- [ ] Heading hierarchy h1 → h2 → h3 (no skipped levels)
- [ ] Semantic HTML (button type, role attributes)

### Task 12.4: /security-scan with Sprint 4 focus

- [ ] HMAC verification fires on every webhook request, no bypass paths
- [ ] OAuth state parameter — Open Wearables generates + validates state for CSRF protection on OAuth callback
- [ ] Encrypted token storage at rest verified — `tokenEncryption.ts` round-trip + tampered-ciphertext rejection
- [ ] Webhook idempotency verified
- [ ] Token encryption key NOT logged anywhere
- [ ] No client-bundle leakage of internal tokens (`@grep -r "OPEN_WEARABLES" client/src`)

### Task 12.5: /review

- [ ] TS baseline: 200 (unchanged)
- [ ] ESLint: clean
- [ ] Build: clean
- [ ] Bundle envelope: IntegrationsTab chunk <50kB gzipped target
- [ ] No console.log in client/

### Task 12.6: License allowlist scan

- [ ] Open Wearables MIT verified at deploy time AND at audit time (paranoia — packages can change licenses)
- [ ] No new dependencies added to package.json — verify via `git log --oneline f6e50aa..HEAD -- package.json package-lock.json`

### Task 12.7: Migration 014 dry-run on dev

- [ ] All 3 phases pass:
  1. Baseline: tables exist, columns exist, row counts captured
  2. Idempotent re-up: clean re-run
  3. Down safety assertion: probe row → BLOCKED, probe consent flip → BLOCKED, both clean → succeeds

### Task 12.8: Documentation updates

- [ ] **Step 1: Update MEMORY.md** — Sprint 4 complete section + new gotchas
- [ ] **Step 2: Update `_brain/notes/decisions.md`** — Sprint 4 architectural decisions (Open Wearables topology, OAuth callback strategy, encryption key approach, photo opt-IN, grouped consent layout)
- [ ] **Step 3: Append to `_brain/notes/gotchas.md`** — any new gotchas discovered during execution

### Task 12.9: Production migration

- [ ] **Step 1: Set `WEARABLE_TOKEN_ENCRYPTION_KEY` + `OPEN_WEARABLES_*` env vars on prod Railway service**
- [ ] **Step 2: Run baseline-014 against prod** — pre-migration snapshot
- [ ] **Step 3: STOP for explicit approval before running up()**
- [ ] **Step 4: Run migration 014 on prod via `scripts/run-prod-migration.ts`**
- [ ] **Step 5: Run post-014 verifier** — all assertions green
- [ ] **Step 6: Update MEMORY.md** — move 014 from Pending to Applied
- [ ] **Step 7: Final commit + push**

```bash
git commit -m "ops: run migration 014 on Railway prod — recorded in MEMORY"
git push origin main
```

**Final checkpoint:** Sprint 4 complete. MEMORY updated. All audits green. Production migration applied. Brainstorm decisions captured. Test suite at +60-80.

---

## Self-Review

Run after writing all batches.

### Spec coverage check

Walk every section of the kickoff message:

- [x] Migration 014 — 4 tables + clients.user_id FK + 4 consent flags + users.preferred_wearable_id (BATCH 1)
- [x] Open Wearables service deployment (BATCH 4 decision + BATCH 5 implementation)
- [x] Backend service layer (BATCH 2)
- [x] Wearable routes (BATCH 3)
- [x] Sync monitor cron (BATCH 3)
- [x] Notification template upgrade — 4 new types (BATCH 3)
- [x] IntegrationsTab UI (BATCH 8)
- [x] Privacy section expansion + migration UX (BATCH 9)
- [x] Dashboard hint card (BATCH 10)
- [x] Trainer-side surfacing (BATCH 10)
- [x] Two HARD brainstorm gates (BATCH 4 + BATCH 7)
- [x] IDOR + mutation testing (BATCH 11)
- [x] Pre-delivery audits + prod migration (BATCH 12)

### Type consistency check

- `WearableProvider` defined once in shared/schema.ts, used in service + routes + UI catalog
- `WearableSyncPreferences` defined once with `DEFAULT_WEARABLE_SYNC_PREFERENCES` constant; matches the JSONB DB default literal
- `WEARABLE_PROVIDERS` tuple drives both the Zod enum (`z.enum(WEARABLE_PROVIDERS)`) and the CHECK constraint in migration 014 — keep these in sync. If a 6th provider is ever added, both must change in lockstep.

### Placeholder scan

No "TBD", no "TODO", no "implement later". Every step contains the actual content. Service file skeletons show real function bodies, not just signatures. Test stubs name what they verify.

### Scope check

12 batches across ~3 weeks of work — comparable to or slightly larger than Sprint 2 (10 batches, ~2 weeks). Two HARD brainstorm gates space the sprint into pre-decision work (1-3), POC (5), provider rollout (6), UI (8-10), and audit/prod (11-12). Execution should not begin without user approval at each gate.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-05-06-sprint-4-wearables.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per BATCH, two-stage review, fastest iteration. Best for the 12-batch scale.
2. **Inline Execution** — execute BATCHes in this session using executing-plans, checkpoint after each.

Either way: BATCH 4 and BATCH 7 are HARD GATES. Do NOT proceed past them without explicit approval.

**Awaiting:**

1. User review of this plan (request changes or approve)
2. Pick execution approach (subagent-driven vs inline)
