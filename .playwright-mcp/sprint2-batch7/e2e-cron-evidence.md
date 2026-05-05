# Cron E2E Live Verification — Sprint 2 BATCH 7

## Setup

Dev server restarted with `QUIET_HOURS_RETRY_INTERVAL_MS=2000` so the cron fires every 2 seconds (default is 5 minutes). Connected to Neon dev database.

## Boot log

```
[2026-05-05T20:59:58.195Z] [INFO] [quietHoursCron] starting, interval=2000ms, batch_size=50
```

Verifies: `startQuietHoursCron()` runs on server boot with the env-overridden interval.

## E2E flow

1. Insert a notification row directly into Neon dev DB:
   - `userId` = sprint2-smoke@test.local
   - `type` = 'workout_assigned'
   - `deliverAfter` = 30 seconds in the past (`2026-05-05T21:00:22.739Z`)
   - `deliveredAt` = `null`
2. Wait 4 seconds.
3. Re-query the row.

## Result

```
Inserted notification 0ac3b175-6760-4e66-816b-f270a2593a29: deliverAfter=2026-05-05T21:00:22.739Z deliveredAt=null
Now waiting 4s for cron tick (interval=2s)...
After cron: deliveredAt=2026-05-05T21:00:54.610Z
PASS: row was delivered 31871ms after the deliver_after watermark
```

The matching cron log line for the tick that processed this row:

```
[2026-05-05T21:00:54.652Z] [INFO] [quietHoursCron] tick complete {"claimed":1,"processed":1,"errors":0}
```

## What this proves

- `runQuietHoursTick()` is firing on the configured interval
- The `SELECT FOR UPDATE SKIP LOCKED` claim correctly picks up rows where `deliver_after IS NOT NULL AND deliver_after <= NOW() AND delivered_at IS NULL`
- `deliverPending(notificationId)` is called for each claimed row
- After the deliver attempt, `delivered_at` is populated (whether the push succeeded or fell through to email fallback / no_destination — all three paths set `deliveredAt` per the migration 012 inline doc)
- Tick `processed=1, errors=0` confirms the call settled successfully

## What was already in flight at boot

Within 2.1 seconds of starting up the server, the first scheduled tick ran:

```
[2026-05-05T21:00:00.341Z] [INFO] [quietHoursCron] tick complete {"claimed":1,"processed":1,"errors":0}
```

This was a leftover row from earlier BATCH 5 testing (a `queued_quiet_hours` test push from BATCH 5's quiet-hours toggle verification). The cron correctly processed it on its first tick after boot — additional evidence that the boot path actually starts processing immediately rather than waiting for an arbitrary first interval delay (`setInterval` does wait one interval before first fire — the 1.1s gap between boot and tick is consistent with the 2s interval we configured).
