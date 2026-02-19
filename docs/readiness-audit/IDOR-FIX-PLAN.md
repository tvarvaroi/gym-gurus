# IDOR Vulnerability Fix Plan

**Date:** 2026-02-18
**Priority:** CRITICAL (BLOCKER-1)
**Estimated Time:** 3 hours

---

## Vulnerability Summary

18 storage methods in `server/storage.ts` lack tenant isolation, allowing users to access/modify other trainers' data by manipulating IDs.

### Attack Vector Example:

```typescript
// Current vulnerable code:
async getClient(id: string): Promise<Client | undefined> {
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  return client;
}

// Attack: Trainer A can access Trainer B's client by knowing the ID
GET /api/clients/detail/client-belongs-to-trainer-b
// Returns client data even though it belongs to another trainer!
```

---

## Fix Strategy: Defense in Depth

### Layer 1: Storage Level (CRITICAL)

Add `trainerId` parameter to all storage methods and enforce it in SQL WHERE clauses.

### Layer 2: Route Level (Already exists via middleware)

The `requireClientOwnership` middleware already performs checks, but it's not sufficient alone.

### Layer 3: Database Level (Future enhancement)

Add Row-Level Security (RLS) policies in PostgreSQL.

---

## Methods to Fix (18 total)

### Clients (3 methods)

| Method                      | Line    | Fix                                     |
| --------------------------- | ------- | --------------------------------------- |
| `getClient(id)`             | 177-181 | Add `trainerId` param, add `AND` clause |
| `updateClient(id, updates)` | 194-198 | Add `trainerId` param, add `AND` clause |
| `deleteClient(id)`          | 200-204 | Add `trainerId` param, add `AND` clause |

**Fixed signature:**

```typescript
getClient(id: string, trainerId: string): Promise<Client | undefined>
updateClient(id: string, updates: Partial<InsertClient>, trainerId: string): Promise<Client | undefined>
deleteClient(id: string, trainerId: string): Promise<boolean>
```

---

### Workouts (6 methods)

| Method                                                      | Line    | Fix                               |
| ----------------------------------------------------------- | ------- | --------------------------------- |
| `getWorkout(id)`                                            | 225-229 | Add `trainerId` param             |
| `updateWorkout(id, updates)`                                | 242-246 | Add `trainerId` param             |
| `deleteWorkout(id)`                                         | 248-252 | Add `trainerId` param             |
| `getWorkoutExercises(workoutId)`                            | 255-258 | Verify workout belongs to trainer |
| `removeExerciseFromWorkout(workoutId, exerciseId)`          | 266-271 | Verify workout belongs to trainer |
| `reorderWorkoutExercises(workoutId, exerciseId, direction)` | 273-298 | Verify workout belongs to trainer |

**Fixed signature:**

```typescript
getWorkout(id: string, trainerId: string): Promise<Workout | undefined>
// ... similar for others
```

---

### Workout Assignments (3 methods)

| Method                                                  | Line    | Fix                                           |
| ------------------------------------------------------- | ------- | --------------------------------------------- |
| `getClientWorkouts(clientId)`                           | 301-373 | Verify client belongs to trainer              |
| `getClientWorkoutsByWeek(clientId, weekStart, weekEnd)` | 375-577 | Verify client belongs to trainer              |
| `completeWorkoutAssignment(id, notes)`                  | 650-657 | Verify assignment belongs to trainer's client |

**Fixed signature:**

```typescript
getClientWorkouts(clientId: string, trainerId: string): Promise<WorkoutAssignment[]>
// ... similar for others
```

---

### Progress Entries (2 methods)

| Method                        | Line    | Fix                              |
| ----------------------------- | ------- | -------------------------------- |
| `getClientProgress(clientId)` | 660-665 | Verify client belongs to trainer |
| `addProgressEntry(entry)`     | 667-671 | Verify client belongs to trainer |

---

### Training Sessions (2 methods)

| Method                               | Line    | Fix                               |
| ------------------------------------ | ------- | --------------------------------- |
| `getClientSessions(clientId)`        | 681-686 | Verify client belongs to trainer  |
| `updateTrainingSession(id, updates)` | 694-698 | Verify session belongs to trainer |

---

### Appointments (2 methods)

| Method                           | Line    | Fix                                   |
| -------------------------------- | ------- | ------------------------------------- |
| `updateAppointment(id, updates)` | 764-771 | Verify appointment belongs to trainer |
| `deleteAppointment(id)`          | 773-777 | Verify appointment belongs to trainer |

---

## Implementation Steps

### Step 1: Update Storage Interface (IStorage)

Add `trainerId` parameter to method signatures in lines 48-120.

### Step 2: Update DatabaseStorage Implementation

For each method, add ownership verification:

**Pattern for direct ownership (workouts):**

```typescript
// BEFORE:
async getWorkout(id: string): Promise<Workout | undefined> {
  const db = await getDb();
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
  return workout || undefined;
}

// AFTER:
async getWorkout(id: string, trainerId: string): Promise<Workout | undefined> {
  const db = await getDb();
  const [workout] = await db.select().from(workouts).where(
    and(
      eq(workouts.id, id),
      eq(workouts.trainerId, trainerId)
    )
  );
  return workout || undefined;
}
```

**Pattern for indirect ownership (clients):**

```typescript
// BEFORE:
async getClient(id: string): Promise<Client | undefined> {
  const db = await getDb();
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  return client || undefined;
}

// AFTER:
async getClient(id: string, trainerId: string): Promise<Client | undefined> {
  const db = await getDb();
  const [client] = await db.select().from(clients).where(
    and(
      eq(clients.id, id),
      eq(clients.trainerId, trainerId)
    )
  );
  return client || undefined;
}
```

### Step 3: Update All Call Sites in routes.ts

Search for each method call and add `trainerId` from `req.user.id`:

```typescript
// BEFORE:
const client = await storage.getClient(clientId);

// AFTER:
const trainerId = req.user!.id;
const client = await storage.getClient(clientId, trainerId);
```

### Step 4: Update MemoryStorage Implementation

Apply same fixes to `server/memoryStorage.ts` for development mode.

### Step 5: Test Each Fix

For each method, verify:

- ✅ Trainer can access their own resources
- ❌ Trainer CANNOT access other trainer's resources
- ✅ Method returns undefined/false for unauthorized access (not error)

---

## Call Sites to Update

### In routes.ts:

```bash
# Find all call sites:
grep -n "storage\.getClient\|storage\.updateClient\|storage\.deleteClient" server/routes.ts
grep -n "storage\.getWorkout\|storage\.updateWorkout\|storage\.deleteWorkout" server/routes.ts
grep -n "storage\.getWorkoutExercises\|storage\.removeExerciseFromWorkout" server/routes.ts
grep -n "storage\.getClientWorkouts\|storage\.getClientWorkoutsByWeek" server/routes.ts
grep -n "storage\.getClientProgress\|storage\.addProgressEntry" server/routes.ts
grep -n "storage\.getClientSessions\|storage\.updateTrainingSession" server/routes.ts
grep -n "storage\.updateAppointment\|storage\.deleteAppointment" server/routes.ts
grep -n "storage\.completeWorkoutAssignment" server/routes.ts
```

### In middleware/auth.ts:

Lines 167, 187 - Update `requireClientOwnership` middleware calls

---

## Testing Checklist

After implementation, verify:

- [ ] Trainer A can list their own clients
- [ ] Trainer A CANNOT get Trainer B's client by ID
- [ ] Trainer A can update their own client
- [ ] Trainer A CANNOT update Trainer B's client
- [ ] Trainer A can delete their own client
- [ ] Trainer A CANNOT delete Trainer B's client
- [ ] Same tests for workouts, assignments, progress, sessions, appointments
- [ ] Solo users can only access their own data
- [ ] Client users can only access their own data (via email match)

---

## Rollback Plan

If issues arise:

1. Revert storage.ts changes
2. Revert routes.ts changes
3. Keep middleware protection in place (partial protection better than none)
4. Fix issues in a separate branch
5. Re-deploy after testing

---

## Success Criteria

✅ All 18 storage methods enforce tenant isolation
✅ All call sites updated to pass trainerId
✅ No TypeScript errors
✅ Manual testing confirms IDOR is fixed
✅ E2E tests pass (when Playwright is installed)

**Estimated completion time:** 3 hours
**Priority:** CRITICAL - Must complete before launch
