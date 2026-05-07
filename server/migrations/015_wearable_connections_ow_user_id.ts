// Migration 015 — wearable_connections.open_wearables_user_id (Sprint 4 Task 5a.10)
//
// Adds the OW user-ID bridge column on wearable_connections. Open Wearables
// has its own identity domain (UUIDs) that must be persisted to look up our
// internal user from a webhook payload's `data.user_id` (which carries OW's
// UUID, not ours).
//
// WHY (2026-05-07 Q2 spike close):
//
// Sprint 4 BATCH 5a was implemented under the Path A assumption — "OW
// `external_user_id` is a runtime lookup mechanism, our internal user UUID
// flows through OW and OW echoes it back on every webhook." Source-level
// inspection of OW master HEAD `34df8a5` proved Path A wrong:
//
//   - OW's User model field is `external_user_id` (NOT `external_id`)
//   - The field is officially deprecated (Pydantic `deprecated=True`) and
//     accepted ONLY as a filter on `GET /users` — NOT on any data-fetching
//     endpoint (timeseries, workouts, sleep, summaries).
//   - OW's iOS / Flutter SDK guides explicitly warn: "The `userId` parameter
//     is the Open Wearables User ID (UUID) — the `id` returned by the
//     [Create User] endpoint. Do NOT pass your own external_user_id here."
//
// Architectural implication: every data-fetching call to OW (and every
// webhook ingest) requires OW's internal user UUID. We MUST store it on our
// side. Path B locks: `wearable_connections.open_wearables_user_id` column.
//
// SHAPE — varchar(36) for UUID. Nullable because:
//
//   1. Existing wearable_connections rows pre-OW have no OW user yet.
//   2. The OAuth-init flow inserts the local row BEFORE calling OW's
//      createUser (so we have a stable connection.id to attach the OAuth
//      callback to). Between that INSERT and the createUser response the
//      column is null. The wearableConnections.ts `initiateOAuth` change
//      under Task 5a.10 wraps INSERT + UPDATE in a single transaction so the
//      window is atomic per request.
//
// PARTIAL INDEX — `WHERE open_wearables_user_id IS NOT NULL`. Don't index
// nulls. The index serves the bridge resolver (`resolveUserIdFromOwUserId`
// in wearableIngest.ts) and the cron's row claim WHERE clause. Both filter
// to non-null rows; the partial index keeps lookup tight without indexing
// pre-OAuth-init rows.
//
// IDEMPOTENCY: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS makes
// up() naturally idempotent. Re-running is a no-op.
//
// down() — refuses if any wearable_connections rows have non-NULL
// `open_wearables_user_id`. No prod rows exist yet (Sprint 4 wearable
// schema hasn't deployed) but the gate stays for consistency with the 014
// + 014.5 down-migration safety pattern.
//
// CLI:    npx tsx server/migrations/015_wearable_connections_ow_user_id.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 015_wearable_connections_ow_user_id

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export const NAME = '015_wearable_connections_ow_user_id';

export async function up() {
  const db = await getDb();
  await db.execute(sql`
    ALTER TABLE wearable_connections
      ADD COLUMN IF NOT EXISTS open_wearables_user_id varchar(36);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_wearable_connections_ow_user_id
      ON wearable_connections (open_wearables_user_id)
      WHERE open_wearables_user_id IS NOT NULL;
  `);
  console.warn(
    '[Migration 015] up() complete: wearable_connections.open_wearables_user_id column + idx_wearable_connections_ow_user_id partial index'
  );
}

export async function down() {
  const db = await getDb();
  // Safety gate: refuse if any rows currently carry the OW UUID bridge.
  // Dropping the column would lose the bridge that ingest + cron rely on
  // to translate OW's UUID → our user_id. Mirrors 014/014.5 down() pattern —
  // turning a silent data-loss footgun into an explicit operator decision.
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM wearable_connections
    WHERE open_wearables_user_id IS NOT NULL
  `);
  const count = result?.rows?.[0]?.c ?? result?.[0]?.c ?? 0;
  if (count > 0) {
    throw new Error(
      `[Migration 015 down] BLOCKED: ${count} wearable_connections rows with non-NULL open_wearables_user_id exist. ` +
        `Dropping the column would lose the OW UUID bridge. ` +
        `Verify these rows are not load-bearing before forcing rollback.`
    );
  }
  await db.execute(sql`DROP INDEX IF EXISTS idx_wearable_connections_ow_user_id;`);
  await db.execute(
    sql`ALTER TABLE wearable_connections DROP COLUMN IF EXISTS open_wearables_user_id;`
  );
  console.warn(
    `[Migration 015 down] reverted: ${count} rows had open_wearables_user_id (zero, safe)`
  );
}

// CLI invocation (compatible with scripts/run-prod-migration.ts dynamic import).
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 015] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 015] ${direction}() failed:`, err);
      process.exit(1);
    });
}
