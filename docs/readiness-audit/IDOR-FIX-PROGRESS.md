# IDOR Vulnerability Fix Progress

**Date:** 2026-02-18
**Status:** IN PROGRESS (6/18 methods completed)
**Time Spent:** ~1 hour

---

## ✅ COMPLETED (6 methods)

### Client Methods (3/3) ✅

| Method                                  | Status      | Lines Fixed                                                |
| --------------------------------------- | ----------- | ---------------------------------------------------------- |
| `getClient(id, trainerId?)`             | ✅ Complete | storage.ts:177-195, routes.ts:498,1121,1357,1520,1568,1922 |
| `updateClient(id, updates, trainerId?)` | ✅ Complete | storage.ts:206-223, routes.ts:556                          |
| `deleteClient(id, trainerId?)`          | ✅ Complete | storage.ts:225-242, routes.ts:580                          |

**Pattern Implemented:**

```typescript
async getClient(id: string, trainerId?: string): Promise<Client | undefined> {
  const db = await getDb();

  if (trainerId) {
    // SECURITY: Enforce tenant isolation
    const [client] = await db.select().from(clients).where(
      and(eq(clients.id, id), eq(clients.trainerId, trainerId))
    );
    return client || undefined;
  }

  // UNSAFE: Only for middleware - logs warning
  console.warn(`[SECURITY] getClient called without trainerId for client ${id}`);
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  return client || undefined;
}
```

### Workout Methods (3/3) ✅

| Method                                   | Status      | Lines Fixed                        |
| ---------------------------------------- | ----------- | ---------------------------------- |
| `getWorkout(id, trainerId?)`             | ✅ Complete | storage.ts:244-262, routes.ts:1133 |
| `updateWorkout(id, updates, trainerId?)` | ✅ Complete | storage.ts:272-289                 |
| `deleteWorkout(id, trainerId?)`          | ✅ Complete | storage.ts:291-308                 |

---

## 🔄 IN PROGRESS (0 methods)

None currently.

---

## ⏳ PENDING (12 methods)

### Workout Exercise Methods (3 methods)

- [ ] `getWorkoutExercises(workoutId, trainerId?)`
- [ ] `removeExerciseFromWorkout(workoutId, exerciseId, trainerId?)`
- [ ] `reorderWorkoutExercises(workoutId, exerciseId, direction, trainerId?)`

**Challenge:** These methods take workoutId, not clientId. Need to verify workout belongs to trainer.

---

### Workout Assignment Methods (3 methods)

- [ ] `getClientWorkouts(clientId, trainerId?)`
- [ ] `getClientWorkoutsByWeek(clientId, weekStart, weekEnd, trainerId?)`
- [ ] `completeWorkoutAssignment(id, notes, trainerId?)`

**Challenge:** Assignment IDs don't directly link to trainers. Need to join through clients table.

---

### Progress Entry Methods (2 methods)

- [ ] `getClientProgress(clientId, trainerId?)`
- [ ] `addProgressEntry(entry, trainerId?)` - Needs validation that clientId belongs to trainer

---

### Training Session Methods (2 methods)

- [ ] `getClientSessions(clientId, trainerId?)`
- [ ] `updateTrainingSession(id, updates, trainerId?)`

---

### Appointment Methods (2 methods)

- [ ] `updateAppointment(id, updates, trainerId?)`
- [ ] `deleteAppointment(id, trainerId?)`

---

## 📊 Statistics

- **Total Methods:** 18
- **Completed:** 6 (33%)
- **Remaining:** 12 (67%)
- **Critical Routes Secured:** 8 route handlers updated
- **Time Estimate for Remaining:** ~2 hours

---

## Key Insights

### What's Working Well:

1. **Optional trainerId pattern** allows backward compatibility with middleware
2. **Security warnings** log when methods are called without trainerId
3. **Defense in depth** - both route-level AND storage-level checks

### Challenges Encountered:

1. **Middleware needs unsafe access** - `requireClientOwnership` middleware must fetch client to verify ownership, creating chicken-and-egg problem
2. **Complex ownership chains** - Some resources (workout assignments, appointments) link to trainer indirectly through clients
3. **Legacy patterns** - Some routes use `getClientWorkouts('')` hack to fetch all assignments

### Next Steps:

1. Update `getClientWorkouts` to require trainerId
2. Update `getClientProgress` to require trainerId
3. Create `getWorkoutAssignmentById(id, trainerId)` helper method
4. Update remaining workout exercise methods
5. Update appointment methods
6. Run tests to verify fixes

---

## Testing Checklist (Partial)

### Completed Tests:

- [ ] Trainer A can get their own client
- [ ] Trainer A CANNOT get Trainer B's client ← **NEEDS MANUAL TESTING**
- [ ] Trainer A can update their own client
- [ ] Trainer A CANNOT update Trainer B's client ← **NEEDS MANUAL TESTING**
- [ ] Trainer A can delete their own client
- [ ] Trainer A CANNOT delete Trainer B's client ← **NEEDS MANUAL TESTING**

### Pending Tests:

- [ ] All workout tests
- [ ] All assignment tests
- [ ] All progress/session/appointment tests

---

## Files Modified

1. **server/storage.ts** - Updated 6 method signatures + implementations
2. **server/routes.ts** - Updated 8 call sites with trainerId parameter
3. **docs/readiness-audit/IDOR-FIX-PLAN.md** - Created comprehensive fix plan
4. **docs/readiness-audit/IDOR-FIX-PROGRESS.md** - This file

---

## Security Impact

**Before Fix:**

- Trainer could access ANY client by ID: `GET /api/clients/detail/:clientId`
- Trainer could update ANY client: `PUT /api/clients/:clientId`
- Trainer could delete ANY client: `DELETE /api/clients/:clientId`
- Same for workouts

**After Fix:**

- SQL WHERE clause enforces `AND trainerId = :trainerId`
- Returns `undefined` if resource doesn't belong to trainer
- 404 error returned to user (no information leakage)

**Estimated Risk Reduction:** HIGH → LOW (for completed methods)

---

## Next Session TODO:

1. Continue with `getClientWorkouts` and `getClientWorkoutsByWeek`
2. Fix `completeWorkoutAssignment` to verify ownership internally
3. Update progress entry methods
4. Update training session methods
5. Update appointment methods
6. Update MemoryStorage class (for development mode)
7. Manual testing with two trainer accounts
8. E2E test verification (after Playwright installation)
