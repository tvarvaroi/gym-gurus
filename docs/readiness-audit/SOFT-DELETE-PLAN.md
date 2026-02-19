# Soft Delete Implementation Plan

**Date:** 2026-02-18
**Priority:** CRITICAL (BLOCKER #2)
**Estimated Time:** 2 hours

---

## Problem Statement

**Current Risk:** 49 foreign keys with `onDelete: 'cascade'` in the schema

**Danger Scenario:**

```sql
-- Trainer accidentally deletes their account
DELETE FROM users WHERE id = 'trainer-123';

-- CASCADE effect:
-- ❌ ALL their clients deleted
-- ❌ ALL their workouts deleted
-- ❌ ALL workout assignments deleted
-- ❌ ALL progress entries deleted
-- ❌ ALL training sessions deleted
-- ❌ ALL appointments deleted
-- ❌ Historical data GONE FOREVER
```

**No undo. No recovery. Just gone.**

---

## Solution: Soft Delete Pattern

### Phase 1: Critical Business Tables (Priority 1)

Add `deleted_at` to tables with business-critical data:

| Table                 | Risk Level  | Impact if Hard Deleted        |
| --------------------- | ----------- | ----------------------------- |
| `users`               | 🔴 CRITICAL | Trainer loses entire business |
| `clients`             | 🔴 CRITICAL | Client relationship data gone |
| `workouts`            | 🔴 CRITICAL | Training program library lost |
| `workout_assignments` | 🟠 HIGH     | Historical training data lost |
| `progress_entries`    | 🟠 HIGH     | Client progress tracking lost |
| `training_sessions`   | 🟠 HIGH     | Session history lost          |
| `appointments`        | 🟡 MEDIUM   | Scheduling history lost       |
| `exercises`           | 🟢 LOW      | Can be recreated              |

### Phase 2: Supporting Tables (Priority 2)

- AI chat conversations
- Meal plans
- Shopping lists
- Achievements
- etc.

---

## Implementation Steps

### Step 1: Create Migration to Add deleted_at Column

```sql
-- Migration: add_soft_delete_columns.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE workout_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add indexes for performance (filtering by deleted_at will be common)
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_deleted_at ON workouts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_assignments_deleted_at ON workout_assignments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_progress_entries_deleted_at ON progress_entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_sessions_deleted_at ON training_sessions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_deleted_at ON exercises(deleted_at) WHERE deleted_at IS NULL;
```

### Step 2: Update Schema (shared/schema.ts)

Add `deleted_at` column to each table:

```typescript
export const users = pgTable('users', {
  // ... existing columns
  deletedAt: timestamp('deleted_at'), // NEW
});

export const clients = pgTable('clients', {
  // ... existing columns
  deletedAt: timestamp('deleted_at'), // NEW
});

// ... repeat for all 8 tables
```

### Step 3: Update Storage Methods

**Pattern for SELECT queries:**

```typescript
// BEFORE:
async getClientsByTrainer(trainerId: string) {
  return await db.select().from(clients)
    .where(eq(clients.trainerId, trainerId));
}

// AFTER:
async getClientsByTrainer(trainerId: string) {
  return await db.select().from(clients)
    .where(
      and(
        eq(clients.trainerId, trainerId),
        isNull(clients.deletedAt) // Only non-deleted
      )
    );
}
```

**Pattern for DELETE operations:**

```typescript
// BEFORE (hard delete):
async deleteClient(id: string, trainerId?: string): Promise<boolean> {
  const result = await db.delete(clients).where(...);
  return result.rowCount > 0;
}

// AFTER (soft delete):
async deleteClient(id: string, trainerId?: string): Promise<boolean> {
  const result = await db.update(clients)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(clients.id, id),
        trainerId ? eq(clients.trainerId, trainerId) : undefined,
        isNull(clients.deletedAt) // Can't delete already deleted
      )
    );
  return result.rowCount > 0;
}
```

### Step 4: Create Helper Functions

```typescript
// server/utils/softDelete.ts
export async function softDelete(
  db: Database,
  table: any,
  id: string,
  ownershipCheck?: { column: any; value: string }
) {
  const conditions = [eq(table.id, id), isNull(table.deletedAt)];

  if (ownershipCheck) {
    conditions.push(eq(ownershipCheck.column, ownershipCheck.value));
  }

  const result = await db
    .update(table)
    .set({ deletedAt: new Date() })
    .where(and(...conditions));

  return result.rowCount > 0;
}

export async function restore(db: Database, table: any, id: string) {
  const result = await db.update(table).set({ deletedAt: null }).where(eq(table.id, id));

  return result.rowCount > 0;
}

export async function hardDelete(db: Database, table: any, id: string) {
  // Admin-only operation - permanently deletes
  const result = await db.delete(table).where(eq(table.id, id));

  return result.rowCount > 0;
}
```

### Step 5: Update All Storage Methods (8 tables × ~4 methods = 32 updates)

**Users:**

- `getUser` - add `isNull(users.deletedAt)`
- `deleteUser` - change to soft delete (NEW method to create)

**Clients:**

- ✅ `getClient` - add deleted_at check
- ✅ `getClientsByTrainer` - add deleted_at check
- ✅ `updateClient` - prevent updating deleted
- ✅ `deleteClient` - change to soft delete

**Workouts:**

- ✅ `getWorkout` - add deleted_at check
- ✅ `getWorkoutsByTrainer` - add deleted_at check
- ✅ `updateWorkout` - prevent updating deleted
- ✅ `deleteWorkout` - change to soft delete

**Workout Assignments:**

- `getClientWorkouts` - add deleted_at check
- `getClientWorkoutsByWeek` - add deleted_at check
- `completeWorkoutAssignment` - prevent completing deleted

**Progress Entries:**

- `getClientProgress` - add deleted_at check
- `addProgressEntry` - prevent adding to deleted client

**Training Sessions:**

- `getTrainerSessions` - add deleted_at check
- `getClientSessions` - add deleted_at check
- `updateTrainingSession` - prevent updating deleted

**Appointments:**

- `getAppointmentsByTrainer` - add deleted_at check
- `getAppointmentsByClient` - add deleted_at check
- `updateAppointment` - prevent updating deleted
- `deleteAppointment` - change to soft delete

**Exercises:**

- `getExercise` - add deleted_at check (optional - exercises are shared)
- `getAllExercises` - add deleted_at check

---

## Testing Checklist

- [ ] Soft delete a client → client marked deleted, not removed
- [ ] Soft deleted client doesn't appear in getClientsByTrainer
- [ ] Soft deleted client's workouts/progress remain accessible (for restore)
- [ ] Cannot update a soft-deleted client
- [ ] Cannot assign workouts to soft-deleted client
- [ ] Restore operation brings client back
- [ ] Hard delete (admin) permanently removes
- [ ] Foreign key constraints still work (don't break cascade on child tables)

---

## Rollback Plan

If soft delete causes issues:

1. The `deleted_at` column is nullable - existing code continues to work
2. Migration can be reversed: `ALTER TABLE x DROP COLUMN deleted_at`
3. Storage method changes are backward compatible (just add `isNull` checks)

---

## Benefits

✅ **Data Recovery:** Accidentally deleted clients can be restored
✅ **Audit Trail:** Know when records were deleted
✅ **Compliance:** GDPR "right to erasure" can use soft delete + hard delete after 30 days
✅ **Business Intelligence:** Analyze churn (when/why clients were deleted)
✅ **Undo:** Trainer can restore deleted workout library

---

## Performance Considerations

**Concern:** Adding `AND deleted_at IS NULL` to every query might slow things down.

**Mitigation:**

1. Partial indexes: `CREATE INDEX ... WHERE deleted_at IS NULL` (Postgres supports this)
2. Most tables are small (<10k records per trainer)
3. Deleted records are typically <5% of total
4. Index on deleted_at makes filtering fast

**Benchmark:** After implementation, run query performance tests.

---

## Future Enhancements

1. **Auto-Purge:** Cron job to hard delete records soft-deleted >90 days ago
2. **Admin UI:** Panel to view and restore deleted records
3. **Bulk Restore:** Restore trainer + all their cascade-deleted data
4. **Paranoid Mode:** Flag in .env to enable/disable soft delete globally

---

## Success Criteria

✅ All 8 critical tables have `deleted_at` column
✅ All storage methods filter by `isNull(deleted_at)`
✅ Delete operations use soft delete, not hard delete
✅ Manual testing confirms data recovery works
✅ No performance degradation
✅ CASCADE deletes changed to NO ACTION or RESTRICT in schema

**Estimated Time:** 2 hours
**Priority:** CRITICAL - Must fix before launch
