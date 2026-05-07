// Migration 014.6 — Body Metrics Per-Record Dedup (Sprint 5 BATCH 1, Path C)
//
// Replaces the day-bucketed partial UNIQUE from 014.5 with a per-record
// partial UNIQUE keyed on source_record_id. Closes the data-fidelity gap
// for Apple Health body imports where users may have multiple measurements
// per (sourceProvider, day) — e.g., a Withings smart scale paired into
// Apple Health writing morning + post-workout + evening weighings.
//
// THE CHANGE:
//   Before (014.5):  UNIQUE (user_id, source_provider, recorded_at::date)
//                    WHERE source IN ('wearable', 'smart_scale')
//   After  (014.6):  body_metrics.source_record_id varchar(255) NULL  -- new column
//                    UNIQUE (user_id, source, source_record_id)
//                    WHERE source != 'manual'
//
// WHY PATH C (per-record over day-bucketed):
//   1. Data fidelity. Apple Health users with smart-scale apps writing
//      multiple weighings per day expect re-import to preserve every
//      measurement. Path A/B (widen day-bucketed) would silently collapse
//      multi-per-day records. Path C preserves them via per-record key.
//   2. Sibling alignment. sleep_sessions / daily_vitals / activity_sessions
//      already use (user_id, source, source_record_id) UNIQUE. Path C
//      makes body_metrics consistent with its three siblings instead of
//      a one-off divergence.
//   3. Wearable forward-compat. When Sprint 4 resumes, its body_composition
//      ingest path will move to per-record source_record_id (consistent
//      with siblings). Today no rows have source != 'manual' on prod
//      (Sprint 4 paused before BATCH 5b deploy, never wrote wearable rows
//      in prod), so dropping the old 014.5 index removes zero functional
//      behavior at migration time.
//
// IDEMPOTENCY:
//   - ADD COLUMN IF NOT EXISTS for source_record_id
//   - CREATE UNIQUE INDEX IF NOT EXISTS for the new partial UNIQUE
//   - DROP INDEX IF EXISTS for the old 014.5 index
//   Re-running up() is a no-op.
//
// down() — TWO-STAGE SAFETY:
//   Stage 1: Refuse if any rows have source != 'manual' AND
//   source_record_id IS NOT NULL. Those are rows that depend on the new
//   per-record dedup; dropping the new index + column would re-enable
//   duplicate inserts AND lose their source_record_id values.
//   Stage 2 (after gate passes): drop new index → drop column → recreate
//   the 014.5 index with its original definition.
//
// ROLLBACK COMPATIBILITY (the user's "concern about migration history
// correctness across forward-and-back rollback paths" surfaced at BATCH 1
// approval):
//   - Forward order: 014.5 up → 014.6 up. New index replaces old.
//   - Reverse order (expected): 014.6 down → 014.5 down. 014.6 down()
//     recreates the 014.5 index, then 014.5 down() drops it cleanly via
//     its existing DROP INDEX IF EXISTS. Both work in sequence.
//   - Out-of-order rollback (operator error, e.g. running 014.5 down()
//     while 014.6 still applied): 014.5's DROP INDEX IF EXISTS is
//     idempotent and would attempt to drop the OLD index that 014.6
//     already dropped — no-op, no error. Migration ledger would be
//     incoherent (014.5 marked rolled back while 014.6 still applied),
//     but DB state stays consistent (014.6's new index is unaffected).
//     Operators must roll back in reverse order; out-of-order is their
//     error to recover. No fix needed in 014.5.
//
// CLI:    npx tsx server/migrations/014_6_body_metrics_per_record_dedup.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 014_6_body_metrics_per_record_dedup

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export const NAME = '014_6_body_metrics_per_record_dedup';

export async function up() {
  const db = await getDb();

  // ─── Stage 1 ─ Add source_record_id column ───────────────────────────────
  await db.execute(sql`
    ALTER TABLE body_metrics
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(255);
  `);

  // ─── Stage 2 ─ Create the new per-record partial UNIQUE ──────────────────
  // Created BEFORE dropping the old 014.5 index so there's never a window
  // with neither dedup mechanism in place. The two indexes coexist briefly
  // (different conflict columns, different filters — no conflict at the
  // index level).
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_body_metrics_per_record_dedup
      ON body_metrics (user_id, source, source_record_id)
      WHERE source != 'manual';
  `);

  // ─── Stage 3 ─ Drop the now-subsumed 014.5 index ─────────────────────────
  // 014.5's idx_body_metrics_wearable_dedup is replaced by the per-record
  // index above. Sprint 4's wearable ingest never ran in prod (Sprint 4
  // PAUSED before BATCH 5b deploy), so no rows depend on it today.
  await db.execute(sql`DROP INDEX IF EXISTS idx_body_metrics_wearable_dedup;`);

  console.warn(
    '[Migration 014.6] up() complete: source_record_id added, idx_body_metrics_per_record_dedup created, idx_body_metrics_wearable_dedup dropped'
  );
}

export async function down() {
  const db = await getDb();

  // ─── Stage 1 ─ Safety gate ───────────────────────────────────────────────
  // Refuse if any rows depend on the new per-record dedup. Dropping the
  // new index AND the column would lose their source_record_id values
  // AND re-enable duplicate inserts on re-import.
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM body_metrics
    WHERE source != 'manual' AND source_record_id IS NOT NULL
  `);
  const count = parseInt(result.rows?.[0]?.c ?? result[0]?.c ?? '0', 10);
  if (count > 0) {
    throw new Error(
      `[Migration 014.6 down] BLOCKED: ${count} body_metrics rows have ` +
        `source != 'manual' AND source_record_id IS NOT NULL. Dropping the ` +
        `per-record index and column would lose their dedup support and ` +
        `silently allow duplicate inserts on re-import. Verify these rows ` +
        `are not load-bearing before forcing rollback.`
    );
  }

  // ─── Stage 2 ─ Drop the new index ────────────────────────────────────────
  await db.execute(sql`DROP INDEX IF EXISTS idx_body_metrics_per_record_dedup;`);

  // ─── Stage 3 ─ Drop the column ───────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE body_metrics
    DROP COLUMN IF EXISTS source_record_id;
  `);

  // ─── Stage 4 ─ Recreate the 014.5 index ──────────────────────────────────
  // Symmetrical with up(). Restores the day-bucketed partial UNIQUE that
  // 014.5 originally created. Verbatim definition — keep this in sync if
  // 014.5 ever changes (it won't, per Sprint 4 PAUSED stance).
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_body_metrics_wearable_dedup
      ON body_metrics (user_id, source_provider, (recorded_at::date))
      WHERE source IN ('wearable', 'smart_scale');
  `);

  console.warn(
    `[Migration 014.6 down] reverted: ${count} rows (zero, safe). ` +
      `idx_body_metrics_per_record_dedup dropped, source_record_id column ` +
      `dropped, idx_body_metrics_wearable_dedup recreated.`
  );
}

// CLI invocation (compatible with scripts/run-prod-migration.ts dynamic import).
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 014.6] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 014.6] ${direction}() failed:`, err);
      process.exit(1);
    });
}
