/**
 * Seed the exercises table from the free-exercise-db dataset (CC0 public domain).
 * Source: https://github.com/yuhonas/free-exercise-db
 *
 * Run with:  npx tsx server/seeds/exercisesSeed.ts
 *
 * Behaviour: upsert by name — existing exercises are updated with richer data,
 *            new exercises are inserted. Idempotent.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';
import { exercises } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Mappings ────────────────────────────────────────────────────────────────

const LEVEL_MAP: Record<string, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  expert: 'advanced',
};

const MUSCLE_MAP: Record<string, string> = {
  abdominals: 'Core',
  abductors: 'Legs',
  adductors: 'Legs',
  biceps: 'Arms',
  calves: 'Legs',
  chest: 'Chest',
  forearms: 'Arms',
  glutes: 'Legs',
  hamstrings: 'Legs',
  lats: 'Back',
  'lower back': 'Back',
  'middle back': 'Back',
  neck: 'Shoulders',
  quadriceps: 'Legs',
  shoulders: 'Shoulders',
  traps: 'Back',
  triceps: 'Arms',
};

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  'body only': 'Bodyweight',
  kettlebells: 'Kettlebell',
  bands: 'Resistance Band',
  'e-z curl bar': 'EZ Bar',
  'exercise ball': 'Exercise Ball',
  'medicine ball': 'Medicine Ball',
  'foam roll': 'Foam Roller',
  other: 'Other',
};

const GITHUB_RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapMuscles(muscles: string[]): string[] {
  const mapped = muscles.map((m) => MUSCLE_MAP[m.toLowerCase()] ?? m);
  // Deduplicate while preserving order
  return [...new Set(mapped)];
}

function mapEquipment(equipment: string | null): string[] {
  if (!equipment) return ['Bodyweight'];
  return [EQUIPMENT_MAP[equipment.toLowerCase()] ?? equipment];
}

function thumbnailUrl(images: string[]): string | null {
  if (!images || images.length === 0) return null;
  return `${GITHUB_RAW}/${images[0]}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface SourceExercise {
  id: string;
  name: string;
  level: string;
  category: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

async function main() {
  console.log('Connecting to database...');
  const db = await getDb();

  // Load source data
  const dataPath = join(__dirname, 'data', 'exercises.json');
  const raw: SourceExercise[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${raw.length} exercises from source`);

  // Fetch all existing exercises by name for upsert logic
  const existing = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const nameToId = new Map<string, string>(existing.map((e) => [e.name.toLowerCase(), e.id]));
  console.log(`Found ${existing.length} existing exercises in DB`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const src of raw) {
    try {
      const muscleGroups = mapMuscles([...src.primaryMuscles, ...src.secondaryMuscles]);
      // Ensure at least one muscle group
      if (muscleGroups.length === 0) muscleGroups.push('Full Body');

      const equipmentArr = mapEquipment(src.equipment);

      // Build description from first instruction sentence (or truncated)
      const description =
        src.instructions.length > 0
          ? src.instructions[0].slice(0, 300)
          : `${src.category} exercise targeting ${muscleGroups.join(', ')}.`;

      const thumb = thumbnailUrl(src.images);
      const difficulty = LEVEL_MAP[src.level] ?? 'intermediate';

      const existingId = nameToId.get(src.name.toLowerCase());

      if (existingId) {
        // Update existing row
        await db
          .update(exercises)
          .set({
            description,
            category: src.category,
            difficulty,
            muscleGroups,
            equipment: equipmentArr,
            instructions: src.instructions,
            thumbnailUrl: thumb,
          })
          .where(eq(exercises.id, existingId));
        updated++;
      } else {
        // Insert new row
        await db.insert(exercises).values({
          name: src.name,
          description,
          category: src.category,
          difficulty,
          muscleGroups,
          equipment: equipmentArr,
          instructions: src.instructions,
          thumbnailUrl: thumb,
        });
        inserted++;
      }
    } catch (err) {
      console.error(`Error processing "${src.name}":`, (err as Error).message);
      errors++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Total in DB: ~${existing.length + inserted}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
