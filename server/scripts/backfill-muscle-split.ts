/**
 * Backfill script: populate primaryMuscles/secondaryMuscles from muscleGroups + COMPOUND_EXERCISE_MUSCLES map.
 * Idempotent — only touches rows where primaryMuscles is empty.
 *
 * Usage: npx tsx server/scripts/backfill-muscle-split.ts
 */

import { getDb } from '../db';
import { exercises } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Inline copy of the compound exercise map (avoids importing client code on server)
const COMPOUND_MAP: Record<string, { primary: string[]; secondary: string[] }> = {
  bench_press: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  incline_bench_press: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  decline_bench_press: { primary: ['chest'], secondary: ['triceps'] },
  dumbbell_press: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  push_up: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  chest_fly: { primary: ['chest'], secondary: [] },
  cable_crossover: { primary: ['chest'], secondary: [] },
  deadlift: {
    primary: ['back', 'hamstrings', 'glutes'],
    secondary: ['quads', 'forearms', 'traps'],
  },
  barbell_row: { primary: ['back', 'lats'], secondary: ['biceps', 'traps'] },
  pull_up: { primary: ['lats', 'back'], secondary: ['biceps'] },
  chin_up: { primary: ['lats', 'biceps'], secondary: ['back'] },
  lat_pulldown: { primary: ['lats'], secondary: ['biceps', 'back'] },
  seated_row: { primary: ['back', 'lats'], secondary: ['biceps', 'traps'] },
  t_bar_row: { primary: ['back', 'lats'], secondary: ['biceps', 'traps'] },
  overhead_press: { primary: ['shoulders'], secondary: ['triceps'] },
  military_press: { primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  lateral_raise: { primary: ['shoulders'], secondary: [] },
  front_raise: { primary: ['shoulders'], secondary: [] },
  rear_delt_fly: { primary: ['shoulders'], secondary: ['back'] },
  arnold_press: { primary: ['shoulders'], secondary: ['triceps'] },
  face_pull: { primary: ['shoulders', 'traps'], secondary: ['back'] },
  squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  front_squat: { primary: ['quads'], secondary: ['glutes'] },
  leg_press: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  lunge: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  romanian_deadlift: { primary: ['hamstrings', 'glutes'], secondary: ['lower_back'] },
  leg_curl: { primary: ['hamstrings'], secondary: [] },
  leg_extension: { primary: ['quads'], secondary: [] },
  hip_thrust: { primary: ['glutes'], secondary: ['hamstrings'] },
  calf_raise: { primary: ['calves'], secondary: [] },
  bicep_curl: { primary: ['biceps'], secondary: ['forearms'] },
  hammer_curl: { primary: ['biceps'], secondary: ['forearms'] },
  preacher_curl: { primary: ['biceps'], secondary: [] },
  tricep_extension: { primary: ['triceps'], secondary: [] },
  tricep_dip: { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  skull_crusher: { primary: ['triceps'], secondary: [] },
  close_grip_bench: { primary: ['triceps'], secondary: ['chest'] },
  plank: { primary: ['abs'], secondary: ['obliques', 'lower_back'] },
  crunch: { primary: ['abs'], secondary: [] },
  russian_twist: { primary: ['obliques'], secondary: ['abs'] },
  leg_raise: { primary: ['abs'], secondary: [] },
  cable_crunch: { primary: ['abs'], secondary: [] },
  ab_wheel: { primary: ['abs'], secondary: ['shoulders', 'lats'] },
  back_extension: { primary: ['lower_back'], secondary: ['glutes', 'hamstrings'] },
};

function inferMuscles(
  name: string,
  muscleGroups: string[]
): { primary: string[]; secondary: string[] } {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

  // Try exact key match first
  const keyMatch = normalized.replace(/\s+/g, '_');
  if (COMPOUND_MAP[keyMatch]) {
    return COMPOUND_MAP[keyMatch];
  }

  // Try substring match
  for (const [key, mapping] of Object.entries(COMPOUND_MAP)) {
    const k = key.replace(/_/g, ' ');
    if (normalized.includes(k) || k.includes(normalized)) {
      return mapping;
    }
  }

  // Fallback: treat muscleGroups[0] as primary, rest as secondary
  if (muscleGroups.length > 0) {
    return { primary: [muscleGroups[0]], secondary: muscleGroups.slice(1) };
  }

  return { primary: [], secondary: [] };
}

async function main() {
  const db = await getDb();

  // Find exercises with empty primaryMuscles
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroups: exercises.muscleGroups,
      primaryMuscles: exercises.primaryMuscles,
    })
    .from(exercises)
    .where(
      sql`array_length(${exercises.primaryMuscles}, 1) IS NULL OR array_length(${exercises.primaryMuscles}, 1) = 0`
    );

  console.warn(`Found ${rows.length} exercises with empty primaryMuscles`);

  let updated = 0;
  for (const row of rows) {
    const { primary, secondary } = inferMuscles(row.name, row.muscleGroups);
    if (primary.length === 0) {
      console.warn(`  SKIP: "${row.name}" — no inference possible`);
      continue;
    }

    await db
      .update(exercises)
      .set({ primaryMuscles: primary, secondaryMuscles: secondary })
      .where(eq(exercises.id, row.id));

    updated++;
    console.warn(`  OK: "${row.name}" → primary=[${primary}] secondary=[${secondary}]`);
  }

  console.warn(`\nBackfill complete: ${updated}/${rows.length} exercises updated`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
