# Test Suite Delta — Sprint 2 BATCH 7

## Baseline (before BATCH 7)

|                    | Count                                   |
| ------------------ | --------------------------------------- |
| Test files passing | 8                                       |
| Test files failing | 1 (aiService — pre-existing, unrelated) |
| Tests passing      | 208                                     |
| Tests failing      | 15 (all aiService — pre-existing)       |

## After BATCH 7

|                    | Count          | Delta     |
| ------------------ | -------------- | --------- |
| Test files passing | 12             | +4        |
| Test files failing | 1 (aiService)  | unchanged |
| Tests passing      | **267**        | **+59**   |
| Tests failing      | 15 (aiService) | unchanged |

## New test files

| File                                                | Tests | Coverage                                                                                                                                                             |
| --------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/test/routes/notifications.test.ts`          | 30    | IDOR ownership + Zod validation + audit log + privacy (endpointHash) for all 7 BATCH 2 notification routes                                                           |
| `server/test/routes/preferred-units.test.ts`        | 10    | IDOR + audit log with previousValue + enum validation for GET/PATCH `/api/settings/preferred-units`                                                                  |
| `server/test/services/userDeletion.test.ts`         | 10    | audit-first ordering invariant + cascade contract (R2 cleanup, push-subs marked inactive not deleted, PII anonymization) + Stripe best-effort + missing-user defense |
| `server/test/jobs/cleanupExpiredQuietHours.test.ts` | 9     | SELECT FOR UPDATE SKIP LOCKED contract + re-entrancy guard + cron status / start / stop / interval clamping                                                          |

## Mutation testing

See `mutation-test-evidence.md`. One IDOR ownership clause was deliberately removed from `DELETE /api/notifications/subscribe/:id`; the matching test failed with `Expected eq(<column>, "user-A") in WHERE clause`. Edit reverted; suite back to 30/30.

## Live cron E2E

See `e2e-cron-evidence.md`. Boot log captured (`interval=2000ms, batch_size=50`). Insert + wait + re-query proved a queued row gets `deliveredAt` populated within one tick.

## What's deferred to BATCH 8

- License allowlist scan (per BATCH 8 plan).
- MEMORY.md update with Sprint 2 closure notes.
- Production migration 012 dry-run script + safety assertions audit.
- Pre-prod-deploy go/no-go review.
