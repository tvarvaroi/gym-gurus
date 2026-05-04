// Migration 012 — Notification Engine
//
// Sprint 2 BATCH 1. Three orthogonal additions:
//   1. push_subscriptions table — per-device web push registrations
//      (Sprint 12 native shell extends this with platform='ios_native' etc.)
//   2. users.preferred_units column — cross-device unit consistency, replaces
//      Sprint 1's per-device localStorage `gg_units` flag
//   3. notifications.deliver_after / delivered_at columns + idempotent reshape of
//      users.notification_preferences from legacy {email, push, sms} to the
//      Sprint-2 canonical shape {categories, quietHours, channels}
//
// Idempotency: every DDL uses IF NOT EXISTS / IF EXISTS. The notification_preferences
// reshape skips rows that already match the new shape (tested by checking for the
// `categories` key). Safe to run twice.
//
// down() — Sprint-1.5 BATCH 2 pattern: refuse to roll back if any data depends on
// the new shapes, because the rollback would silently destroy data. The operator
// must manually reconcile before re-running down().
//
// CLI:    npx tsx server/migrations/012_notification_engine.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 012_notification_engine

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();

  // ─── 1. push_subscriptions table ─────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh VARCHAR(200) NOT NULL,
      auth VARCHAR(50) NOT NULL,
      user_agent TEXT,
      platform VARCHAR(20) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      last_used_at TIMESTAMP,
      failure_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // UNIQUE on endpoint — push services issue one URL per registration globally;
  // a duplicate insert is a re-subscribe and the route handler upserts on it.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_endpoint
      ON push_subscriptions (endpoint)
  `);
  // Composite partial index — fan-out hot path (`WHERE user_id = ? AND active = true`).
  // PARTIAL because inactive rows are kept for forensics but never queried in fan-out.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_push_subs_user_active
      ON push_subscriptions (user_id, active)
      WHERE active = TRUE
  `);

  // ─── 2. users.preferred_units column ─────────────────────────────────────
  // Default 'metric' — matches Sprint 1's localStorage default. AuthGuard's
  // one-time migration (BATCH 6) reads any existing localStorage gg_units value
  // for each user and writes it back here on first visit after deploy.
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS preferred_units VARCHAR(10) NOT NULL DEFAULT 'metric'
  `);

  // ─── 3. notifications quiet-hours queue columns ──────────────────────────
  await db.execute(sql`
    ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS deliver_after TIMESTAMP,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP
  `);
  // Partial composite index — drives the cron's "what's still pending?" query.
  // WHERE clause restricts the index to ROWS THE CRON MIGHT PROCESS, keeping
  // the index small even if the table has millions of historical delivered rows.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_delivery_queue
      ON notifications (deliver_after)
      WHERE deliver_after IS NOT NULL AND delivered_at IS NULL
  `);

  // ─── 3b. Mark every pre-existing notification row as delivered ───────────
  // These rows pre-date the deliver_after / delivered_at columns. Their delivery
  // history was "instant write to DB row, no push fan-out." We mark them
  // delivered_at = created_at so the cron never re-fires them as pending pushes.
  // Safe because these rows have NULL deliver_after and NULL delivered_at, so the
  // partial index above doesn't include them anyway after this UPDATE — but we
  // close them out explicitly to honour the new semantic ("non-NULL = settled").
  await db.execute(sql`
    UPDATE notifications
       SET delivered_at = created_at
     WHERE delivered_at IS NULL
       AND deliver_after IS NULL
  `);

  // ─── 4. Reshape users.notification_preferences (idempotent) ──────────────
  // Q1 decision: in-place reshape with one-time backfill. Old shape:
  //   {email: bool, push: bool, sms: bool}
  // New shape:
  //   {categories: {...}, quietHours: {...}, channels: {push, email}}
  //
  // Idempotent guard: only rewrites rows that DON'T already have the `categories`
  // key. A second run is a no-op. This means:
  //   - Pre-Sprint-2 row (has email/push/sms): rewritten to new shape, sms dropped.
  //   - Pre-Sprint-2 row with NULL prefs: rewritten to all-defaults new shape.
  //   - Already-migrated row (has categories): skipped.
  //
  // Defaults for the new shape:
  //   - categories: all five → true
  //   - quietHours.enabled: false (off by default — explicit user opt-in)
  //   - quietHours.start/end/timezone: UTC 22:00 → 08:00 placeholder (UI sets real values)
  //   - channels.push: COALESCE old `push` flag, default true
  //   - channels.email: COALESCE old `email` flag, default false
  //     (Sprint 2 spec: email fallback off by default; legacy email=true users keep it on)
  await db.execute(sql`
    UPDATE users
       SET notification_preferences = jsonb_build_object(
         'categories', jsonb_build_object(
           'workouts', TRUE,
           'recovery', TRUE,
           'achievements', TRUE,
           'social', TRUE,
           'billing', TRUE
         ),
         'quietHours', jsonb_build_object(
           'enabled', FALSE,
           'start', '22:00',
           'end', '08:00',
           'timezone', 'UTC'
         ),
         'channels', jsonb_build_object(
           'push', COALESCE((notification_preferences->>'push')::boolean, TRUE),
           'email', COALESCE((notification_preferences->>'email')::boolean, FALSE)
         )
       )
     WHERE notification_preferences IS NULL
        OR NOT (notification_preferences ? 'categories')
  `);

  console.warn(
    '[Migration 012] up() complete: push_subscriptions + preferred_units + notifications quiet-hours queue + notification_preferences reshape'
  );
}

export async function down() {
  const db = await getDb();

  // ─── Safety assertion 1: push_subscriptions data ─────────────────────────
  // Dropping the table would destroy every device registration. Force operator
  // to reconcile (export, document, manually drop) before re-running down().
  const psRows = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM push_subscriptions`
  );
  const psCountStr = (psRows as any).rows?.[0]?.count ?? (psRows as any)[0]?.count ?? '0';
  const psCount = parseInt(psCountStr, 10);
  if (psCount > 0) {
    throw new Error(
      `[Migration 012 down] BLOCKED: ${psCount} push_subscriptions rows exist. ` +
        `Dropping the table would destroy every device registration. ` +
        `Reconcile manually (DELETE the rows, OR archive them somewhere) before re-running down().`
    );
  }

  // ─── Safety assertion 2: non-default preferred_units ─────────────────────
  // Any user who toggled to 'imperial' (or any non-default) would silently revert
  // to 'metric' on column drop. Force reconciliation.
  const puRows = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM users WHERE preferred_units IS DISTINCT FROM 'metric'`
  );
  const puCountStr = (puRows as any).rows?.[0]?.count ?? (puRows as any)[0]?.count ?? '0';
  const puCount = parseInt(puCountStr, 10);
  if (puCount > 0) {
    throw new Error(
      `[Migration 012 down] BLOCKED: ${puCount} users have non-default preferred_units. ` +
        `Dropping the column would silently revert their unit choice. ` +
        `Reconcile manually before re-running down().`
    );
  }

  // ─── Safety assertion 3: any notification_preferences in new shape ───────
  // We CAN'T reverse the reshape losslessly — sms was dropped, categories+quietHours
  // are net-new. Reverting would discard that data. Refuse if any user has the new
  // shape (which means up() ran).
  const npRows = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM users WHERE notification_preferences ? 'categories'`
  );
  const npCountStr = (npRows as any).rows?.[0]?.count ?? (npRows as any)[0]?.count ?? '0';
  const npCount = parseInt(npCountStr, 10);
  if (npCount > 0) {
    throw new Error(
      `[Migration 012 down] BLOCKED: ${npCount} users have new-shape notification_preferences. ` +
        `Reverting would discard categories + quietHours data. ` +
        `Reconcile manually (overwrite or NULL-out preferences) before re-running down().`
    );
  }

  // Now safe to drop. Order: most-derived first, then column drops, then table drops.
  await db.execute(sql`DROP INDEX IF EXISTS idx_notifications_delivery_queue`);
  await db.execute(sql`ALTER TABLE notifications DROP COLUMN IF EXISTS delivered_at`);
  await db.execute(sql`ALTER TABLE notifications DROP COLUMN IF EXISTS deliver_after`);

  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS preferred_units`);

  await db.execute(sql`DROP INDEX IF EXISTS idx_push_subs_user_active`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_push_subs_endpoint`);
  await db.execute(sql`DROP TABLE IF EXISTS push_subscriptions`);

  console.warn(
    `[Migration 012 down] Reverted: ${psCount} push_subscriptions rows / ${puCount} non-default unit prefs / ${npCount} new-shape preferences existed (all zero, safe to revert)`
  );
}

// CLI invocation: npx tsx server/migrations/012_notification_engine.ts [up|down]
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 012] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 012] ${direction}() failed:`, err);
      process.exit(1);
    });
}
