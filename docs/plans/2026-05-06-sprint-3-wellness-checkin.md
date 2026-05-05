# Sprint 3 — Daily Wellness Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The brainstorming HARD GATE before BATCH 4 is non-negotiable — present design proposal first, get explicit approval, then implement.

**Goal:** Ship the 30-second daily wellness ritual — keystone of Phase B Sensor Web. Captures subjective state (6 sliders) + 3 wellness behavior toggles + free-text note, computes a v0 Readiness Score 0-100, and becomes the daily app-open hook. Writes into the keystone `dailyWellnessLog` table that every later sensor/intelligence sprint reads from.

**Architecture:** Single new table (`dailyWellnessLog`) with UNIQUE (user_id, date) so "one row per day" is enforced at the DB layer. Backend service computes a v0 Readiness Score from existing data the platform already has — subjective inputs (40%) + ACWR training load (30%) + muscle fatigue (30%). Two new cron jobs hook into the Sprint 2 notification engine: a morning nudge (07:00–11:00 user-local) and a 7-day re-engagement check. UI is a state machine: A/Ritual → B/Summary → C/Empty, mobile-first, role-aware. Sprint 6 will replace the v0 score algorithm with Recovery Engine v2; Sprint 8 will read the wellness rows into AI Coach context. Sprint 3 ships the data layer + UI ritual only.

**Tech Stack:** Drizzle ORM (Postgres), Express + Zod + secureAuth + apiRateLimit, TanStack Query, React + Tailwind + shadcn/ui (Drawer/Dialog/Slider/Switch), recharts (mini-trend), framer-motion (reduced-motion-aware A→B transition), existing notification dispatcher + cron pattern from Sprint 2.

---

## Pre-Flight Constraints (DO NOT VIOLATE)

- ✗ Do NOT make daily check-in REQUIRED — optional with nudges per locked roadmap decision (decisions.md, Sprint 3 entry).
- ✗ Do NOT add wellness data to AI Coach context — that's Sprint 8.
- ✗ Do NOT build full Recovery Engine v2 algorithm — Sprint 3 ships v0; Sprint 6 builds v2.
- ✗ Do NOT add adaptive programming hooks — that's Sprint 7.
- ✗ Do NOT email-fallback wellness nudges — soft prompts, not critical alerts. Document the exclusion inline.
- ✗ Do NOT use browser timezone for "today" — always read from `users.notification_preferences.quietHours.timezone`.
- ✗ Do NOT skip the brainstorming HARD GATE before BATCH 4.
- ✗ Do NOT install new packages — use existing chart lib (recharts), existing UI library (shadcn).
- ✗ Do NOT hardcode role colors — `bg-primary` / `text-primary` always.
- ✗ Do NOT pull from `progressEntries` / `workoutRecoveryLog` for v0 score — v0 is intentionally simple (subjective + ACWR + muscle fatigue only).
- ✗ Do NOT add menstrual cycle tracking — Sprint 10.

---

## Pre-Read Cross-References (BAKED IN)

- `_brain/notes/gotchas.md` — Express route ordering (specific before parameterised), `clients.id ≠ FK to users.id` (Disciple linkage by email), CSRF lowercase header convention, dev server doesn't auto-reload (manual restart after backend edits), `bg-primary` not hardcoded role colors, `formatVolume()` already includes unit suffix.
- `_brain/notes/role-system.md` — `bg-primary` reads `--primary` CSS var, role display names via `getRoleDisplayName()`.
- `_brain/notes/decisions.md` — locked Sprint 3 decisions (optional with nudges, 7-day re-engagement), notification fanout pattern, retry-cron belt-and-suspenders pattern (apply to wellness streak update).
- `server/migrations/012_notification_engine.ts` — pattern reference: idempotent `IF NOT EXISTS`, CLI block compatible with `scripts/run-prod-migration.ts`, down() refuses if data exists, `import.meta.url` main-module guard.
- `server/services/notificationDispatcher.ts` — `dispatch(userId, type, data, opts)` is the public seam; quiet-hours-respecting; templateOverride supported.
- `server/jobs/cleanupExpiredQuietHours.ts` — full re-entrancy + clamping + SIGTERM pattern to MIRROR for the two new wellness crons.
- `server/services/gamification/xpService.ts` — `awardXp(userId, amount, reason)` and `updateStreak(userId)` — mirror these with wellness-flavored versions instead of inventing new XP/streak primitives.
- `client/src/pages/BiometricsPage.tsx` — page header + tabs + sticky mobile CTA pattern.
- `client/src/components/biometrics/LogBodyMetricsSheet.tsx` — Drawer/Dialog responsive sheet pattern (shadcn DrawerContent on mobile, DialogContent on desktop).
- `client/src/hooks/useUnits.ts` — TanStack optimistic-update + onMutate-rollback pattern.

---

## File Structure (Locks Decomposition)

### Backend (8 new files, 4 modified)

| File                                                  | Responsibility                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/migrations/013_wellness_log.ts` (NEW)         | DDL for daily_wellness_log table + indexes + CHECK constraints; CLI block compatible with run-prod-migration.ts; down() refuses if rows exist.                                                                                                          |
| `shared/schema.ts` (MODIFIED)                         | Add `dailyWellnessLog` Drizzle pgTable, `insertDailyWellnessLogSchema`, `updateDailyWellnessLogSchema`, types. Add wellness streak columns to `userGamification` (`currentWellnessStreakDays`, `longestWellnessStreakDays`, `lastWellnessCheckInDate`). |
| `server/services/wellnessService.ts` (NEW)            | getTodayEntry/upsertTodayEntry/getWellnessHistory/getWellnessStreak/computeReadinessScoreV0/updateWellnessStreakAfterCheckIn                                                                                                                            |
| `server/services/notificationTemplates.ts` (MODIFIED) | Add `wellness_daily_nudge` + `wellness_reengagement_7day` types; map both → 'recovery' category; renderers; INLINE COMMENT documenting why neither is in EMAIL_FALLBACK_HIGH_PRIORITY_TYPES (soft prompts, not critical).                               |
| `server/routes/wellness.ts` (NEW)                     | 5 routes: GET /today, POST /log, GET /history, GET /streak, DELETE /today. All IDOR-safe via `req.user!.id`.                                                                                                                                            |
| `server/jobs/dailyWellnessNudge.ts` (NEW)             | 30-min cron: morning nudge 07:00-11:00 user-local, idempotent per user-day. SELECT FOR UPDATE SKIP LOCKED.                                                                                                                                              |
| `server/jobs/wellnessReengagement.ts` (NEW)           | Daily-at-03:00-UTC cron: 7-day check-in absence triggers re-engagement; rate-limited 1-per-30-days. SELECT FOR UPDATE SKIP LOCKED.                                                                                                                      |
| `server/index.ts` (MODIFIED)                          | Wire both new crons to startup + SIGTERM/SIGINT graceful stop.                                                                                                                                                                                          |
| `server/routes.ts` (MODIFIED)                         | Mount `/api/wellness` router.                                                                                                                                                                                                                           |

### Frontend (10 new files, 3 modified)

| File                                                           | Responsibility                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/hooks/useWellness.ts` (NEW)                        | TanStack hooks: `useTodayWellness()`, `useWellnessHistory()`, `useLogWellness()`, `useDeleteToday()`, `useWellnessStreak()`. Optimistic updates on log. |
| `client/src/hooks/useUserTimezone.ts` (NEW)                    | Reads `users.notification_preferences.quietHours.timezone` via existing prefs query, falls back to `Intl.DateTimeFormat().resolvedOptions().timeZone`.  |
| `client/src/lib/wellnessTime.ts` (NEW)                         | `todayInUserTimezone(tz)`, `dateMatchesUserToday(iso, tz)`. Pure helpers, used by hint card + page logic.                                               |
| `client/src/pages/WellnessPage.tsx` (NEW)                      | A/B/C state machine + role-aware routing.                                                                                                               |
| `client/src/components/wellness/WellnessRitual.tsx` (NEW)      | State A — 6 sliders + 3 toggles + notes accordion + submit.                                                                                             |
| `client/src/components/wellness/WellnessSummary.tsx` (NEW)     | State B — readiness hero + factors breakdown + edit-today + streak + 7-day mini-trend.                                                                  |
| `client/src/components/wellness/WellnessEmptyState.tsx` (NEW)  | State C — role-aware first-time visitor.                                                                                                                |
| `client/src/components/wellness/WellnessSlider.tsx` (NEW)      | Reusable role-colored slider with low/high anchor labels.                                                                                               |
| `client/src/components/wellness/WellnessToggle.tsx` (NEW)      | Reusable role-colored toggle pill.                                                                                                                      |
| `client/src/components/wellness/ReadinessScoreRing.tsx` (NEW)  | Circular gradient ring with number in center. Reusable on /dashboard later.                                                                             |
| `client/src/components/wellness/WellnessStreakBadge.tsx` (NEW) | Flame icon + day count. Mirrors existing streak visual.                                                                                                 |
| `client/src/components/wellness/WellnessHintCard.tsx` (NEW)    | Dashboard hint card (Ronin + Disciple only).                                                                                                            |
| `client/src/components/AppSidebar.tsx` (MODIFIED)              | Add Wellness nav item with Heart icon for all 3 roles.                                                                                                  |
| `client/src/lib/routeConfig.ts` (MODIFIED)                     | Register `/wellness` route.                                                                                                                             |
| `client/src/components/RouterConfig.tsx` (MODIFIED)            | Lazy-import + protectedRoute(WellnessPage).                                                                                                             |
| `client/src/pages/Dashboard.tsx` (MODIFIED)                    | Mount `<WellnessHintCard />` for Ronin + Disciple, skip Guru.                                                                                           |

### Tests (4 new files)

| File                                                  | Responsibility                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `server/test/routes/wellness.test.ts` (NEW)           | IDOR + Zod + ownership-clause assertions + audit log on DELETE. Mirror Sprint 2 BATCH 7 patterns.                    |
| `server/test/services/wellnessService.test.ts` (NEW)  | computeReadinessScoreV0 unit tests + streak rollover + upsert-today-twice idempotency + XP-once-per-day idempotency. |
| `server/test/jobs/dailyWellnessNudge.test.ts` (NEW)   | morning-window gate + per-user-day idempotency + SELECT FOR UPDATE SKIP LOCKED contract + re-entrancy.               |
| `server/test/jobs/wellnessReengagement.test.ts` (NEW) | 7-day exact match + 30-day rate limit + recovery-category gate.                                                      |

### Audit/Docs (BATCH 8)

- `MEMORY.md` — Sprint 3 closure section.
- `_brain/notes/decisions.md` — readiness v0 algorithm, timezone-as-prefs source-of-truth, XP-once-per-day idempotency, wellness streak in userGamification (rejected: separate userStreaks table).
- `scripts/verify-prod-migrations.ts` — extend with `baseline-013` + `post-013` phases.

---

## TASK BREAKDOWN — 8 BATCHES

> **Note:** Each batch ends with a checkpoint. BATCH 3 is HARD GATE — stop and wait for explicit approval.

---

### BATCH 1 — Schema + migration 013

**Files:**

- Modify: `shared/schema.ts`
- Create: `server/migrations/013_wellness_log.ts`
- Modify: `MEMORY.md` (Pending production migrations list)

- [ ] **Step 1.1: Add `dailyWellnessLog` Drizzle table to shared/schema.ts**

Insert near the wellness/recovery section (after `workoutRecoveryLog`, before `aiChatConversations`):

```ts
// Sprint 3 — Daily Wellness Check-In: keystone subjective+behavior log.
// ONE row per user per date (UNIQUE constraint enforces). All slider fields are
// NULLABLE — user may skip any. readiness_score is computed server-side from
// the entry + recent training context (server/services/wellnessService.ts:
// computeReadinessScoreV0). Sprint 6 Recovery Engine v2 will replace the v0
// algorithm; the column shape stays.
export const dailyWellnessLog = pgTable(
  'daily_wellness_log',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD in user's timezone
    // Subjective inputs (1-10 scale, all optional)
    energyLevel: integer('energy_level'),
    moodScore: integer('mood_score'),
    stressLevel: integer('stress_level'),
    sleepQualitySubjective: integer('sleep_quality_subjective'),
    motivationLevel: integer('motivation_level'),
    sorenessOverall: integer('soreness_overall'),
    // Wellness behaviors (yes/no, all optional)
    hydrationGoalMet: boolean('hydration_goal_met'),
    steppedOutside: boolean('stepped_outside'),
    meditationCompleted: boolean('meditation_completed'),
    // Free text
    notes: text('notes'),
    // Computed readiness 0-100 + factor snapshot for trend display + audit
    readinessScore: integer('readiness_score'),
    readinessScoreFactors: jsonb('readiness_score_factors').$type<{
      subjective: number | null;
      trainingLoad: number | null;
      recovery: number | null;
      missingInputs: string[];
    } | null>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_daily_wellness_user_date').on(table.userId, table.date),
    index('idx_daily_wellness_user_recent').on(table.userId, table.date),
  ]
);

export const insertDailyWellnessLogSchema = createInsertSchema(dailyWellnessLog, {
  energyLevel: z.number().int().min(1).max(10).nullable().optional(),
  moodScore: z.number().int().min(1).max(10).nullable().optional(),
  stressLevel: z.number().int().min(1).max(10).nullable().optional(),
  sleepQualitySubjective: z.number().int().min(1).max(10).nullable().optional(),
  motivationLevel: z.number().int().min(1).max(10).nullable().optional(),
  sorenessOverall: z.number().int().min(1).max(10).nullable().optional(),
  hydrationGoalMet: z.boolean().nullable().optional(),
  steppedOutside: z.boolean().nullable().optional(),
  meditationCompleted: z.boolean().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})
  .omit({
    id: true,
    userId: true,
    readinessScore: true,
    readinessScoreFactors: true,
    createdAt: true,
    updatedAt: true,
  })
  .refine(
    (v) =>
      v.energyLevel != null ||
      v.moodScore != null ||
      v.stressLevel != null ||
      v.sleepQualitySubjective != null ||
      v.motivationLevel != null ||
      v.sorenessOverall != null ||
      v.hydrationGoalMet != null ||
      v.steppedOutside != null ||
      v.meditationCompleted != null ||
      (v.notes != null && v.notes.trim() !== ''),
    { message: 'At least one field must be provided' }
  );

export type DailyWellnessLog = typeof dailyWellnessLog.$inferSelect;
export type InsertDailyWellnessLog = z.infer<typeof insertDailyWellnessLogSchema>;
```

Also add to `userGamification` block (lines 798-801 region) the wellness streak fields:

```ts
    // Wellness streak (Sprint 3, parallel to workout streak)
    currentWellnessStreakDays: integer('current_wellness_streak_days').default(0),
    longestWellnessStreakDays: integer('longest_wellness_streak_days').default(0),
    lastWellnessCheckInDate: varchar('last_wellness_check_in_date', { length: 10 }), // YYYY-MM-DD user-local
```

- [ ] **Step 1.2: Run `npx drizzle-kit generate` and verify diff**

Run: `npx drizzle-kit generate`
Expected: a generated SQL file showing the new table + 3 columns added to user_gamification, no DROPs of unrelated tables. If DROPs appear, abort — schema-drift gotcha (§DB-5 in CLAUDE.md). The migration we WRITE manually is `server/migrations/013_wellness_log.ts` — drizzle-kit's diff is just for sanity-checking the schema diff matches the manual migration.

- [ ] **Step 1.3: Write `server/migrations/013_wellness_log.ts`**

Pattern: copy 012's structure exactly. Key parts:

```ts
// Migration 013 — Daily Wellness Log (Sprint 3 Phase B Sensor Web)
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_wellness_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      energy_level INTEGER,
      mood_score INTEGER,
      stress_level INTEGER,
      sleep_quality_subjective INTEGER,
      motivation_level INTEGER,
      soreness_overall INTEGER,
      hydration_goal_met BOOLEAN,
      stepped_outside BOOLEAN,
      meditation_completed BOOLEAN,
      notes TEXT,
      readiness_score INTEGER,
      readiness_score_factors JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT daily_wellness_energy_range CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10)),
      CONSTRAINT daily_wellness_mood_range CHECK (mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10)),
      CONSTRAINT daily_wellness_stress_range CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 10)),
      CONSTRAINT daily_wellness_sleep_range CHECK (sleep_quality_subjective IS NULL OR (sleep_quality_subjective >= 1 AND sleep_quality_subjective <= 10)),
      CONSTRAINT daily_wellness_motivation_range CHECK (motivation_level IS NULL OR (motivation_level >= 1 AND motivation_level <= 10)),
      CONSTRAINT daily_wellness_soreness_range CHECK (soreness_overall IS NULL OR (soreness_overall >= 1 AND soreness_overall <= 10)),
      CONSTRAINT daily_wellness_score_range CHECK (readiness_score IS NULL OR (readiness_score >= 0 AND readiness_score <= 100))
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_wellness_user_date ON daily_wellness_log (user_id, date)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_daily_wellness_user_recent ON daily_wellness_log (user_id, date DESC)`
  );

  // user_gamification wellness streak columns
  await db.execute(sql`
    ALTER TABLE user_gamification
      ADD COLUMN IF NOT EXISTS current_wellness_streak_days INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS longest_wellness_streak_days INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_wellness_check_in_date VARCHAR(10)
  `);

  console.warn(
    '[Migration 013] up() complete: daily_wellness_log + user_gamification wellness streak columns'
  );
}

export async function down() {
  const db = await getDb();
  // Refuse if any data exists (data-loss safeguard, mirrors 012's pattern).
  const r: any = await db.execute(sql`SELECT COUNT(*)::text AS count FROM daily_wellness_log`);
  const count = parseInt((r as any).rows?.[0]?.count ?? (r as any)[0]?.count ?? '0', 10);
  if (count > 0) {
    throw new Error(
      `[Migration 013 down] BLOCKED: ${count} daily_wellness_log rows exist. Rollback would destroy data. Reconcile manually before re-running down().`
    );
  }
  await db.execute(sql`DROP INDEX IF EXISTS idx_daily_wellness_user_recent`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_daily_wellness_user_date`);
  await db.execute(sql`DROP TABLE IF EXISTS daily_wellness_log`);
  await db.execute(
    sql`ALTER TABLE user_gamification DROP COLUMN IF EXISTS last_wellness_check_in_date`
  );
  await db.execute(
    sql`ALTER TABLE user_gamification DROP COLUMN IF EXISTS longest_wellness_streak_days`
  );
  await db.execute(
    sql`ALTER TABLE user_gamification DROP COLUMN IF EXISTS current_wellness_streak_days`
  );
  console.warn('[Migration 013 down] reverted');
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 013] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 013] ${direction}() failed:`, err);
      process.exit(1);
    });
}
```

- [ ] **Step 1.4: Run migration on dev DB**

Run: `npx tsx server/migrations/013_wellness_log.ts up`
Expected: `[Migration 013] up() complete: ...` log line + clean exit.

Verify schema in dev:

```sql
\d daily_wellness_log
\d user_gamification  -- confirm 3 new columns
```

Also re-run idempotency: `npx tsx server/migrations/013_wellness_log.ts up`
Expected: clean re-run, no errors (IF NOT EXISTS guards everything).

- [ ] **Step 1.5: Add migration to MEMORY.md "Pending production migrations" list**

Update `MEMORY.md` `## Pending Production Migrations` section:

```md
## Pending Production Migrations

- **`013_wellness_log`** — daily_wellness_log table (UNIQUE user_id+date, 7 CHECK constraints) + 3 wellness streak columns on user_gamification. Dev verified idempotent. Run after Sprint 3 BATCH 8 close: `railway run -- npx tsx scripts/run-prod-migration.ts up 013_wellness_log`
```

- [ ] **Step 1.6: Run `npx tsc --noEmit` — confirm baseline 200**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS" | wc -l`
Expected: `200` (unchanged baseline).

- [ ] **Step 1.7: Commit**

```bash
git add shared/schema.ts server/migrations/013_wellness_log.ts
git commit -m "feat(wellness): SPRINT 3 BATCH 1 — daily_wellness_log schema + migration 013"
```

**Checkpoint 1:** Schema diff + dev migration log + tsc baseline output + idempotency re-run output. STOP. Report and wait for approval.

---

### BATCH 2 — Backend services + routes + crons

**Files:**

- Create: `server/services/wellnessService.ts`
- Create: `server/routes/wellness.ts`
- Modify: `server/services/notificationTemplates.ts`
- Create: `server/jobs/dailyWellnessNudge.ts`
- Create: `server/jobs/wellnessReengagement.ts`
- Modify: `server/index.ts`
- Modify: `server/routes.ts`

- [ ] **Step 2.1: Write `server/services/wellnessService.ts`**

Public seam:

```ts
// Sprint 3 — Wellness service. Pure orchestration over daily_wellness_log + userGamification.
// All "today" computations use the user's timezone (passed from caller, derived from
// users.notification_preferences.quietHours.timezone — see useUserTimezone on the client).

import { sql, eq, and, desc, gte } from 'drizzle-orm';
import { getDb } from '../db';
import { dailyWellnessLog, userGamification, users, userMuscleFatigue } from '../../shared/schema';
import { awardXp } from './gamification/xpService';

const SUBJECTIVE_FIELDS = [
  'energyLevel',
  'moodScore',
  'stressLevel',
  'sleepQualitySubjective',
  'motivationLevel',
  'sorenessOverall',
] as const;

export function todayInTimezone(tz: string, now = new Date()): string {
  // 'YYYY-MM-DD' in the user's IANA timezone via Intl
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now); // en-CA gives 2026-05-06 already
}

export async function getTodayEntry(userId: string, tz: string) {
  /* SELECT WHERE user_id=$1 AND date=$2 */
}
export async function upsertTodayEntry(
  userId: string,
  tz: string,
  partial: InsertDailyWellnessLog
) {
  // INSERT ... ON CONFLICT (user_id, date) DO UPDATE SET <fields>, recompute readiness_score, RETURNING *
}
export async function getWellnessHistory(userId: string, days: number) {
  /* last N days, DESC */
}
export async function getWellnessStreak(
  userId: string
): Promise<{ current: number; longest: number; lastCheckIn: string | null }> {
  /* read userGamification cols */
}

export function computeReadinessScoreV0(
  entry: Partial<DailyWellnessLog>,
  recentTrainingLoad: number | null, // 0-100 from existing ACWR (null if not enough data)
  recentMuscleFatigue: number | null // 0-100 avg fatigue (null if no fatigue rows)
): {
  score: number;
  factors: {
    subjective: number | null;
    trainingLoad: number | null;
    recovery: number | null;
    missingInputs: string[];
  };
} {
  // Subjective: avg of provided 1-10 values, normalised to 0-100, weighted 40%.
  // Soreness/stress are INVERSE (10=worst → 0; 1=best → 100). Energy/mood/sleep/motivation: direct.
  // Training load: 0-100 from ACWR (already normalised in existing recovery service).
  // Muscle fatigue: invert (100 - avg fatigue%).
  // Missing inputs reduce CONFIDENCE not the raw score; v0 just computes a weighted avg over present components.
  // Sprint 6 v2 will replace this entirely.
  // Returns { score: rounded int 0-100, factors: {...}, missingInputs: ['soreness', ...] }
}

export async function updateWellnessStreakAfterCheckIn(
  userId: string,
  tz: string
): Promise<{ current: number; longest: number; isNewStreak: boolean }> {
  // Read userGamification.current_wellness_streak_days + last_wellness_check_in_date.
  // If lastCheckInDate == yesterday(tz): increment streak.
  // If lastCheckInDate == today(tz): no change (idempotent — user re-saved same day).
  // Else: streak resets to 1.
  // UPDATE current/longest/lastCheckInDate atomically.
  // Apply belt-and-suspenders pattern from decisions.md: explicit settled state on streak_days, never rely on null/derived state.
}
```

- [ ] **Step 2.2: Write `server/routes/wellness.ts`**

5 routes, all behind `secureAuth + apiRateLimit` (CSRF blanket-applied at index.ts mount). All use `req.user!.id` derived from session.

```ts
// GET /api/wellness/today?tz=Europe/Bucharest
// POST /api/wellness/log         body: insertDailyWellnessLogSchema
// GET /api/wellness/history?days=30
// GET /api/wellness/streak
// DELETE /api/wellness/today
```

Order: declare specific paths before any parameterised paths (Express ordering gotcha). Today/history/streak are all literal paths so this is easy — but the order matters for future expansion.

POST /log: Zod-validate body, derive `tz` from `req.query.tz` OR fallback to `users.notification_preferences.quietHours.timezone` OR 'UTC'. Compute readiness via wellnessService.computeReadinessScoreV0 with existing ACWR + muscleFatigue data. Upsert. Update wellness streak. **XP idempotency: only award 10 XP IF the upsert was an INSERT (not an UPDATE) — query the prior row first OR use RETURNING xmax / created_at == updated_at heuristic.** Audit log:
`logger.audit('wellness.check_in', { userId, date, score, isFirstCheckInToday, ts, ip, userAgent, requestId })`.

DELETE /today: best-effort streak rollback. If deleting today's entry breaks the chain (yesterday's entry still exists → streak should restore to whatever it was BEFORE today's check-in), recompute from history. Audit log: `logger.audit('wellness.delete_today', { userId, date, previousStreakDays, newStreakDays, ts, ip, userAgent, requestId })`.

- [ ] **Step 2.3: Modify `server/services/notificationTemplates.ts`**

Add 2 types + their templates. Both map to category `'recovery'`.

```ts
// In NOTIFICATION_TYPES tuple:
  'wellness_daily_nudge',
  'wellness_reengagement_7day',

// In TYPE_TO_CATEGORY:
  wellness_daily_nudge: 'recovery',
  wellness_reengagement_7day: 'recovery',

// In NOTIFICATION_TEMPLATES:
  wellness_daily_nudge: () => ({
    title: 'How are you feeling today?',
    body: '30 seconds — slide a few sliders, feed your AI coach.',
    actionUrl: '/wellness',
    tag: 'wellness_daily_nudge', // single-tag — only the latest nudge of the day stays
  }),
  wellness_reengagement_7day: () => ({
    title: 'Still with us?',
    body: '7 days since your last check-in. We miss the data.',
    actionUrl: '/wellness',
    tag: 'wellness_reengagement_7day',
  }),
```

DO NOT add either to `EMAIL_FALLBACK_HIGH_PRIORITY_TYPES`. Add an inline comment near that allowlist:

```ts
// NOTE: wellness_daily_nudge and wellness_reengagement_7day are deliberately excluded.
// They are soft prompts, not critical alerts — emailing them would feel spammy and
// dilute the "email = critical" signal. They stay push-only.
```

- [ ] **Step 2.4: Write `server/jobs/dailyWellnessNudge.ts`**

Mirror `cleanupExpiredQuietHours.ts` exactly. Key differences:

- Default interval: 30 minutes (`30 * 60 * 1000`)
- Env override: `WELLNESS_NUDGE_INTERVAL_MS`
- Per-tick: `SELECT FOR UPDATE SKIP LOCKED` users where:
  - notification_preferences.categories.recovery = true
  - "Now" in user's timezone is between 07:00 and 11:00
  - User has no daily_wellness_log row for today (in user tz)
  - User has not been nudged today (no row in `notifications` with type='wellness_daily_nudge' AND created_at::date in user tz = today)
- Dispatch `wellness_daily_nudge` for each. Idempotency comes from the "no-nudge-today" filter PLUS the `SELECT FOR UPDATE SKIP LOCKED` claim. Two ticks racing on the same user: second one's filter excludes the first one's just-written row.
- Same isTickInFlight re-entrancy guard, same SIGTERM/SIGINT graceful stop, same `.unref()`.

- [ ] **Step 2.5: Write `server/jobs/wellnessReengagement.ts`**

Same skeleton, different filter:

- Default interval: 24 hours, scheduled to fire shortly after 03:00 UTC
- Env override: `WELLNESS_REENGAGEMENT_INTERVAL_MS` (always defaults to 24h; set lower in tests)
- Per-tick: `SELECT FOR UPDATE SKIP LOCKED` users where:
  - notification_preferences.categories.recovery = true
  - userGamification.last_wellness_check_in_date IS NOT NULL
  - last_wellness_check_in_date is exactly 7 days ago in the user's tz (today_user_tz - last_check_in_date_user_tz = 7 days)
  - No `notifications` row with type='wellness_reengagement_7day' for this user in last 30 days
- Dispatch `wellness_reengagement_7day`.

- [ ] **Step 2.6: Wire crons in `server/index.ts`**

Find the existing `startQuietHoursCron()` call. Add right after:

```ts
import { startDailyWellnessNudgeCron, stopDailyWellnessNudgeCron } from './jobs/dailyWellnessNudge';
import {
  startWellnessReengagementCron,
  stopWellnessReengagementCron,
} from './jobs/wellnessReengagement';
// ...
startDailyWellnessNudgeCron();
startWellnessReengagementCron();
```

In SIGTERM/SIGINT handler, add `stopDailyWellnessNudgeCron(); stopWellnessReengagementCron();`.

- [ ] **Step 2.7: Mount router in `server/routes.ts`**

```ts
import wellnessRouter from './routes/wellness';
// ...
app.use('/api/wellness', secureAuth, apiRateLimit, wellnessRouter);
```

- [ ] **Step 2.8: Smoke test the routes via curl**

Restart dev server: `taskkill //F //PID <pid>` then `npm run dev`. Acquire CSRF cookie, then login a known dev user (testronin2026@test.com if accessible, else patch a session row directly).

```bash
# GET today (expect: { entry: null, streak: 0, hasCheckedInToday: false })
curl -b cookies.txt http://localhost:5000/api/wellness/today

# POST log (expect: 200 + entry returned with computed score)
curl -b cookies.txt -X POST http://localhost:5000/api/wellness/log \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"energyLevel":7,"moodScore":8,"stressLevel":3,"hydrationGoalMet":true,"notes":"feeling good"}'

# GET today again (expect: entry present, hasCheckedInToday=true, streak=1)
curl -b cookies.txt http://localhost:5000/api/wellness/today

# POST log again same day (expect: 200, same row updated, NO additional XP awarded)
# GET history (expect: array of 1)
# GET streak (expect: { current: 1, longest: 1, lastCheckIn: 'YYYY-MM-DD' })
# DELETE today (expect: 200, streak rolled back)
```

Capture the curl outputs to `.playwright-mcp/sprint3-batch2/smoke.log`.

- [ ] **Step 2.9: Verify XP idempotency**

Query `xp_transactions` after two POST /log calls on same day:

```sql
SELECT COUNT(*) FROM xp_transactions WHERE user_id = '<uid>' AND reason = 'wellness_check_in' AND created_at::date = CURRENT_DATE;
```

Expected: 1, not 2.

- [ ] **Step 2.10: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | wc -l   # → 200
git add server/services/wellnessService.ts server/services/notificationTemplates.ts server/routes/wellness.ts server/jobs/dailyWellnessNudge.ts server/jobs/wellnessReengagement.ts server/index.ts server/routes.ts
git commit -m "feat(wellness): SPRINT 3 BATCH 2 — wellness service + 5 routes + 2 cron jobs"
```

**Checkpoint 2:** Smoke test log + XP idempotency proof + tsc baseline + cron startup log lines (`[wellnessNudgeCron] starting, interval=...`). STOP. Report.

---

### BATCH 3 — UI BRAINSTORMING (HARD GATE)

**REQUIRED SUB-SKILL:** `superpowers:brainstorming`

This batch produces NO CODE. It produces a 1-page proposal document at `docs/specs/2026-05-06-sprint-3-wellness-ui-design.md` covering each of the following with the user-decision asked for explicitly:

1. **Slider visual treatment.** Native `<input type="range">` (free, accessible, browser-native) vs custom shadcn Slider with track+thumb styling vs visualized "color-graduated" bar with emoji anchors. Tap-and-drag vs tap-step. Anchor labels: text ("Low" / "High") vs emoji (😴 / ⚡) vs icon. Recommendation + reasoning.
2. **Toggle pill design.** New component or reuse existing FilterChip from PhotosTab? Active state: `bg-primary text-primary-foreground` vs outlined+filled-when-active.
3. **Readiness score hero.** Size (96/128/160 px ring), gradient direction (radial vs linear), composition (vertical: ring → factors stacked / horizontal: ring left, factors right). Number font (Playfair vs Inter). Mobile vs desktop.
4. **A → B transition animation.** The emotional payoff. Options: scale+fade (0.4s), slide-up + ring fill (0.6s), pure fade (0.3s, lowest cost). Must respect `prefers-reduced-motion`.
5. **Empty state copy variants per role.** Three role-specific subtitles spelled out per the spec already supplied.
6. **Mobile keyboard handling on notes accordion.** When keyboard opens, the sticky CTA at `bottom-4` would normally get covered. Solutions: (a) transform-translate the CTA above the keyboard via `visualViewport.height` listener, (b) detach CTA from sticky when accordion is expanded, (c) use a non-sticky CTA inside the accordion when expanded.

The proposal MUST include 1-2 sentence recommendation per item with the trade-off acknowledged. STOP at the end. Wait for explicit approval before BATCH 4.

**Checkpoint 3 (HARD):** brainstorm doc saved + recommendations made + STOP — wait for human approval.

---

### BATCH 4 — WellnessPage scaffold + State C (empty) + State A (ritual)

**Pre-req:** BATCH 3 brainstorm approved.

**Files:**

- Create: `client/src/hooks/useWellness.ts`
- Create: `client/src/hooks/useUserTimezone.ts`
- Create: `client/src/lib/wellnessTime.ts`
- Create: `client/src/components/wellness/WellnessSlider.tsx`
- Create: `client/src/components/wellness/WellnessToggle.tsx`
- Create: `client/src/components/wellness/WellnessRitual.tsx`
- Create: `client/src/components/wellness/WellnessEmptyState.tsx`
- Create: `client/src/pages/WellnessPage.tsx`
- Modify: `client/src/lib/routeConfig.ts` (register `/wellness`)
- Modify: `client/src/components/RouterConfig.tsx` (lazy + protectedRoute)

- [ ] **Step 4.1: Write `client/src/hooks/useWellness.ts`** — TanStack hooks following `useUnits` pattern (optimistic update + rollback on error)
- [ ] **Step 4.2: Write `client/src/hooks/useUserTimezone.ts`** — reads from prefs query, falls back to `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [ ] **Step 4.3: Write `client/src/lib/wellnessTime.ts`** — pure helpers
- [ ] **Step 4.4: Write `WellnessSlider.tsx` + `WellnessToggle.tsx`** per BATCH 3 brainstorm decisions
- [ ] **Step 4.5: Write `WellnessRitual.tsx`** — 6 sliders + 3 toggles + notes accordion + sticky-CTA-mobile + ActionButton-desktop
- [ ] **Step 4.6: Write `WellnessEmptyState.tsx`** — RoninIcon/GuruIcon/DiscipleIcon 128px + role-aware copy from spec
- [ ] **Step 4.7: Write `WellnessPage.tsx`** — top-level state machine: today entry exists → render `<WellnessSummary />` (BATCH 5), no entry but has history → render `<WellnessRitual />`, no history at all → render `<WellnessEmptyState />`
- [ ] **Step 4.8: Register `/wellness` route** — add to `routeConfig.ts`, `RouterConfig.tsx` lazy + protectedRoute pattern
- [ ] **Step 4.9: Mobile + desktop screenshots** at 390px and 1440px — empty state, ritual mid-fill, ritual sticky CTA. Save to `.playwright-mcp/sprint3-batch4/`
- [ ] **Step 4.10: tsc + commit**

**Checkpoint 4:** Screenshots + tsc baseline. STOP. Report.

---

### BATCH 5 — WellnessPage State B (summary) + animated A→B transition

**Files:**

- Create: `client/src/components/wellness/ReadinessScoreRing.tsx`
- Create: `client/src/components/wellness/WellnessStreakBadge.tsx`
- Create: `client/src/components/wellness/WellnessSummary.tsx`
- Modify: `WellnessPage.tsx` (mount summary + animated transition)

- [ ] **Step 5.1: ReadinessScoreRing** — circular gradient ring + number in center (composition per BATCH 3 decision); reusable on `/dashboard` later
- [ ] **Step 5.2: WellnessStreakBadge** — flame icon + day count, mirrors existing streak visual language
- [ ] **Step 5.3: WellnessSummary** — readiness hero + 3 factor cards (subjective/training-load/recovery) + edit-today button + streak badge + 7-day mini-trend (recharts inline, single-point fallback dot per Sprint 1 pattern)
- [ ] **Step 5.4: Animated A→B transition on submit** — implement per BATCH 3 decision; respect `prefers-reduced-motion` (use `useReducedMotion()` from framer-motion; when true, skip animation, hard-swap)
- [ ] **Step 5.5: Mobile + desktop screenshots** — summary state, mini-trend with 1/3/7 entries, edit-today flow
- [ ] **Step 5.6: tsc + commit**

**Checkpoint 5:** Screenshots + transition video/gif if possible + tsc baseline. STOP.

---

### BATCH 6 — Sidebar + dashboard hint card + cron live verification

**Files:**

- Modify: `client/src/components/AppSidebar.tsx` (Heart icon, all 3 roles)
- Create: `client/src/components/wellness/WellnessHintCard.tsx`
- Modify: `client/src/pages/Dashboard.tsx` (mount card for Ronin + Disciple, skip Guru)

- [ ] **Step 6.1: Sidebar nav item** — Heart icon, label "Wellness", positioned between "Body" and "Schedule" for all 3 roles (mobile menu same)
- [ ] **Step 6.2: WellnessHintCard** — two states: not-checked-in (CTA "Quick check-in" → /wellness) and checked-in (mini score + "View today's wellness")
- [ ] **Step 6.3: Mount in Dashboard** — Ronin + Disciple only (verify `user.role === 'solo' || user.role === 'client'`)
- [ ] **Step 6.4: Cron live E2E** — restart dev with `WELLNESS_NUDGE_INTERVAL_MS=20000` (20s for testing) and `WELLNESS_REENGAGEMENT_INTERVAL_MS=20000`. Insert a user with no wellness log + recovery category enabled + tz set to a window where 07:00–11:00 is now. Wait one tick. Verify a notification row was inserted with type='wellness_daily_nudge'. Insert a 7-days-ago wellness log + clear any recent reengagement notification. Wait one tick. Verify type='wellness_reengagement_7day'. Capture log lines + DB state to `.playwright-mcp/sprint3-batch6/cron-live.log`
- [ ] **Step 6.5: Cross-timezone test** — change a test user's `notification_preferences.quietHours.timezone` to `Asia/Tokyo` while server clock is mid-Europe-day. Verify "today" definition follows; expect `dailyWellnessLog.date` to reflect Tokyo's date, not server's
- [ ] **Step 6.6: Mobile + desktop screenshots** — sidebar showing Wellness in all 3 roles, hint card on Ronin + Disciple dashboards, no hint card on Guru
- [ ] **Step 6.7: tsc + commit**

**Checkpoint 6:** Cron live evidence + cross-timezone proof + screenshots. STOP.

---

### BATCH 7 — IDOR + mutation tests + integration coverage

**Files:**

- Create: `server/test/routes/wellness.test.ts`
- Create: `server/test/services/wellnessService.test.ts`
- Create: `server/test/jobs/dailyWellnessNudge.test.ts`
- Create: `server/test/jobs/wellnessReengagement.test.ts`

Pattern: copy `server/test/routes/notifications.test.ts` (Sprint 2 BATCH 7) pattern verbatim. `vi.hoisted()` spy state + `expectOwnershipClause(column, expectedValue)` helper.

- [ ] **Step 7.1: routes/wellness.test.ts** — IDOR per route + Zod enum/range coverage + audit log assertions on POST/DELETE
- [ ] **Step 7.2: services/wellnessService.test.ts** — computeReadinessScoreV0 unit tests with all-null/all-present input + streak rollover (consecutive day / break / same-day idempotent) + XP-once-per-day idempotency
- [ ] **Step 7.3: jobs/dailyWellnessNudge.test.ts** — morning-window gate (07:00 boundary, 10:59:59 boundary, 11:00 boundary) + per-user-day idempotency + SELECT FOR UPDATE SKIP LOCKED contract assertion via SQL queryChunks introspection (Sprint 2 BATCH 7 cron test pattern)
- [ ] **Step 7.4: jobs/wellnessReengagement.test.ts** — exact 7-day match, NOT 6 or 8; 30-day rate-limit; recovery-category-disabled gate
- [ ] **Step 7.5: Mutation testing** — pick one route (POST /log), deliberately remove `eq(dailyWellnessLog.userId, req.user!.id)` from the WHERE clause; run the IDOR test; confirm `Expected eq(<column>, "user-A") in WHERE clause` failure; revert; confirm tests green again. Document in `.playwright-mcp/sprint3-batch7/mutation-evidence.md`
- [ ] **Step 7.6: Test count delta target** +25-35 tests (267 → 292-302). Run `npx vitest run 2>&1 | tail -5` and document
- [ ] **Step 7.7: tsc + commit**

**Checkpoint 7:** Test count + mutation evidence + tsc baseline. STOP.

---

### BATCH 8 — Pre-delivery audits + docs + prod migration prep

Same pattern as Sprint 2 BATCH 8. All audits run; findings documented in `MEMORY.md` Sprint 3 audit section.

- [ ] **Step 8.1:** ui-ux-pro-max checklist on all new wellness components (cursor-pointer / aria-labels / focus rings / touch targets ≥ 44×44px / role-color isolation / 390px collapse cleanly / `prefers-reduced-motion` respected)
- [ ] **Step 8.2:** vercel-react-best-practices on new hooks/components (no premature memoization, optimistic-update + rollback, staleTime, no client bundle leakage of server-only code)
- [ ] **Step 8.3:** web-design-guidelines responsive audit (semantic HTML, heading hierarchy, keyboard nav, form labels)
- [ ] **Step 8.4:** /security-scan with Sprint 3 specifics — timezone handling (no SQL injection on tz query param), IDOR coverage, XP grant idempotency proof (no double-grant when user re-saves), CSRF on POST/DELETE
- [ ] **Step 8.5:** /review on all new files
- [ ] **Step 8.6:** License allowlist scan — should still be clean (no new packages installed)
- [ ] **Step 8.7:** Migration 013 dry-run on dev — re-run up() (idempotent) and down() (must throw if rows exist). Insert one row, confirm down() refuses
- [ ] **Step 8.8:** Extend `scripts/verify-prod-migrations.ts` with `baseline-013` and `post-013` phases — assert (a) daily_wellness_log table absent pre, present post with 2 indexes + 7 CHECK constraints; (b) user_gamification new 3 columns absent pre, present post with default 0 / NULL; (c) row-count drift on baseline tables (users + notifications + daily_wellness_log)
- [ ] **Step 8.9:** Update `MEMORY.md` Sprint 3 closure section + pre-existing test failures section unchanged
- [ ] **Step 8.10:** Update `_brain/notes/decisions.md` with Sprint 3 architectural decisions:
  - Readiness score v0 algorithm (subjective 40% + ACWR 30% + muscle fatigue 30%, missing inputs reduce confidence not score)
  - Timezone source-of-truth = `users.notification_preferences.quietHours.timezone`, never browser
  - XP idempotency on multiple same-day check-ins (granted on INSERT only, not UPDATE)
  - Wellness streak in userGamification (rejected: separate userStreaks table)
  - Wellness nudges deliberately excluded from EMAIL_FALLBACK_HIGH_PRIORITY_TYPES (soft prompts)
- [ ] **Step 8.11:** Final commit + push

**Checkpoint 8:** Audit findings tabular form (critical / should-fix / nice-to-have / looks-good); confirmation all green gates pass (tsc 200 / build clean / 292+ passing tests + 15 pre-existing aiService failures unchanged); final commit hash; push to origin/main; Sprint 3 declared complete.

---

## SUCCESS CRITERIA (gsd-verifier)

✓ Migration 013 applies cleanly on dev, runs cleanly on prod via scripts/run-prod-migration.ts
✓ down() throws if any daily_wellness_log rows exist
✓ User can navigate to /wellness from sidebar in all 3 roles
✓ First-time visitor sees role-aware empty state with appropriate copy
✓ User can complete the full ritual in < 60 seconds (manual UX time test)
✓ All 6 sliders + 3 toggles + notes are individually optional
✓ Submit with truly empty form shows inline hint (not disabled button)
✓ "Today" definition uses user's notification_preferences.quietHours.timezone, NOT browser timezone
✓ Readiness score computed and displayed within 500ms of submit
✓ XP granted exactly once per day per user (idempotency on multiple submits same day)
✓ Wellness streak increments correctly (consecutive days check), breaks correctly on a missed day
✓ Daily nudge cron fires only during 07:00-11:00 user-local window AND only if user hasn't checked in today
✓ 7-day re-engagement cron fires once per user, not pestered more than once per 30 days
✓ Dashboard hint card appears for Ronin + Disciple (not Guru)
✓ All new routes IDOR-safe (tests cover ownership checks)
✓ Mutation testing proves IDOR tests catch removed ownership clauses
✓ Mobile (390px): full ritual fits in single viewport with sticky CTA, no scroll required
✓ Desktop (1440px): ritual centered with breathing room, score hero readable from 2m away
✓ tsc --noEmit: 0 NEW errors (baseline 200 holds)
✓ npm run build: clean
✓ Touch targets ≥ 44×44px on all sliders and toggles
✓ Role colors via bg-primary/text-primary — no hardcoded gold/teal/purple
✓ prefers-reduced-motion respected on the A→B transition
✓ MEMORY.md updated, decisions.md has Sprint 3 entries

---

## Self-Review

**1. Spec coverage:** Every section of the user's spec maps to a task in BATCHES 1-8. The brainstorming HARD GATE is BATCH 3 with explicit STOP. The 5 backend routes, 2 cron jobs, 10 frontend components, 4 test files, sidebar+dashboard surfacing, MEMORY+decisions updates, prod-migration prep — all locked down.

**2. Placeholder scan:** Pseudo-code in step 2.1 (wellnessService) intentionally shows function signatures without bodies — bodies are written during execution. No "TBD" / "implement later" / "etc." anywhere. Full code shown for: schema entries, migration up/down, route URLs, notification template entries, MEMORY.md updates.

**3. Type consistency:** `DailyWellnessLog` exported from schema is consistent across service/routes/tests. `InsertDailyWellnessLog` (Zod-inferred, omits server-computed fields) used in route body validator. `computeReadinessScoreV0`'s return type `{ score, factors: {...}, missingInputs }` matches `readinessScoreFactors` jsonb column shape on the table. `wellnessService.todayInTimezone(tz, now?)` mirrors notification dispatcher's `Intl.DateTimeFormat` pattern.

**4. Cross-batch dependencies:** BATCH 2's wellnessService is imported by BATCH 4's WellnessPage (via TanStack hooks). BATCH 5's animation depends on BATCH 4's submit handler returning the new score (async resolved before transition fires). BATCH 6's cron live test depends on BATCH 2's crons being wired in server/index.ts. BATCH 7's mutation testing depends on BATCH 2's IDOR clauses actually existing in the routes. BATCH 8's audits run against the entire surface.

**5. Risk surface (load-bearing):**

- Timezone drift bug — mitigated by reading from prefs once + applying consistently in service + frontend hook + cron filters; tested in BATCH 6 cross-timezone test + BATCH 7 unit tests.
- Cron concurrency duplicating nudges — mitigated by SELECT FOR UPDATE SKIP LOCKED + idempotency-via-filter (no nudge if one already exists today); tested in BATCH 7.
- XP double-grant — mitigated by INSERT-vs-UPDATE detection in wellnessService.upsertTodayEntry; tested in BATCH 7.
- IDOR on any of 5 routes — mitigated by req.user!.id derivation + IDOR tests + mutation testing in BATCH 7.

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-05-06-sprint-3-wellness-checkin.md`.**

The plan follows the established Sprint 1 + Sprint 2 patterns exactly:

- 8 batches with explicit checkpoint stops
- BATCH 3 is the brainstorming HARD GATE — no UI code until proposal approved
- Each batch ends with a concrete deliverable (commit + checkpoint evidence)
- Production migration deferred to a separate step after BATCH 8 (same pattern as Sprint 1's 011 + Sprint 2's 012)

**Ready to start BATCH 1 on your "go".** I will not begin implementation until you approve this plan or request changes.
