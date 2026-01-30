-- Migration 003: Per-Set Weights Configuration
-- Description: Replace single weight/reps with per-set configuration
-- Date: 2025-12-09
-- WARNING: This migration modifies the workout_exercises table structure
-- BACKUP YOUR DATA BEFORE RUNNING!

-- Step 1: Add new sets_configuration column (JSONB)
ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS sets_configuration JSONB;

-- Step 2: Backfill existing data from old format to new format
-- Convert: sets=3, reps="10", weight="135"
-- Into: [
--   {"setNumber": 1, "reps": 10, "weight": 135, "completed": false},
--   {"setNumber": 2, "reps": 10, "weight": 135, "completed": false},
--   {"setNumber": 3, "reps": 10, "weight": 135, "completed": false}
-- ]

UPDATE workout_exercises
SET sets_configuration = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'setNumber', generate_series,
      'reps', CASE
        -- If reps is a number, convert to integer
        WHEN reps ~ '^[0-9]+$' THEN reps::int
        -- If reps is a range (e.g., "10-12"), keep as string
        WHEN reps ~ '^[0-9]+-[0-9]+$' THEN NULL
        -- Otherwise (e.g., "AMRAP", "45 sec"), keep NULL
        ELSE NULL
      END,
      'weight', CASE
        -- Try to extract numeric weight value
        WHEN weight IS NOT NULL AND weight ~ '^[0-9]+\.?[0-9]*' THEN
          (regexp_match(weight, '^([0-9]+\.?[0-9]*)'))[1]::numeric
        ELSE NULL
      END,
      'completed', false,
      'notes', NULL
    )
  )
  FROM generate_series(1, COALESCE(sets, 3))  -- Default to 3 sets if NULL
)
WHERE sets_configuration IS NULL;

-- Step 3: Handle edge cases (NULL or 0 sets)
UPDATE workout_exercises
SET sets_configuration = '[{"setNumber": 1, "reps": 10, "weight": null, "completed": false}]'::jsonb
WHERE sets_configuration IS NULL OR sets_configuration = '[]'::jsonb;

-- Step 4: Make sets_configuration NOT NULL after backfill
ALTER TABLE workout_exercises
  ALTER COLUMN sets_configuration SET NOT NULL;

-- Step 5: Add validation constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_sets_configuration_format'
  ) THEN
    ALTER TABLE workout_exercises
      ADD CONSTRAINT check_sets_configuration_format
      CHECK (jsonb_typeof(sets_configuration) = 'array');
  END IF;
END $$;

-- Step 6: Add new fields for advanced features
ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tempo TEXT,              -- e.g., "3-1-1-0" (eccentric-pause-concentric-pause)
  ADD COLUMN IF NOT EXISTS group_id TEXT,           -- For supersets/circuits
  ADD COLUMN IF NOT EXISTS group_type TEXT;         -- 'superset', 'circuit', 'giant_set'

-- Step 7: Add check constraint for group_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_workout_exercises_group_type'
  ) THEN
    ALTER TABLE workout_exercises
      ADD CONSTRAINT check_workout_exercises_group_type
      CHECK (group_type IS NULL OR group_type IN ('superset', 'circuit', 'giant_set'));
  END IF;
END $$;

-- Step 8: Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_exercises_group
  ON workout_exercises(group_id)
  WHERE group_id IS NOT NULL;

-- Step 9: Add comments
COMMENT ON COLUMN workout_exercises.sets_configuration IS 'JSON array of set configurations with setNumber, reps, weight, completed, etc.';
COMMENT ON COLUMN workout_exercises.tempo IS 'Tempo prescription in format: eccentric-pause-concentric-pause (e.g., "3-1-1-0")';
COMMENT ON COLUMN workout_exercises.group_id IS 'ID to group exercises together (for supersets/circuits)';
COMMENT ON COLUMN workout_exercises.group_type IS 'Type of grouping: superset, circuit, or giant_set';

-- Step 10: OLD COLUMNS - DO NOT DROP YET! Keep for rollback safety
-- After confirming migration success in production, you can drop these:
-- ALTER TABLE workout_exercises DROP COLUMN sets;
-- ALTER TABLE workout_exercises DROP COLUMN reps;
-- ALTER TABLE workout_exercises DROP COLUMN weight;
--
-- For now, just add a comment warning they're deprecated
COMMENT ON COLUMN workout_exercises.sets IS 'DEPRECATED: Use sets_configuration instead';
COMMENT ON COLUMN workout_exercises.reps IS 'DEPRECATED: Use sets_configuration instead';
COMMENT ON COLUMN workout_exercises.weight IS 'DEPRECATED: Use sets_configuration instead';

-- Example of new format:
-- sets_configuration = [
--   {
--     "setNumber": 1,
--     "reps": 10,
--     "weight": 60,
--     "completed": false,
--     "actualReps": null,
--     "actualWeight": null,
--     "rpe": null,
--     "notes": null
--   },
--   {
--     "setNumber": 2,
--     "reps": 8,
--     "weight": 70,
--     "completed": false
--   },
--   {
--     "setNumber": 3,
--     "reps": 6,
--     "weight": 80,
--     "completed": false
--   }
-- ]
