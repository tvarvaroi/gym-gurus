-- Migration 002: Exercise Type System
-- Description: Add exercise types and type-specific default fields
-- Date: 2025-12-09

-- Add exercise type and defaults
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'weighted_reps',
  ADD COLUMN IF NOT EXISTS default_sets INTEGER,
  ADD COLUMN IF NOT EXISTS default_reps TEXT,
  ADD COLUMN IF NOT EXISTS default_duration INTEGER,  -- in seconds
  ADD COLUMN IF NOT EXISTS default_rest_time INTEGER, -- in seconds
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS video_urls TEXT[],
  ADD COLUMN IF NOT EXISTS alternative_exercises TEXT[]; -- Array of exercise IDs

-- Add check constraint for exercise_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_exercise_type'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT check_exercise_type
      CHECK (exercise_type IN (
        'weighted_reps',      -- Standard weighted exercises (bench press, squats)
        'bodyweight_reps',    -- Bodyweight exercises (push-ups, pull-ups)
        'timed_hold',         -- Isometric holds (plank, wall sit)
        'cardio_distance',    -- Distance-based cardio (running, rowing)
        'cardio_time',        -- Time-based cardio (jump rope)
        'plyometric',         -- Explosive movements (box jumps, burpees)
        'mobility'            -- Stretching and mobility (hip flexor stretch)
      ));
  END IF;
END $$;

-- Backfill existing exercises as 'weighted_reps'
UPDATE exercises
SET exercise_type = 'weighted_reps'
WHERE exercise_type IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_exercises_type
  ON exercises(exercise_type);

-- Add comments
COMMENT ON COLUMN exercises.exercise_type IS 'Type of exercise determines which fields are required (reps, weight, duration, etc.)';
COMMENT ON COLUMN exercises.default_sets IS 'Default number of sets for this exercise';
COMMENT ON COLUMN exercises.default_reps IS 'Default reps (can be range like "10-12" or "AMRAP")';
COMMENT ON COLUMN exercises.default_duration IS 'Default duration in seconds (for timed exercises)';
COMMENT ON COLUMN exercises.thumbnail_url IS 'URL to exercise thumbnail image';
COMMENT ON COLUMN exercises.video_urls IS 'Array of video demonstration URLs';
COMMENT ON COLUMN exercises.alternative_exercises IS 'Array of exercise IDs that can be substituted';
