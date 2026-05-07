// Migration 014.5 — Body Metrics Wearable Dedup (Sprint 4 BATCH 5a)
//
// Adds a partial UNIQUE index on body_metrics(user_id, source_provider,
// (recorded_at::date)) WHERE source IN ('wearable', 'smart_scale').
//
// WHY (2026-05-07 plan-review finding):
//
// Sprint 1 created body_metrics with only `idx_body_metrics_user_id` and
// `idx_body_metrics_user_recorded_at` — no UNIQUE constraint. The
// `body_composition.created` ingest path in Task 5a.4 needs an UPSERT
// (`ON CONFLICT ... DO UPDATE`) to be idempotent against Svix retries.
// ON CONFLICT requires a unique index targeting the conflict columns.
// Without one, every retry of the same logical event silently inserts a
// duplicate row — exactly the failure mode BATCH 2's amend Item 3 fixed
// for vitals.
//
// WHY PARTIAL (not table-wide):
//
// Sprint 1's body_metrics allows multiple manual entries per user per day
// (a user can log weight at 7am and 5pm and both rows persist). A table-
// wide UNIQUE on (user_id, source_provider, (recorded_at::date)) would
// break that semantic. Partial UNIQUE filtered on
// `source IN ('wearable', 'smart_scale')` enforces dedup ONLY for wearable-
// sourced rows, leaves manual entries untouched. Same partial-index
// pattern proven in Sprint 1's progress_entries polymorphic CHECK
// constraint (`progress_entries_user_or_client_check`).
//
// IDEMPOTENCY: CREATE UNIQUE INDEX IF NOT EXISTS makes up() naturally
// idempotent. Re-running is a no-op.
//
// down() — refuses if any wearable-sourced body_metrics rows currently
// exist (manual entries don't depend on the index, so they don't gate
// the down). Mirrors Sprint 1.5 BATCH 2 + 012 + 013 + 014 down() pattern —
// turning a silent data-loss footgun into an explicit operator decision.
//
// CLI:    npx tsx server/migrations/014_5_body_metrics_wearable_dedup.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 014_5_body_metrics_wearable_dedup

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export const NAME = '014_5_body_metrics_wearable_dedup';

export async function up() {
  const db = await getDb();
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_body_metrics_wearable_dedup
      ON body_metrics (user_id, source_provider, (recorded_at::date))
      WHERE source IN ('wearable', 'smart_scale');
  `);
  console.warn(
    '[Migration 014.5] up() complete: idx_body_metrics_wearable_dedup created (partial UNIQUE)'
  );
}

export async function down() {
  const db = await getDb();
  // Safety gate: refuse if any body_metrics rows currently rely on the dedup
  // index (i.e. any wearable-sourced rows). Manual entries are unaffected
  // by the index existing or not, so they don't gate the down-migration.
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM body_metrics
    WHERE source IN ('wearable', 'smart_scale')
  `);
  const count = parseInt(result.rows?.[0]?.c ?? result[0]?.c ?? '0', 10);
  if (count > 0) {
    throw new Error(
      `[Migration 014.5 down] BLOCKED: ${count} wearable-sourced body_metrics rows exist. ` +
        `Dropping idx_body_metrics_wearable_dedup would re-enable duplicate inserts. ` +
        `Verify these rows are not load-bearing before forcing rollback.`
    );
  }
  await db.execute(sql`DROP INDEX IF EXISTS idx_body_metrics_wearable_dedup;`);
  console.warn(
    `[Migration 014.5 down] reverted: ${count} wearable-sourced rows (zero, safe)`
  );
}

// CLI invocation (compatible with scripts/run-prod-migration.ts dynamic import).
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 014.5] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 014.5] ${direction}() failed:`, err);
      process.exit(1);
    });
}
