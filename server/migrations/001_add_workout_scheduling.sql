-- Migration 001: Add Workout Scheduling Fields
-- Description: Add time, timezone, and status fields to workout_assignments
-- Date: 2025-12-09

-- Add scheduling metadata to workout_assignments
ALTER TABLE workout_assignments
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT,                    -- HH:MM format
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_title TEXT,
  ADD COLUMN IF NOT EXISTS custom_notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS notifications_sent JSONB DEFAULT '[]'::jsonb;

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_workout_assignment_status'
  ) THEN
    ALTER TABLE workout_assignments
      ADD CONSTRAINT check_workout_assignment_status
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed'));
  END IF;
END $$;

-- Add indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_workout_assignments_scheduled_datetime
  ON workout_assignments(scheduled_date, scheduled_time)
  WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_assignments_status
  ON workout_assignments(status);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_status
  ON workout_assignments(client_id, status);

-- Add comment
COMMENT ON COLUMN workout_assignments.scheduled_time IS 'Scheduled time in HH:MM format (24-hour)';
COMMENT ON COLUMN workout_assignments.timezone IS 'IANA timezone identifier (e.g., America/New_York)';
COMMENT ON COLUMN workout_assignments.status IS 'Workout status: scheduled, in_progress, completed, cancelled, missed';
COMMENT ON COLUMN workout_assignments.is_customized IS 'True if this instance has been customized from the template';
COMMENT ON COLUMN workout_assignments.notifications_sent IS 'Array of notification logs (type, sentAt, channel, status)';
