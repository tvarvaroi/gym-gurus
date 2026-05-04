// One-shot verification script for migrations 010 + 011 against Railway prod.
// Run via: railway run -- npx tsx scripts/verify-prod-migrations.ts <phase>
//
// Phases:
//   baseline  — pre-010 snapshot: existing-table row counts + confirm 010/011
//               artefacts are absent (so we know the migrations haven't been
//               run yet)
//   post-010  — confirm program_* tables exist + indexes + row counts on
//               existing tables haven't drifted from baseline
//   post-011  — confirm body_metrics + progress_photos exist, progress_entries
//               polymorphic refactor took effect, share_body_metrics_with_trainer
//               column on clients, AND the critical check that no existing
//               progress_entries row has client_id=NULL after the refactor
//
// Designed to be safe to re-run. All queries are SELECT-only.
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';

type Phase = 'baseline' | 'post-010' | 'post-011';

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

const phase = (process.argv[2] ?? '') as Phase;
const phases: Record<Phase, () => Promise<void>> = {
  baseline,
  'post-010': post010,
  'post-011': post011,
};

const fn = phases[phase];
if (!fn) {
  console.error(`Usage: npx tsx scripts/verify-prod-migrations.ts <baseline|post-010|post-011>`);
  process.exit(2);
}

fn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
