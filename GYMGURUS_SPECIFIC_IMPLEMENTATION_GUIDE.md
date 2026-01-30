# GymGurus-Specific Implementation Guide
## Workout Assignment & Display Refactoring

---

## 🎯 Executive Summary

**GREAT NEWS:** Your app already has ~60% of the required infrastructure!

### What Already Exists ✅
- ✅ `scheduledDate`, `dayOfWeek`, `weekNumber` fields in schema
- ✅ Server auto-calculates week fields from `scheduledDate`
- ✅ `WeeklyWorkoutView` component groups by `dayOfWeek`
- ✅ Backend endpoint accepts `scheduledDate` parameter
- ✅ Appointments table with `startTime`/`endTime` fields

### What Needs to Change 🔧
- 🔧 Add date/time picker to assignment UI
- 🔧 Connect appointments to workout assignments
- 🔧 Add per-set weights (currently per-exercise)
- 🔧 Add exercise type system
- 🔧 Prevent duplicate exercises in builder
- 🔧 Remove "Assign Workout" from Client Details page

### Estimated Effort
- **Backend changes:** 2-3 weeks
- **Frontend changes:** 3-4 weeks
- **Testing & polish:** 1-2 weeks
- **Total:** 6-9 weeks

---

## 📋 Part 1: Current Architecture Analysis

### 1.1 Current Workout Assignment Flow

#### **Location 1: WorkoutBuilder.tsx**
**File:** `client/src/pages/WorkoutBuilder.tsx` (Lines 102-121)

**Current Code:**
```typescript
const assignWorkoutMutation = useMutation({
  mutationFn: (clientId: string) => apiRequest('POST', '/api/workout-assignments', {
    workoutId,
    clientId
  }),
  onSuccess: () => {
    toast({ title: "Workout assigned successfully" });
    refetch();
  }
});
```

**Problems:**
- ❌ No date selection
- ❌ No time selection
- ❌ Assignment happens immediately
- ❌ Can't schedule for future dates

---

#### **Location 2: ClientDetailsPage.tsx**
**File:** `client/src/pages/ClientDetailsPage.tsx` (Lines 156-173)

**Current Code:**
```typescript
const assignWorkoutMutation = useMutation({
  mutationFn: async (workoutId: string) => {
    const response = await fetch('/api/workout-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId, clientId })
    });
    return response.json();
  }
});
```

**Problems:**
- ❌ Same issues as WorkoutBuilder
- ❌ This page should NOT have assignment (per requirements)
- 🔧 **ACTION:** Remove this entire section

---

### 1.2 Current Data Model

#### **Schema: workoutAssignments table**
**File:** `shared/schema.ts` (Lines 110-129)

```typescript
export const workoutAssignments = pgTable("workout_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull(),
  clientId: varchar("client_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),

  // ✅ THESE ALREADY EXIST BUT AREN'T USED!
  scheduledDate: text("scheduled_date"),      // YYYY-MM-DD
  dayOfWeek: integer("day_of_week"),          // 0-6
  weekNumber: integer("week_number"),         // ISO week
  weekYear: integer("week_year"),             // Year
});
```

**Good News:**
- ✅ Schema already supports scheduling!
- ✅ Just needs UI to populate these fields

**What's Missing:**
- ❌ No `scheduledTime` field (need to add)
- ❌ No `timezone` field (need to add)
- ❌ No `isCustomized` flag (template vs instance)
- ❌ No `templateId` reference (currently `workoutId` is the template)

---

#### **Schema: workoutExercises table**
**File:** `shared/schema.ts` (Lines 95-107)

```typescript
export const workoutExercises = pgTable("workout_exercises", {
  id: varchar("id").primaryKey(),
  workoutId: varchar("workout_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  sets: integer("sets").notNull(),           // Just a count
  reps: text("reps").notNull(),               // e.g., "10-12"
  weight: text("weight"),                     // Single weight for ALL sets
  restTime: integer("rest_time"),
  sortOrder: integer("sort_order").notNull()
});
```

**Problems:**
- ❌ `weight` is per-exercise, not per-set
- ❌ Can't do progressive overload (different weights per set)
- ❌ No exercise type system
- 🔧 **ACTION:** Replace `sets`, `reps`, `weight` with `setsConfiguration: jsonb`

---

### 1.3 Current Client Display

#### **WeeklyWorkoutView Component**
**File:** `client/src/components/WeeklyWorkoutView.tsx`

**Key Logic (Lines 72-86):**
```typescript
const workoutsByDay = useMemo(() => {
  if (!data?.workouts) return {};

  const grouped: Record<number, Workout[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  };

  data.workouts.forEach(workout => {
    if (workout.dayOfWeek !== null && workout.dayOfWeek !== undefined) {
      grouped[workout.dayOfWeek].push(workout);
    }
  });

  return grouped;
}, [data?.workouts]);
```

**Good News:**
- ✅ Already groups by `dayOfWeek`!
- ✅ Calendar grid already implemented
- ✅ Shows exercise details in expandable cards
- ✅ Shows completion status

**What's Missing:**
- ❌ No time display (only date)
- ❌ No timezone handling
- 🔧 **ACTION:** Add time display next to day name (already partially done!)

---

### 1.4 Appointments System

#### **Schema: appointments table**
**File:** `shared/schema.ts` (Lines 213-231)

```typescript
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey(),
  trainerId: varchar("trainer_id").notNull(),
  clientId: varchar("client_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),              // YYYY-MM-DD
  startTime: text("start_time").notNull(),   // HH:MM ✅
  endTime: text("end_time"),                 // HH:MM ✅
  type: text("type").notNull(),
  status: text("status").notNull(),
  notes: text("notes")
});
```

**Current State:**
- ✅ Has time fields (`startTime`, `endTime`)
- ❌ **NO relationship to workouts!**
- ❌ Appointments ≠ Workouts (separate systems)

**Decision Point:**
Should we:
1. **Option A:** Link appointments to workout assignments (recommended)
2. **Option B:** Keep them separate but show both in calendar

---

## 📋 Part 2: Step-by-Step Implementation

### Phase 1: Schema Changes (Week 1)

#### **Migration 1: Add scheduling fields to workoutAssignments**

**File to create:** `server/migrations/001_add_workout_scheduling.sql`

```sql
-- Add scheduling metadata
ALTER TABLE workout_assignments
  ADD COLUMN scheduled_time TEXT,                    -- HH:MM format
  ADD COLUMN timezone TEXT DEFAULT 'UTC',
  ADD COLUMN duration_minutes INTEGER,
  ADD COLUMN is_customized BOOLEAN DEFAULT FALSE,
  ADD COLUMN custom_title TEXT,
  ADD COLUMN custom_notes TEXT,
  ADD COLUMN status TEXT DEFAULT 'scheduled',
  ADD COLUMN cancelled_at TIMESTAMP,
  ADD COLUMN cancellation_reason TEXT;

-- Make scheduledDate required going forward (but allow NULL for existing)
-- We won't make it NOT NULL to preserve existing data

-- Add check constraint for status
ALTER TABLE workout_assignments
  ADD CONSTRAINT check_workout_assignment_status
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed'));

-- Add index for time-based queries
CREATE INDEX idx_workout_assignments_scheduled_datetime
  ON workout_assignments(scheduled_date, scheduled_time)
  WHERE scheduled_date IS NOT NULL;

-- Add index for status
CREATE INDEX idx_workout_assignments_status
  ON workout_assignments(status);
```

---

#### **Migration 2: Exercise type system**

**File to create:** `server/migrations/002_exercise_types.sql`

```sql
-- Add exercise type
ALTER TABLE exercises
  ADD COLUMN exercise_type TEXT DEFAULT 'weighted_reps',
  ADD COLUMN default_sets INTEGER,
  ADD COLUMN default_reps TEXT,
  ADD COLUMN default_duration INTEGER,
  ADD COLUMN thumbnail_url TEXT;

-- Add check constraint
ALTER TABLE exercises
  ADD CONSTRAINT check_exercise_type
  CHECK (exercise_type IN (
    'weighted_reps', 'bodyweight_reps', 'timed_hold',
    'cardio_distance', 'cardio_time', 'plyometric', 'mobility'
  ));

-- Backfill existing exercises as 'weighted_reps'
UPDATE exercises SET exercise_type = 'weighted_reps' WHERE exercise_type IS NULL;
```

---

#### **Migration 3: Per-set configuration**

**File to create:** `server/migrations/003_per_set_weights.sql`

```sql
-- Add sets_configuration JSONB column
ALTER TABLE workout_exercises
  ADD COLUMN sets_configuration JSONB;

-- Backfill existing data: convert old format to new format
-- Example: sets=3, reps="10", weight="135" becomes:
-- [
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
        WHEN reps ~ '^[0-9]+$' THEN reps::int
        ELSE NULL
      END,
      'weight', CASE
        WHEN weight IS NOT NULL AND weight ~ '^[0-9.]+' THEN weight::numeric
        ELSE NULL
      END,
      'completed', false
    )
  )
  FROM generate_series(1, sets)
)
WHERE sets_configuration IS NULL;

-- Now make it NOT NULL
ALTER TABLE workout_exercises
  ALTER COLUMN sets_configuration SET NOT NULL;

-- Drop old columns (after verification!)
-- ALTER TABLE workout_exercises DROP COLUMN sets;
-- ALTER TABLE workout_exercises DROP COLUMN reps;
-- ALTER TABLE workout_exercises DROP COLUMN weight;
```

---

#### **Migration 4: Link appointments to workouts (optional)**

**File to create:** `server/migrations/004_link_appointments_workouts.sql`

```sql
-- Add optional link from appointment to workout assignment
ALTER TABLE appointments
  ADD COLUMN workout_assignment_id VARCHAR REFERENCES workout_assignments(id);

-- Add index
CREATE INDEX idx_appointments_workout_assignment
  ON appointments(workout_assignment_id)
  WHERE workout_assignment_id IS NOT NULL;

-- Also allow reverse lookup
ALTER TABLE workout_assignments
  ADD COLUMN appointment_id VARCHAR REFERENCES appointments(id);

CREATE INDEX idx_workout_assignments_appointment
  ON workout_assignments(appointment_id)
  WHERE appointment_id IS NOT NULL;
```

---

### Phase 2: Update Schema Types (Week 1)

#### **Update shared/schema.ts**

**Add to workoutAssignments table:**
```typescript
export const workoutAssignments = pgTable("workout_assignments", {
  // ... existing fields ...

  // NEW SCHEDULING FIELDS
  scheduledTime: text("scheduled_time"),
  timezone: text("timezone").default('UTC'),
  durationMinutes: integer("duration_minutes"),
  isCustomized: boolean("is_customized").default(false),
  customTitle: text("custom_title"),
  customNotes: text("custom_notes"),
  status: text("status").default('scheduled'),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),

  // OPTIONAL: Link to appointment
  appointmentId: varchar("appointment_id").references(() => appointments.id),
}, (table) => [
  index("idx_workout_assignments_scheduled_datetime").on(table.scheduledDate, table.scheduledTime),
  index("idx_workout_assignments_status").on(table.status),
]);
```

**Add to exercises table:**
```typescript
export const exercises = pgTable("exercises", {
  // ... existing fields ...

  // NEW TYPE SYSTEM
  exerciseType: text("exercise_type").default('weighted_reps'),
  defaultSets: integer("default_sets"),
  defaultReps: text("default_reps"),
  defaultDuration: integer("default_duration"),
  thumbnailUrl: text("thumbnail_url"),
});

// Add enum
export enum ExerciseType {
  WEIGHTED_REPS = 'weighted_reps',
  BODYWEIGHT_REPS = 'bodyweight_reps',
  TIMED_HOLD = 'timed_hold',
  CARDIO_DISTANCE = 'cardio_distance',
  CARDIO_TIME = 'cardio_time',
  PLYOMETRIC = 'plyometric',
  MOBILITY = 'mobility'
}
```

**Update workoutExercises table:**
```typescript
export const workoutExercises = pgTable("workout_exercises", {
  id: varchar("id").primaryKey(),
  workoutId: varchar("workout_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),

  // REPLACE sets, reps, weight with:
  setsConfiguration: jsonb("sets_configuration").notNull().$type<SetConfiguration[]>(),

  restTime: integer("rest_time"),
  sortOrder: integer("sort_order").notNull(),

  // NEW FIELDS
  notes: text("notes"),
  tempo: text("tempo"),
  groupId: text("group_id"),  // For supersets
  groupType: text("group_type")  // 'superset', 'circuit', etc.
});

// Add type
export interface SetConfiguration {
  setNumber: number;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number;
  completed: boolean;
  completedAt?: string;
  rpe?: number;
  notes?: string;
}
```

**Update appointments table:**
```typescript
export const appointments = pgTable("appointments", {
  // ... existing fields ...

  // NEW: Link to workout
  workoutAssignmentId: varchar("workout_assignment_id").references(() => workoutAssignments.id),
});
```

---

### Phase 3: Backend API Changes (Week 2)

#### **Update POST /api/workout-assignments**

**File:** `server/routes.ts` (around line 780)

**Current code:**
```typescript
app.post("/api/workout-assignments", async (req: Request, res: Response) => {
  try {
    const validatedData = insertWorkoutAssignmentSchema.parse(req.body);

    // Auto-calculate week fields if scheduledDate is provided
    const assignmentData = { ...validatedData };
    if (validatedData.scheduledDate) {
      const scheduledDate = new Date(validatedData.scheduledDate);
      assignmentData.dayOfWeek = scheduledDate.getDay();
      assignmentData.weekNumber = getISOWeek(scheduledDate);
      assignmentData.weekYear = getISOWeekYear(scheduledDate);
    }

    const assignment = await storage.assignWorkoutToClient(assignmentData);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: "Failed to assign workout" });
  }
});
```

**NEW code (enhanced):**
```typescript
app.post("/api/workout-assignments", async (req: Request, res: Response) => {
  try {
    const validatedData = insertWorkoutAssignmentSchema.parse(req.body);

    // REQUIRE scheduledDate and scheduledTime going forward
    if (!validatedData.scheduledDate) {
      return res.status(400).json({
        error: "scheduledDate is required",
        details: "Workouts must be scheduled for a specific date"
      });
    }

    if (!validatedData.scheduledTime) {
      return res.status(400).json({
        error: "scheduledTime is required",
        details: "Workouts must be scheduled for a specific time"
      });
    }

    // Auto-calculate week fields
    const assignmentData = { ...validatedData };
    const scheduledDate = new Date(validatedData.scheduledDate);
    assignmentData.dayOfWeek = scheduledDate.getDay();
    assignmentData.weekNumber = getISOWeek(scheduledDate);
    assignmentData.weekYear = getISOWeekYear(scheduledDate);
    assignmentData.status = 'scheduled';

    // Set timezone (default to trainer's timezone or UTC)
    assignmentData.timezone = validatedData.timezone || 'UTC';

    // Get workout duration for scheduling
    if (validatedData.workoutId) {
      const workout = await storage.getWorkout(validatedData.workoutId);
      assignmentData.durationMinutes = workout?.duration || 60;
    }

    // Check for schedule conflicts (optional but recommended)
    const conflicts = await checkScheduleConflicts({
      trainerId: req.user?.id,
      clientId: validatedData.clientId,
      date: validatedData.scheduledDate,
      time: validatedData.scheduledTime,
      duration: assignmentData.durationMinutes
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Schedule conflict detected",
        conflicts: conflicts
      });
    }

    const assignment = await storage.assignWorkoutToClient(assignmentData);

    // TODO: Schedule notifications
    // await scheduleWorkoutNotifications(assignment);

    res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to assign workout" });
  }
});
```

**Add helper function:**
```typescript
async function checkScheduleConflicts(params: {
  trainerId: string;
  clientId: string;
  date: string;
  time: string;
  duration: number;
}): Promise<any[]> {
  const db = await getDb();

  // Calculate end time
  const [hours, minutes] = params.time.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + params.duration;

  // Check for overlapping assignments
  const conflicts = await db.select()
    .from(workoutAssignments)
    .where(
      and(
        eq(workoutAssignments.scheduledDate, params.date),
        eq(workoutAssignments.status, 'scheduled'),
        or(
          eq(workoutAssignments.clientId, params.clientId),
          eq(workoutAssignments.trainerId, params.trainerId)
        )
      )
    );

  // Filter by time overlap
  return conflicts.filter(conflict => {
    if (!conflict.scheduledTime) return false;

    const [cHours, cMinutes] = conflict.scheduledTime.split(':').map(Number);
    const cStartMinutes = cHours * 60 + cMinutes;
    const cEndMinutes = cStartMinutes + (conflict.durationMinutes || 60);

    // Check if times overlap
    return (
      (startMinutes >= cStartMinutes && startMinutes < cEndMinutes) ||
      (endMinutes > cStartMinutes && endMinutes <= cEndMinutes) ||
      (startMinutes <= cStartMinutes && endMinutes >= cEndMinutes)
    );
  });
}
```

---

#### **Create new endpoint: POST /api/schedule/assign-workout**

This is the NEW primary way to assign workouts (from Schedule page).

**File:** `server/routes.ts` (add new route)

```typescript
// POST /api/schedule/assign-workout - Assign workout from schedule page
app.post("/api/schedule/assign-workout", secureAuth, async (req: Request, res: Response) => {
  try {
    const { workoutId, clientId, scheduledDate, scheduledTime, timezone, customizations } = req.body;

    // Validate required fields
    if (!workoutId || !clientId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ['workoutId', 'clientId', 'scheduledDate', 'scheduledTime']
      });
    }

    const trainerId = req.user?.id;

    // Load workout template
    const workout = await storage.getWorkout(workoutId);
    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    // Check schedule conflicts
    const conflicts = await checkScheduleConflicts({
      trainerId,
      clientId,
      date: scheduledDate,
      time: scheduledTime,
      duration: workout.duration
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Schedule conflict",
        conflicts: conflicts.map(c => ({
          id: c.id,
          clientId: c.clientId,
          time: c.scheduledTime,
          title: c.customTitle || 'Scheduled workout'
        }))
      });
    }

    // Create scheduled workout
    const scheduledDate = new Date(req.body.scheduledDate);

    const assignment = await storage.assignWorkoutToClient({
      workoutId,
      clientId,
      scheduledDate: req.body.scheduledDate,
      scheduledTime,
      timezone: timezone || 'UTC',
      dayOfWeek: scheduledDate.getDay(),
      weekNumber: getISOWeek(scheduledDate),
      weekYear: getISOWeekYear(scheduledDate),
      durationMinutes: workout.duration,
      status: 'scheduled',
      isCustomized: !!customizations,
      customTitle: customizations?.title,
      customNotes: customizations?.notes
    });

    // If customizations.exercises provided, create customized exercises
    if (customizations?.exercises) {
      // Copy exercises from template with customizations
      // Implementation depends on how you want to handle this
    }

    // Schedule notifications
    // await scheduleWorkoutNotifications(assignment);

    // Update onboarding
    await storage.updateUserOnboardingProgress(trainerId, {
      assignedFirstWorkout: true
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning workout from schedule:", error);
    res.status(500).json({ error: "Failed to assign workout" });
  }
});
```

---

### Phase 4: Frontend Changes (Week 3-5)

#### **Step 1: Remove Assignment from ClientDetailsPage**

**File:** `client/src/pages/ClientDetailsPage.tsx`

**Find and remove** (around lines 156-173):
```typescript
// DELETE THIS ENTIRE SECTION
const assignWorkoutMutation = useMutation({
  mutationFn: async (workoutId: string) => {
    // ...
  }
});

// And the UI button that uses it
```

**Add message instead:**
```tsx
{/* Where the assign button was */}
<Card className="p-6">
  <div className="text-center text-muted-foreground">
    <Calendar className="mx-auto h-12 w-12 mb-4" />
    <p className="text-sm">
      To assign workouts with specific dates and times,
      <Link to="/schedule" className="text-primary hover:underline ml-1">
        go to the Schedule page
      </Link>
    </p>
  </div>
</Card>
```

---

#### **Step 2: Create ScheduleWorkoutModal Component**

**File to create:** `client/src/components/ScheduleWorkoutModal.tsx`

```tsx
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ScheduleWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedDate?: Date;
  preselectedTime?: string;
  preselectedClient?: string;
}

export function ScheduleWorkoutModal({
  open,
  onOpenChange,
  preselectedDate,
  preselectedTime,
  preselectedClient
}: ScheduleWorkoutModalProps) {
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(preselectedDate);
  const [selectedTime, setSelectedTime] = useState(preselectedTime || '09:00');
  const [selectedClient, setSelectedClient] = useState(preselectedClient || '');
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return response.json();
    }
  });

  // Fetch workouts
  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workouts');
      return response.json();
    }
  });

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/schedule/assign-workout', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Workout scheduled successfully' });
      onOpenChange(false);
      // Refetch calendar data
    },
    onError: (error: any) => {
      if (error.conflicts) {
        toast({
          title: 'Schedule conflict',
          description: 'This time slot conflicts with an existing appointment',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Failed to schedule workout', variant: 'destructive' });
      }
    }
  });

  const handleSchedule = () => {
    if (!selectedDate || !selectedClient || !selectedWorkout) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    scheduleMutation.mutate({
      workoutId: selectedWorkout,
      clientId: selectedClient,
      scheduledDate: selectedDate.toISOString().split('T')[0],
      scheduledTime: selectedTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      customizations: customNotes ? { notes: customNotes } : undefined
    });
  };

  // Generate time slots (9am - 9pm in 30-min increments)
  const timeSlots = [];
  for (let hour = 9; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Workout</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Date Picker */}
          <div>
            <Label>Date *</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
          </div>

          {/* Time Picker */}
          <div>
            <Label htmlFor="time">Time *</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger id="time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Picker */}
          <div>
            <Label htmlFor="client">Client *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workout Picker */}
          <div>
            <Label htmlFor="workout">Workout Template *</Label>
            <Select value={selectedWorkout} onValueChange={setSelectedWorkout}>
              <SelectTrigger id="workout">
                <SelectValue placeholder="Select workout..." />
              </SelectTrigger>
              <SelectContent>
                {workouts?.map((workout: any) => (
                  <SelectItem key={workout.id} value={workout.id}>
                    {workout.title} ({workout.difficulty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any special instructions..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={scheduleMutation.isPending || !selectedDate || !selectedClient || !selectedWorkout}
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Workout'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### **Step 3: Add Schedule Workout to SchedulePage**

**File:** `client/src/pages/SchedulePage.tsx`

**Add button to schedule workout:**
```tsx
import { ScheduleWorkoutModal } from '@/components/ScheduleWorkoutModal';

export default function SchedulePage() {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{date: Date, time: string} | null>(null);

  // Existing code...

  return (
    <div className="space-y-6">
      {/* Header with Schedule Workout button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <Button onClick={() => setShowScheduleModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Workout
        </Button>
      </div>

      {/* Existing calendar UI... */}

      {/* Add modal */}
      <ScheduleWorkoutModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        preselectedDate={selectedSlot?.date}
        preselectedTime={selectedSlot?.time}
      />
    </div>
  );
}
```

---

#### **Step 4: Prevent Duplicate Exercises in WorkoutBuilder**

**File:** `client/src/pages/WorkoutBuilder.tsx`

**Find the `handleAddExercise` function (around line 123):**

```typescript
// BEFORE (allows duplicates):
const handleAddExercise = () => {
  addExerciseMutation.mutate({
    exerciseId: selectedExercise,
    sets: exerciseData.sets,
    reps: exerciseData.reps,
    weight: exerciseData.weight,
    restTime: exerciseData.restTime,
    sortOrder: (workout?.exercises?.length || 0) + 1
  });
};

// AFTER (prevents duplicates):
const handleAddExercise = () => {
  // Check if exercise already exists
  const isDuplicate = workout?.exercises?.some(
    (ex) => ex.exerciseId === selectedExercise
  );

  if (isDuplicate) {
    toast({
      title: "Exercise already added",
      description: "This exercise is already in the workout",
      variant: "destructive"
    });
    return;
  }

  addExerciseMutation.mutate({
    exerciseId: selectedExercise,
    sets: exerciseData.sets,
    reps: exerciseData.reps,
    weight: exerciseData.weight,
    restTime: exerciseData.restTime,
    sortOrder: (workout?.exercises?.length || 0) + 1
  });
};
```

---

### Phase 5: Per-Set Weights UI (Week 4-5)

#### **Update WorkoutBuilder to use per-set weights**

**File:** `client/src/pages/WorkoutBuilder.tsx`

**Replace the simple sets/reps/weight inputs with:**

```tsx
{/* Per-Set Configuration */}
<div className="space-y-4">
  <Label>Sets Configuration</Label>

  {[...Array(exerciseData.sets)].map((_, setIndex) => (
    <Card key={setIndex} className="p-4">
      <div className="flex items-center gap-4">
        <div className="font-semibold text-sm">Set {setIndex + 1}</div>

        <div className="flex-1 grid grid-cols-3 gap-4">
          {/* Reps */}
          <div>
            <Label htmlFor={`reps-${setIndex}`} className="text-xs">Reps</Label>
            <Input
              id={`reps-${setIndex}`}
              type="number"
              value={exerciseData.setsConfig?.[setIndex]?.reps || 10}
              onChange={(e) => {
                const newConfig = [...(exerciseData.setsConfig || [])];
                newConfig[setIndex] = {
                  ...newConfig[setIndex],
                  setNumber: setIndex + 1,
                  reps: parseInt(e.target.value)
                };
                setExerciseData({ ...exerciseData, setsConfig: newConfig });
              }}
            />
          </div>

          {/* Weight */}
          <div>
            <Label htmlFor={`weight-${setIndex}`} className="text-xs">Weight (kg)</Label>
            <Input
              id={`weight-${setIndex}`}
              type="number"
              value={exerciseData.setsConfig?.[setIndex]?.weight || 0}
              onChange={(e) => {
                const newConfig = [...(exerciseData.setsConfig || [])];
                newConfig[setIndex] = {
                  ...newConfig[setIndex],
                  setNumber: setIndex + 1,
                  weight: parseFloat(e.target.value)
                };
                setExerciseData({ ...exerciseData, setsConfig: newConfig });
              }}
            />
          </div>

          {/* RPE (optional) */}
          <div>
            <Label htmlFor={`rpe-${setIndex}`} className="text-xs">Target RPE</Label>
            <Input
              id={`rpe-${setIndex}`}
              type="number"
              min="1"
              max="10"
              value={exerciseData.setsConfig?.[setIndex]?.rpe || ''}
              placeholder="Optional"
              onChange={(e) => {
                const newConfig = [...(exerciseData.setsConfig || [])];
                newConfig[setIndex] = {
                  ...newConfig[setIndex],
                  setNumber: setIndex + 1,
                  rpe: parseInt(e.target.value)
                };
                setExerciseData({ ...exerciseData, setsConfig: newConfig });
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  ))}

  {/* Quick fill buttons */}
  <div className="flex gap-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        // Copy set 1 to all sets
        const firstSet = exerciseData.setsConfig?.[0];
        if (!firstSet) return;

        const newConfig = [...Array(exerciseData.sets)].map((_, i) => ({
          ...firstSet,
          setNumber: i + 1
        }));
        setExerciseData({ ...exerciseData, setsConfig: newConfig });
      }}
    >
      Copy Set 1 to All
    </Button>

    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        // Progressive overload: decrease reps, increase weight each set
        const baseReps = exerciseData.setsConfig?.[0]?.reps || 10;
        const baseWeight = exerciseData.setsConfig?.[0]?.weight || 60;

        const newConfig = [...Array(exerciseData.sets)].map((_, i) => ({
          setNumber: i + 1,
          reps: Math.max(6, baseReps - (i * 2)), // Decrease 2 reps per set
          weight: baseWeight + (i * 10), // Increase 10kg per set
          completed: false
        }));
        setExerciseData({ ...exerciseData, setsConfig: newConfig });
      }}
    >
      Progressive Overload
    </Button>
  </div>
</div>
```

---

## 📋 Part 3: Testing Checklist

### Unit Tests
- [ ] Schema migrations run without errors
- [ ] New fields have correct types and constraints
- [ ] Backfill scripts preserve existing data
- [ ] API endpoints validate required fields
- [ ] Conflict detection works correctly
- [ ] Duplicate exercise prevention works

### Integration Tests
- [ ] Can assign workout with date and time from Schedule page
- [ ] Cannot assign workout without date/time
- [ ] Client Details page doesn't show assign button
- [ ] Calendar view displays workouts at correct times
- [ ] Per-set weights save and load correctly
- [ ] Exercise type system shows appropriate fields

### E2E Tests
- [ ] Full workflow: Create template → Schedule for client → Client views → Client completes
- [ ] Reschedule workflow works
- [ ] Cancel workflow works
- [ ] Notification system triggers correctly
- [ ] Offline mode syncs when reconnected

---

## 📋 Part 4: Deployment Strategy

### Week 1-2: Backend (Database + API)
1. Run migrations on staging
2. Test with real data snapshot
3. Deploy to production (backward compatible)
4. Monitor for errors

### Week 3-4: Frontend (UI Changes)
1. Deploy Schedule page changes
2. Deploy Client Details changes (remove assign button)
3. Deploy WorkoutBuilder improvements
4. Feature flag for rollout

### Week 5: Client App Updates
1. Deploy calendar view improvements
2. Deploy per-set weight tracking
3. Deploy simplified Schedule page

### Week 6: Full Release
1. Enable for all users
2. Send announcement
3. Monitor metrics
4. Collect feedback

---

## 🎯 Success Metrics

Track these KPIs post-deployment:

1. **Assignment Accuracy**
   - Target: 100% of new assignments have date + time
   - Query: `SELECT COUNT(*) FROM workout_assignments WHERE created_at > '2025-01-01' AND scheduled_time IS NULL`

2. **Duplicate Exercises**
   - Target: 0 duplicates in new workouts
   - Query: Check workout_exercises for same exercise_id in same workout_id

3. **Client Engagement**
   - Baseline: Current workout completion rate
   - Target: 20% increase
   - Query: `SELECT COUNT(DISTINCT id) WHERE completed_at IS NOT NULL / COUNT(*)`

4. **User Satisfaction**
   - Survey after 2 weeks
   - Target: 4.5/5 rating

---

## 🚨 Rollback Plan

If critical issues arise:

### Database Rollback
- Migrations are additive (don't drop columns immediately)
- Can revert to old code without data loss
- Old assignments still work (scheduledDate nullable)

### Feature Flags
```typescript
const ENABLE_SCHEDULED_ASSIGNMENTS = process.env.FEATURE_SCHEDULED_ASSIGNMENTS === 'true';

if (ENABLE_SCHEDULED_ASSIGNMENTS) {
  // New code path
} else {
  // Old code path
}
```

---

## 📚 Additional Resources

### Files to Review
1. `shared/schema.ts` - Complete data model
2. `server/routes.ts` - All API endpoints
3. `client/src/components/WeeklyWorkoutView.tsx` - Calendar implementation
4. `client/src/pages/WorkoutExecution.tsx` - Workout logging
5. `client/src/pages/WorkoutBuilder.tsx` - Template creation

### Key Dependencies
- `date-fns` - Already installed ✅
- `date-fns-tz` - Need to add for timezone support
- `@tanstack/react-query` - Already installed ✅
- UI components - Already have shadcn/ui ✅

---

## ✅ Next Steps

1. **Review this document** with your team
2. **Prioritize phases** - Can start with just Phase 1-2 for quick wins
3. **Set up staging environment** for testing migrations
4. **Create feature branch** for development
5. **Begin implementation** starting with Phase 1

**Questions or clarifications needed?** Let me know and I can provide more specific code examples or guidance for any section!
