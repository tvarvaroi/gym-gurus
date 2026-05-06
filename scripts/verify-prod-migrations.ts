// One-shot verification script for migrations 010 + 011 + 012 + 013 against Railway prod.
// Run via: railway run -- npx tsx scripts/verify-prod-migrations.ts <phase>
//
// Phases:
//   baseline      — pre-010 snapshot: existing-table row counts + confirm 010/011
//                   artefacts are absent
//   post-010      — confirm program_* tables exist + indexes + row counts on
//                   existing tables haven't drifted from baseline
//   post-011      — confirm body_metrics + progress_photos exist, progress_entries
//                   polymorphic refactor took effect, share_body_metrics_with_trainer
//                   column on clients, AND the critical check that no existing
//                   progress_entries row has client_id=NULL after the refactor
//   baseline-012  — pre-012 snapshot: confirm 012 artefacts ABSENT, capture
//                   row counts for drift detection, assert notification_preferences
//                   column has zero rows with new-shape (categories key)
//   post-012      — confirm push_subscriptions table + 3 indexes, preferred_units
//                   column with all rows = 'metric', notification_preferences fully
//                   reshaped (every row has categories/quietHours/channels keys),
//                   notifications.deliver_after + delivered_at + partial index,
//                   AND CRITICAL: zero pre-existing notifications rows are
//                   cron-claimable (would cause historical re-delivery)
//   baseline-013  — pre-013 snapshot: confirm 013 artefacts ABSENT (daily_wellness_log
//                   table + 2 indexes + 3 user_gamification wellness-streak columns),
//                   capture row counts for drift detection
//   post-013      — confirm daily_wellness_log table + UNIQUE (user_id,date) +
//                   DESC index + 7 named CHECK constraints fire on probe inserts,
//                   ON DELETE CASCADE on user_id wired, 3 user_gamification cols
//                   present with default 0/0/NULL on every existing row, existing-
//                   table row counts unchanged from baseline-013
//
// Designed to be safe to re-run. All queries are SELECT-only except the
// transaction-wrapped CHECK constraint enforcement test in post-011.
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';

type Phase =
  | 'baseline'
  | 'post-010'
  | 'post-011'
  | 'baseline-012'
  | 'post-012'
  | 'baseline-013'
  | 'post-013';

const EXISTING_TABLES_TO_COUNT = [
  'users',
  'clients',
  'workouts',
  'exercises',
  'progress_entries',
  'sessions',
];

async function rowCounts(db: Awaited<ReturnType<typeof getDb>>) {
  const counts: Record<string, number> = {};
  for (const t of EXISTING_TABLES_TO_COUNT) {
    const result: any = await db.execute(sql.raw(`SELECT COUNT(*)::text AS c FROM ${t}`));
    const c = result.rows?.[0]?.c ?? result[0]?.c ?? '0';
    counts[t] = parseInt(c, 10);
  }
  return counts;
}

async function tableExists(db: Awaited<ReturnType<typeof getDb>>, name: string) {
  const result: any = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `);
  return Boolean(result.rows?.[0]?.exists ?? result[0]?.exists);
}

async function columnExists(db: Awaited<ReturnType<typeof getDb>>, table: string, column: string) {
  const result: any = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `);
  return Boolean(result.rows?.[0]?.exists ?? result[0]?.exists);
}

async function columnIsNullable(
  db: Awaited<ReturnType<typeof getDb>>,
  table: string,
  column: string
) {
  const result: any = await db.execute(sql`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `);
  const v = result.rows?.[0]?.is_nullable ?? result[0]?.is_nullable;
  return v === 'YES';
}

async function constraintExists(db: Awaited<ReturnType<typeof getDb>>, name: string) {
  const result: any = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = ${name}
    ) AS exists
  `);
  return Boolean(result.rows?.[0]?.exists ?? result[0]?.exists);
}

async function indexExists(db: Awaited<ReturnType<typeof getDb>>, name: string) {
  const result: any = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = ${name}
    ) AS exists
  `);
  return Boolean(result.rows?.[0]?.exists ?? result[0]?.exists);
}

async function baseline() {
  const db = await getDb();
  console.log('=== BASELINE (pre-010) ===\n');

  // Database identity check — confirms we're hitting the right DB.
  const ident: any = await db.execute(sql`SELECT current_database() AS db, version() AS v`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}`);
  console.log(`Version : ${(ident.rows?.[0]?.v ?? ident[0]?.v ?? '').slice(0, 80)}\n`);

  // 010 artefacts — must NOT exist
  const programsExists = await tableExists(db, 'programs');
  const programWeeksExists = await tableExists(db, 'program_weeks');
  const programEnrollmentsExists = await tableExists(db, 'program_enrollments');
  const programDayCompletionsExists = await tableExists(db, 'program_day_completions');

  // 011 artefacts — must NOT exist
  const bodyMetricsExists = await tableExists(db, 'body_metrics');
  const progressPhotosExists = await tableExists(db, 'progress_photos');
  const peUserIdExists = await columnExists(db, 'progress_entries', 'user_id');
  const clientsShareColExists = await columnExists(
    db,
    'clients',
    'share_body_metrics_with_trainer'
  );

  console.log('010 artefacts (must be absent before run):');
  console.log(
    `  programs                     : ${programsExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  program_weeks                : ${programWeeksExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  program_enrollments          : ${programEnrollmentsExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  program_day_completions      : ${programDayCompletionsExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log('');
  console.log('011 artefacts (must be absent before run):');
  console.log(
    `  body_metrics                 : ${bodyMetricsExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  progress_photos              : ${progressPhotosExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  progress_entries.user_id     : ${peUserIdExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  clients.share_body_metrics…  : ${clientsShareColExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  console.log('\nExisting-table row counts (snapshot for drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  console.log(
    '\nSAVE THESE NUMBERS — used as the baseline for post-010 and post-011 drift checks.'
  );
}

async function post010() {
  const db = await getDb();
  console.log('=== POST-010 ===\n');

  const programsOk = await tableExists(db, 'programs');
  const weeksOk = await tableExists(db, 'program_weeks');
  const enrollmentsOk = await tableExists(db, 'program_enrollments');
  const completionsOk = await tableExists(db, 'program_day_completions');

  const idxCreator = await indexExists(db, 'idx_programs_creator_id');
  const idxGoal = await indexExists(db, 'idx_programs_goal');
  const idxPublic = await indexExists(db, 'idx_programs_public');
  const idxWeeksProgram = await indexExists(db, 'idx_program_weeks_program_id');
  const idxWeeksOrder = await indexExists(db, 'idx_program_weeks_order');
  const idxEnrUser = await indexExists(db, 'idx_enrollments_user_id');
  const idxEnrProgram = await indexExists(db, 'idx_enrollments_program_id');
  const idxEnrStatus = await indexExists(db, 'idx_enrollments_status');
  const idxComplEnr = await indexExists(db, 'idx_day_completions_enrollment_id');
  const idxComplWeek = await indexExists(db, 'idx_day_completions_enrollment_week');

  console.log('Tables:');
  console.log(`  programs                     : ${programsOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  program_weeks                : ${weeksOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  program_enrollments          : ${enrollmentsOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  program_day_completions      : ${completionsOk ? 'present ✓' : 'MISSING'}`);

  console.log('\nIndexes (must all be present):');
  for (const [n, ok] of Object.entries({
    idx_programs_creator_id: idxCreator,
    idx_programs_goal: idxGoal,
    idx_programs_public: idxPublic,
    idx_program_weeks_program_id: idxWeeksProgram,
    idx_program_weeks_order: idxWeeksOrder,
    idx_enrollments_user_id: idxEnrUser,
    idx_enrollments_program_id: idxEnrProgram,
    idx_enrollments_status: idxEnrStatus,
    idx_day_completions_enrollment_id: idxComplEnr,
    idx_day_completions_enrollment_week: idxComplWeek,
  })) {
    console.log(`  ${n.padEnd(38)} : ${ok ? 'present ✓' : 'MISSING'}`);
  }

  console.log('\nNew tables row count (must be 0):');
  for (const t of ['programs', 'program_weeks', 'program_enrollments', 'program_day_completions']) {
    const r: any = await db.execute(sql.raw(`SELECT COUNT(*)::text AS c FROM ${t}`));
    const c = r.rows?.[0]?.c ?? r[0]?.c ?? '?';
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }

  console.log('\nExisting-table row counts (compare to baseline — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
}

async function post011() {
  const db = await getDb();
  console.log('=== POST-011 ===\n');

  const bodyMetricsOk = await tableExists(db, 'body_metrics');
  const progressPhotosOk = await tableExists(db, 'progress_photos');

  const peUserIdOk = await columnExists(db, 'progress_entries', 'user_id');
  const peClientIdNullable = await columnIsNullable(db, 'progress_entries', 'client_id');
  const peCheckOk = await constraintExists(db, 'progress_entries_user_or_client_check');
  const peUserIdxOk = await indexExists(db, 'idx_progress_entries_user_id');

  const clientsShareColOk = await columnExists(db, 'clients', 'share_body_metrics_with_trainer');

  const bmIdx1 = await indexExists(db, 'idx_body_metrics_user_id');
  const bmIdx2 = await indexExists(db, 'idx_body_metrics_user_recorded_at');
  const ppIdx1 = await indexExists(db, 'idx_progress_photos_user_id');
  const ppIdx2 = await indexExists(db, 'idx_progress_photos_user_taken_at');
  const ppIdx3 = await indexExists(db, 'idx_progress_photos_user_pose_taken_at');

  console.log('New tables:');
  console.log(`  body_metrics                 : ${bodyMetricsOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  progress_photos              : ${progressPhotosOk ? 'present ✓' : 'MISSING'}`);

  console.log('\nNew tables row count (must be 0):');
  for (const t of ['body_metrics', 'progress_photos']) {
    const r: any = await db.execute(sql.raw(`SELECT COUNT(*)::text AS c FROM ${t}`));
    const c = r.rows?.[0]?.c ?? r[0]?.c ?? '?';
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }

  console.log('\nProgress entries polymorphic refactor:');
  console.log(`  user_id column exists        : ${peUserIdOk ? 'yes ✓' : 'NO'}`);
  console.log(
    `  client_id is nullable        : ${peClientIdNullable ? 'yes ✓' : 'NO (still NOT NULL)'}`
  );
  console.log(`  XOR CHECK constraint         : ${peCheckOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  partial idx on user_id       : ${peUserIdxOk ? 'present ✓' : 'MISSING'}`);

  console.log('\nClient consent flag:');
  console.log(
    `  share_body_metrics_with_trainer column on clients : ${clientsShareColOk ? 'present ✓' : 'MISSING'}`
  );

  console.log('\nNew indexes:');
  for (const [n, ok] of Object.entries({
    idx_body_metrics_user_id: bmIdx1,
    idx_body_metrics_user_recorded_at: bmIdx2,
    idx_progress_photos_user_id: ppIdx1,
    idx_progress_photos_user_taken_at: ppIdx2,
    idx_progress_photos_user_pose_taken_at: ppIdx3,
  })) {
    console.log(`  ${n.padEnd(40)} : ${ok ? 'present ✓' : 'MISSING'}`);
  }

  // CHECK constraint enforcement test: try inserting a row that violates the
  // XOR (both client_id and user_id NULL). Wrap in a transaction that we throw
  // out of, so it auto-rollbacks regardless of outcome — no test data leaks
  // into prod. We expect PostgreSQL to reject the insert with the named
  // CHECK constraint; if it accepts it, the constraint isn't being enforced.
  console.log('\nCHECK constraint enforcement test (transaction, auto-rollback):');
  let constraintTriggered = false;
  let constraintErrMsg = '';
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        INSERT INTO progress_entries (client_id, user_id, type, value, unit, recorded_at)
        VALUES (NULL, NULL, 'weight', 80.0, 'kg', NOW())
      `);
      // If the violating insert was accepted, that's the failure mode we're
      // testing for. Throw to force rollback AND signal the check failed.
      throw new Error('UNEXPECTED: violating insert was accepted by Postgres');
    });
  } catch (e: any) {
    constraintErrMsg = e.message ?? String(e);
    constraintTriggered =
      constraintErrMsg.includes('progress_entries_user_or_client_check') ||
      constraintErrMsg.toLowerCase().includes('check constraint');
  }
  console.log(
    `  Violating insert rejected     : ${constraintTriggered ? 'yes ✓ (constraint enforced)' : 'NO — CHECK NOT ENFORCED'}`
  );
  if (!constraintTriggered) {
    console.log(`  Postgres response             : ${constraintErrMsg.slice(0, 200)}`);
  } else {
    // Truncate the message — confirming we got the right named constraint
    // back is enough; no need to dump the full stack.
    const named = constraintErrMsg.match(/progress_entries_user_or_client_check/)
      ? 'named-constraint match'
      : 'generic CHECK violation';
    console.log(`  Constraint identifier         : ${named}`);
  }

  // CRITICAL CHECK: every pre-existing row MUST still have client_id populated.
  // Migration 011 made client_id nullable but never NULLs out existing rows.
  // Any row with client_id=NULL after the migration means data corruption.
  console.log('\n⚠️  CRITICAL: progress_entries data integrity check:');
  const orphans: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM progress_entries WHERE client_id IS NULL AND user_id IS NULL
  `);
  const orphanCount = parseInt(orphans.rows?.[0]?.c ?? orphans[0]?.c ?? '0', 10);
  console.log(
    `  Rows with both client_id AND user_id NULL : ${orphanCount} ${orphanCount === 0 ? '✓ (none — XOR invariant holds)' : '— CATASTROPHIC, INVESTIGATE'}`
  );

  const allClientCount: any = await db.execute(
    sql`SELECT COUNT(*)::text AS c FROM progress_entries`
  );
  const total = parseInt(allClientCount.rows?.[0]?.c ?? allClientCount[0]?.c ?? '0', 10);
  const nullClientId: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM progress_entries WHERE client_id IS NULL
  `);
  const nullClientCount = parseInt(nullClientId.rows?.[0]?.c ?? nullClientId[0]?.c ?? '0', 10);
  console.log(`  Total progress_entries rows               : ${total}`);
  console.log(
    `  Rows with client_id IS NULL               : ${nullClientCount} ${nullClientCount === 0 ? '✓ (every existing row kept its client_id)' : '— pre-existing rows must retain client_id; investigate'}`
  );

  console.log('\nExisting-table row counts (compare to baseline — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
}

async function columnDefault(
  db: Awaited<ReturnType<typeof getDb>>,
  table: string,
  column: string
): Promise<string | null> {
  const result: any = await db.execute(sql`
    SELECT column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `);
  const v = result.rows?.[0]?.column_default ?? result[0]?.column_default;
  return v ?? null;
}

async function indexDef(
  db: Awaited<ReturnType<typeof getDb>>,
  name: string
): Promise<string | null> {
  const result: any = await db.execute(sql`
    SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = ${name}
  `);
  const v = result.rows?.[0]?.indexdef ?? result[0]?.indexdef;
  return v ?? null;
}

async function jsonbCount(
  db: Awaited<ReturnType<typeof getDb>>,
  whereClause: string
): Promise<number> {
  const r: any = await db.execute(
    sql.raw(`SELECT COUNT(*)::text AS c FROM users WHERE ${whereClause}`)
  );
  return parseInt(r.rows?.[0]?.c ?? r[0]?.c ?? '0', 10);
}

async function baseline012() {
  const db = await getDb();
  console.log('=== BASELINE-012 (pre-012) ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db, version() AS v`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}`);
  console.log(`Version : ${(ident.rows?.[0]?.v ?? ident[0]?.v ?? '').slice(0, 80)}\n`);

  // 012 artefacts — must NOT exist
  const pushSubsExists = await tableExists(db, 'push_subscriptions');
  const preferredUnitsExists = await columnExists(db, 'users', 'preferred_units');
  const deliverAfterExists = await columnExists(db, 'notifications', 'deliver_after');
  const deliveredAtExists = await columnExists(db, 'notifications', 'delivered_at');
  const idxQueueExists = await indexExists(db, 'idx_notifications_delivery_queue');
  const idxPushUserActiveExists = await indexExists(db, 'idx_push_subs_user_active');
  const idxPushEndpointExists = await indexExists(db, 'idx_push_subs_endpoint');

  console.log('012 artefacts (must be absent before run):');
  console.log(
    `  push_subscriptions table              : ${pushSubsExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  users.preferred_units column          : ${preferredUnitsExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  notifications.deliver_after column    : ${deliverAfterExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  notifications.delivered_at column     : ${deliveredAtExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  idx_notifications_delivery_queue      : ${idxQueueExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  idx_push_subs_user_active             : ${idxPushUserActiveExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  idx_push_subs_endpoint                : ${idxPushEndpointExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // notification_preferences column must already exist (pre-Sprint-2 schema), but
  // ZERO rows should have the new-shape `categories` key — that key is added by
  // the migration's reshape UPDATE.
  const npColExists = await columnExists(db, 'users', 'notification_preferences');
  console.log('\nnotification_preferences shape (must be legacy or NULL pre-012):');
  console.log(
    `  column exists                         : ${npColExists ? 'yes ✓' : 'NO (UNEXPECTED — migration assumes column is pre-existing)'}`
  );
  if (npColExists) {
    const newShapeRows = await jsonbCount(db, `notification_preferences ? 'categories'`);
    const legacyShapeRows = await jsonbCount(
      db,
      `notification_preferences IS NOT NULL AND NOT (notification_preferences ? 'categories')`
    );
    const nullRows = await jsonbCount(db, `notification_preferences IS NULL`);
    console.log(
      `  rows with new-shape (categories key)  : ${newShapeRows} ${newShapeRows === 0 ? '✓' : '— UNEXPECTED, migration may already have run'}`
    );
    console.log(`  rows with legacy/other JSON shape     : ${legacyShapeRows}`);
    console.log(`  rows with NULL                        : ${nullRows}`);
  }

  console.log('\nExisting-table row counts (snapshot for drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }

  // Notifications-only count, since the migration backfills deliver_at on every
  // pre-existing notifications row — useful to compare post-run.
  const notifTotal: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM notifications`);
  const notifTotalCount = parseInt(notifTotal.rows?.[0]?.c ?? notifTotal[0]?.c ?? '0', 10);
  console.log(`  notifications (full count)   : ${notifTotalCount}`);

  console.log('\nSAVE THESE NUMBERS — used as the baseline for post-012 drift checks.');
}

async function post012() {
  const db = await getDb();
  console.log('=== POST-012 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // ─── (a) push_subscriptions table + 3 indexes ──────────────────────────
  const pushSubsOk = await tableExists(db, 'push_subscriptions');
  const idxPushUserActive = await indexExists(db, 'idx_push_subs_user_active');
  const idxPushEndpoint = await indexExists(db, 'idx_push_subs_endpoint');
  // pkey index on a table that uses `id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()`
  // gets the standard name push_subscriptions_pkey.
  const idxPushPkey = await indexExists(db, 'push_subscriptions_pkey');

  console.log('(a) push_subscriptions table + indexes:');
  console.log(`  table                                 : ${pushSubsOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  push_subscriptions_pkey               : ${idxPushPkey ? 'present ✓' : 'MISSING'}`);
  console.log(
    `  idx_push_subs_endpoint (UNIQUE)       : ${idxPushEndpoint ? 'present ✓' : 'MISSING'}`
  );
  console.log(
    `  idx_push_subs_user_active (PARTIAL)   : ${idxPushUserActive ? 'present ✓' : 'MISSING'}`
  );

  // Verify the partial index has the right WHERE clause
  if (idxPushUserActive) {
    const def = (await indexDef(db, 'idx_push_subs_user_active')) ?? '';
    const hasPartialClause = /WHERE\s+\(?active\s*=\s*true\)?/i.test(def);
    console.log(
      `  idx_push_subs_user_active WHERE check : ${hasPartialClause ? 'partial WHERE active=true ✓' : 'WRONG/MISSING (' + def + ')'}`
    );
  }

  // Verify the UNIQUE index is actually unique on endpoint
  if (idxPushEndpoint) {
    const def = (await indexDef(db, 'idx_push_subs_endpoint')) ?? '';
    const isUnique = /UNIQUE/i.test(def);
    console.log(
      `  idx_push_subs_endpoint UNIQUE check   : ${isUnique ? 'UNIQUE ✓' : 'NOT UNIQUE (' + def + ')'}`
    );
  }

  // ─── (b) push_subscriptions row count = 0 ──────────────────────────────
  const pushSubsCount: any = await db.execute(
    sql`SELECT COUNT(*)::text AS c FROM push_subscriptions`
  );
  const psc = parseInt(pushSubsCount.rows?.[0]?.c ?? pushSubsCount[0]?.c ?? '0', 10);
  console.log(
    `\n(b) push_subscriptions row count        : ${psc} ${psc === 0 ? '✓' : '— UNEXPECTED'}`
  );

  // ─── (c) users.preferred_units default 'metric' + every row = 'metric' ──
  const puColOk = await columnExists(db, 'users', 'preferred_units');
  const puDefault = await columnDefault(db, 'users', 'preferred_units');
  console.log('\n(c) users.preferred_units column:');
  console.log(`  column exists                         : ${puColOk ? 'yes ✓' : 'NO'}`);
  console.log(
    `  default value                         : ${puDefault} ${puDefault?.includes("'metric'") ? '✓' : '— UNEXPECTED'}`
  );
  if (puColOk) {
    const rowsByUnit: any = await db.execute(sql`
      SELECT preferred_units, COUNT(*)::text AS c FROM users GROUP BY preferred_units
    `);
    const groups = (rowsByUnit.rows ?? rowsByUnit) as Array<{ preferred_units: string; c: string }>;
    console.log(`  rows grouped by preferred_units value :`);
    for (const g of groups) {
      console.log(
        `    ${String(g.preferred_units).padEnd(15)} : ${g.c} ${g.preferred_units === 'metric' ? '✓' : '— UNEXPECTED, only metric was expected post-migration'}`
      );
    }
    const nullPu: any = await db.execute(
      sql`SELECT COUNT(*)::text AS c FROM users WHERE preferred_units IS NULL`
    );
    const nullPuCount = parseInt(nullPu.rows?.[0]?.c ?? nullPu[0]?.c ?? '0', 10);
    console.log(
      `  rows with preferred_units IS NULL     : ${nullPuCount} ${nullPuCount === 0 ? '✓ (column is NOT NULL)' : '— UNEXPECTED'}`
    );
  }

  // ─── (d), (e) users.notification_preferences reshape complete ──────────
  console.log('\n(d, e) users.notification_preferences reshape:');
  const totalUsers = await jsonbCount(db, 'TRUE');
  const newShapeRows = await jsonbCount(db, `notification_preferences ? 'categories'`);
  const hasQuietHours = await jsonbCount(db, `notification_preferences ? 'quietHours'`);
  const hasChannels = await jsonbCount(db, `notification_preferences ? 'channels'`);
  const stillLegacy = await jsonbCount(
    db,
    `notification_preferences IS NOT NULL AND NOT (notification_preferences ? 'categories')`
  );
  const stillNull = await jsonbCount(db, `notification_preferences IS NULL`);

  console.log(`  total users                           : ${totalUsers}`);
  console.log(
    `  rows with new-shape (categories key)  : ${newShapeRows} ${newShapeRows === totalUsers ? '✓ (every row migrated)' : '— UNEXPECTED'}`
  );
  console.log(
    `  rows with quietHours key              : ${hasQuietHours} ${hasQuietHours === totalUsers ? '✓' : '— UNEXPECTED'}`
  );
  console.log(
    `  rows with channels key                : ${hasChannels} ${hasChannels === totalUsers ? '✓' : '— UNEXPECTED'}`
  );
  console.log(
    `  rows still in legacy shape            : ${stillLegacy} ${stillLegacy === 0 ? '✓ (zero legacy remaining)' : '— UNEXPECTED, reshape did not cover all rows'}`
  );
  console.log(
    `  rows still NULL                       : ${stillNull} ${stillNull === 0 ? '✓ (every row populated)' : '— UNEXPECTED'}`
  );

  // Sample a row to show actual reshape values — proves the structural shape.
  const sample: any = await db.execute(sql`
    SELECT id, notification_preferences::text AS prefs FROM users LIMIT 1
  `);
  const sampleRow = (sample.rows ?? sample)[0];
  if (sampleRow) {
    const prefsStr = sampleRow.prefs ?? sampleRow.notification_preferences;
    console.log(
      `\n  sample user (${String(sampleRow.id).slice(0, 12)}…) notification_preferences:`
    );
    try {
      const prefs = JSON.parse(prefsStr);
      const cat = prefs.categories ?? {};
      const ch = prefs.channels ?? {};
      const qh = prefs.quietHours ?? {};
      const cats = ['workouts', 'recovery', 'achievements', 'social', 'billing'];
      const allCatsTrue = cats.every((k) => cat[k] === true);
      console.log(
        `    categories.{workouts,recovery,achievements,social,billing} all true : ${allCatsTrue ? '✓' : '— UNEXPECTED: ' + JSON.stringify(cat)}`
      );
      console.log(
        `    channels.push                                                       : ${ch.push} ${ch.push === true ? '✓' : '— UNEXPECTED'}`
      );
      console.log(
        `    channels.email                                                      : ${ch.email} (note: COALESCE preserved legacy true if user had email=true pre-migration)`
      );
      console.log(
        `    quietHours.enabled                                                  : ${qh.enabled} ${qh.enabled === false ? '✓' : '— UNEXPECTED'}`
      );
      console.log(
        `    quietHours.start                                                    : ${qh.start} ${qh.start === '22:00' ? '✓' : '— UNEXPECTED'}`
      );
      console.log(
        `    quietHours.end                                                      : ${qh.end} ${qh.end === '08:00' ? '✓' : '— UNEXPECTED'}`
      );
      console.log(
        `    quietHours.timezone                                                 : ${qh.timezone} ${qh.timezone === 'UTC' ? '✓' : '— UNEXPECTED'}`
      );
    } catch (e) {
      console.log(`    PARSE FAILED: ${(e as Error).message}; raw=${prefsStr}`);
    }
  }

  // ─── (f) notifications.deliver_after + delivered_at columns ────────────
  const daOk = await columnExists(db, 'notifications', 'deliver_after');
  const dvOk = await columnExists(db, 'notifications', 'delivered_at');
  console.log('\n(f) notifications new columns:');
  console.log(`  deliver_after column                  : ${daOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  delivered_at column                   : ${dvOk ? 'present ✓' : 'MISSING'}`);

  // ─── (g) idx_notifications_delivery_queue + WHERE clause ───────────────
  const idxQueueOk = await indexExists(db, 'idx_notifications_delivery_queue');
  console.log('\n(g) idx_notifications_delivery_queue:');
  console.log(`  index exists                          : ${idxQueueOk ? 'yes ✓' : 'NO'}`);
  if (idxQueueOk) {
    const def = (await indexDef(db, 'idx_notifications_delivery_queue')) ?? '';
    const hasDeliverAfter = /deliver_after\s+IS\s+NOT\s+NULL/i.test(def);
    const hasDeliveredAt = /delivered_at\s+IS\s+NULL/i.test(def);
    console.log(`  WHERE deliver_after IS NOT NULL       : ${hasDeliverAfter ? '✓' : '— MISSING'}`);
    console.log(`  WHERE delivered_at IS NULL            : ${hasDeliveredAt ? '✓' : '— MISSING'}`);
    console.log(`  full indexdef: ${def}`);
  }

  // ─── (h) CRITICAL: zero pre-existing notifications cron-claimable ──────
  // The migration sets delivered_at = created_at on every pre-existing row
  // (lines 92-97 of 012_notification_engine.ts), and deliver_after stays NULL.
  // The cron's claim query is `WHERE deliver_after <= NOW() AND delivered_at IS NULL`
  // — both gates closed for pre-existing rows.
  console.log('\n(h) ⚠️  CRITICAL: cron will not re-deliver historical notifications:');
  const claimable: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM notifications
    WHERE deliver_after IS NOT NULL AND delivered_at IS NULL
  `);
  const claimableCount = parseInt(claimable.rows?.[0]?.c ?? claimable[0]?.c ?? '0', 10);
  console.log(
    `  rows the cron would claim now         : ${claimableCount} ${claimableCount === 0 ? '✓ (cron has nothing to do — historical rows safely closed)' : '— CATASTROPHIC, cron would re-deliver these!'}`
  );

  const settled: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM notifications WHERE delivered_at IS NOT NULL
  `);
  const settledCount = parseInt(settled.rows?.[0]?.c ?? settled[0]?.c ?? '0', 10);
  const totalNotif: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM notifications`);
  const totalNotifCount = parseInt(totalNotif.rows?.[0]?.c ?? totalNotif[0]?.c ?? '0', 10);
  console.log(
    `  rows with delivered_at IS NOT NULL    : ${settledCount} of ${totalNotifCount} ${settledCount === totalNotifCount ? '✓ (every pre-existing row marked settled = created_at)' : '— UNEXPECTED, some pre-existing rows missed by backfill'}`
  );

  const hasDeliverAfter: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM notifications WHERE deliver_after IS NOT NULL
  `);
  const hasDeliverAfterCount = parseInt(
    hasDeliverAfter.rows?.[0]?.c ?? hasDeliverAfter[0]?.c ?? '0',
    10
  );
  console.log(
    `  rows with deliver_after IS NOT NULL   : ${hasDeliverAfterCount} ${hasDeliverAfterCount === 0 ? '✓ (no pre-existing row was queued for cron)' : '— Sprint 2 dispatch already enqueued live rows; expected in active prod'}`
  );

  // ─── (i) row counts unchanged from baseline ────────────────────────────
  console.log('\n(i) Existing-table row counts (compare to baseline-012 — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  console.log(`  notifications (full count)   : ${totalNotifCount}`);
}

// ===========================================================================
// Migration 013 — Daily Wellness Log (Sprint 3)
// ===========================================================================

async function baseline013() {
  const db = await getDb();
  console.log('=== BASELINE-013 (pre-013) ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db, version() AS v`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}`);
  console.log(`Version : ${(ident.rows?.[0]?.v ?? ident[0]?.v ?? '').slice(0, 80)}\n`);

  // 013 artefacts — must NOT exist pre-run
  const dwlExists = await tableExists(db, 'daily_wellness_log');
  const idxDateExists = await indexExists(db, 'idx_daily_wellness_user_date');
  const idxRecentExists = await indexExists(db, 'idx_daily_wellness_user_recent');
  const ugCurrentExists = await columnExists(
    db,
    'user_gamification',
    'current_wellness_streak_days'
  );
  const ugLongestExists = await columnExists(
    db,
    'user_gamification',
    'longest_wellness_streak_days'
  );
  const ugLastExists = await columnExists(db, 'user_gamification', 'last_wellness_check_in_date');

  console.log('013 artefacts (must be absent before run):');
  console.log(
    `  daily_wellness_log table              : ${dwlExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  idx_daily_wellness_user_date          : ${idxDateExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  idx_daily_wellness_user_recent        : ${idxRecentExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  user_gamification.current_wellness_streak_days : ${ugCurrentExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  user_gamification.longest_wellness_streak_days : ${ugLongestExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  user_gamification.last_wellness_check_in_date  : ${ugLastExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // user_gamification table itself MUST exist (pre-Sprint 3 schema)
  const ugTableExists = await tableExists(db, 'user_gamification');
  console.log(
    `\n  user_gamification table exists        : ${ugTableExists ? 'yes ✓' : 'NO (UNEXPECTED — migration assumes this table is pre-existing)'}`
  );

  console.log('\nExisting-table row counts (snapshot for post-013 drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  // Also capture user_gamification count — relevant since the migration adds
  // columns to it; row count must NOT change.
  if (ugTableExists) {
    const ugCount: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM user_gamification`);
    const ugc = parseInt(ugCount.rows?.[0]?.c ?? ugCount[0]?.c ?? '0', 10);
    console.log(`  user_gamification (full count): ${ugc}`);
  }

  console.log('\nSAVE THESE NUMBERS — used as the baseline for post-013 drift checks.');
}

async function post013() {
  const db = await getDb();
  console.log('=== POST-013 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // ─── (a) daily_wellness_log table + 7 named CHECK constraints ────────────
  const dwlOk = await tableExists(db, 'daily_wellness_log');
  console.log('(a) daily_wellness_log table:');
  console.log(`  table                                 : ${dwlOk ? 'present ✓' : 'MISSING'}`);

  const checkNames = [
    'daily_wellness_energy_range',
    'daily_wellness_mood_range',
    'daily_wellness_stress_range',
    'daily_wellness_sleep_range',
    'daily_wellness_motivation_range',
    'daily_wellness_soreness_range',
    'daily_wellness_score_range',
  ];
  console.log('\n  Named CHECK constraints (must all exist):');
  for (const n of checkNames) {
    const ok = await constraintExists(db, n);
    console.log(`    ${n.padEnd(40)} : ${ok ? 'present ✓' : 'MISSING'}`);
  }

  // ─── (b) Indexes ──────────────────────────────────────────────────────────
  const idxDateOk = await indexExists(db, 'idx_daily_wellness_user_date');
  const idxRecentOk = await indexExists(db, 'idx_daily_wellness_user_recent');
  console.log('\n(b) Indexes:');
  console.log(`  idx_daily_wellness_user_date (UNIQUE) : ${idxDateOk ? 'present ✓' : 'MISSING'}`);
  if (idxDateOk) {
    const def = (await indexDef(db, 'idx_daily_wellness_user_date')) ?? '';
    const isUnique = /UNIQUE/i.test(def);
    console.log(`  ↑ UNIQUE check                        : ${isUnique ? '✓' : 'NOT UNIQUE'}`);
  }
  console.log(`  idx_daily_wellness_user_recent (DESC) : ${idxRecentOk ? 'present ✓' : 'MISSING'}`);
  if (idxRecentOk) {
    const def = (await indexDef(db, 'idx_daily_wellness_user_recent')) ?? '';
    const hasDesc = /DESC/i.test(def);
    console.log(`  ↑ DESC ordering check                 : ${hasDesc ? '✓' : 'NO DESC'}`);
  }

  // ─── (c) ON DELETE CASCADE on user_id FK ─────────────────────────────────
  // Read pg_constraint for the foreign key on daily_wellness_log.user_id
  // and verify confdeltype = 'c' (cascade).
  console.log('\n(c) user_id FK ON DELETE CASCADE:');
  const fkRow: any = await db.execute(sql`
    SELECT confdeltype FROM pg_constraint
    WHERE conrelid = 'public.daily_wellness_log'::regclass AND contype = 'f'
  `);
  const fkRows = (fkRow.rows ?? fkRow) as Array<{ confdeltype: string }>;
  const cascadeFk = fkRows.find((r) => r.confdeltype === 'c');
  console.log(
    `  user_id FK confdeltype = 'c' (cascade) : ${cascadeFk ? '✓' : 'NOT CASCADE (' + JSON.stringify(fkRows) + ')'}`
  );

  // ─── (d) Probe insert + CHECK enforcement (transactional, rolled back) ───
  // Insert a probe row with energy_level=99 (out-of-range). Must throw the
  // daily_wellness_energy_range constraint. Then probe with score=200 — must
  // throw daily_wellness_score_range. Wrap in BEGIN/ROLLBACK so no rows persist.
  console.log('\n(d) Probe CHECK constraint enforcement (rolled back):');
  const userRow: any = await db.execute(sql`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
  const probeUserRows = (userRow.rows ?? userRow) as Array<{ id: string }>;
  if (probeUserRows.length === 0) {
    console.log('  ⚠ no user available to probe — skipping CHECK enforcement test');
  } else {
    const probeUserId = probeUserRows[0].id;
    let energyBlocked = false;
    let scoreBlocked = false;
    let energyName = '';
    let scoreName = '';
    try {
      await db.execute(sql`BEGIN`);
      try {
        await db.execute(sql`
          INSERT INTO daily_wellness_log (user_id, date, energy_level)
          VALUES (${probeUserId}, '1900-01-01', 99)
        `);
      } catch (e: any) {
        energyBlocked = true;
        energyName = e?.constraint ?? e?.message ?? '';
      }
      await db.execute(sql`ROLLBACK`);

      await db.execute(sql`BEGIN`);
      try {
        await db.execute(sql`
          INSERT INTO daily_wellness_log (user_id, date, readiness_score)
          VALUES (${probeUserId}, '1900-01-02', 200)
        `);
      } catch (e: any) {
        scoreBlocked = true;
        scoreName = e?.constraint ?? e?.message ?? '';
      }
      await db.execute(sql`ROLLBACK`);
    } catch (e) {
      try {
        await db.execute(sql`ROLLBACK`);
      } catch {
        // ignore
      }
      console.log(`  probe transaction wrapper error: ${(e as Error).message}`);
    }
    console.log(
      `  energy=99 → CHECK fired                : ${energyBlocked ? '✓ ' + (energyName.includes('energy_range') ? '(by daily_wellness_energy_range)' : '(constraint: ' + energyName.slice(0, 60) + ')') : 'NOT BLOCKED — CATASTROPHIC'}`
    );
    console.log(
      `  score=200 → CHECK fired                : ${scoreBlocked ? '✓ ' + (scoreName.includes('score_range') ? '(by daily_wellness_score_range)' : '(constraint: ' + scoreName.slice(0, 60) + ')') : 'NOT BLOCKED — CATASTROPHIC'}`
    );
  }

  // ─── (e) daily_wellness_log row count = 0 ─────────────────────────────────
  const dwlCount: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM daily_wellness_log`);
  const dwlc = parseInt(dwlCount.rows?.[0]?.c ?? dwlCount[0]?.c ?? '0', 10);
  console.log(
    `\n(e) daily_wellness_log row count        : ${dwlc} ${dwlc === 0 ? '✓' : '— UNEXPECTED'}`
  );

  // ─── (f), (g), (h) user_gamification wellness streak columns ─────────────
  const ugCurrentOk = await columnExists(db, 'user_gamification', 'current_wellness_streak_days');
  const ugLongestOk = await columnExists(db, 'user_gamification', 'longest_wellness_streak_days');
  const ugLastOk = await columnExists(db, 'user_gamification', 'last_wellness_check_in_date');
  console.log('\n(f, g, h) user_gamification wellness streak columns:');
  console.log(`  current_wellness_streak_days          : ${ugCurrentOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  longest_wellness_streak_days          : ${ugLongestOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  last_wellness_check_in_date           : ${ugLastOk ? 'present ✓' : 'MISSING'}`);

  if (ugCurrentOk) {
    const def = await columnDefault(db, 'user_gamification', 'current_wellness_streak_days');
    console.log(
      `  current default                       : ${def} ${def === '0' ? '✓' : '— UNEXPECTED'}`
    );
  }
  if (ugLongestOk) {
    const def = await columnDefault(db, 'user_gamification', 'longest_wellness_streak_days');
    console.log(
      `  longest default                       : ${def} ${def === '0' ? '✓' : '— UNEXPECTED'}`
    );
  }
  if (ugLastOk) {
    const def = await columnDefault(db, 'user_gamification', 'last_wellness_check_in_date');
    console.log(
      `  last default                          : ${def === null ? 'NULL ✓' : def + ' — UNEXPECTED'}`
    );
  }

  // Confirm every existing user_gamification row has the defaults applied.
  if (ugCurrentOk && ugLongestOk && ugLastOk) {
    // NOTE: Postgres lowercases unquoted column aliases (`AS lastN` becomes
    // `lastn` in the result row). Keep SQL aliases lowercase by convention
    // so JS property access matches what Postgres actually returns. Caught
    // 2026-05-06 in post-013 where `r.lastN` returned undefined → NaN.
    const ugRows: any = await db.execute(sql`
      SELECT
        COUNT(*)::text AS total,
        SUM(CASE WHEN current_wellness_streak_days = 0 THEN 1 ELSE 0 END)::text AS curr0,
        SUM(CASE WHEN longest_wellness_streak_days = 0 THEN 1 ELSE 0 END)::text AS long0,
        SUM(CASE WHEN last_wellness_check_in_date IS NULL THEN 1 ELSE 0 END)::text AS last_null
      FROM user_gamification
    `);
    const r = (ugRows.rows ?? ugRows)[0] as {
      total: string;
      curr0: string;
      long0: string;
      last_null: string;
    };
    const total = parseInt(r.total, 10);
    const curr0 = parseInt(r.curr0, 10);
    const long0 = parseInt(r.long0, 10);
    const lastN = parseInt(r.last_null, 10);
    console.log('\n  Defaults applied to every existing row:');
    console.log(
      `  current_wellness_streak_days = 0      : ${curr0} of ${total} ${curr0 === total ? '✓' : '— UNEXPECTED'}`
    );
    console.log(
      `  longest_wellness_streak_days = 0      : ${long0} of ${total} ${long0 === total ? '✓' : '— UNEXPECTED'}`
    );
    console.log(
      `  last_wellness_check_in_date = NULL    : ${lastN} of ${total} ${lastN === total ? '✓' : '— UNEXPECTED'}`
    );
  }

  // ─── (i) Existing-table row counts unchanged from baseline ───────────────
  console.log('\n(i) Existing-table row counts (compare to baseline-013 — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  const ugCount: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM user_gamification`);
  const ugc = parseInt(ugCount.rows?.[0]?.c ?? ugCount[0]?.c ?? '0', 10);
  console.log(`  user_gamification (full count): ${ugc}`);
}

const phase = (process.argv[2] ?? '') as Phase;
const phases: Record<Phase, () => Promise<void>> = {
  baseline,
  'post-010': post010,
  'post-011': post011,
  'baseline-012': baseline012,
  'post-012': post012,
  'baseline-013': baseline013,
  'post-013': post013,
};

const fn = phases[phase];
if (!fn) {
  console.error(
    `Usage: npx tsx scripts/verify-prod-migrations.ts <baseline|post-010|post-011|baseline-012|post-012|baseline-013|post-013>`
  );
  process.exit(2);
}

fn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
