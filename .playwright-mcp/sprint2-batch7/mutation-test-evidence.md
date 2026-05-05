# Mutation Testing Evidence — Sprint 2 BATCH 7

## Test target

`server/test/routes/notifications.test.ts > DELETE /api/notifications/subscribe/:id — IDOR ownership guard > includes eq(pushSubscriptions.userId, callerId) in WHERE — ownership clause`

## Mutation applied

In `server/routes/notifications.ts:203` (DELETE /subscribe/:id handler), the WHERE clause was changed from:

```ts
.where(and(eq(pushSubscriptions.id, req.params.id), eq(pushSubscriptions.userId, userId)))
```

to:

```ts
.where(eq(pushSubscriptions.id, req.params.id))
```

This drops the IDOR ownership guard — a malicious caller could revoke another user's push subscription by guessing/leaking the row id.

## Test result with mutation in place

```
✗ DELETE /api/notifications/subscribe/:id — IDOR ownership guard
  > includes eq(pushSubscriptions.userId, callerId) in WHERE — ownership clause

AssertionError: Expected eq(<column>, "user-A") in WHERE clause.
Got eq calls: ["sub-1"]: expected undefined to be defined

Test Files  1 failed (1)
     Tests  1 failed | 29 passed (30)
```

The test correctly detects the missing ownership clause: only `eq(<id>, 'sub-1')` was recorded in the spy log, not `eq(<userId>, 'user-A')`.

## Revert + re-run

Edit reverted to restore the `and(eq(id), eq(userId))` clause. Re-run:

```
✓ server/test/routes/notifications.test.ts (30 tests) 193ms
Test Files  1 passed (1)
     Tests  30 passed (30)
```

## Conclusion

The IDOR test suite has mutation-detection guarantee: removing an ownership check from a single route causes the matching test to fail with a precise error message pointing to the missing clause. The same `expectOwnershipClause()` helper is reused across all 11 IDOR tests in `notifications.test.ts` and `preferred-units.test.ts` — every protected route has equivalent coverage.
