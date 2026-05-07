# Sprint 5 — Apple Health XML Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. ONE HARD brainstorm gate exists at BATCH 4 (UX of the import flow itself) — STOP, present design, wait for explicit approval before BATCH 5 implementation.

**Goal:** Let any iOS user import their Apple Health export (`export.zip` from the Health app) and see their historical sleep / workouts / body metrics / vitals in `/biometrics` charts. Zero recurring infrastructure cost beyond R2. No provider portals. No OAuth. Just upload → parse → ingest → render.

**Architecture:** Apple Health export is one shot, no recurring sync. User exports `export.zip` from Health app, drops it on `/settings?tab=imports`, the file is stored to R2 (existing pipeline from Sprint 1 biometrics photos), a row in a new `apple_health_imports` table tracks the operation, a cron picks up unstarted imports and stream-parses the XML using `sax`, and per-record callbacks UPSERT into the existing wearable schema (`sleep_sessions`, `daily_vitals`, `activity_sessions`, `body_metrics`) with `source='apple_health'`. Idempotent re-import via stable `source_record_id` derivation: same export → identical IDs → ON CONFLICT no-op.

**Tech Stack:**

- DB: PostgreSQL on Railway, Drizzle ORM 0.45.2 (deck-clearing Item 1)
- Backend: Express + TypeScript + Drizzle, `sax` (streaming SAX XML parser, MIT, ~30KB, no deps), `unzipper` or `node-stream-zip` for streaming `.zip` extraction (license verified at install)
- Frontend: React 18 + Vite + TanStack Query + shadcn/ui + wouter + lucide-react + RolePill primitive (deck-clearing Item 2)
- Storage: Cloudflare R2 (existing fileUpload pipeline; Sprint 1 — same allowlist mechanism reused for `application/zip` MIME)
- Cron: existing `setInterval` pattern (mirrors `cleanupExpiredQuietHours.ts` from Sprint 2 + `wearableSyncMonitor.ts` from Sprint 4 BATCH 3) — `SELECT FOR UPDATE SKIP LOCKED` claim + `isTickInFlight` re-entrancy guard + SIGTERM graceful stop
- Notifications: existing dispatcher (Sprint 2) + 2 new template types (`import.complete`, `import.failed`)

**Locked decisions** (from kickoff + `_brain/notes/decisions.md`):

1. Reuses Sprint 4's wearable schema (`sleep_sessions`, `daily_vitals`, `activity_sessions`, `body_metrics`). Migration 014 + 014.5 are unblocked by Sprint 5 — Sprint 4 paused before deploying them; Sprint 5 needs them on prod.
2. Migration 015 stays gated on Sprint 4 resumption — Sprint 5 doesn't need `wearable_connections.open_wearables_user_id`.
3. `source` field on each ingested row = `'apple_health'` (distinct from `'wearable'` / `'manual'` / `'smart_scale'`).
4. Idempotency via stable `source_record_id` derivation. For records with Apple Health UUIDs (newer exports), use the UUID. For older records lacking UUIDs, fall back to `hash(sourceName + startDate + value + recordType)`. Same export → identical IDs → ON CONFLICT no-op.
5. Streaming parse only. 100MB+ XMLs are common for long-time Apple Health users. Never load-into-memory.
6. Background cron processing. Even small imports go through the cron path for consistency (no synchronous parse path).
7. `bodyMetrics` partial UNIQUE strategy: **DECIDED AT BATCH 1 CHECKPOINT** (Path A widens, Path B adds new partial, Path C adds `source_record_id` column). Plan assumes the answer below in BATCH 1 surface.
8. Per locked roadmap decision: native iOS HealthKit (Capacitor) is Sprint 12. Sprint 5 is the escape valve until then — XML import only.

---

## Guardrails (do not violate)

- **Do NOT load the entire XML into memory.** Streaming parse only. The XML can be 100MB+; an `await fs.readFile` call would OOM Railway.
- **Do NOT skip the BATCH 4 brainstorm HARD GATE** before any UI implementation. Long-running operation UX is non-trivial and gets ONE design pass.
- **Do NOT ship without per-record `source_record_id` idempotency.** Re-import must be safe. The kickoff explicitly requires this.
- **Do NOT extract from the .zip without zip-slip path traversal protection.** A malicious .zip could write to arbitrary filesystem paths via `../` in entry names. Validate every entry name during streaming extraction.
- **Do NOT run migration 015 on prod during Sprint 5.** That migration is Sprint 4 territory and stays gated on Sprint 4 resumption.
- **Do NOT install dependencies beyond what BATCH 1/2 itemize** (`sax` + a zip extraction library). Verify license at install (allowlist: MIT, Apache 2.0, BSD-2/3, ISC; rejected: AGPL).
- **Do NOT hardcode role colors.** Use `bg-primary` / `text-primary` / role CSS variables. Same Sprint 1 → Sprint 4 discipline.
- **Do NOT ship a synchronous parse path** even for small files. Always cron-driven for consistency, observability, and cancel-ability.
- **Do NOT modify Sprint 4's wearable schema (014, 014.5).** Extend via new migration if needed (014.6 for the bodyMetrics WHERE widening, decided at BATCH 1).
- **Do NOT proceed past BATCH 3** without a confirmed end-to-end synthetic-XML → DB row → `/biometrics` chart render smoke test. The substrate-leverage assumption needs proof.
- **Do NOT auto-fix when TS or tests surface upgrade-induced errors** — surface specific failures, await review (deck-clearing Item 1 discipline).

---

## File Structure

**New files:**

```
server/
├── migrations/
│   ├── 016_apple_health_imports.ts      ← BATCH 1: new table for tracking import ops
│   └── (014.6 if Path A or Path B; see BATCH 1 decision surface)
├── services/
│   ├── appleHealthParser.ts             ← BATCH 2: streaming XML parser via sax
│   ├── appleHealthIngest.ts             ← BATCH 3: per-record UPSERTs into existing tables
│   ├── appleHealthZip.ts                ← BATCH 2: zip-slip-safe streaming extraction of export.xml
│   └── notificationTemplates.ts         ← BATCH 3: extend with import.complete + import.failed types
├── routes/
│   └── appleHealth.ts                   ← BATCH 3: 5 routes (upload, list, detail, cancel, delete)
├── jobs/
│   └── processAppleHealthImports.ts     ← BATCH 3: cron polling 'uploaded' status, parse + ingest
└── test/
    ├── services/appleHealthParser.test.ts        ← BATCH 2
    ├── services/appleHealthIngest.test.ts        ← BATCH 3
    ├── routes/appleHealth.test.ts                ← BATCH 7 (mutation testing — fourth IDOR site)
    └── jobs/processAppleHealthImports.test.ts    ← BATCH 7 (cron concurrency)

client/src/
├── components/
│   ├── settings/
│   │   └── ImportsTab.tsx               ← BATCH 6: tab orchestrator
│   └── imports/
│       ├── AppleHealthUploadFlow.tsx    ← BATCH 5: 5-step wizard
│       ├── ImportProgressCard.tsx       ← BATCH 5: live polling status
│       └── ImportInstructionsCard.tsx   ← BATCH 5: iOS export guide
└── hooks/
    └── useAppleHealthImports.ts         ← BATCH 5: React Query hooks

shared/schema.ts                          ← BATCH 1: appleHealthImports table + insert schema + types
docs/plans/2026-05-08-sprint-5-apple-health-import.md  ← THIS FILE
```

**Modified files:**

```
shared/schema.ts                          ← BATCH 1: appleHealthImports table
client/src/pages/SettingsPage.tsx         ← BATCH 6: add Imports tab (6th, between Notifications and Privacy)
client/src/pages/Dashboard.tsx            ← BATCH 6: dashboard hint card for Ronin (no imports + no wearable connections)
server/services/notificationTemplates.ts  ← BATCH 3: 2 new types in EVENT_TYPE_TO_CATEGORY + per-type renderer
client/src/components/notifications/settings/NotificationCategoriesCard.tsx  ← BATCH 3 (auto-pickup of new types via existing category map)
```

**Migration sequence on prod (BATCH 8 close):**

1. `014_wearable_data` — Sprint 4 BATCH 1; never prod-applied; Sprint 5 unblocks
2. `014_5_body_metrics_wearable_dedup` — Sprint 4 BATCH 5a; never prod-applied; Sprint 5 unblocks
3. (`014.6_apple_health_dedup` if Path A or Path B — decided BATCH 1)
4. `016_apple_health_imports` — new this sprint
5. `015_wearable_connections_ow_user_id` — STAYS deferred, gated on Sprint 4 resumption

---

## Bite-Sized Task Breakdown

---

### BATCH 1 — Schema + migration 016 + 014.6 decision

**Files:**

- Modify: `shared/schema.ts` (add `appleHealthImports` table after `activitySessions` ~line 402)
- Create: `server/migrations/016_apple_health_imports.ts`
- Test: dev migration roundtrip (up → down → up)

**Goal:** Land the `apple_health_imports` tracking table on dev. Surface the 014.6 decision (bodyMetrics partial UNIQUE strategy) at checkpoint, do not decide unilaterally.

- [ ] **Step 1: Add `appleHealthImports` Drizzle table to shared/schema.ts**

Insert in the wearable section (after `activitySessions`, ~line 402):

```ts
// Apple Health import tracking — Sprint 5. One row per upload operation,
// tracks status + counters. The actual imported records live in
// sleep_sessions / daily_vitals / activity_sessions / body_metrics.
export const APPLE_HEALTH_IMPORT_STATUSES = [
  'uploaded', // file arrived, waiting for cron pickup
  'parsing', // cron claimed it; XML stream in progress
  'completed', // success
  'failed', // parse error or ingest error; error_message captures cause
  'cancelled', // user cancelled mid-parse
] as const;
export type AppleHealthImportStatus = (typeof APPLE_HEALTH_IMPORT_STATUSES)[number];

export const appleHealthImports = pgTable(
  'apple_health_imports',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    fileR2Key: varchar('file_r2_key', { length: 512 }), // nullable after success-cleanup
    status: varchar('status', { length: 16 })
      .notNull()
      .default('uploaded')
      .$type<AppleHealthImportStatus>(),
    recordsParsed: integer('records_parsed').notNull().default(0),
    recordsIngestedWorkout: integer('records_ingested_workout').notNull().default(0),
    recordsIngestedSleep: integer('records_ingested_sleep').notNull().default(0),
    recordsIngestedVitals: integer('records_ingested_vitals').notNull().default(0),
    recordsIngestedBody: integer('records_ingested_body').notNull().default(0),
    recordsSkippedDuplicate: integer('records_skipped_duplicate').notNull().default(0),
    recordsSkippedUnparseable: integer('records_skipped_unparseable').notNull().default(0),
    errorMessage: text('error_message'),
    dateRangeStart: varchar('date_range_start', { length: 10 }), // YYYY-MM-DD
    dateRangeEnd: varchar('date_range_end', { length: 10 }), // YYYY-MM-DD
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('idx_apple_health_imports_user_status').on(table.userId, table.status),
    index('idx_apple_health_imports_user_recent').on(table.userId, sql`${table.createdAt} DESC`),
  ]
);

export const appleHealthImportsRelations = relations(appleHealthImports, ({ one }) => ({
  user: one(users, { fields: [appleHealthImports.userId], references: [users.id] }),
}));

export const insertAppleHealthImportSchema = createInsertSchema(appleHealthImports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  recordsParsed: true,
  recordsIngestedWorkout: true,
  recordsIngestedSleep: true,
  recordsIngestedVitals: true,
  recordsIngestedBody: true,
  recordsSkippedDuplicate: true,
  recordsSkippedUnparseable: true,
});
export type InsertAppleHealthImport = z.infer<typeof insertAppleHealthImportSchema>;
export type AppleHealthImport = typeof appleHealthImports.$inferSelect;
```

- [ ] **Step 2: Run TS check**

Run: `npx tsc --noEmit | grep -c "error TS"`
Expected: 199 (baseline; new table compiles cleanly)

- [ ] **Step 3: Create migration 016 file**

Mirror `014_5_body_metrics_wearable_dedup.ts` shape: NAME export, sql template, IF NOT EXISTS idempotency, down() with row-presence safety gate, fileURLToPath CLI guard.

```ts
// Migration 016 — Apple Health Imports (Sprint 5 BATCH 1)
//
// Creates apple_health_imports tracking table. One row per upload
// operation; the actual imported records (workouts/sleep/body/vitals)
// live in the existing wearable schema with source='apple_health'.
//
// IDEMPOTENCY: CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN
// IF NOT EXISTS. Re-running is a no-op.
//
// down() — refuses if any apple_health_imports rows currently exist
// (because dropping the table would orphan in-flight imports). Mirrors
// 012/013/014/014.5 down() pattern.
//
// CLI:  npx tsx server/migrations/016_apple_health_imports.ts [up|down]
// Prod: railway run -- npx tsx scripts/run-prod-migration.ts up 016_apple_health_imports

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export const NAME = '016_apple_health_imports';

export async function up() {
  const db = await getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS apple_health_imports (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_size_bytes BIGINT NOT NULL,
      file_r2_key VARCHAR(512),
      status VARCHAR(16) NOT NULL DEFAULT 'uploaded',
      records_parsed INTEGER NOT NULL DEFAULT 0,
      records_ingested_workout INTEGER NOT NULL DEFAULT 0,
      records_ingested_sleep INTEGER NOT NULL DEFAULT 0,
      records_ingested_vitals INTEGER NOT NULL DEFAULT 0,
      records_ingested_body INTEGER NOT NULL DEFAULT 0,
      records_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
      records_skipped_unparseable INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      date_range_start VARCHAR(10),
      date_range_end VARCHAR(10),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      CONSTRAINT apple_health_imports_status_check
        CHECK (status IN ('uploaded','parsing','completed','failed','cancelled'))
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_apple_health_imports_user_status
      ON apple_health_imports (user_id, status);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_apple_health_imports_user_recent
      ON apple_health_imports (user_id, created_at DESC);
  `);
  console.warn('[Migration 016] up() complete: apple_health_imports created');
}

export async function down() {
  const db = await getDb();
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM apple_health_imports
  `);
  const count = parseInt(result.rows?.[0]?.c ?? result[0]?.c ?? '0', 10);
  if (count > 0) {
    throw new Error(
      `[Migration 016 down] BLOCKED: ${count} apple_health_imports rows exist. ` +
        `Dropping the table would orphan in-flight import operations. ` +
        `Verify these rows are not load-bearing before forcing rollback.`
    );
  }
  await db.execute(sql`DROP INDEX IF EXISTS idx_apple_health_imports_user_recent;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_apple_health_imports_user_status;`);
  await db.execute(sql`DROP TABLE IF EXISTS apple_health_imports;`);
  console.warn(`[Migration 016 down] reverted: ${count} rows (zero, safe)`);
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 016] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 016] ${direction}() failed:`, err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run migration 016 up on dev**

Run: `npx tsx server/migrations/016_apple_health_imports.ts up`
Expected: `[Migration 016] up() complete`

- [ ] **Step 5: Verify table + indexes via psql introspection**

Query the dev DB to confirm:

- `SELECT * FROM apple_health_imports LIMIT 1;` — table exists, 0 rows
- `SELECT indexdef FROM pg_indexes WHERE tablename = 'apple_health_imports';` — both indexes present
- `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'apple_health_imports_status_check';` — CHECK constraint present

- [ ] **Step 6: Run migration 016 down on dev**

Run: `npx tsx server/migrations/016_apple_health_imports.ts down`
Expected: success (table empty, safety gate passes)

- [ ] **Step 7: Test safety gate fires when rows present**

INSERT a synthetic row, run down, expect error message blocking with row count > 0. DELETE the row, re-run down — succeeds.

- [ ] **Step 8: Re-run up to leave dev in clean post-migration state**

Run: `npx tsx server/migrations/016_apple_health_imports.ts up`
Expected: idempotent — table exists, 0 rows, no errors.

- [ ] **Step 9: BATCH 1 CHECKPOINT — Surface 014.6 decision**

The `bodyMetrics` partial UNIQUE strategy for `source='apple_health'` is the load-bearing schema decision for Sprint 5. The 014.5 partial UNIQUE filters `WHERE source IN ('wearable', 'smart_scale')` with conflict columns `(user_id, source_provider, (recorded_at::date))`. Three paths:

**Path A — Widen the existing 014.5 WHERE clause (single index, all wearable-style sources).**

- New migration `014.6_apple_health_dedup_widen.ts` — drops `idx_body_metrics_wearable_dedup`, recreates with `WHERE source IN ('wearable', 'smart_scale', 'apple_health')`
- Conflict semantics: per-day uniqueness — re-importing same-day Apple Health body measurement = UPSERT, not duplicate
- **Trade-off:** loses multi-per-day fidelity for Apple Health (user weighs at 7am AND 5pm → both records collapse to one row, last-write-wins). Same trade-off Sprint 4 already accepted for wearables.
- **Schema impact:** none. Same shape.
- **Pro:** simplest. One index covers all wearable-style sources.
- **Con:** Apple Health users may have multiple per-day body measurements they expect to preserve.

**Path B — Add a separate partial UNIQUE for `apple_health`.**

- New migration `014.6_apple_health_dedup_separate.ts` — adds `idx_body_metrics_apple_health_dedup` with `WHERE source = 'apple_health'`, conflict columns `(user_id, source_provider, (recorded_at::date))`
- Same per-day semantic as Path A but kept as separate index
- **Trade-off:** same per-day collapse as Path A. Identical user-facing behavior.
- **Schema impact:** one extra index, no column changes.
- **Pro:** keeps wearable + apple_health concerns separate (easier to evolve independently in future).
- **Con:** two indexes, slightly larger storage, no real semantic difference vs. Path A.

**Path C — Add a `source_record_id` column to `bodyMetrics` + new partial UNIQUE on `(user_id, source, source_record_id) WHERE source != 'manual'`.**

- New migration `014.6_body_metrics_source_record_id.ts` — ALTER TABLE ADD COLUMN + new partial UNIQUE
- Conflict semantics: per-RECORD uniqueness — Apple Health's UUID (or hash fallback) becomes the conflict key
- **Trade-off:** preserves multi-per-day fidelity. Each Apple Health body measurement is its own row. Re-import is still safe (same UUID → ON CONFLICT no-op).
- **Schema impact:** new column on bodyMetrics. Wearable ingest unchanged (wearables don't write source_record_id today and won't need to).
- **Pro:** true record-level idempotency. No data loss for multi-per-day Apple Health body data. Aligns with sleep_sessions / activity_sessions which already use this pattern.
- **Con:** new column. Migration touches more surface area. Wearable code path needs no change but existing 014.5 index becomes partially redundant (could drop it in 014.6 OR keep both).

**Recommended path:** **C** — record-level idempotency aligns with the kickoff prompt's stated design ("source_record_id derivation must be stable: re-importing the same export produces identical IDs, hits ON CONFLICT, becomes a no-op") AND preserves the multi-per-day fidelity that Apple Health users have (a Withings smart scale paired with Apple Health may write 2-3 weighings on heavy-tracking days; collapsing them to one row would silently lose data). The schema-extension cost is one column + one index.

**Surface required artifacts at checkpoint:**

- `npx tsx server/migrations/016_apple_health_imports.ts up` output (success)
- Schema diff: appleHealthImports table + insert schema + types
- 014.6 path recommendation (above) + await user approval before writing 014.6 migration file
- TS = 199 (baseline preserved)
- npm run build clean

---

### BATCH 2 — XML parser service + sax integration + tests

**Files:**

- Create: `server/services/appleHealthZip.ts` — zip-slip-safe streaming extraction of `export.xml` from `.zip`
- Create: `server/services/appleHealthParser.ts` — streaming SAX-based parser with per-record-type callbacks
- Create: `server/test/services/appleHealthParser.test.ts` — synthetic XML fixtures + edge cases
- Modify: `package.json` — add `sax` + zip extraction dep (license-verified)

**Goal:** Convert a streaming `.zip` containing Apple Health `export.xml` into per-record callback events. No DB writes yet. Pure transform service.

- [ ] **Step 1: License-verify sax + zip lib**

Run: `npm view sax license` → expect MIT. Pick a streaming zip lib (`unzipper` MIT vs. `node-stream-zip` MIT) — prefer `node-stream-zip` (zero deps, simpler API, actively maintained). Verify license.

- [ ] **Step 2: Install deps**

Run: `npm install sax node-stream-zip @types/sax`
Expected: clean install, drizzle-orm advisory still resolved, no new high-severity vulns.

- [ ] **Step 3: Write zip-slip-safe streaming extractor**

`server/services/appleHealthZip.ts` — function `streamExportXml(r2Key, onChunk)`. Validates every entry name against `..` traversal. Only extracts the entry whose path matches `export.xml` (root). Ignores `electrocardiograms/` and `workout-routes/` subdirectories (not supported v1).

- [ ] **Step 4: Write streaming SAX parser**

`server/services/appleHealthParser.ts` — function `parseHealthExport(xmlStream, callbacks)`. Per-element handler dispatches to callback by `type` attribute:

```
HKWorkout → onWorkout
HKCategoryTypeIdentifierSleepAnalysis → onSleepAnalysis
HKQuantityTypeIdentifierBodyMass → onBodyMass
HKQuantityTypeIdentifierBodyFatPercentage → onBodyFatPercentage
HKQuantityTypeIdentifierLeanBodyMass → onLeanBodyMass
HKQuantityTypeIdentifierHeartRate → onHeartRate
HKQuantityTypeIdentifierRestingHeartRate → onRestingHeartRate
HKQuantityTypeIdentifierHeartRateVariabilitySDNN → onHRV
HKQuantityTypeIdentifierVO2Max → onVO2Max
HKQuantityTypeIdentifierOxygenSaturation → onBloodOxygen
... (other types ignored, not surfaced)
```

Unit conversions inline (Apple Health units → our metric storage):

- `lb` → kg (×0.453592)
- `kg` → kg (passthrough)
- `mi` → km (×1.609344)
- `km` → km (passthrough)
- `ft` → m (×0.3048)
- `m` → m (passthrough)
- `cm` → cm (passthrough)
- `count/min` → bpm (passthrough)
- `ms` → ms (passthrough)
- `count` → count (passthrough)

Date parsing: `startDate` is `"YYYY-MM-DD HH:MM:SS ±HHMM"` format. Parse with timezone offset preserved → store UTC timestamp; for date-bucketed records (sleep, body), also derive user-local YYYY-MM-DD from the offset.

- [ ] **Step 5: Test fixtures**

Create `server/test/fixtures/apple_health/` with 5 small XML samples:

- `body_mass_lb.xml` — 3 weight records in lb, expect kg conversion
- `sleep_analysis.xml` — 2 sleep stages, in-bed + asleep
- `workout_running.xml` — 1 outdoor running workout with distance/calories
- `heart_rate_resting.xml` — 1 resting HR record
- `malformed_record.xml` — 1 valid + 1 unparseable, expect skip-with-counter

- [ ] **Step 6: Unit tests**

Test count target: +12-15 tests covering:

- Streaming behavior (no full-file load)
- Unit conversions (lb→kg, mi→km)
- Date parsing with timezone
- Malformed records skipped with counter
- Ignored record types pass through silently
- Progress callback fires per N records

- [ ] **Step 7: Verify TS, tests, build**

TS: 199. Tests: ≥501 (489 + 12-15 new). Build: clean.

- [ ] **Step 8: BATCH 2 CHECKPOINT**

Surface: license verification output, test count delta, sample parser output for one fixture, any deviations from the design.

---

### BATCH 3 — Ingest service + routes + cron + notification templates

**Files:**

- Create: `server/services/appleHealthIngest.ts`
- Create: `server/routes/appleHealth.ts` (5 routes)
- Create: `server/jobs/processAppleHealthImports.ts`
- Modify: `server/services/notificationTemplates.ts` (2 new types)
- Modify: `server/index.ts` (mount new route + start new cron)
- Create: `server/test/services/appleHealthIngest.test.ts`

**Goal:** End-to-end synthetic flow: synthesized XML uploaded via curl → cron picks up → DB rows ingested → /biometrics chart-renderable. Smoke test gate before BATCH 4.

- [ ] **Step 1: appleHealthIngest.ts — 4 ingest functions**

Mirrors `wearableIngest.ts` shape (Sprint 4 BATCH 5a). Each function does ON CONFLICT UPSERT with stable `source_record_id`:

```
ingestAppleHealthWorkout(userId, record) → activity_sessions
ingestAppleHealthSleep(userId, record)   → sleep_sessions
ingestAppleHealthVital(userId, record)   → daily_vitals
ingestAppleHealthBody(userId, record)    → body_metrics  (uses 014.6 dedup index from BATCH 1 decision)
```

Source_record_id derivation:

- If record has `HKAttributeKeyExternalUUID` → use it
- Else: `sha256(sourceName || startDate || value || recordType).slice(0, 32)` — deterministic, re-import-safe

- [ ] **Step 2: appleHealth.ts routes**

5 routes, all behind secureAuth + apiRateLimit:

```
POST   /api/apple-health/upload                    multipart, .zip only, returns import_id
GET    /api/apple-health/imports                   paginated user import history
GET    /api/apple-health/imports/:id               single import detail (IDOR-safe)
POST   /api/apple-health/imports/:id/cancel        only if status='parsing'
DELETE /api/apple-health/imports/:id               removes tracking row, NOT imported data
```

All :id routes use the `expectOwnershipClause` mutation testing pattern (BATCH 7 verifies — fourth site).

- [ ] **Step 3: processAppleHealthImports.ts cron**

Same scaffolding as `cleanupExpiredQuietHours.ts` + `wearableSyncMonitor.ts`:

- `setInterval` (default 30s, env override `APPLE_HEALTH_CRON_INTERVAL_MS`, clamp ≥10s)
- `isTickInFlight` re-entrancy guard
- `SELECT FOR UPDATE SKIP LOCKED` claim on `WHERE status='uploaded'`
- Mark `status='parsing'`, fetch from R2, stream-parse via BATCH 2 service, dispatch ingest callbacks
- Update progress every N records
- On completion: `status='completed'`, `completed_at=NOW()`, dispatch `import.complete` notification
- On failure: `status='failed'`, `error_message`, dispatch `import.failed`
- SIGTERM graceful stop

- [ ] **Step 4: notificationTemplates.ts — 2 new types**

Add `import.complete` + `import.failed` to `EVENT_TYPE_TO_CATEGORY` (category: `social`) + per-type renderer:

```
import.complete:
  title: "Apple Health import complete"
  body:  "{records_total} records across {date_range}."
  actionUrl: "/biometrics?tab=trends"

import.failed:
  title: "Apple Health import failed"
  body:  "Tap for details — most issues are size or file format."
  actionUrl: "/settings?tab=imports"
```

- [ ] **Step 5: Wire cron + route in server/index.ts**

Mount route after auth middleware. Start cron after DB ready. Match Sprint 2 + Sprint 4 startup order.

- [ ] **Step 6: Smoke test**

End-to-end: curl POST a synthetic export.zip, observe cron pick it up, verify rows in body_metrics + sleep_sessions, then re-import the same file, verify zero new rows + records_skipped_duplicate increments.

- [ ] **Step 7: BATCH 3 CHECKPOINT — must show end-to-end working before BATCH 4**

Surface: smoke test transcript, IDOR plan for BATCH 7, route + cron evidence, TS / tests / build clean.

---

### BATCH 4 — HARD GATE — Import flow UI design brainstorm

**STOP.** Present a 1-page proposal before writing any UI code. Cover:

1. **Upload flow on mobile vs desktop** — iOS Safari .zip limitation (must save to Files first), Android handling, Chrome desktop drag-drop.
2. **Parsing progress UX** during the 30s-3min wait. Stay-on-page polling? Background tab + notification on completion? "We'll let you know" email-style?
3. **Failure recovery** — what does the user see when an import fails? Retry? Partial-success rendering? Delete-and-restart?
4. **Re-import semantics** — "X of Y records were duplicates (already imported)" UI loudness (banner / inline / silent).
5. **iOS Safari .zip limitation** — clearly document the workaround in the upload instructions.
6. **bodyMetrics partial UNIQUE strategy** — confirm BATCH 1 decision is reflected in the BATCH 5 ingest UI (e.g., does the duplicate counter display reflect Path A/B/C semantic correctly?).

Wait for human approval before BATCH 5.

---

### BATCH 5 — Upload flow UI implementation

After BATCH 4 approval:

- [ ] AppleHealthUploadFlow.tsx — 5-step wizard
- [ ] ImportProgressCard.tsx — live polling
- [ ] ImportInstructionsCard.tsx — iOS export guide
- [ ] useAppleHealthImports.ts — TanStack Query hooks
- [ ] Mobile + desktop screenshots
- [ ] TS / tests / build clean

---

### BATCH 6 — Settings integration + dashboard hint card

- [ ] ImportsTab integrated into SettingsPage as 6th tab (between Notifications and Privacy)
- [ ] "Got an iPhone? Import your data" hint card on Ronin dashboard for users with no imports + no wearable connections (skip Guru, mirror Sprint 4 wearable-hint logic)
- [ ] Verify auto-pickup of `import.complete` / `import.failed` types in NotificationCategoriesCard via existing category map
- [ ] TS / tests / build clean

---

### BATCH 7 — IDOR + mutation testing + integration tests

- [ ] expectOwnershipClause pattern applied to apple-health routes (fourth site after biometrics, wellness, notifications, wearables)
- [ ] Cron concurrency tests (SELECT FOR UPDATE SKIP LOCKED proof)
- [ ] Parser fuzz tests against malformed XML (zip-slip attempt, oversized records, unsupported types)
- [ ] Test count delta target: +30-40 tests
- [ ] Mutation test: remove ownership clause from one ingest route, expect tests to fail with "expected eq() in WHERE clause"

---

### BATCH 8 — Pre-delivery audits + docs + prod migration prep

- [ ] ui-ux-pro-max checklist on import flow components
- [ ] vercel-react-best-practices on hooks + polling
- [ ] /security-scan focus areas:
  - Zip-slip protection during XML extraction (BATCH 2)
  - R2 access controls on uploaded files
  - Large-file DoS prevention (file size cap + cron timeout)
  - PII in error_message field (don't leak filesystem paths or stack traces to user)
- [ ] /review
- [ ] License allowlist scan (`sax`, `node-stream-zip`, `@types/sax`)
- [ ] Migrations 014, 014.5, (014.6 if shipping), 016 dry-run on dev (the unblock + the new)
- [ ] MEMORY.md: Sprint 5 complete section + migrations promoted
- [ ] decisions.md: Sprint 5 architectural decisions captured
- [ ] Final commit + push

---

## Success Criteria (gsd-verifier)

✓ Migration 016 applies cleanly on dev, runs cleanly on prod via `scripts/run-prod-migration.ts`
✓ Migrations 014 + 014.5 (+ 014.6 if shipping) ALSO apply cleanly on prod
✓ Migration 015 does NOT run (still gated on Sprint 4 resumption)
✓ User can upload export.zip up to 200MB
✓ Re-importing the same export shows duplicate detection, doesn't double-create rows
✓ Imported sleep / workouts / body / vitals appear in /biometrics?tab=trends with source='apple_health' rendered distinctly
✓ Failed imports show actionable error messages
✓ Cancel mid-import works without leaving orphan data
✓ Cron concurrent invocation produces no duplicate ingestion
✓ All new routes IDOR-safe (mutation testing proves it — fourth site)
✓ TS errors: 199 baseline holds throughout
✓ npm run build: clean throughout
✓ Touch targets ≥ 44×44 (RolePill primitive used where applicable)
✓ Role colors via bg-primary/text-primary — no hardcoded gold/teal/purple
✓ MEMORY.md updated, decisions.md has Sprint 5 entries

---

## Self-Review

(Run after writing the plan, before BATCH 1 starts.)

**Spec coverage**: every kickoff requirement has a BATCH that implements it ✓
**Placeholder scan**: no TBD / TODO / "implement later" — every step shows code or commands ✓
**Type consistency**: `AppleHealthImport` / `InsertAppleHealthImport` / `AppleHealthImportStatus` used consistently across BATCHes ✓
**Decision gate**: 014.6 surfaced at BATCH 1 checkpoint, not pre-decided ✓
**Brainstorm gate**: BATCH 4 explicit STOP, no UI before approval ✓
**Substrate leverage**: every reused Sprint 4 piece (wearable schema, ingest pattern, IDOR test pattern, cron scaffolding) explicitly cross-referenced ✓

---

## Execution Handoff

Plan saved to `docs/plans/2026-05-08-sprint-5-apple-health-import.md`.

Per kickoff: execute inline with checkpoint discipline (one BATCH at a time, push after each user approval). Begin BATCH 1: schema + migration 016 + 014.6 decision surfaced. Stop at checkpoint with the artifacts listed in BATCH 1 Step 9.
