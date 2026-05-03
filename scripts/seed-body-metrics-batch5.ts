// Sprint 1 BATCH 5 screenshot fixture seed.
// - Sets/resets password on the 3 test accounts to a known value
// - Seeds body metrics for ronin-test@ with 12 entries spread across 30 days
// - Seeds body metrics for disciple-test@ with 6 entries spread across 60 days
// - Links disciple-test@ to guru-test@ as a client (idempotent)
// - Sets shareBodyMetricsWithTrainer=true initially

import { getDb } from '../server/db';
import { users, bodyMetrics, clients } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const PASSWORD = 'TestPass123!';

const RONIN_EMAIL = 'ronin-test@gymgurus.dev';
const DISCIPLE_EMAIL = 'disciple-test@gymgurus.dev';
const GURU_EMAIL = 'guru-test@gymgurus.dev';

async function setPassword(db: any, email: string) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  await db.update(users).set({ password: hash }).where(eq(users.email, email));
  console.log(`  password set: ${email} → ${PASSWORD}`);
}

async function clearMetrics(db: any, userId: string) {
  await db.delete(bodyMetrics).where(eq(bodyMetrics.userId, userId));
}

interface MetricSeed {
  daysAgo: number;
  weightKg: number;
  bodyFat: number;
  muscleMassKg?: number;
  notes?: string;
}

async function seedMetrics(db: any, userId: string, seeds: MetricSeed[]) {
  await clearMetrics(db, userId);
  for (const s of seeds) {
    const recordedAt = new Date(Date.now() - s.daysAgo * 86_400_000);
    await db.insert(bodyMetrics).values({
      userId,
      recordedAt,
      weightKg: s.weightKg.toFixed(2),
      bodyFatPercentage: s.bodyFat.toFixed(2),
      muscleMassKg: s.muscleMassKg ? s.muscleMassKg.toFixed(2) : null,
      notes: s.notes ?? null,
    });
  }
  console.log(`  seeded ${seeds.length} body_metrics rows`);
}

(async () => {
  const db = await getDb();

  // Reset passwords on all test accounts
  console.log('Resetting passwords...');
  for (const email of [RONIN_EMAIL, DISCIPLE_EMAIL, GURU_EMAIL, 'biotest@gymgurus.dev']) {
    await setPassword(db, email);
  }

  // Lookup user IDs
  const [ronin] = await db.select().from(users).where(eq(users.email, RONIN_EMAIL));
  const [disciple] = await db.select().from(users).where(eq(users.email, DISCIPLE_EMAIL));
  const [guru] = await db.select().from(users).where(eq(users.email, GURU_EMAIL));

  if (!ronin || !disciple || !guru) {
    console.error('One or more test accounts missing — re-run sync-prod-to-dev');
    process.exit(1);
  }

  // Ronin: 12 entries across 30 days (downward-trending weight + body fat)
  console.log(`\nSeeding Ronin (${ronin.id})...`);
  const roninSeeds: MetricSeed[] = [];
  for (let i = 0; i < 12; i++) {
    const daysAgo = 28 - Math.floor(i * (28 / 11));
    roninSeeds.push({
      daysAgo,
      weightKg: 84 - i * 0.3 + (Math.random() - 0.5) * 0.2,
      bodyFat: 21 - i * 0.2 + (Math.random() - 0.5) * 0.1,
      muscleMassKg: 38 + i * 0.05,
    });
  }
  await seedMetrics(db, ronin.id, roninSeeds);

  // Disciple: 6 entries across 60 days (recent ones populated for trainer view)
  console.log(`\nSeeding Disciple (${disciple.id})...`);
  const discipleSeeds: MetricSeed[] = [
    { daysAgo: 55, weightKg: 68, bodyFat: 24 },
    { daysAgo: 45, weightKg: 67.5, bodyFat: 23.6 },
    { daysAgo: 30, weightKg: 67.0, bodyFat: 23.1 },
    { daysAgo: 18, weightKg: 66.8, bodyFat: 22.7, muscleMassKg: 32.5 },
    { daysAgo: 8, weightKg: 66.3, bodyFat: 22.2, muscleMassKg: 32.7 },
    { daysAgo: 2, weightKg: 65.9, bodyFat: 21.9, muscleMassKg: 32.9 },
  ];
  await seedMetrics(db, disciple.id, discipleSeeds);

  // Ensure Guru has Disciple in their roster (linkage by email)
  console.log('\nEnsuring Guru→Disciple linkage...');
  const existing = await db
    .select()
    .from(clients)
    .where(sql`${clients.email} = ${DISCIPLE_EMAIL} AND ${clients.trainerId} = ${guru.id}`);

  if (existing.length === 0) {
    const inserted = await db
      .insert(clients)
      .values({
        trainerId: guru.id,
        name: 'Disciple Test',
        email: DISCIPLE_EMAIL,
        goal: 'Build muscle, log body composition consistently',
        status: 'active',
        shareBodyMetricsWithTrainer: true,
      })
      .returning({ id: clients.id });
    console.log(`  linked, client.id = ${inserted[0]?.id}`);
  } else {
    // Make sure consent is on for screenshot baseline
    await db
      .update(clients)
      .set({ shareBodyMetricsWithTrainer: true })
      .where(eq(clients.id, existing[0].id));
    console.log(`  already linked, client.id = ${existing[0].id} (consent=ON)`);
  }

  console.log('\n✅ Seed complete.');
  console.log(`Login as Ronin:    ${RONIN_EMAIL} / ${PASSWORD}`);
  console.log(`Login as Disciple: ${DISCIPLE_EMAIL} / ${PASSWORD}`);
  console.log(`Login as Guru:     ${GURU_EMAIL} / ${PASSWORD}`);
  process.exit(0);
})();
