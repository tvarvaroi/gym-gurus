// One-shot verification script for migrations 010 + 011 + 012 + 013 + 014 against Railway prod.
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
//   baseline-014  — pre-014 snapshot: confirm 014 artefacts ABSENT (4 wearable tables,
//                   5 client cols, users.preferred_wearable_id), capture row counts
//                   for drift detection
//   post-014      — confirm 4 wearable tables + indexes (UNIQUE flags verified via
//                   indexdef), CHECK constraints on provider/status fire on probe
//                   inserts, clients.user_id + idx + FK to users, 4 consent cols
//                   with verified defaults (true/true/true/false), backfill role
//                   correctness check (every backfilled client links to users.role
//                   = 'client', NOT trainer/solo — privacy violation prevention),
//                   spot-check 5 random backfilled email pairs, drift on existing
//                   tables matches baseline-014 exactly
//   baseline-015  — pre-015 snapshot: confirm 015 artefacts ABSENT (the
//                   wearable_connections.open_wearables_user_id column +
//                   idx_wearable_connections_ow_user_id partial index)
//   post-015      — confirm column exists with type varchar(36), partial
//                   index exists + IS partial (WHERE clause present), bridge
//                   round-trip probe (INSERT row with non-NULL ow_user_id,
//                   SELECT by ow_user_id finds the probe row, DELETE probe)
//                   — all in one wearable_connections row scoped to a probe
//                   provider so cleanup is bounded; existing-table row
//                   counts unchanged from baseline-015.
//
// Designed to be safe to re-run. All queries are SELECT-only except the
// transaction-wrapped CHECK constraint enforcement tests in post-011 and post-014.
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';

type Phase =
  | 'baseline'
  | 'post-010'
  | 'post-011'
  | 'baseline-012'
  | 'post-012'
  | 'baseline-013'
  | 'post-013'
  | 'baseline-014'
  | 'post-014'
  | 'baseline-014.5'
  | 'post-014.5'
  | 'baseline-014.6'
  | 'post-014.6'
  | 'baseline-015'
  | 'post-015';

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

// ===========================================================================
// Migration 014 — Wearable Integration (Sprint 4)
// ===========================================================================

// Helper: look up FK target table for a given (table, column).
async function fkTargetTable(
  db: Awaited<ReturnType<typeof getDb>>,
  table: string,
  column: string
): Promise<string | null> {
  const r: any = await db.execute(sql`
    SELECT ccu.table_name AS target
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${table}
      AND kcu.column_name = ${column}
    LIMIT 1
  `);
  const v = r.rows?.[0]?.target ?? r[0]?.target;
  return v ?? null;
}

async function baseline014() {
  const db = await getDb();
  console.log('=== BASELINE-014 (pre-014) ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db, version() AS v`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}`);
  console.log(`Version : ${(ident.rows?.[0]?.v ?? ident[0]?.v ?? '').slice(0, 80)}\n`);

  // 014 artefacts — 4 tables must NOT exist pre-run
  const wcExists = await tableExists(db, 'wearable_connections');
  const ssExists = await tableExists(db, 'sleep_sessions');
  const dvExists = await tableExists(db, 'daily_vitals');
  const asExists = await tableExists(db, 'activity_sessions');

  console.log('014 tables (must be absent before run):');
  console.log(
    `  wearable_connections                : ${wcExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  sleep_sessions                      : ${ssExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  daily_vitals                        : ${dvExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  activity_sessions                   : ${asExists ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // 5 client cols must NOT exist
  const cUserId = await columnExists(db, 'clients', 'user_id');
  const cSleep = await columnExists(db, 'clients', 'share_sleep_with_trainer');
  const cHrv = await columnExists(db, 'clients', 'share_hrv_with_trainer');
  const cActivity = await columnExists(db, 'clients', 'share_activity_with_trainer');
  const cPhotos = await columnExists(db, 'clients', 'share_progress_photos_with_trainer');

  console.log('\n014 clients columns (must be absent before run):');
  console.log(
    `  clients.user_id                     : ${cUserId ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  clients.share_sleep_with_trainer    : ${cSleep ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  clients.share_hrv_with_trainer      : ${cHrv ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  clients.share_activity_with_trainer : ${cActivity ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );
  console.log(
    `  clients.share_progress_photos_with… : ${cPhotos ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // users.preferred_wearable_id must NOT exist
  const uPwId = await columnExists(db, 'users', 'preferred_wearable_id');
  console.log('\n014 users column (must be absent before run):');
  console.log(
    `  users.preferred_wearable_id         : ${uPwId ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // idx_clients_user_id must NOT exist
  const idxUid = await indexExists(db, 'idx_clients_user_id');
  console.log('\n014 indexes (must be absent before run):');
  console.log(
    `  idx_clients_user_id                 : ${idxUid ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  console.log('\nExisting-table row counts (snapshot for post-014 drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }

  // Capture clients full count + clients-with-deleted_at-null count — used for
  // backfill correctness assertions in post-014.
  const clientsTotal: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM clients`);
  const clientsTotalCount = parseInt(clientsTotal.rows?.[0]?.c ?? clientsTotal[0]?.c ?? '0', 10);
  const clientsLive: any = await db.execute(
    sql`SELECT COUNT(*)::text AS c FROM clients WHERE deleted_at IS NULL`
  );
  const clientsLiveCount = parseInt(clientsLive.rows?.[0]?.c ?? clientsLive[0]?.c ?? '0', 10);
  console.log(`  clients (full count)         : ${clientsTotalCount}`);
  console.log(`  clients (deleted_at IS NULL) : ${clientsLiveCount}`);

  console.log('\nSAVE THESE NUMBERS — used as the baseline for post-014 drift checks.');
}

async function post014() {
  const db = await getDb();
  console.log('=== POST-014 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // ─── (a) 4 wearable tables + indexes ─────────────────────────────────────
  const wcOk = await tableExists(db, 'wearable_connections');
  const ssOk = await tableExists(db, 'sleep_sessions');
  const dvOk = await tableExists(db, 'daily_vitals');
  const asOk = await tableExists(db, 'activity_sessions');

  console.log('(a) Wearable tables:');
  console.log(`  wearable_connections                : ${wcOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  sleep_sessions                      : ${ssOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  daily_vitals                        : ${dvOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  activity_sessions                   : ${asOk ? 'present ✓' : 'MISSING'}`);

  // Indexes: UNIQUE on connections (user_id, provider), sleep+activity
  // (user_id, source, source_record_id), vitals (user_id, date, source).
  // Plain idx on connections (status, last_sync_at), sleep (user_id, date),
  // activity (user_id, started_at).
  console.log('\n  Indexes (UNIQUE flag verified via indexdef):');
  const indexChecks = [
    {
      name: 'idx_wearable_connections_user_provider',
      mustBeUnique: true,
    },
    {
      name: 'idx_wearable_connections_status_sync',
      mustBeUnique: false,
    },
    {
      name: 'idx_sleep_sessions_user_date',
      mustBeUnique: false,
    },
    {
      name: 'idx_sleep_sessions_user_source_record',
      mustBeUnique: true,
    },
    {
      name: 'idx_daily_vitals_user_date_source',
      mustBeUnique: true,
    },
    {
      name: 'idx_activity_sessions_user_started',
      mustBeUnique: false,
    },
    {
      name: 'idx_activity_sessions_user_source_record',
      mustBeUnique: true,
    },
  ];
  for (const { name, mustBeUnique } of indexChecks) {
    const present = await indexExists(db, name);
    if (!present) {
      console.log(`    ${name.padEnd(44)} : MISSING`);
      continue;
    }
    const def = (await indexDef(db, name)) ?? '';
    const isUnique = /CREATE UNIQUE INDEX/i.test(def);
    if (mustBeUnique) {
      console.log(
        `    ${name.padEnd(44)} : present ${isUnique ? '✓ (UNIQUE)' : '— NOT UNIQUE (' + def.slice(0, 80) + ')'}`
      );
    } else {
      console.log(`    ${name.padEnd(44)} : present ✓ (non-unique as expected)`);
    }
  }

  // ─── (b) CHECK constraints on wearable_connections ───────────────────────
  // Probe insert with provider='unknown' — must throw with provider_check name.
  // Probe with status='lol' — must throw with status_check name.
  // BEGIN / ROLLBACK transactions per probe so nothing persists.
  console.log('\n(b) CHECK constraint enforcement (rolled back, no data persisted):');
  const userRow: any = await db.execute(sql`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
  const probeUserRows = (userRow.rows ?? userRow) as Array<{ id: string }>;
  if (probeUserRows.length === 0) {
    console.log('  ⚠ no user available to probe — skipping CHECK enforcement test');
  } else {
    const probeUserId = probeUserRows[0].id;
    let providerBlocked = false;
    let statusBlocked = false;
    let providerName = '';
    let statusName = '';
    try {
      await db.execute(sql`BEGIN`);
      try {
        await db.execute(sql`
          INSERT INTO wearable_connections (user_id, provider)
          VALUES (${probeUserId}, 'unknown')
        `);
      } catch (e: any) {
        providerBlocked = true;
        providerName = e?.constraint ?? e?.message ?? '';
      }
      await db.execute(sql`ROLLBACK`);

      await db.execute(sql`BEGIN`);
      try {
        await db.execute(sql`
          INSERT INTO wearable_connections (user_id, provider, status)
          VALUES (${probeUserId}, 'whoop', 'lol')
        `);
      } catch (e: any) {
        statusBlocked = true;
        statusName = e?.constraint ?? e?.message ?? '';
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
      `  provider='unknown' → CHECK fired      : ${providerBlocked ? '✓ ' + (providerName.includes('provider_check') ? '(by wearable_connections_provider_check)' : '(constraint: ' + providerName.slice(0, 60) + ')') : 'NOT BLOCKED — CATASTROPHIC'}`
    );
    console.log(
      `  status='lol' → CHECK fired            : ${statusBlocked ? '✓ ' + (statusName.includes('status_check') ? '(by wearable_connections_status_check)' : '(constraint: ' + statusName.slice(0, 60) + ')') : 'NOT BLOCKED — CATASTROPHIC'}`
    );
  }

  // ─── (c) clients.user_id column + idx + FK ───────────────────────────────
  const cUserIdOk = await columnExists(db, 'clients', 'user_id');
  const idxCUid = await indexExists(db, 'idx_clients_user_id');
  const fkTarget = await fkTargetTable(db, 'clients', 'user_id');
  console.log('\n(c) clients.user_id column + index + FK:');
  console.log(`  clients.user_id column              : ${cUserIdOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  idx_clients_user_id index           : ${idxCUid ? 'present ✓' : 'MISSING'}`);
  console.log(
    `  FK target                           : ${fkTarget ?? '(none)'} ${fkTarget === 'users' ? '✓' : '— UNEXPECTED, expected users'}`
  );

  // ─── (d) 4 client consent columns + verified defaults ────────────────────
  const cSleepOk = await columnExists(db, 'clients', 'share_sleep_with_trainer');
  const cHrvOk = await columnExists(db, 'clients', 'share_hrv_with_trainer');
  const cActivityOk = await columnExists(db, 'clients', 'share_activity_with_trainer');
  const cPhotosOk = await columnExists(db, 'clients', 'share_progress_photos_with_trainer');

  console.log('\n(d) clients consent columns + defaults:');
  console.log(`  share_sleep_with_trainer            : ${cSleepOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  share_hrv_with_trainer              : ${cHrvOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  share_activity_with_trainer         : ${cActivityOk ? 'present ✓' : 'MISSING'}`);
  console.log(`  share_progress_photos_with_trainer  : ${cPhotosOk ? 'present ✓' : 'MISSING'}`);

  if (cSleepOk) {
    const def = await columnDefault(db, 'clients', 'share_sleep_with_trainer');
    console.log(
      `  share_sleep default                 : ${def} ${def === 'true' ? '✓' : '— UNEXPECTED, expected true'}`
    );
  }
  if (cHrvOk) {
    const def = await columnDefault(db, 'clients', 'share_hrv_with_trainer');
    console.log(
      `  share_hrv default                   : ${def} ${def === 'true' ? '✓' : '— UNEXPECTED, expected true'}`
    );
  }
  if (cActivityOk) {
    const def = await columnDefault(db, 'clients', 'share_activity_with_trainer');
    console.log(
      `  share_activity default              : ${def} ${def === 'true' ? '✓' : '— UNEXPECTED, expected true'}`
    );
  }
  if (cPhotosOk) {
    const def = await columnDefault(db, 'clients', 'share_progress_photos_with_trainer');
    console.log(
      `  share_progress_photos default       : ${def} ${def === 'false' ? '✓' : '— UNEXPECTED, expected false (opt-IN)'}`
    );
  }

  // ─── (e) users.preferred_wearable_id column + FK ─────────────────────────
  const uPwIdOk = await columnExists(db, 'users', 'preferred_wearable_id');
  const uFkTarget = await fkTargetTable(db, 'users', 'preferred_wearable_id');
  console.log('\n(e) users.preferred_wearable_id column + FK:');
  console.log(`  users.preferred_wearable_id column  : ${uPwIdOk ? 'present ✓' : 'MISSING'}`);
  console.log(
    `  FK target                           : ${uFkTarget ?? '(none)'} ${uFkTarget === 'wearable_connections' ? '✓' : '— UNEXPECTED, expected wearable_connections'}`
  );

  // ─── (f) Backfill correctness — role check (privacy violation prevention) ─
  // CRITICAL: every backfilled client (user_id IS NOT NULL) must link to a
  // users row with role='client'. If any backfilled client links to a trainer
  // or solo, the backfill matched the wrong user and we have a privacy
  // violation (trainer's clients table now silently links a different person).
  //
  // NOTE on aliases: Postgres lowercases unquoted column aliases (`AS lastN`
  // becomes `lastn`). Keeping all aliases lowercase by convention so JS access
  // matches what comes back. Caught 2026-05-06 in post-013, in gotchas.md.
  console.log(
    '\n(f) ⚠️  CRITICAL: backfill correctness — role check (privacy violation prevention):'
  );
  const backfillStats: any = await db.execute(sql`
    SELECT
      COUNT(*)::text AS backfilled_total,
      SUM(CASE WHEN u.role = 'client' THEN 1 ELSE 0 END)::text AS role_client,
      SUM(CASE WHEN u.role = 'trainer' THEN 1 ELSE 0 END)::text AS role_trainer,
      SUM(CASE WHEN u.role = 'solo' THEN 1 ELSE 0 END)::text AS role_solo
    FROM clients c
    JOIN users u ON u.id = c.user_id
    WHERE c.user_id IS NOT NULL
      AND c.deleted_at IS NULL
  `);
  const bfRow = (backfillStats.rows ?? backfillStats)[0] as {
    backfilled_total: string;
    role_client: string;
    role_trainer: string;
    role_solo: string;
  };
  const bfTotal = parseInt(bfRow?.backfilled_total ?? '0', 10);
  const bfClient = parseInt(bfRow?.role_client ?? '0', 10);
  const bfTrainer = parseInt(bfRow?.role_trainer ?? '0', 10);
  const bfSolo = parseInt(bfRow?.role_solo ?? '0', 10);

  const orphanCount: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM clients
     WHERE user_id IS NULL AND deleted_at IS NULL
  `);
  const orphan = parseInt(orphanCount.rows?.[0]?.c ?? orphanCount[0]?.c ?? '0', 10);

  console.log(`  total backfilled (user_id NOT NULL) : ${bfTotal}`);
  console.log(
    `  of which role = 'client'            : ${bfClient} ${bfClient === bfTotal ? '✓ (every backfilled row links to a Disciple)' : '— CATASTROPHIC: privacy violation, ' + (bfTotal - bfClient) + ' rows link to non-Disciple users'}`
  );
  console.log(
    `  of which role = 'trainer'           : ${bfTrainer} ${bfTrainer === 0 ? '✓ (zero — no false positives)' : '— CATASTROPHIC: trainer-shaped rows in backfill'}`
  );
  console.log(
    `  of which role = 'solo'              : ${bfSolo} ${bfSolo === 0 ? '✓ (zero — no false positives)' : '— CATASTROPHIC: solo-shaped rows in backfill'}`
  );
  console.log(
    `  unmatched (user_id IS NULL)         : ${orphan} (prospects who haven't registered as Disciples — expected, NOT a failure)`
  );

  // ─── (g) Spot-check 5 random backfilled email pairs ──────────────────────
  // Join clients → users by the FK and verify LOWER(c.email) = LOWER(u.email).
  // Output ✓/✗ per row with truncated email pairs for log readability.
  console.log('\n(g) Spot-check email match (5 random backfilled rows):');
  const spotCheck: any = await db.execute(sql`
    SELECT
      c.email AS client_email,
      u.email AS user_email,
      LOWER(c.email) = LOWER(u.email) AS matches
    FROM clients c
    JOIN users u ON u.id = c.user_id
    WHERE c.user_id IS NOT NULL
      AND c.deleted_at IS NULL
    ORDER BY RANDOM()
    LIMIT 5
  `);
  const spotRows = (spotCheck.rows ?? spotCheck) as Array<{
    client_email: string;
    user_email: string;
    matches: boolean;
  }>;
  if (spotRows.length === 0) {
    console.log('  (no backfilled rows to spot-check)');
  } else {
    for (let i = 0; i < spotRows.length; i++) {
      const r = spotRows[i];
      const trunc = (e: string) =>
        e.length > 32 ? e.slice(0, 14) + '…' + e.slice(-14) : e.padEnd(32);
      console.log(
        `    [${i + 1}] ${trunc(r.client_email)} ↔ ${trunc(r.user_email)} : ${r.matches ? '✓' : '✗ — UNEXPECTED, FK row is for a different email'}`
      );
    }
  }

  // ─── (h) Wearable tables row count = 0 ───────────────────────────────────
  console.log('\n(h) Wearable tables row count (must be 0):');
  for (const t of ['wearable_connections', 'sleep_sessions', 'daily_vitals', 'activity_sessions']) {
    const r: any = await db.execute(sql.raw(`SELECT COUNT(*)::text AS c FROM ${t}`));
    const c = r.rows?.[0]?.c ?? r[0]?.c ?? '?';
    console.log(`  ${t.padEnd(28)} : ${c} ${c === '0' ? '✓' : '— UNEXPECTED'}`);
  }

  // ─── (i) Existing-table row counts unchanged from baseline ───────────────
  console.log('\n(i) Existing-table row counts (compare to baseline-014 — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  const clientsTotal: any = await db.execute(sql`SELECT COUNT(*)::text AS c FROM clients`);
  const clientsTotalCount = parseInt(clientsTotal.rows?.[0]?.c ?? clientsTotal[0]?.c ?? '0', 10);
  const clientsLive: any = await db.execute(
    sql`SELECT COUNT(*)::text AS c FROM clients WHERE deleted_at IS NULL`
  );
  const clientsLiveCount = parseInt(clientsLive.rows?.[0]?.c ?? clientsLive[0]?.c ?? '0', 10);
  console.log(`  clients (full count)         : ${clientsTotalCount}`);
  console.log(`  clients (deleted_at IS NULL) : ${clientsLiveCount}`);
}

// ─── Migration 014.5 verifier phases (Sprint 4 BATCH 5a) ────────────────────
// 014.5 adds a partial UNIQUE index on body_metrics for wearable dedup.
// Index def example: CREATE UNIQUE INDEX idx_body_metrics_wearable_dedup
//   ON public.body_metrics USING btree (user_id, source_provider, ((recorded_at)::date))
//   WHERE ((source)::text = ANY ((ARRAY['wearable'::character varying,
//   'smart_scale'::character varying])::text[]));

async function baseline0145() {
  const db = await getDb();
  console.log('=== BASELINE-014.5 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // Index must NOT exist yet
  const idxOk = await indexExists(db, 'idx_body_metrics_wearable_dedup');
  console.log('014.5 index (must be absent before run):');
  console.log(
    `  idx_body_metrics_wearable_dedup     : ${idxOk ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // Snapshot wearable-sourced row count (must match exactly post-run since up()
  // is index-only — no row writes).
  const r: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM body_metrics
    WHERE source IN ('wearable', 'smart_scale')
  `);
  const wearableCount = parseInt(r.rows?.[0]?.c ?? r[0]?.c ?? '0', 10);
  console.log(
    `\nbody_metrics wearable-sourced rows (snapshot for post-014.5 drift check): ${wearableCount}`
  );

  console.log('\nExisting-table row counts (snapshot for post-014.5 drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  console.log('\nSAVE THESE NUMBERS — used as the baseline for post-014.5 drift checks.');
}

async function post0145() {
  const db = await getDb();
  console.log('=== POST-014.5 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // ─── (a) Index exists + UNIQUE + partial WHERE clause ───────────────────
  const idxOk = await indexExists(db, 'idx_body_metrics_wearable_dedup');
  console.log('(a) Partial UNIQUE index on body_metrics:');
  console.log(
    `  idx_body_metrics_wearable_dedup     : ${idxOk ? 'present ✓' : 'MISSING — CATASTROPHIC'}`
  );

  if (idxOk) {
    const def = (await indexDef(db, 'idx_body_metrics_wearable_dedup')) ?? '';
    const isUnique = /CREATE UNIQUE INDEX/i.test(def);
    const hasPartialWhere = /WHERE\s*\(\s*\(?source\)?/i.test(def);
    const hasDateExpression = /\(\s*recorded_at\s*\)\s*::\s*date/i.test(def);
    console.log(
      `  is UNIQUE?                          : ${isUnique ? '✓' : 'NO — index is NOT unique'}`
    );
    console.log(
      `  has partial WHERE clause?           : ${hasPartialWhere ? '✓' : 'NO — index is full-table (BREAKS manual-entry semantics)'}`
    );
    console.log(
      `  uses (recorded_at::date) expression : ${hasDateExpression ? '✓' : 'NO — index does NOT collapse intra-day'}`
    );
    console.log(`  raw indexdef                        : ${def.slice(0, 200)}`);
  }

  // ─── (b) UPSERT round-trip probe ─────────────────────────────────────────
  // Insert a wearable-sourced probe row twice with same (user, provider, day).
  // Second insert MUST UPSERT not duplicate. Cleanup at end. All in a single
  // transaction (BEGIN/ROLLBACK) so nothing persists. We can't ROLLBACK and
  // also assert the count stayed at 1 because the rollback erases evidence —
  // instead use a dedicated probe source_provider + DELETE cleanup.
  console.log('\n(b) UPSERT round-trip probe (wearable dedup behavior):');

  const userRow: any = await db.execute(sql`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
  const probeUserRows = (userRow.rows ?? userRow) as Array<{ id: string }>;
  if (probeUserRows.length === 0) {
    console.log('  ⚠ no user available to probe — skipping UPSERT round-trip test');
  } else {
    const probeUserId = probeUserRows[0].id;
    const PROBE_PROVIDER = 'verifier_probe_5a';

    try {
      // Cleanup any leftover probe rows from a previous abandoned run
      await db.execute(sql`
        DELETE FROM body_metrics WHERE source_provider = ${PROBE_PROVIDER}
      `);

      const beforeR: any = await db.execute(sql`
        SELECT COUNT(*)::text AS c FROM body_metrics WHERE source_provider = ${PROBE_PROVIDER}
      `);
      const before = parseInt(beforeR.rows?.[0]?.c ?? beforeR[0]?.c ?? '0', 10);

      // INSERT 1
      await db.execute(sql`
        INSERT INTO body_metrics (user_id, recorded_at, weight_kg, source, source_provider)
        VALUES (${probeUserId}, NOW(), 75.0, 'wearable', ${PROBE_PROVIDER})
        ON CONFLICT (user_id, source_provider, (recorded_at::date))
          WHERE source IN ('wearable', 'smart_scale')
        DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = NOW();
      `);
      // INSERT 2 — same day, should UPSERT not insert
      await db.execute(sql`
        INSERT INTO body_metrics (user_id, recorded_at, weight_kg, source, source_provider)
        VALUES (${probeUserId}, NOW(), 76.0, 'wearable', ${PROBE_PROVIDER})
        ON CONFLICT (user_id, source_provider, (recorded_at::date))
          WHERE source IN ('wearable', 'smart_scale')
        DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = NOW();
      `);

      const afterR: any = await db.execute(sql`
        SELECT COUNT(*)::text AS c FROM body_metrics WHERE source_provider = ${PROBE_PROVIDER}
      `);
      const after = parseInt(afterR.rows?.[0]?.c ?? afterR[0]?.c ?? '0', 10);

      // Verify the value was updated (76.0, not 75.0)
      const valueR: any = await db.execute(sql`
        SELECT weight_kg::text AS w FROM body_metrics WHERE source_provider = ${PROBE_PROVIDER}
      `);
      const finalWeight = valueR.rows?.[0]?.w ?? valueR[0]?.w ?? '?';

      console.log(`  before INSERTs                      : ${before} rows (probe namespace)`);
      console.log(
        `  after 2 INSERTs (same day)          : ${after} rows ${after === before + 1 ? '✓ (UPSERTed correctly)' : '— UNEXPECTED, dedup BROKEN'}`
      );
      console.log(
        `  final weight_kg value               : ${finalWeight} ${finalWeight === '76.00' || finalWeight === '76' ? '✓ (UPDATE took)' : `— UNEXPECTED, expected 76.00 got ${finalWeight}`}`
      );

      // Cleanup
      await db.execute(sql`
        DELETE FROM body_metrics WHERE source_provider = ${PROBE_PROVIDER}
      `);
      console.log(`  cleanup                             : probe row deleted ✓`);
    } catch (e: any) {
      // Always attempt cleanup even on failure
      try {
        await db.execute(sql`
          DELETE FROM body_metrics WHERE source_provider = 'verifier_probe_5a'
        `);
      } catch {
        // ignore
      }
      console.log(`  ⚠ UPSERT probe error: ${e?.message ?? e}`);
    }
  }

  // ─── (c) Existing-table row counts unchanged from baseline ───────────────
  console.log('\n(c) Existing-table row counts (compare to baseline-014.5 — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  // Wearable-sourced body_metrics count (must match baseline-014.5 exactly —
  // up() is index-only)
  const r: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM body_metrics
    WHERE source IN ('wearable', 'smart_scale')
  `);
  const wearableCount = parseInt(r.rows?.[0]?.c ?? r[0]?.c ?? '0', 10);
  console.log(`  body_metrics (wearable-sourced) : ${wearableCount}`);
}

// ─── Migration 014.6 verifier phases (Sprint 5 BATCH 1, Path C) ─────────────
// 014.6 replaces 014.5's day-bucketed partial UNIQUE with a per-record partial
// UNIQUE keyed on source_record_id. Up() does THREE things:
//   (1) ALTER TABLE ADD COLUMN source_record_id varchar(255)  -- nullable
//   (2) CREATE UNIQUE INDEX idx_body_metrics_per_record_dedup
//         ON body_metrics (user_id, source, source_record_id)
//         WHERE source != 'manual'
//   (3) DROP INDEX idx_body_metrics_wearable_dedup  (subsumed by new index)
//
// Post-014.6 verifier asserts ALL three transitions occurred AND adds a
// fresh probe-INSERT-twice round-trip exercising the new partial UNIQUE
// (different conflict columns vs 014.5 — now (user_id, source, source_record_id)
// instead of (user_id, source_provider, recorded_at::date)).

async function baseline0146() {
  const db = await getDb();
  console.log('=== BASELINE-014.6 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // Old 014.5 index MUST be present pre-014.6 (will be dropped by 014.6 up)
  const oldIdxOk = await indexExists(db, 'idx_body_metrics_wearable_dedup');
  console.log('014.5 index (must be PRESENT before 014.6 run, will be dropped by it):');
  console.log(
    `  idx_body_metrics_wearable_dedup     : ${oldIdxOk ? 'present ✓' : 'ABSENT (UNEXPECTED — 014.5 must apply before 014.6)'}`
  );

  // source_record_id column must NOT exist yet
  const colOk = await columnExists(db, 'body_metrics', 'source_record_id');
  console.log('\n014.6 column (must be absent before run):');
  console.log(
    `  body_metrics.source_record_id       : ${colOk ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // New 014.6 index must NOT exist yet
  const newIdxOk = await indexExists(db, 'idx_body_metrics_per_record_dedup');
  console.log('\n014.6 index (must be absent before run):');
  console.log(
    `  idx_body_metrics_per_record_dedup   : ${newIdxOk ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // Snapshot non-manual row count (must match exactly post-014.6 since up()
  // is column+index only — no row writes/deletes).
  const r: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM body_metrics
    WHERE source != 'manual'
  `);
  const nonManualCount = parseInt(r.rows?.[0]?.c ?? r[0]?.c ?? '0', 10);
  console.log(
    `\nbody_metrics non-manual rows (snapshot for post-014.6 drift check): ${nonManualCount}`
  );

  console.log('\nExisting-table row counts (snapshot for post-014.6 drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  console.log('\nSAVE THESE NUMBERS — used as the baseline for post-014.6 drift checks.');
}

async function post0146() {
  const db = await getDb();
  console.log('=== POST-014.6 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // ─── (a) source_record_id column exists with correct type ───────────────
  const colOk = await columnExists(db, 'body_metrics', 'source_record_id');
  console.log('(a) body_metrics.source_record_id column:');
  console.log(`  exists?                             : ${colOk ? '✓' : 'MISSING — CATASTROPHIC'}`);

  if (colOk) {
    const typeR: any = await db.execute(sql`
      SELECT data_type, character_maximum_length::text AS len, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'body_metrics'
        AND column_name = 'source_record_id'
    `);
    const row = typeR.rows?.[0] ?? typeR[0] ?? {};
    const dataType = row.data_type ?? '?';
    const len = row.len ?? '?';
    const nullable = row.is_nullable ?? '?';
    const typeOk = dataType === 'character varying' && len === '255' && nullable === 'YES';
    console.log(
      `  type=${dataType} length=${len} nullable=${nullable} : ${typeOk ? '✓ (varchar(255), nullable)' : '— UNEXPECTED, expected nullable varchar(255)'}`
    );
  }

  // ─── (b) New 014.6 index present + UNIQUE + partial WHERE clause ────────
  const newIdxOk = await indexExists(db, 'idx_body_metrics_per_record_dedup');
  console.log('\n(b) New per-record partial UNIQUE index:');
  console.log(
    `  idx_body_metrics_per_record_dedup   : ${newIdxOk ? 'present ✓' : 'MISSING — CATASTROPHIC'}`
  );

  if (newIdxOk) {
    const def = (await indexDef(db, 'idx_body_metrics_per_record_dedup')) ?? '';
    const isUnique = /CREATE UNIQUE INDEX/i.test(def);
    const hasPartialWhere =
      /WHERE\s*\(?\s*\(?source\)?\s*::\s*text/i.test(def) || /WHERE\s+source/i.test(def);
    const hasSourceRecordId = /source_record_id/i.test(def);
    console.log(
      `  is UNIQUE?                          : ${isUnique ? '✓' : 'NO — index is NOT unique'}`
    );
    console.log(
      `  has partial WHERE clause?           : ${hasPartialWhere ? '✓' : 'NO — index is full-table (BREAKS manual-entry semantics)'}`
    );
    console.log(
      `  references source_record_id?        : ${hasSourceRecordId ? '✓' : 'NO — index does not include source_record_id'}`
    );
    console.log(`  raw indexdef                        : ${def.slice(0, 200)}`);
  }

  // ─── (c) Old 014.5 index DROPPED — load-bearing for 014.6's correctness ─
  // 014.6 up() drops idx_body_metrics_wearable_dedup as Stage 3. If still
  // present, the migration only partially applied and is in an inconsistent
  // state.
  const oldIdxOk = await indexExists(db, 'idx_body_metrics_wearable_dedup');
  console.log('\n(c) Old 014.5 index (must be DROPPED by 014.6):');
  console.log(
    `  idx_body_metrics_wearable_dedup     : ${oldIdxOk ? 'STILL PRESENT — 014.6 PARTIALLY APPLIED' : 'absent ✓ (dropped by 014.6 as designed)'}`
  );

  // ─── (d) UPSERT round-trip probe (per-record dedup behavior) ────────────
  // Insert a probe row twice with same (user, source, source_record_id).
  // Second insert MUST UPSERT not duplicate. Cleanup at end.
  console.log('\n(d) UPSERT round-trip probe (per-record dedup behavior):');

  const userRow: any = await db.execute(sql`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
  const probeUserRows = (userRow.rows ?? userRow) as Array<{ id: string }>;
  if (probeUserRows.length === 0) {
    console.log('  ⚠ no user available to probe — skipping UPSERT round-trip test');
  } else {
    const probeUserId = probeUserRows[0].id;
    const PROBE_SOURCE = 'apple_health';
    const PROBE_RECORD_ID = 'verifier-probe-014_6-stable-record-id';
    const PROBE_PROVIDER = 'verifier_probe_146';

    try {
      // Cleanup any leftover probe rows from a previous abandoned run
      await db.execute(sql`
        DELETE FROM body_metrics WHERE source_record_id = ${PROBE_RECORD_ID}
      `);

      const beforeR: any = await db.execute(sql`
        SELECT COUNT(*)::text AS c FROM body_metrics WHERE source_record_id = ${PROBE_RECORD_ID}
      `);
      const before = parseInt(beforeR.rows?.[0]?.c ?? beforeR[0]?.c ?? '0', 10);

      // INSERT 1
      await db.execute(sql`
        INSERT INTO body_metrics (user_id, recorded_at, weight_kg, source, source_provider, source_record_id)
        VALUES (${probeUserId}, NOW(), 75.0, ${PROBE_SOURCE}, ${PROBE_PROVIDER}, ${PROBE_RECORD_ID})
        ON CONFLICT (user_id, source, source_record_id)
          WHERE source != 'manual'
        DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = NOW();
      `);
      // INSERT 2 — same (user, source, record_id), should UPSERT not insert
      await db.execute(sql`
        INSERT INTO body_metrics (user_id, recorded_at, weight_kg, source, source_provider, source_record_id)
        VALUES (${probeUserId}, NOW(), 76.0, ${PROBE_SOURCE}, ${PROBE_PROVIDER}, ${PROBE_RECORD_ID})
        ON CONFLICT (user_id, source, source_record_id)
          WHERE source != 'manual'
        DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = NOW();
      `);

      const afterR: any = await db.execute(sql`
        SELECT COUNT(*)::text AS c FROM body_metrics WHERE source_record_id = ${PROBE_RECORD_ID}
      `);
      const after = parseInt(afterR.rows?.[0]?.c ?? afterR[0]?.c ?? '0', 10);

      // Verify the value was updated (76.0, not 75.0)
      const valueR: any = await db.execute(sql`
        SELECT weight_kg::text AS w FROM body_metrics WHERE source_record_id = ${PROBE_RECORD_ID}
      `);
      const finalWeight = valueR.rows?.[0]?.w ?? valueR[0]?.w ?? '?';

      console.log(`  before INSERTs                      : ${before} rows (probe namespace)`);
      console.log(
        `  after 2 INSERTs (same source_record_id) : ${after} rows ${after === before + 1 ? '✓ (UPSERTed correctly)' : '— UNEXPECTED, dedup BROKEN'}`
      );
      console.log(
        `  final weight_kg value               : ${finalWeight} ${finalWeight === '76.00' || finalWeight === '76' ? '✓ (UPDATE took)' : `— UNEXPECTED, expected 76.00 got ${finalWeight}`}`
      );

      // Cleanup
      await db.execute(sql`
        DELETE FROM body_metrics WHERE source_record_id = ${PROBE_RECORD_ID}
      `);
      console.log(`  cleanup                             : probe row deleted ✓`);
    } catch (e: any) {
      // Always attempt cleanup even on failure
      try {
        await db.execute(sql`
          DELETE FROM body_metrics WHERE source_record_id = ${PROBE_RECORD_ID}
        `);
      } catch {
        // ignore
      }
      console.log(`  ⚠ UPSERT probe error: ${e?.message ?? e}`);
    }
  }

  // ─── (e) Existing-table row counts unchanged from baseline ──────────────
  console.log('\n(e) Existing-table row counts (compare to baseline-014.6 — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  // Non-manual body_metrics count (must match baseline-014.6 exactly —
  // up() is column+index only, no row writes)
  const r: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM body_metrics
    WHERE source != 'manual'
  `);
  const nonManualCount = parseInt(r.rows?.[0]?.c ?? r[0]?.c ?? '0', 10);
  console.log(`  body_metrics (non-manual)       : ${nonManualCount}`);
}

// ===========================================================================
// 015 — wearable_connections.open_wearables_user_id (Sprint 4 Task 5a.10)
// ===========================================================================
// 015 adds the OW user-ID bridge column + a partial index on it. This is the
// load-bearing piece behind Path B (Q2 spike LOCKED): every webhook ingest
// translates `data.user_id` (OW's UUID) → our internal `userId` via this
// column. Without it, INSERTs would FK-violate against users.id.
//
// Index def example:
//   CREATE INDEX idx_wearable_connections_ow_user_id
//     ON public.wearable_connections USING btree (open_wearables_user_id)
//     WHERE (open_wearables_user_id IS NOT NULL);

async function baseline015() {
  const db = await getDb();
  console.log('=== BASELINE-015 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // Column must NOT exist yet
  const colOk = await columnExists(db, 'wearable_connections', 'open_wearables_user_id');
  console.log('015 column (must be absent before run):');
  console.log(
    `  wearable_connections.open_wearables_user_id : ${colOk ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  // Index must NOT exist yet
  const idxOk = await indexExists(db, 'idx_wearable_connections_ow_user_id');
  console.log('015 index (must be absent before run):');
  console.log(
    `  idx_wearable_connections_ow_user_id          : ${idxOk ? 'PRESENT (UNEXPECTED)' : 'absent ✓'}`
  );

  console.log('\nExisting-table row counts (snapshot for post-015 drift detection):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
  console.log('\nSAVE THESE NUMBERS — used as the baseline for post-015 drift checks.');
}

async function post015() {
  const db = await getDb();
  console.log('=== POST-015 ===\n');

  const ident: any = await db.execute(sql`SELECT current_database() AS db`);
  console.log(`Database: ${ident.rows?.[0]?.db ?? ident[0]?.db}\n`);

  // ─── (a) Column exists with correct type ────────────────────────────────
  const colOk = await columnExists(db, 'wearable_connections', 'open_wearables_user_id');
  console.log('(a) wearable_connections.open_wearables_user_id column:');
  console.log(`  exists?                              : ${colOk ? '✓' : 'MISSING — CATASTROPHIC'}`);

  if (colOk) {
    const typeR: any = await db.execute(sql`
      SELECT data_type, character_maximum_length::text AS len, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'wearable_connections'
        AND column_name = 'open_wearables_user_id'
    `);
    const row = typeR.rows?.[0] ?? typeR[0] ?? {};
    const dataType = row.data_type ?? '?';
    const len = row.len ?? '?';
    const nullable = row.is_nullable ?? '?';
    const typeOk = dataType === 'character varying' && len === '36';
    console.log(
      `  type=${dataType} length=${len} nullable=${nullable} : ${typeOk ? '✓ (varchar(36))' : '— UNEXPECTED, expected varchar(36)'}`
    );
  }

  // ─── (b) Partial index exists + WHERE clause + non-unique ───────────────
  const idxOk = await indexExists(db, 'idx_wearable_connections_ow_user_id');
  console.log('\n(b) Partial index on open_wearables_user_id:');
  console.log(
    `  idx_wearable_connections_ow_user_id  : ${idxOk ? 'present ✓' : 'MISSING — CATASTROPHIC'}`
  );

  if (idxOk) {
    const def = (await indexDef(db, 'idx_wearable_connections_ow_user_id')) ?? '';
    const isUnique = /CREATE UNIQUE INDEX/i.test(def);
    const hasPartialWhere = /WHERE\s*\(?\s*open_wearables_user_id/i.test(def);
    console.log(
      `  is non-unique?                       : ${!isUnique ? '✓' : 'NO — index is UNIQUE (multiple connections per OW user is the design — this BREAKS that)'}`
    );
    console.log(
      `  has partial WHERE IS NOT NULL?       : ${hasPartialWhere ? '✓' : 'NO — index includes NULL rows (wastes index, OAuth-init intermediate rows would index)'}`
    );
    console.log(`  raw indexdef                         : ${def.slice(0, 200)}`);
  }

  // ─── (c) Bridge round-trip probe ───────────────────────────────────────
  // INSERT a probe row with non-NULL open_wearables_user_id, SELECT by
  // that field (exercises the index), assert the round-trip works, DELETE
  // the probe row. The probe is bounded by a known PROBE_OW_UUID so
  // cleanup is precise — we DELETE only rows carrying that UUID.
  //
  // The provider must be a real enum value (the
  // `wearable_connections_provider_check` CHECK constraint enumerates
  // them literally — see `shared/schema.ts` WEARABLE_PROVIDERS). We use
  // 'garmin' as the probe provider and require the chosen user has no
  // existing 'garmin' row already (UNIQUE(userId, provider) collision
  // would mask the bridge test). If they do, we skip with a note.
  console.log('\n(c) Bridge round-trip probe (open_wearables_user_id resolver path):');

  const PROBE_OW_UUID = 'probe-ow-uuid-015';
  const PROBE_PROVIDER = 'garmin';

  // Find a user with no existing (user_id, provider='garmin') row so the
  // INSERT doesn't collide with real data. Cap at 5 candidates so we
  // don't loop forever on a fully-populated DB.
  const candidates: any = await db.execute(sql`
    SELECT u.id
    FROM users u
    LEFT JOIN wearable_connections wc
      ON wc.user_id = u.id AND wc.provider = ${PROBE_PROVIDER}
    WHERE u.deleted_at IS NULL AND wc.id IS NULL
    LIMIT 5
  `);
  const candidateRows = (candidates.rows ?? candidates) as Array<{ id: string }>;
  if (candidateRows.length === 0) {
    console.log(
      '  ⚠ no probe-eligible user (every user has a garmin row already) — skipping bridge round-trip test'
    );
  } else {
    const probeUserId = candidateRows[0].id;

    try {
      // Cleanup any leftover probe rows from a previous abandoned run
      // (matched by ow_user_id, since provider='garmin' alone would
      // delete real rows).
      await db.execute(sql`
        DELETE FROM wearable_connections WHERE open_wearables_user_id = ${PROBE_OW_UUID}
      `);

      // INSERT probe row (provider='garmin' satisfies the enum check)
      await db.execute(sql`
        INSERT INTO wearable_connections (
          user_id, provider, status, open_wearables_user_id
        ) VALUES (
          ${probeUserId}, ${PROBE_PROVIDER}, 'connected', ${PROBE_OW_UUID}
        )
      `);

      // SELECT by open_wearables_user_id — this is the bridge resolver path
      const lookupR: any = await db.execute(sql`
        SELECT user_id FROM wearable_connections
        WHERE open_wearables_user_id = ${PROBE_OW_UUID}
      `);
      const lookup = (lookupR.rows ?? lookupR) as Array<{ user_id: string }>;
      const found = lookup.length === 1 && lookup[0].user_id === probeUserId;
      console.log(
        `  bridge lookup (ow_uuid → user_id)    : ${found ? '✓ (returned the probe user_id)' : `— UNEXPECTED, found ${lookup.length} rows`}`
      );

      // Cleanup — match by the probe ow_user_id so we never touch real rows
      const cleanupR: any = await db.execute(sql`
        DELETE FROM wearable_connections WHERE open_wearables_user_id = ${PROBE_OW_UUID}
      `);
      const deleted = cleanupR.rowCount ?? cleanupR?.rows?.length ?? 1;
      console.log(`  cleanup                              : ${deleted} probe row(s) deleted ✓`);
    } catch (e: any) {
      // Always attempt cleanup even on failure
      try {
        await db.execute(sql`
          DELETE FROM wearable_connections WHERE open_wearables_user_id = ${PROBE_OW_UUID}
        `);
      } catch {
        // ignore
      }
      console.log(`  ⚠ bridge probe error: ${e?.message ?? e}`);
    }
  }

  // ─── (d) Existing-table row counts unchanged from baseline ──────────────
  console.log('\n(d) Existing-table row counts (compare to baseline-015 — MUST match exactly):');
  const counts = await rowCounts(db);
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(28)} : ${c}`);
  }
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
  'baseline-014': baseline014,
  'post-014': post014,
  'baseline-014.5': baseline0145,
  'post-014.5': post0145,
  'baseline-014.6': baseline0146,
  'post-014.6': post0146,
  'baseline-015': baseline015,
  'post-015': post015,
};

const fn = phases[phase];
if (!fn) {
  console.error(
    `Usage: npx tsx scripts/verify-prod-migrations.ts <baseline|post-010|post-011|baseline-012|post-012|baseline-013|post-013|baseline-014|post-014|baseline-014.5|post-014.5|baseline-014.6|post-014.6|baseline-015|post-015>`
  );
  process.exit(2);
}

fn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
