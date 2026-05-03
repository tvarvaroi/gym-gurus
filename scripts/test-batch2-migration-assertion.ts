// One-shot smoke test for Sprint 1.5 BATCH 2 migration safety assertion.
// Inserts a progress_entries row with user_id NOT NULL, then attempts down(),
// expects the migration to refuse. Cleans up after.

import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';
import { down } from '../server/migrations/011_biometrics_foundation';

const RONIN_USER_ID = '8961e315-6937-480d-b985-cf7870579430';

(async () => {
  const db = await getDb();

  // Insert a synthetic user_id-keyed progress entry (XOR check requires
  // client_id IS NULL when user_id IS NOT NULL).
  const probeId = `probe-${Date.now()}`;
  await db.execute(sql`
    INSERT INTO progress_entries (id, user_id, client_id, type, value, unit, recorded_at)
    VALUES (${probeId}, ${RONIN_USER_ID}, NULL, 'weight', '80.0', 'kg', NOW())
  `);
  console.log(`Probe row inserted: id=${probeId}`);

  let blocked = false;
  try {
    await down();
  } catch (e) {
    blocked = true;
    console.log(`✓ down() refused: ${(e as Error).message.slice(0, 200)}`);
  }

  // Cleanup the probe row
  await db.execute(sql`DELETE FROM progress_entries WHERE id = ${probeId}`);
  console.log(`Probe row cleaned up`);

  if (!blocked) {
    console.error('✗ down() ran without blocking — assertion did not fire');
    process.exit(1);
  }

  console.log('\nSmoke test passed: down() blocks when user_id rows exist.');
  process.exit(0);
})();
