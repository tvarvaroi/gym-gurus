# Sprint 2 — Notification Engine + Cross-Device Units + R2 Orphan Cleanup

> **For Claude:** REQUIRED SUB-SKILL: superpowers:executing-plans for batch-by-batch execution. STOP at every checkpoint and present evidence before pushing. NEVER bundle batches except where explicitly noted.

**Created:** 2026-05-05
**Status:** Drafted, awaiting human approval before BATCH 1
**Source:** Sprint 2 kickoff brief (this conversation) + Q2-Q3 master roadmap Phase A Sprint 2
**Goal:** Make notifications real (delivery, not just rows) so every Sprint 3+ feature can hook into them. Plus pull two natural-fit items: cross-device unit consistency (server-persisted) and R2 orphan cleanup at account deletion.

---

## Architecture (3 sentences)

Web push v1 only — VAPID + browser `pushManager.subscribe` + a server-side fan-out service. Native FCM bridges land in Sprint 12 with the Capacitor shell, not now. The notification engine is layered: `notificationService.sendNotification(userId, type, data)` is the public seam, which writes the row, gates on category preferences, gates on quiet-hours-in-user-timezone, fans out to every active push subscription via `pushService.sendPush`, and falls through to email when push has zero successful deliveries AND email channel is on.

## Tech Stack

- **Backend:** `web-push` npm package (MIT-licensed, mature, no deps), Drizzle, Zod, Express, existing Resend integration for email fallback.
- **Frontend:** existing service worker at `client/public/sw.js` (already registered in `client/src/main.tsx:41`), TanStack Query for preference state, react-hook-form for the settings UI, shadcn primitives.
- **Schema:** migration `012_notification_engine` adds `push_subscriptions` table + `users.preferred_units` column + reshapes `users.notification_preferences` content via SQL backfill.
- **Cron:** lightweight `setInterval` job inside the same Node process for quiet-hours retry (no separate worker — Sprint 13 may extract).

---

## ⚠️ Blocking decisions to resolve (need human answers before BATCH 1)

These five questions shape the schema and core service. I'm proposing recommendations; tell me which to commit to.

### Q1. notification_preferences shape migration

**Discovery:** `users.notification_preferences` already exists as untyped jsonb (created by `migrations/0000_burly_yellow_claw.sql`). Today's shape: `{ email: true, push: true, sms: false }`. Sprint 2 spec wants `{ categories, quietHours, channels }`.

**Options:**

- **(a) [recommended]** In-place reshape with one-time SQL backfill in migration 012. Old `email` / `push` flags map into `channels` if present. SMS gets dropped (we don't have SMS infra). Categories all default `true`. Quiet hours default off.
- **(b)** Add `notification_preferences_v2 jsonb` and gradually migrate. Two columns coexist for a release.
- **(c)** Wipe everyone's preferences back to defaults.

**Recommendation: (a).** Cheapest, no double-column drift, no read-time fallback logic. The backfill is idempotent (we check the shape and only rewrite if old shape detected).

---

### Q2. notification type naming

**Discovery:** Existing `notifications.type` enum strings are snake_case_underscored (`workout_assigned`, `achievement_unlocked`, etc.) and 11 helper functions in `notificationService.ts` write rows with these exact strings. Sprint 2 spec proposes 11 new dotted templates (`workout.reminder`, `recovery.low`, etc.). They overlap conceptually but the strings disagree.

**Options:**

- **(a) [recommended]** Keep existing snake_case strings as-is. Introduce a separate `category` concept that maps `type → category` via a code-side lookup table. The 11 new templates from the brief get added with new types where there's no overlap (`recovery_low`, `sleep_summary`, `summary_weekly`) and reuse existing types where there is (`workout_assigned`, `achievement_unlocked`, `level_up`, `payment_received`, `client_joined`).
- **(b)** Rename all existing types to dotted. Breaking change to a write path with multiple call sites. New rows after the rename look fine, old rows still have old strings — UI has to handle both.

**Recommendation: (a).** Don't break the write path. The category gating (workouts / recovery / achievements / social / billing) is a SEPARATE concept from type — categories are coarse-grained for user toggles, types are fine-grained for templating.

---

### Q3. Quiet-hours queue mechanism

**Discovery:** spec says "if quiet hours: write notifications row but mark deliverAfter timestamp; do NOT push". The `notifications` table doesn't have a `deliverAfter` column.

**Options:**

- **(a) [recommended]** Add `deliver_after timestamp` + `delivered_at timestamp` columns to the existing `notifications` table in migration 012. Cron polls `WHERE deliver_after <= NOW() AND delivered_at IS NULL`, fans out, sets `delivered_at`.
- **(b)** Separate `notification_delivery_queue` table referenced from `notifications` via FK.
- **(c)** No quiet-hours queue — just drop notifications fired during quiet hours.

**Recommendation: (a).** Keep the data on one table. Two columns, partial index `(deliver_after) WHERE delivered_at IS NULL` for the cron query. Notifications fired outside quiet hours get `delivered_at = NOW()` immediately so they're filtered out of the cron's working set.

(c) was rejected because dropping a "you missed your workout" notification during quiet hours and never re-firing it = the user never sees it. The spec is correct: queue + retry.

---

### Q4. VAPID key handling

**Options:**

- **(a) [recommended]** Generate VAPID keys ONCE per environment (one for dev, one for prod). Store private key in Railway env vars only. Public key sent via `/api/notifications/vapid-public-key` to clients. Never rotate unless compromise suspected — rotation invalidates every existing subscription.
- **(b)** Use the same VAPID keypair for dev and prod. Simpler but mixes environments.

**Recommendation: (a).** I'll generate the dev pair locally during BATCH 1 (`npx web-push generate-vapid-keys`) and add to `.env.example` as placeholder. Prod keys generated separately and added to Railway via dashboard before BATCH 8 push.

---

### Q5. Push icon strategy

**Discovery:** Sprint 2 spec says "role-aware icon: gold/teal/purple SVG variants from existing assets." But web push notifications need PNG (or ICO), not SVG. We have `RoninIcon` / `GuruIcon` / `DiscipleIcon` as TSX SVG components, not as PNG files. Generating three role-coloured PNGs adds asset-pipeline work.

**Options:**

- **(a) [recommended]** v1: single neutral GG-monogram PNG icon for all roles. Title and body convey role context (e.g. "Way to go, Ronin — 30-day streak!"). Defer per-role icons to Sprint 12 native shell where icon support is much richer.
- **(b)** Generate three PNG variants (gold/purple/teal) at build time from the SVGs, look up the user's role server-side at send time, attach the matching icon URL.

**Recommendation: (a).** Native iOS/Android push (Sprint 12) supports rich icons natively; web push's icon UX is already minimal across browsers. Don't burn asset-pipeline budget on an interim feature.

---

## 🎨 BATCH 4 brainstorm gate (UI design proposals — answered later)

These five UI questions are deliberately deferred to BATCH 4 per the sprint brief — that batch is the HARD GATE. I'll present design proposals + screenshots/mockups in that batch and wait for explicit approval before implementing the Settings UI in BATCH 5.

- Permission prompt placement, timing, copy
- Quiet hours UI (mobile-first time picker, timezone picker)
- Test notification button placement + result feedback
- Active devices list (Revoke flow, last-used display, user-agent parsing)
- Email fallback toggle copy

---

## File structure (concrete change list)

### New files

- `server/migrations/012_notification_engine.ts` — schema migration
- `server/services/pushService.ts` — `sendPush(subscription, payload)` wrapper around web-push
- `server/services/notificationTemplates.ts` — 11 templates + type→category map
- `server/services/orphanCleanup.ts` — delete R2 objects on account deletion
- `server/services/userDeletion.ts` — orchestrate full account deletion (audit + R2 + Stripe + push subs)
- `server/services/notificationDispatcher.ts` — internal helper for fan-out (split from notificationService for testability)
- `server/jobs/cleanupExpiredQuietHours.ts` — `setInterval` cron started from server/index.ts at boot
- `client/src/lib/pushSubscription.ts` — browser-side subscribe/unsubscribe helpers
- `client/src/components/notifications/PushPermissionPrompt.tsx` — post-action permission ask
- `client/src/components/notifications/NotificationsTab.tsx` — Settings tab body
- `client/src/components/notifications/QuietHoursControl.tsx` — time + timezone picker
- `client/src/components/notifications/ActiveDevicesList.tsx` — devices list with Revoke
- `client/src/hooks/useNotificationPreferences.ts` — TanStack Query wrapper
- `client/src/hooks/useUnits.ts` — server-backed unit preference (replaces direct localStorage reads)
- `server/routes/notifications.test.ts` — IDOR + happy-path coverage
- `server/services/notificationDispatcher.test.ts` — quiet hours + category gating + email fallback unit tests

### Modified files

- `shared/schema.ts` — add `pushSubscriptions` table + `users.preferredUnits` column + tighter Zod for notification preferences shape
- `server/services/notificationService.ts` — extend with `sendNotification(userId, type, data)`, keep existing `notify*` helpers but route them through `sendNotification` so every existing call site gets push delivery for free
- `server/routes/notifications.ts` — add subscribe/preferences/test/vapid-public-key routes, all IDOR-safe + CSRF + rate-limited
- `server/routes/settings.ts` — add GET + PATCH `/api/settings/preferred-units`, extend `DELETE /account` to call `userDeletion.deleteUserAccount(userId)`
- `server/index.ts` — start the quiet-hours retry cron after `registerRoutes`
- `client/public/sw.js` — fix the `clients` lint bug (`self.clients`), add `pushsubscriptionchange` handler, harden push handler with tag/badge/icon/data
- `client/src/lib/units.ts` — keep existing API; getUnits/setUnits become async wrappers backed by server with localStorage fallback
- `client/src/pages/SettingsPage.tsx` — add Notifications tab (5th, between existing Notifications-stub and Privacy)
- `client/src/pages/BiometricsPage.tsx` — replace direct `getUnits()` with `useUnits()` hook
- `.env.example` — add VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
- `package.json` — add `web-push` (MIT-licensed)

### Untouched (verified)

- `client/src/main.tsx` — service worker registration already in place at line 41
- `server/middleware/auth.ts` / `csrf.ts` — DO NOT TOUCH
- `server/routes/webhooks.ts` — DO NOT TOUCH (Stripe raw body)
- `shared/schema.ts` notifications table structure — unchanged except for the two new columns described in Q3

---

## Schema delta (final, assuming Q1+Q3 recommendations accepted)

```ts
// shared/schema.ts additions

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: varchar('p256dh', { length: 200 }).notNull(),
    auth: varchar('auth', { length: 50 }).notNull(),
    userAgent: text('user_agent'),
    platform: varchar('platform', { length: 20 }).notNull(), // 'web' | 'ios_pwa' | 'android' | 'ios_native' | 'android_native'
    active: boolean('active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at'),
    failureCount: integer('failure_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_push_subs_user_active').on(table.userId, table.active), // partial WHERE active=true in SQL
    uniqueIndex('idx_push_subs_endpoint').on(table.endpoint),
  ]
);

// users table — add column
preferredUnits: varchar('preferred_units', { length: 10 }).notNull().default('metric'),

// notifications table — add two columns for quiet-hours queue
deliverAfter: timestamp('deliver_after'),  // NULL = deliver immediately
deliveredAt: timestamp('delivered_at'),    // NULL = pending; non-null = delivered (or eligible failure)
```

Migration 012 SQL ops:

1. `CREATE TABLE push_subscriptions ...` with indexes (partial unique on endpoint, partial composite on user_id WHERE active=true)
2. `ALTER TABLE users ADD COLUMN preferred_units VARCHAR(10) NOT NULL DEFAULT 'metric'`
3. `ALTER TABLE notifications ADD COLUMN deliver_after TIMESTAMP, ADD COLUMN delivered_at TIMESTAMP`
4. Backfill existing notification_preferences values from old `{email, push, sms}` to new shape:
   ```sql
   UPDATE users SET notification_preferences = jsonb_build_object(
     'categories', jsonb_build_object('workouts', true, 'recovery', true, 'achievements', true, 'social', true, 'billing', true),
     'quietHours', jsonb_build_object('enabled', false, 'start', '22:00', 'end', '08:00', 'timezone', 'UTC'),
     'channels', jsonb_build_object('push', COALESCE((notification_preferences->>'push')::boolean, true), 'email', COALESCE((notification_preferences->>'email')::boolean, false))
   )
   WHERE notification_preferences IS NULL OR NOT (notification_preferences ? 'categories');
   ```
5. Mark all existing `notifications` rows as already-delivered: `UPDATE notifications SET delivered_at = created_at WHERE delivered_at IS NULL`
   (because they were created before this column existed and their delivery was historically "instant write to DB" — we don't want the cron to re-fire them as pending pushes).

Down-migration safety assertions (per Sprint 1.5 BATCH 2 pattern):

- Refuse to run `down()` if any `push_subscriptions` row exists (data loss).
- Refuse to run `down()` if any user has `preferred_units != 'metric'` (data loss).
- Refuse to run `down()` if any non-empty `notification_preferences` has the new shape (`categories` key present) — would silently revert preferences to defaults.

---

## Notification preferences zod schema (canonical shape)

```ts
const NotificationPreferencesSchema = z.object({
  categories: z.object({
    workouts: z.boolean(),
    recovery: z.boolean(),
    achievements: z.boolean(),
    social: z.boolean(),
    billing: z.boolean(),
  }),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM 24h
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string(), // IANA name e.g. "Europe/Bucharest"
  }),
  channels: z.object({
    push: z.boolean(),
    email: z.boolean(),
  }),
});
```

PATCH endpoint accepts `Partial<NotificationPreferences>` via `.deepPartial()` so the UI can update one field without sending the whole object.

---

## Notification templates (final list, type→category mapping)

| Type (existing or new)                                                             | Category       | Title                       | Body                                                 | Action URL               |
| ---------------------------------------------------------------------------------- | -------------- | --------------------------- | ---------------------------------------------------- | ------------------------ |
| `workout_assigned` (existing)                                                      | `workouts`     | "New workout assigned"      | "{trainerName} assigned you {title}"                 | `/workouts/today`        |
| `workout_completed` (existing)                                                     | `social`       | "Workout completed"         | "{clientName} completed {title}"                     | `/clients/{id}`          |
| `workout_reminder` (NEW)                                                           | `workouts`     | "Time to train"             | "{title} starts in {minutes} minutes"                | `/workouts/today`        |
| `workout_missed` (NEW)                                                             | `workouts`     | "You missed {title}"        | "Reschedule or skip — your call."                    | `/programs/active`       |
| `session_reminder` (existing)                                                      | `workouts`     | "Session starting soon"     | "{title} starts at {time}"                           | `/schedule`              |
| `recovery_low` (NEW)                                                               | `recovery`     | "Low recovery alert"        | "Your readiness is {pct}%. Consider a deload today." | `/dashboard`             |
| `sleep_summary` (NEW)                                                              | `recovery`     | "Last night's sleep"        | "{hours}h, {pct}% quality. Score {score}."           | `/biometrics?tab=trends` |
| `personal_record` (existing)                                                       | `achievements` | "New PR!"                   | "{exerciseName}: {newRecord}"                        | `/progress`              |
| `achievement_unlocked` (existing)                                                  | `achievements` | "Achievement unlocked!"     | "You earned {title} (+{xp} XP)"                      | `/achievements`          |
| `level_up` (existing)                                                              | `achievements` | "Level {n}!"                | "You've reached level {n} — {rank}"                  | `/achievements`          |
| `streak_milestone` (existing)                                                      | `achievements` | "{days}-day streak!"        | "{days} workouts in a row. You're a machine."        | `/achievements`          |
| `streak_danger` (existing)                                                         | `achievements` | "Streak in danger!"         | "Your {days}-day streak expires in ~{hours}h."       | `/dashboard`             |
| `summary_weekly` (NEW, replaces existing repurposed `streak_milestone` weekly use) | `achievements` | "Weekly summary"            | "{n} workouts, {prs} PRs, {pct}% adherence"          | `/dashboard`             |
| `client_joined` (existing)                                                         | `social`       | "New Disciple joined"       | "{name} accepted your invitation"                    | `/clients`               |
| `message` (existing)                                                               | `social`       | "Message from {senderName}" | "{previewText}"                                      | `/messages/{id}`         |
| `payment_received` (existing)                                                      | `billing`      | "Payment received"          | "{amount} from {clientName}"                         | `/payments`              |

Spec listed 11 templates; this final table has 16 (the existing 11 + 5 net-new from the brief). Existing `notify*` helpers in notificationService.ts keep their signatures — they now route through `sendNotification` which adds the gating + push fan-out.

---

## VAPID env vars (added to .env.example)

```bash
# Web Push (Sprint 2)
# Generate with: npx web-push generate-vapid-keys
# Public key sent to client; private key NEVER leaves server. Never rotate without regenerating subscriptions.
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tvarvaroi@gmail.com
```

---

## Execution batches (8 total, brainstorm HARD GATE between BATCH 3 and BATCH 5)

### BATCH 1 — Schema + migration 012 + dev key generation

**Goal:** Land schema changes + run on dev. No backend logic yet.

**Files:** `shared/schema.ts`, `server/migrations/012_notification_engine.ts`, `.env.example`, `package.json` (web-push dep added).

**Steps:**

1. Run `npm install web-push @types/web-push` — verify license MIT in `node_modules/web-push/package.json` and pin minor version.
2. Run `npx web-push generate-vapid-keys` — capture both keys.
3. Update `shared/schema.ts`: add `pushSubscriptions` pgTable + indexes, add `preferredUnits` column to users, add `deliverAfter` + `deliveredAt` to notifications. Add `insertPushSubscriptionSchema` + types. Add `NotificationPreferencesSchema` (with `.deepPartial()` for PATCH variant).
4. Create `server/migrations/012_notification_engine.ts` with `up()` containing: CREATE TABLE push_subscriptions + indexes; ALTER users ADD preferred_units; ALTER notifications ADD deliver_after/delivered_at; the JSONB backfill UPDATE for users.notification_preferences; the historical-notifications-mark-delivered UPDATE. `down()` with three data-loss safety assertions (Q3 + Q1 patterns).
5. Add CLI invocation block (`if (process.argv[1] === fileURLToPath(import.meta.url))`).
6. Add VAPID env entries to `.env.example` (placeholder values).
7. Add the dev VAPID keys to local `.env` (NOT committed) — verify they don't get logged.
8. Run `npx tsx server/migrations/012_notification_engine.ts up` against dev DB. Verify with raw SQL:
   - `SELECT * FROM push_subscriptions LIMIT 1;` (table exists, empty)
   - `SELECT preferred_units FROM users LIMIT 5;` (column exists, all 'metric')
   - `SELECT notification_preferences FROM users WHERE notification_preferences IS NOT NULL LIMIT 5;` (new shape)
   - `\d notifications` → has deliver_after + delivered_at
   - `SELECT COUNT(*) FROM notifications WHERE delivered_at IS NULL;` → 0 (all historical rows marked delivered)
9. Run `down()` once on a throwaway clone to verify safety assertions trigger when data exists. Document the test in commit message.
10. `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l` → must equal 200 (baseline).
11. `npm run build` → clean.
12. Commit:
    ```
    feat(schema): SPRINT 2 BATCH 1 — migration 012 (push_subscriptions + preferred_units + notification quiet-hours columns)
    ```

**Checkpoint:** Stop. Show migration up + down logs, schema diff, TS error count. Wait for approval before BATCH 2.

---

### BATCH 2 — Backend services + routes (no UI yet)

**Goal:** Notification engine works end-to-end via curl. UI lands BATCH 5.

**Files:** `server/services/pushService.ts`, `server/services/notificationTemplates.ts`, `server/services/notificationDispatcher.ts`, `server/services/notificationService.ts` (extension), `server/services/orphanCleanup.ts`, `server/services/userDeletion.ts`, `server/routes/notifications.ts` (extension), `server/routes/settings.ts` (extension), `server/jobs/cleanupExpiredQuietHours.ts`, `server/index.ts` (cron startup).

**Steps:**

1. **`pushService.ts`** — read VAPID env at module load, init web-push setVapidDetails. Export `sendPush(subscription, payload): Promise<{result: 'sent' | 'expired' | 'failed', error?: string}>`. On 410/404 return `expired`. On 5xx retry up to 3 with exponential backoff (250ms / 1s / 4s) then return `failed`. NEVER log VAPID private key.
2. **`notificationTemplates.ts`** — export `TEMPLATES` record keyed by type, with `{ category, title, body, actionUrl, requiredFields[] }`. Export `typeToCategory(type)` and `renderTemplate(type, data)` helpers. Export `CATEGORIES` const tuple.
3. **`notificationDispatcher.ts`** — pure function `dispatch(db, userId, type, data)` returns `{notifId, deliveries: {sent: n, queued: n, failed: n}}`. Internally:
   - Load user's notification_preferences. If categories[category] === false → write notification row but DO NOT push, set deliveredAt=NOW.
   - Compute "now in user's timezone" via `Intl.DateTimeFormat`. If quiet hours enabled AND in window → write row with deliverAfter = end-of-window, deliveredAt = NULL, return without pushing.
   - Otherwise: write row, then load active push_subscriptions for user, fan out via pushService.sendPush, update each sub's last_used_at or failure_count, mark sub inactive after 3 consecutive failures. Set notifications.deliveredAt = NOW.
   - If push delivered to zero subs (none active OR all failed) AND user.notification_preferences.channels.email === true → send email via existing Resend infra with template title/body + action link.
4. **`notificationService.ts` extension** — add `sendNotification(userId, type, data)` as a thin wrapper around dispatcher. Refactor each existing `notify*` helper to call `sendNotification` instead of `createNotification`. Keep `createNotification` as deprecated internal helper (can be removed Sprint 3 once we verify nothing else calls it).
5. **`orphanCleanup.ts`** — `cleanupOrphanedR2Objects(userId): Promise<{deleted, failed}>`. Iterates `body_metrics` (none) and `progress_photos` (imageUrl + thumbnailUrl) for the user, calls `deleteImage(url)` for each. Idempotent — calling twice on same userId is safe.
6. **`userDeletion.ts`** — `deleteUserAccount(userId)`:
   1. Logger.audit('account.deleted', {...}) BEFORE any mutation.
   2. cleanupOrphanedR2Objects(userId).
   3. Mark all push_subscriptions inactive for the user.
   4. Cancel active Stripe subscription if user.subscriptionId set.
   5. Set users.deletedAt = NOW + anonymize PII (existing pattern from settings.ts:332-347).
7. **Routes — `server/routes/notifications.ts`**:
   - `GET /api/notifications/vapid-public-key` → `{ publicKey: process.env.VAPID_PUBLIC_KEY }`. No auth required (public).
   - `POST /api/notifications/subscribe` — Zod-validated body `{ endpoint, p256dh, auth, userAgent?, platform }`. Upserts on endpoint UNIQUE constraint (if endpoint exists for THIS user, refresh keys + mark active; if exists for a DIFFERENT user, return 409 — security boundary).
   - `DELETE /api/notifications/subscribe/:id` — IDOR-safe: `WHERE id = :id AND userId = req.user.id`.
   - `GET /api/notifications/preferences` → return user's notification_preferences, parsed through Zod.
   - `PATCH /api/notifications/preferences` — Zod `.deepPartial()`, deep merge into existing, store back. Audit-log via logger.audit('preferences.notifications_changed', {previous, value}).
   - `POST /api/notifications/test` — sends a test push immediately (bypasses category gating but RESPECTS quiet hours so users can test that branch too).
8. **Routes — `server/routes/settings.ts` extension**:
   - `GET /api/settings/preferred-units` → `{ units: 'metric' | 'imperial' }`.
   - `PATCH /api/settings/preferred-units` — Zod `{ units: z.enum(['metric', 'imperial']) }`. Audit-log via logger.audit('preferences.units_changed', {previous, value}).
   - Extend `DELETE /api/settings/account` — call `userDeletion.deleteUserAccount(req.user.id)` instead of inlined anonymize.
9. **`cleanupExpiredQuietHours.ts`** — exports `startQuietHoursCron(): NodeJS.Timeout`. Every 5 minutes (configurable via `QUIET_HOURS_RETRY_INTERVAL_MS` env), queries `notifications WHERE deliver_after <= NOW() AND delivered_at IS NULL`, batches them by userId, calls dispatcher per user (which re-checks quiet hours in case the user changed their window), sets delivered_at. Catches and logs all errors — never lets cron die.
10. **`server/index.ts`** — after `registerRoutes(app)`, before `app.listen`, call `startQuietHoursCron()`. Add a graceful shutdown hook that clears the interval.
11. Smoke test:
    - `npm run dev`
    - Open browser, register a service worker subscription via DevTools console (manual `pushManager.subscribe`), POST it to `/api/notifications/subscribe`.
    - Hit `POST /api/notifications/test` → push notification appears within 5s.
    - Hit `PATCH /api/notifications/preferences` to set quietHours.enabled=true with a window that includes NOW. Re-test → notification queued, no push. Wait for window to end OR manually run cron once → push fires.
    - Hit `PATCH /api/notifications/preferences` to disable categories.workouts. Trigger a workout reminder via a manual notifyWorkoutAssigned call → row written, no push.
12. TS + build gates.
13. Commit: `feat(notifications): SPRINT 2 BATCH 2 — push delivery engine + preferences API + account-deletion cleanup`.

**Checkpoint:** Stop. Show smoke test logs. Wait for approval.

---

### BATCH 3 — Service worker + client subscription flow + post-action prompt

**Goal:** Browser side of the push pipeline. Permission prompt fires after a meaningful action, SW handles push events with rich payload.

**Files:** `client/public/sw.js`, `client/src/lib/pushSubscription.ts`, `client/src/components/notifications/PushPermissionPrompt.tsx`, hook integration in workout completion, body metrics log, AI coach send.

**Steps:**

1. **`client/public/sw.js`** — fix lint bug (`clients` → `self.clients`), enrich push handler:
   ```js
   self.addEventListener('push', (event) => {
     if (!event.data) return;
     const data = event.data.json();
     event.waitUntil(
       self.registration.showNotification(data.title, {
         body: data.body,
         icon: '/icons/icon-192.png',
         badge: '/icons/icon-72.png',
         tag: data.tag, // dedupe key — same tag replaces previous notification
         renotify: false,
         data: { url: data.url, type: data.type },
       })
     );
   });
   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     const url = event.notification.data?.url || '/';
     event.waitUntil(
       self.clients.matchAll({ type: 'window' }).then((wins) => {
         const existing = wins.find((c) => c.url.includes(url));
         if (existing) return existing.focus();
         return self.clients.openWindow(url);
       })
     );
   });
   self.addEventListener('pushsubscriptionchange', (event) => {
     // Browser invalidated the subscription. Try to renew via main app on next tab open.
     // We don't have the user's session in the SW — just clear the local cache and let
     // the next online interaction re-subscribe.
     event.waitUntil(
       self.clients.matchAll().then((clients) => {
         clients.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_LOST' }));
       })
     );
   });
   ```
2. **`client/src/lib/pushSubscription.ts`**:
   - `requestPermissionAndSubscribe(): Promise<{state: 'granted' | 'denied' | 'unsupported' | 'ios-pwa-required', subscription?: PushSubscription}>`. Detects iOS Safari without standalone PWA → returns `ios-pwa-required` so UI can show the right copy.
   - `unsubscribe(): Promise<void>`.
   - `getCurrentSubscription(): Promise<PushSubscription | null>`.
   - `urlBase64ToUint8Array(b64)` — standard helper for VAPID key conversion.
   - All methods catch + log; never crash the app.
3. **`PushPermissionPrompt.tsx`** — small bottom-sheet (mobile) / inline-card (desktop) component. Conditional render via `localStorage.getItem('pushPromptSeen')` and `Notification.permission === 'default'`. Dismiss = remember.
4. **Trigger wiring** — in three places, fire `usePushPermissionPrompt().maybePrompt()` after the action completes:
   - First workout completion: `WorkoutExecution.tsx` after the celebration card.
   - First body metric logged: `LogBodyMetricsSheet.tsx` after success toast.
   - First AI coach message sent: `AICoach.tsx` after first response received.
     "First" is heuristic via TanStack Query data — if user already has > 0 of that resource, do not prompt. Three independent triggers; whichever fires first wins.
5. **iOS detection** — copy variant: "Add GymGurus to your Home Screen first to enable notifications. Tap Share → Add to Home Screen, then come back here."
6. Smoke test on Chrome desktop, Chrome Android (real device or emulator), Safari iOS (PWA installed).
7. TS + build gates.
8. Commit: `feat(push): SPRINT 2 BATCH 3 — service worker handlers + post-action permission prompt`.

**Checkpoint:** Stop. Show screenshots of the prompt across the three triggers. Wait for approval.

---

### BATCH 4 — Brainstorm HARD GATE (UI design proposals)

**This batch is design-only. No code. STOP and wait for explicit approval before BATCH 5.**

Deliverable: a 1-page proposal in this conversation covering the five UI questions:

1. **Permission prompt placement, timing, copy** — Mobile bottom-sheet / desktop right-aligned card. Three triggers (first workout, first metric, first AI msg). Copy: "Stay on track" + "Get push reminders for workouts, recovery, and milestones. You're in control — turn off any category in Settings." Buttons: "Enable" (primary, role-coloured) / "Maybe later" (ghost).
2. **Quiet hours UI** — Toggle row, then if enabled: 24h `<input type="time">` for start + end, plus a `<select>` of common timezones with "Auto-detect" option that calls `Intl.DateTimeFormat().resolvedOptions().timeZone`. Mobile-first: time inputs are full-width on mobile, side-by-side on desktop.
3. **Test notification button** — Card with a button "Send test notification". Below the button, after click: a status line. Three states:
   - "✓ Sent. Check your device." (green)
   - "⚠ Quiet hours active — queued for after {endTime}." (amber)
   - "✗ No active devices. Enable notifications first." (red, disables the button)
4. **Active devices list** — Row per subscription. Left: parsed user-agent ("Chrome on macOS") via tiny in-house parser, no `ua-parser-js` dep. Right: relative time ("Last used 2 hours ago") + Revoke button. Confirm dialog before revoke.
5. **Email fallback toggle copy** — Label: "Email backup". Description: "If your phone is offline or you've revoked notifications, important alerts go to your email instead. Off by default."

I'll bring rough wireframes in this batch. **STOP and wait for explicit go/no-go on each.**

---

### BATCH 5 — Settings UI implementation (after BATCH 4 approval)

**Goal:** Notifications tab in SettingsPage, all controls wired to BATCH 2 endpoints.

**Files:** `SettingsPage.tsx`, `NotificationsTab.tsx`, `QuietHoursControl.tsx`, `ActiveDevicesList.tsx`, `useNotificationPreferences.ts`.

**Steps:**

1. Create `useNotificationPreferences()` hook: TanStack Query with `staleTime: 30_000`, mutations invalidate on success.
2. Create `NotificationsTab` body following the BATCH 4 approved design. Use existing role-aware tokens (`bg-primary`, `text-primary`). Touch targets ≥ 44×44. cursor-pointer on all clickables.
3. Create `QuietHoursControl` — accordion-style: switch → expanding section with start/end + timezone.
4. Create `ActiveDevicesList` — fetch-on-mount, optimistic revoke.
5. Wire into `SettingsPage.tsx` as 5th tab. Update tab order per existing convention.
6. Pre-delivery checklist (ui-ux-pro-max + vercel-react-best-practices + web-design-guidelines):
   - All clickables `cursor-pointer`.
   - All interactive elements have visible focus ring.
   - aria-labels on icon-only buttons.
   - Transitions 150–300ms.
   - prefers-reduced-motion respected (no purposeless animation on the tab).
   - 320px → 1920px responsive without horizontal scroll.
7. Mobile + desktop screenshots checkpoint.
8. TS + build gates.
9. Commit: `feat(settings): SPRINT 2 BATCH 5 — Notifications tab UI`.

**Checkpoint:** Stop with screenshots. Wait for approval.

---

### BATCH 6 — Cross-device units server-backed migration

**Goal:** Unit toggle on BiometricsPage syncs across devices via `users.preferred_units`. localStorage `gg_units` becomes a fallback only.

**Files:** `client/src/lib/units.ts`, `client/src/hooks/useUnits.ts`, `client/src/pages/BiometricsPage.tsx`, `server/routes/settings.ts` (already extended in BATCH 2).

**Steps:**

1. `useUnits()` hook: TanStack Query for GET `/api/settings/preferred-units`. On first successful fetch in a session, also write to `localStorage.gg_units` for SSR-free synchronous reads.
2. **One-time migration on first visit after deploy**: in `App.tsx` AuthGuard `useEffect`, when user is loaded and `preferred_units` from server is the default 'metric' BUT localStorage has 'imperial', call PATCH to upgrade. Then write the localStorage value to match server. Idempotent — runs once because subsequent visits show server already 'imperial'.
3. Update `client/src/lib/units.ts`:
   - Keep existing API surface (`getUnits`, `setUnits`, `displayWeight`, etc.) so call sites don't break.
   - `getUnits()` now reads from localStorage as a fast cache; the source of truth is the server via `useUnits()`.
   - `setUnits(u)` writes to localStorage AND calls the PATCH endpoint via TanStack mutation.
   - Remove the Sprint-4-TODO comment about migrating.
4. Update `BiometricsPage.tsx`: replace `getUnits()` call in PageHeader actions with `useUnits()` value. The toggle button calls the hook's setter.
5. Smoke test:
   - On device A (imperial set in localStorage from Sprint 1), open the app → migration writes preferred_units = 'imperial' to server, BiometricsPage shows lb.
   - On device B (fresh localStorage), open → reads server 'imperial', shows lb.
   - On device A toggle to metric. On device B refresh → shows kg.
6. Verify audit-log emits on units change (BATCH 2 already added this).
7. TS + build gates.
8. Mobile + desktop screenshots.
9. Commit: `feat(settings): SPRINT 2 BATCH 6 — cross-device unit preference (server-backed)`.

**Checkpoint:** Stop with screenshots showing two-device sync. Wait for approval.

---

### BATCH 7 — Cron + verification

**Goal:** Quiet-hours retry cron is running, account deletion flow integration tested end-to-end.

**Files:** mostly verification + targeted hardening.

**Steps:**

1. Verify the cron started in BATCH 2 is logging at startup. Add a `[QUIET-HOURS] Cron started, interval=300000ms` line if not present.
2. Manual test of full E2E flow:
   - Log in, enable push, set quiet hours covering NOW.
   - Trigger a workout reminder via curl → row created, no push.
   - Wait for cron tick (or manually invoke job once) → push fires.
   - Mark notification as read → notifications endpoint returns it as read.
3. Manual account-deletion test on a throwaway dev account:
   - Upload a body photo.
   - Subscribe to push.
   - Set custom notification preferences.
   - Hit DELETE /api/settings/account with confirmation.
   - Verify R2 object gone, push subscription marked inactive, audit log emitted, session destroyed, user.deletedAt set, PII anonymized.
4. Add missing IDOR test cases (BATCH 2 wrote happy-path tests; this batch adds the IDOR variants as a separate file `notifications.test.ts` per Sprint 1.5 BATCH 4 pattern):
   - GET /preferences and PATCH /preferences — userA can't read userB's
   - DELETE /subscribe/:id — userA can't revoke userB's sub
   - The endpoint UNIQUE constraint test: userB can't claim userA's endpoint
5. Run full test suite: `npm test`. Expected: 208 + ~25 new tests = ~233 passing, 15 pre-existing aiService failures still excluded.
6. TS + build gates.
7. Commit: `test(notifications): SPRINT 2 BATCH 7 — IDOR coverage + E2E quiet-hours + account deletion verification`.

**Checkpoint:** Stop with test output paste. Wait for approval.

---

### BATCH 8 — Pre-delivery audits + docs + prod migration prep

**Files:** docs only + prod migration list update.

**Steps:**

1. Run ui-ux-pro-max pre-delivery checklist on BATCH 5 components — paste results.
2. Run vercel-react-best-practices spot-checks: useMemo on prefs, no unnecessary re-renders, no waterfalls in NotificationsTab.
3. Run web-design-guidelines audit on the new components.
4. **License review** — for each dependency added in this sprint, look up the package's `license` field via `npm view <pkg> license`. The accepted-licenses allowlist is: `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `MPL-2.0`, `0BSD`, `Unlicense`. Any other license (especially GPL family, AGPL, SSPL, proprietary, or unspecified) MUST be flagged for explicit human decision before merge — do not accept silently. Document the allowlist outcome in the commit message. (Sprint 2 baseline: `web-push@3.6.7` MPL-2.0 — accepted via `_brain/notes/decisions.md` 2026-05-05 entry.)
5. `/security-scan` — focus on VAPID handling, push subscription IDOR, account-deletion authentication. Should be clean.
6. `/review` — local review gate.
7. **Update MEMORY.md**:
   - Add "Sprint 2 — Notification Engine (COMPLETE 2026-05-XX)" section with file list + decisions.
   - Add "Pending production migrations" entry for migration 012.
   - Add gotcha: **VAPID key rotation invalidates all push subscriptions.** If `VAPID_PRIVATE_KEY` ever changes, every `push_subscriptions` row becomes useless — push services bind subscriptions to the public key used at subscribe time. Rotation = mass user re-subscribe required. Plan rotation only as part of a major incident response, not maintenance. Dev and prod use separate keypairs; never copy prod keys to dev or vice versa (would let dev testing fire prod pushes).
8. **Update `_brain/notes/decisions.md`**: add 5 entries (`web-push MPL-2.0` already added during BATCH 1):
   - Notification preferences shape decision (Q1)
   - Notification type naming kept-existing (Q2)
   - Quiet hours queue-on-notifications-table (Q3)
   - VAPID per-environment (Q4)
   - Push icon neutral-v1 (Q5)
9. **Update `_brain/notes/gotchas.md`**: any new gotchas discovered (cron-in-process drift, SW pushsubscriptionchange caveats, browser-specific push behaviour).
10. Generate prod VAPID keys, add to Railway via dashboard (NOT via push). Document in MEMORY.md without keys.
11. Final commit: `docs(sprint-2): MEMORY + decisions + gotchas + pending prod migration`.
12. Push all batches.

**Checkpoint:** Stop. Confirm Railway green. Then run migration 012 on prod via:

```
railway run -- npx tsx scripts/run-prod-migration.ts up 012_notification_engine
```

---

## Success criteria (gsd-verifier)

- ✓ Migration 012 applies cleanly on dev, runs cleanly on prod via run-prod-migration.ts
- ✓ down() throws if push_subscriptions rows exist OR users have non-default preferred_units OR notification_preferences has new shape
- ✓ User can enable push on Chrome desktop / Chrome Android / Safari iOS PWA
- ✓ Test notification arrives within 5s
- ✓ Per-category toggle blocks delivery
- ✓ Quiet hours queues + delivers after window in user's timezone
- ✓ Failed delivery to expired subscription → mark inactive after 3 attempts
- ✓ Email fallback fires when push had zero successful deliveries AND email channel on
- ✓ Account deletion cleans up R2 objects, marks subs inactive, anonymizes PII, audit-logs the event
- ✓ Unit toggle syncs across devices (sign-in test on second device)
- ✓ localStorage gg_units one-time migration writes to server
- ✓ All new routes IDOR-safe (test coverage)
- ✓ VAPID private key never logged or in client bundle
- ✓ tsc --noEmit baseline 200 (zero net-new errors)
- ✓ npm run build clean
- ✓ Touch targets ≥ 44×44
- ✓ Role colours via bg-primary/text-primary only
- ✓ prefers-reduced-motion respected
- ✓ MEMORY.md / decisions.md / gotchas.md updated
- ✓ Migration 012 added to "Pending production migrations" then cleared after prod apply

---

## Guardrails (DO NOT)

- Do NOT prompt for permission on page load — wait for post-action trigger
- Do NOT install Firebase / FCM packages
- Do NOT bypass scripts/run-prod-migration.ts for prod
- Do NOT remove localStorage gg_units fallback
- Do NOT log VAPID private key
- Do NOT leak push endpoint URLs to clients (server-side only)
- Do NOT change role colours or typography
- Do NOT skip BATCH 4 brainstorm gate
- Do NOT use console.log (Logger or console.warn)
- Do NOT add deps beyond `web-push` (verify MIT)

---

## Risk assessment

| Batch | Risk                                                                                                                                                   | Mitigation                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | JSONB backfill rewrites a user's pref incorrectly                                                                                                      | Backfill is idempotent (only fires when shape doesn't have `categories` key); throwaway-clone test                                        |
| 1     | Adding `deliver_after` + `delivered_at` columns to notifications could miss filtering in existing read paths (`getUserNotifications` returns all rows) | Existing reads stay correct: undelivered rows are still rows the user owns. Only the cron filters on `delivered_at IS NULL`.              |
| 2     | Cron runs in same process — restarts cancel pending retries                                                                                            | Each retry re-queries from DB on next tick; max delay = retry interval (5min). Acceptable.                                                |
| 2     | Email fallback could spam users on push outages                                                                                                        | Per-template gating: `summary_weekly` and `streak_milestone` skip email entirely; only urgent ones (workout_reminder, recovery_low) email |
| 2     | Existing `notify*` helpers refactored to call sendNotification — could break a feature if dispatcher bugs out                                          | Wrap each helper change in unit tests                                                                                                     |
| 3     | iOS Safari PWA push is finicky                                                                                                                         | Detect `standalone` mode, show `ios-pwa-required` copy if not standalone                                                                  |
| 3     | pushsubscriptionchange handler can't directly re-subscribe (no user session in SW)                                                                     | Just message the main app; main app re-subscribes on next interaction                                                                     |
| 5     | Settings UI growing past viewport on mobile                                                                                                            | Tab content is already scrollable. Test 320px viewport.                                                                                   |
| 6     | Race between localStorage and server preference on first migration                                                                                     | One-time AuthGuard effect; idempotent                                                                                                     |
| 7     | Account deletion cascade could orphan Stripe subscription                                                                                              | userDeletion calls Stripe cancel BEFORE row anonymization                                                                                 |

---

## Estimated effort

| Batch                         | Effort    | Lines changed |
| ----------------------------- | --------- | ------------- |
| 1 — Schema + migration 012    | 2-3 hours | ~250          |
| 2 — Backend services + routes | 6-8 hours | ~900          |
| 3 — SW + permission prompt    | 3-4 hours | ~400          |
| 4 — Brainstorm (UI proposal)  | 1-2 hours | 0             |
| 5 — Settings UI               | 4-5 hours | ~500          |
| 6 — Cross-device units        | 2 hours   | ~150          |
| 7 — Cron + IDOR tests         | 3 hours   | ~400          |
| 8 — Audits + docs             | 1-2 hours | ~100 (docs)   |

**Total:** ~2.5 days of focused work + screenshot/test checkpoint time. Plan calibrated against Sprint 1's actual delivery rhythm.

---

## Notes captured during plan drafting

- The `python3` design search script can't run on this Windows machine (Microsoft Store stub interceptor). Sprint 2 uses the documented design rules from `ui-ux-pro-max/CLAUDE.md` (Pre-Delivery Checklist + Common Rules for Professional UI) and Sprint 1's established component patterns.
- `users.notification_preferences` was created by `migrations/0000_burly_yellow_claw.sql` (legacy drizzle-kit init), NOT by `server/migrations/`. Migration 012 reshapes content via UPDATE — no DDL on that column.
- Existing service worker has a known lint failure (`clients` undefined) called out in `_brain/notes/gotchas.md` line 268. BATCH 3 fixes it.
- Existing `DELETE /api/settings/account` already anonymizes — BATCH 2 extends, doesn't replace.
- Test infra is Sprint 1.5 ready (vitest + supertest + helpers.ts + setup.ts).

---

**Awaiting human approval. Specifically wanted on:**

1. Q1 (notification_preferences in-place reshape) ← shapes BATCH 1
2. Q2 (keep existing snake_case types) ← shapes BATCH 2
3. Q3 (deliver_after on notifications table) ← shapes BATCH 1
4. Q4 (per-environment VAPID) ← shapes BATCH 1 + BATCH 8
5. Q5 (single neutral PNG icon v1) ← shapes BATCH 3

…then BATCH 4 brainstorm before BATCH 5 implementation.
