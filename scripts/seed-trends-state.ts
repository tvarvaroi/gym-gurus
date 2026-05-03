// Toggle Ronin's body_metrics seed state for screenshot capture.
// Usage: npx tsx scripts/seed-trends-state.ts <empty|one|full>

import { getDb } from '../server/db';
import { users, bodyMetrics } from '../shared/schema';
import { eq } from 'drizzle-orm';

const RONIN_EMAIL = 'ronin-test@gymgurus.dev';

(async () => {
  const state = process.argv[2] ?? 'full';
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, RONIN_EMAIL));
  if (!u) {
    console.error('Ronin user not found');
    process.exit(1);
  }
  await db.delete(bodyMetrics).where(eq(bodyMetrics.userId, u.id));

  if (state === 'empty') {
    console.log('Ronin metrics cleared (empty state).');
  } else if (state === 'one') {
    await db.insert(bodyMetrics).values({
      userId: u.id,
      recordedAt: new Date(Date.now() - 2 * 86_400_000),
      weightKg: '82.50',
      bodyFatPercentage: '20.00',
      muscleMassKg: '38.50',
    });
    console.log('Ronin seeded with 1 entry.');
  } else if (state === 'full') {
    for (let i = 0; i < 12; i++) {
      const daysAgo = 28 - Math.floor(i * (28 / 11));
      await db.insert(bodyMetrics).values({
        userId: u.id,
        recordedAt: new Date(Date.now() - daysAgo * 86_400_000),
        weightKg: (84 - i * 0.3).toFixed(2),
        bodyFatPercentage: (21 - i * 0.2).toFixed(2),
        muscleMassKg: (38 + i * 0.05).toFixed(2),
      });
    }
    console.log('Ronin seeded with 12 entries.');
  } else {
    console.error('Unknown state:', state);
    process.exit(1);
  }
  process.exit(0);
})();
