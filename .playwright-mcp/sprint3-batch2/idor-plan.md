# Sprint 3 BATCH 7 — IDOR Test Plan

Authored at end of BATCH 2 (2026-05-06). Lists the exhaustive surface that the
BATCH 7 IDOR + mutation tests must cover. Same patterns as Sprint 1.5 BATCH 4
and Sprint 2 BATCH 7.

## 1. Wellness routes (5)

All routes derive `userId = req.user!.id` from the session. The IDOR boundary
is the WHERE clause: every read/write must filter by `dailyWellnessLog.userId =
req.user!.id`. No body/path-param-derived user IDs anywhere.

| Method | Path                           | IDOR clauses to assert                                                                                                                                                                          | Body/Query Zod                                                         |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/wellness/today?tz=...`   | `eq(dailyWellnessLog.userId, callerId)` AND `eq(dailyWellnessLog.date, today)`; also `eq(users.id, callerId)` (timezone resolution); also `eq(userGamification.userId, callerId)` (streak read) | tz query string passes IANA regex                                      |
| POST   | `/api/wellness/log`            | SELECT-existing: `eq(userId, callerId) AND eq(date, today)`; UPDATE: same; INSERT: userId injected from session, never from body; XP: `eq(userGamification.userId, callerId)`                   | insertDailyWellnessLogSchema enforces 1-10 / boolean / refine ≥1 field |
| GET    | `/api/wellness/history?days=N` | `eq(dailyWellnessLog.userId, callerId)`; days clamped 1..365                                                                                                                                    | days param parsed safely                                               |
| GET    | `/api/wellness/streak`         | `eq(userGamification.userId, callerId)`                                                                                                                                                         | (no body/query)                                                        |
| DELETE | `/api/wellness/today?tz=...`   | DELETE: `eq(userId, callerId) AND eq(date, today)`; recompute uses `eq(userId, callerId)`                                                                                                       | tz query string                                                        |

**For each route a test verifies:**

- 401 when unauthenticated.
- IDOR clause: spy `eq()` calls (vi.hoisted pattern from Sprint 2 BATCH 7) — assert `eq(<column>, <expectedUserId>)` is in the WHERE chain.
- Cross-user IDOR: caller userA, target dailyWellnessLog row owned by userB, route MUST NOT return/mutate userB's row.
- Audit log on POST + DELETE: `logger.audit(...)` called with the right shape (userId, email, date, requestId).

## 2. Cron-triggered notification dispatches (2)

Crons themselves bypass HTTP auth, but their dispatched notifications must
land on the correct user. Each dispatch uses `dispatch(userId, type, data)` and
the dispatcher writes to `notifications.user_id = userId`.

| Cron                   | Type dispatched              | Filter assertions to test                                                                         |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `dailyWellnessNudge`   | `wellness_daily_nudge`       | recovery category gate, morning window 07:00–11:00 user-tz, no nudge today, no wellness log today |
| `wellnessReengagement` | `wellness_reengagement_7day` | recovery category gate, lastCheckIn = today−7days in user-tz, no re-engagement in last 30 days    |

**For each cron:**

- SELECT FOR UPDATE SKIP LOCKED contract: assert raw SQL contains `FOR UPDATE SKIP LOCKED`.
- Re-entrancy: invoke run\*Tick twice rapidly; second call returns `claimed=0`.
- Recovery category disabled: row excluded.
- Idempotency-by-filter: cron tick after notification already dispatched returns claimed=0.
- Cross-tz boundary: user at 06:59 user-local NOT claimed; at 07:00 IS claimed; at 11:00 NOT claimed.

## 3. Mutation testing target

Pick ONE route per BATCH 7 standard. Recommended target: `POST /api/wellness/log`.

**Mutation:** remove `eq(dailyWellnessLog.userId, callerId)` from the SELECT-existing WHERE clause in `wellnessService.upsertTodayEntry`.

**Expected failure:** the IDOR-cross-user test for POST /log fails with `Expected eq(<column>, "user-A") in WHERE clause. Got eq calls: [...]`.

**Revert** and confirm 30/30 wellness tests green.

## 4. Test file inventory (BATCH 7 will create)

| File                                            | Tests | Coverage                                                                                                                                                                                                                            |
| ----------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/test/routes/wellness.test.ts`           | ~14   | 5 routes × (401, IDOR clause, cross-user IDOR, Zod validation, audit log)                                                                                                                                                           |
| `server/test/services/wellnessService.test.ts`  | ~10   | computeReadinessScoreV0 (all 8 permutations of present/missing inputs, label/weight/contribution shape, algorithm tag), updateWellnessStreakAfterCheckIn (yesterday/today/break), recomputeAfterDelete, XP-once-per-day idempotency |
| `server/test/jobs/dailyWellnessNudge.test.ts`   | ~7    | morning window edges, idempotency-by-filter, re-entrancy guard, SELECT FOR UPDATE SKIP LOCKED contract, recovery-disabled gate                                                                                                      |
| `server/test/jobs/wellnessReengagement.test.ts` | ~6    | exact 7-day match (NOT 6 or 8), 30-day rate-limit, recovery-disabled gate, SELECT FOR UPDATE SKIP LOCKED contract                                                                                                                   |

**Test count delta target:** +25–35 tests (267 → 292–302 passing).

## 5. Smoke evidence already captured (BATCH 2)

The BATCH 2 disposable smoke (deleted, but proven in commit message + checkpoint report):

- 5 routes returned correct shapes (200 / 401 paths)
- isNewInsert=true on first POST → xpAwarded=10
- isNewInsert=false on edit → xpAwarded=0 (XP idempotency proven)
- `xp_transactions WHERE reason='wellness_check_in'` count = 1 after 2 POSTs
- Cron tick (8c) re-run after dispatch correctly returned claimed=0 (filter idempotency proven)
- Cross-timezone test: server UTC=2026-05-05 but Auckland-local entry stored date=2026-05-06

These behaviors will be encoded as proper vitest tests in BATCH 7.
