/**
 * Wearable Ingest Service — Sprint 4 BATCH 5a (Path B refactor — Task 5a.10)
 *
 * Four exported ingest functions, one per Open Wearables canonical event type:
 *   - ingestWorkoutCreated         (writes activity_sessions)
 *   - ingestSleepCreated           (writes sleep_sessions)
 *   - ingestConnectionCreated      (UPDATEs wearable_connections + dispatches wearable_connected)
 *   - ingestBodyCompositionCreated (writes bodyMetrics — smart-scale path)
 *
 * Replaces BATCH 2's three functions (ingestSleepSession, ingestDailyVitals,
 * ingestActivity) which were keyed off our own `(userId, connectionId,
 * source, payload)` envelope. The new shape matches OW upstream's webhook
 * payload — `data.id`, `data.user_id`, `data.source.provider`, etc. Per OW's
 * canonical webhooks guide (the-momentum/open-wearables docs/api-reference/
 * guides/webhooks.mdx).
 *
 * Path B (locked at Q2 spike completion 2026-05-07): OW emits its own UUID
 * in webhook payloads as `data.user_id`. We store the OW UUID in
 * `wearable_connections.open_wearables_user_id` (set during OAuth flow init
 * via openWearablesClient.createUser). Each ingest function resolves OW's
 * UUID to our internal user UUID via resolveUserIdFromOwUserId() before any
 * DB write referencing user_id.
 *
 * Why Path B (not Path A): OW's external_user_id field is officially
 * deprecated and not wired into data-fetching endpoints (workouts, sleep,
 * timeseries). Per OW's integration guide we MUST store OW's UUID. See
 * decisions.md "Sprint 4 BATCH 5 spike findings — Q2 LOCKED Path B" and
 * gotchas.md "Tests that mock at the system boundary mask identity-bridge bugs".
 *
 * Unknown-user policy (data webhooks — workout / sleep / body_composition):
 *   skip-with-log + 200 ack. The bridge resolver returned null (no
 *   wearable_connections row carries the OW UUID). Recoverable failure
 *   mode: user disconnected mid-sync, OAuth-init txn rolled back, etc.
 *   Retrying produces the same outcome — DON'T throw 5xx (Svix would
 *   retry indefinitely, retry storm). Always 200 ack.
 *
 * Unknown-user policy (connection.created):
 *   log at ERROR level + 200 ack. Logged at the highest level the project's
 *   logger exposes ('error' — there is no native ALERT level; see
 *   server/logger.ts) because this case should be IMPOSSIBLE if our
 *   OAuth-init flow is correct. The transaction in
 *   wearableConnections.initiateOAuth atomically INSERTs the local row +
 *   sets open_wearables_user_id BEFORE the user redirects to the provider —
 *   so by the time connection.created fires, the bridge row must exist.
 *   Surfacing it lets us notice broken state. 200 ack stays for the same
 *   reason: retrying produces the same outcome.
 *
 * Each function:
 *   1. Resolves OW's UUID → our user_id via the wearable_connections bridge
 *   2. Maps OW canonical fields → our column names
 *   3. UPSERT via raw SQL with `RETURNING (xmax = 0) AS inserted` to detect
 *      first-row vs conflict-update path (BATCH 2 pattern preserved)
 *   4. If `inserted=true` AND this is the user's FIRST row of this dataType
 *      ever → fires `wearable_first_sync_complete`
 *   5. Calls recordSuccessfulSync on the matching wearable_connections row
 *      (the row exists because the bridge resolution succeeded)
 *
 * Idempotency:
 *   - workout/sleep: UNIQUE (user_id, source, source_record_id) — pre-existing
 *     in Sprint 4 BATCH 2 schema (see shared/schema.ts).
 *   - body_composition: partial UNIQUE (user_id, source_provider,
 *     (recorded_at::date)) WHERE source IN ('wearable', 'smart_scale') —
 *     migration 014.5 (Task 5a.4.5). Without this, retries would silently
 *     insert duplicates.
 *
 * SQL alias rule (carried over from BATCH 2): every alias is lowercase
 * (`inserted`, `source_record_id`). Postgres folds unquoted identifiers to
 * lowercase; capitalized aliases would silently lose-the-case in the result
 * key.
 *
 * First-sync-complete dispatch: per-(user, dataType). If a user connects
 * Garmin and gets workout data, then later connects Polar and Polar's first
 * activity also writes a row, the notification does NOT re-fire (count is
 * already ≥1). Per-data-type counter so a Disciple gets a separate banner
 * for their first workout vs first sleep vs first body-composition row.
 *
 * Race-condition acceptance: two simultaneous webhooks for the same
 * (user, dataType) could both pass the inserted-AND-count===1 gate before
 * either sees the other's row. Notification fires twice; the OS notification
 * tray collapses on tag = `wearable_first_sync_complete:<dataType>`. Server
 * notifications table will have two rows. Accepted for v1 (low-frequency,
 * low-cost duplication; documented).
 */
import { sql, eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import {
  sleepSessions,
  activitySessions,
  bodyMetrics,
  wearableConnections,
  type WearableProvider,
  type WearableStatus,
} from '../../shared/schema';
import { recordSuccessfulSync } from './wearableConnections';
import { dispatch } from './notificationDispatcher';
import { logger } from '../logger';

// ─── OW canonical event payload shapes ──────────────────────────────────────
// These mirror OW upstream's webhook payload contracts. `Record<string,
// unknown>` index lets us stash future fields without recompile (OW emits
// unknown extras forward-compat).

export interface WorkoutCreatedData {
  id: string;
  user_id: string;
  type: string; // e.g. 'running', 'cycling', 'strength_training'
  start_time: string; // ISO8601
  end_time: string; // ISO8601
  source: { provider: string; device?: string | null };
  duration_seconds?: number | null;
  calories_kcal?: number | null;
  distance_meters?: number | null;
  avg_heart_rate_bpm?: number | null;
  max_heart_rate_bpm?: number | null;
  steps?: number | null;
  elevation_gain_meters?: number | null;
  strain_score?: number | null;
  training_load_score?: number | null;
  route_polyline?: string | null;
  [k: string]: unknown;
}

export interface SleepCreatedData {
  id: string;
  user_id: string;
  start_time: string; // ISO8601 — bedtime
  end_time: string; // ISO8601 — wake
  source: { provider: string; device?: string | null };
  total_sleep_seconds?: number | null;
  efficiency_percent?: number | null;
  stages?: {
    deep_seconds?: number | null;
    rem_seconds?: number | null;
    light_seconds?: number | null;
    awake_seconds?: number | null;
  };
  avg_heart_rate_bpm?: number | null;
  min_heart_rate_bpm?: number | null;
  hrv_overnight_ms?: number | null;
  respiratory_rate_bpm?: number | null;
  spo2_min_percent?: number | null;
  body_temperature_deviation_c?: number | null;
  sleep_score?: number | null;
  is_nap?: boolean | null;
  [k: string]: unknown;
}

export interface ConnectionCreatedData {
  user_id: string;
  provider: string;
  connection_id: string;
  connected_at: string; // ISO8601
  [k: string]: unknown;
}

export interface BodyCompositionSample {
  timestamp: string; // ISO8601
  type: string; // 'weight' | 'body_fat' | 'lean_mass' | 'muscle_mass' | 'bone_mass' | 'body_water' | 'visceral_fat' | 'bmi'
  value: number;
  unit: string; // 'kg' | 'percent' | 'rating' | ...
  [k: string]: unknown;
}

export interface BodyCompositionCreatedData {
  user_id: string;
  provider: string;
  series_type: string;
  samples: BodyCompositionSample[];
  [k: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const asDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const asInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

const asDecimalString = (v: unknown): string | null =>
  typeof v === 'number' && Number.isFinite(v) ? String(v) : null;

const secondsToMinutes = (s: unknown): number | null => {
  const n = asInt(s);
  return n === null ? null : Math.round(n / 60);
};

// ─── First-sync-complete dispatch helper ────────────────────────────────────

type WearableDataType = 'workout' | 'sleep' | 'body_composition';

/**
 * Fires `wearable_first_sync_complete` exactly once per (userId, dataType)
 * pair, the first time the user has any row of that data type from any
 * wearable source.
 */
async function maybeDispatchFirstSyncComplete(
  userId: string,
  dataType: WearableDataType
): Promise<void> {
  const db = await getDb();
  let table: typeof sleepSessions | typeof activitySessions | typeof bodyMetrics;
  if (dataType === 'sleep') {
    table = sleepSessions;
  } else if (dataType === 'workout') {
    table = activitySessions;
  } else {
    table = bodyMetrics;
  }
  // Count includes the row we just inserted (already committed); we want
  // exactly 1 → "first row ever for this dataType".
  const result = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.userId, userId));
  const c = result[0]?.c ?? 0;
  if (c === 1) {
    await dispatch(userId, 'wearable_first_sync_complete', { dataType, days: c });
  }
}

/**
 * Resolve a user's wearable_connections row by (userId, provider). Used by
 * each ingest path to call recordSuccessfulSync. Returns null if no row
 * exists (which would mean OW emitted a data event for a user who never
 * connected — log + ignore the sync record but don't fail the ingest).
 */
async function findConnectionId(userId: string, provider: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ id: wearableConnections.id })
    .from(wearableConnections)
    .where(
      and(
        eq(wearableConnections.userId, userId),
        eq(wearableConnections.provider, provider as WearableProvider)
      )
    );
  return rows[0]?.id ?? null;
}

/**
 * Bridge resolver — Path B (Q2 spike close). Maps OW's internal user UUID
 * (carried in webhook `data.user_id`) → our internal user UUID via
 * `wearable_connections.open_wearables_user_id`. Returns null when no row
 * matches; the caller decides skip-vs-throw per the unknown-user policy
 * (see header comment).
 *
 * This is the load-bearing surface for the bridge integration tests
 * (server/test/services/wearableIngest.bridge.test.ts). Removing the eq()
 * clause OR mocking this function in the test file would mask the bridge
 * bug — see _brain/notes/gotchas.md "Tests that mock at the system boundary
 * mask identity-bridge bugs".
 */
export async function resolveUserIdFromOwUserId(owUserId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ userId: wearableConnections.userId })
    .from(wearableConnections)
    .where(eq(wearableConnections.openWearablesUserId, owUserId))
    .limit(1);
  return rows[0]?.userId ?? null;
}

// ─── Ingest functions ───────────────────────────────────────────────────────

export async function ingestWorkoutCreated(
  data: WorkoutCreatedData
): Promise<{ inserted: boolean; skipped?: 'unknown_user' }> {
  const db = await getDb();
  const owUserId = data.user_id;
  const provider = data.source?.provider ?? 'unknown';
  const sourceRecordId = data.id;

  // Bridge resolution: OW's UUID → our user_id. Skip-with-log + 200 ack on
  // null per the unknown-user policy.
  const userId = await resolveUserIdFromOwUserId(owUserId);
  if (!userId) {
    logger.warn('workout.created received for unknown OW user (no bridge row)', {
      owUserId,
      source: 'wearable',
      eventType: 'workout.created',
      provider,
    });
    return { inserted: false, skipped: 'unknown_user' };
  }

  const startedAt = asDate(data.start_time);
  if (!startedAt) {
    throw new Error(`workout.created: invalid start_time '${data.start_time}'`);
  }
  // Prefer explicit duration_seconds; otherwise compute from end - start.
  let durationMinutes = secondsToMinutes(data.duration_seconds);
  if (durationMinutes === null) {
    const endAt = asDate(data.end_time);
    if (endAt) {
      durationMinutes = Math.round((endAt.getTime() - startedAt.getTime()) / 60_000);
    }
  }

  const result = await db.execute(sql`
    INSERT INTO activity_sessions (
      user_id, started_at, duration_minutes, activity_type,
      distance_meters, calories, avg_heart_rate, max_heart_rate,
      steps, elevation_gain_meters, strain_score, training_load_score,
      route_polyline, source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${startedAt}, ${durationMinutes},
      ${data.type ?? null}, ${asInt(data.distance_meters)},
      ${asInt(data.calories_kcal)}, ${asInt(data.avg_heart_rate_bpm)},
      ${asInt(data.max_heart_rate_bpm)}, ${asInt(data.steps)},
      ${asInt(data.elevation_gain_meters)},
      ${asDecimalString(data.strain_score)}, ${asDecimalString(data.training_load_score)},
      ${data.route_polyline ?? null},
      ${provider}, ${sourceRecordId}, ${JSON.stringify(data)}::jsonb
    )
    ON CONFLICT (user_id, source, source_record_id) DO UPDATE SET
      started_at = EXCLUDED.started_at,
      duration_minutes = EXCLUDED.duration_minutes,
      activity_type = EXCLUDED.activity_type,
      distance_meters = EXCLUDED.distance_meters,
      calories = EXCLUDED.calories,
      avg_heart_rate = EXCLUDED.avg_heart_rate,
      max_heart_rate = EXCLUDED.max_heart_rate,
      steps = EXCLUDED.steps,
      elevation_gain_meters = EXCLUDED.elevation_gain_meters,
      strain_score = EXCLUDED.strain_score,
      training_load_score = EXCLUDED.training_load_score,
      route_polyline = EXCLUDED.route_polyline,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
  const inserted = Boolean(row.inserted);

  if (inserted) {
    await maybeDispatchFirstSyncComplete(userId, 'workout');
  }

  const connectionId = await findConnectionId(userId, provider);
  if (connectionId) {
    await recordSuccessfulSync(connectionId);
  } else {
    logger.warn('workout.created received for user with no matching wearable_connection', {
      userId,
      provider,
    });
  }

  return { inserted };
}

export async function ingestSleepCreated(
  data: SleepCreatedData
): Promise<{ inserted: boolean; skipped?: 'unknown_user' }> {
  const db = await getDb();
  const owUserId = data.user_id;
  const provider = data.source?.provider ?? 'unknown';
  const sourceRecordId = data.id;

  // Bridge resolution: OW's UUID → our user_id.
  const userId = await resolveUserIdFromOwUserId(owUserId);
  if (!userId) {
    logger.warn('sleep.created received for unknown OW user (no bridge row)', {
      owUserId,
      source: 'wearable',
      eventType: 'sleep.created',
      provider,
    });
    return { inserted: false, skipped: 'unknown_user' };
  }

  const bedtime = asDate(data.start_time);
  const wakeTime = asDate(data.end_time);
  // Wake date in user's tz — for v1 we use UTC date of end_time. Future:
  // store wake date in user's locally-configured tz once that's wired.
  const wakeDate = wakeTime
    ? wakeTime.toISOString().slice(0, 10)
    : (asDate(data.start_time)?.toISOString().slice(0, 10) ?? '');

  let totalSleepMinutes = secondsToMinutes(data.total_sleep_seconds);
  if (totalSleepMinutes === null && bedtime && wakeTime) {
    totalSleepMinutes = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60_000);
  }

  const stages = data.stages ?? {};
  const deepMinutes = secondsToMinutes(stages.deep_seconds);
  const remMinutes = secondsToMinutes(stages.rem_seconds);
  const lightMinutes = secondsToMinutes(stages.light_seconds);
  const awakeMinutes = secondsToMinutes(stages.awake_seconds);

  const result = await db.execute(sql`
    INSERT INTO sleep_sessions (
      user_id, date, bedtime, wake_time, total_sleep_minutes,
      deep_minutes, rem_minutes, light_minutes, awake_minutes,
      avg_heart_rate, min_heart_rate, hrv_overnight_ms,
      respiratory_rate, blood_oxygen_min, body_temperature_deviation,
      sleep_score, source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${wakeDate}, ${bedtime}, ${wakeTime},
      ${totalSleepMinutes}, ${deepMinutes}, ${remMinutes},
      ${lightMinutes}, ${awakeMinutes},
      ${asInt(data.avg_heart_rate_bpm)}, ${asInt(data.min_heart_rate_bpm)},
      ${asDecimalString(data.hrv_overnight_ms)},
      ${asDecimalString(data.respiratory_rate_bpm)},
      ${asDecimalString(data.spo2_min_percent)},
      ${asDecimalString(data.body_temperature_deviation_c)},
      ${asInt(data.sleep_score)}, ${provider}, ${sourceRecordId},
      ${JSON.stringify(data)}::jsonb
    )
    ON CONFLICT (user_id, source, source_record_id) DO UPDATE SET
      date = EXCLUDED.date,
      bedtime = EXCLUDED.bedtime,
      wake_time = EXCLUDED.wake_time,
      total_sleep_minutes = EXCLUDED.total_sleep_minutes,
      deep_minutes = EXCLUDED.deep_minutes,
      rem_minutes = EXCLUDED.rem_minutes,
      light_minutes = EXCLUDED.light_minutes,
      awake_minutes = EXCLUDED.awake_minutes,
      avg_heart_rate = EXCLUDED.avg_heart_rate,
      min_heart_rate = EXCLUDED.min_heart_rate,
      hrv_overnight_ms = EXCLUDED.hrv_overnight_ms,
      respiratory_rate = EXCLUDED.respiratory_rate,
      blood_oxygen_min = EXCLUDED.blood_oxygen_min,
      body_temperature_deviation = EXCLUDED.body_temperature_deviation,
      sleep_score = EXCLUDED.sleep_score,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
  const inserted = Boolean(row.inserted);

  if (inserted) {
    await maybeDispatchFirstSyncComplete(userId, 'sleep');
  }

  const connectionId = await findConnectionId(userId, provider);
  if (connectionId) {
    await recordSuccessfulSync(connectionId);
  } else {
    logger.warn('sleep.created received for user with no matching wearable_connection', {
      userId,
      provider,
    });
  }

  return { inserted };
}

export async function ingestConnectionCreated(
  data: ConnectionCreatedData
): Promise<{ skipped?: 'unknown_user' } | void> {
  const db = await getDb();
  const owUserId = data.user_id;
  const provider = data.provider;
  const connectedAt = asDate(data.connected_at) ?? new Date();

  // Path B: with Path-B-correct OAuth-init, the local row already exists at
  // this point — the wearableConnections.initiateOAuth transaction
  // INSERTed it and persisted open_wearables_user_id BEFORE the user
  // redirected to the provider's OAuth screen. Look up the existing row
  // directly by open_wearables_user_id.
  const existing = await db
    .select({
      id: wearableConnections.id,
      userId: wearableConnections.userId,
      status: wearableConnections.status,
    })
    .from(wearableConnections)
    .where(eq(wearableConnections.openWearablesUserId, owUserId))
    .limit(1);

  // Unknown-user policy for connection.created: log at ERROR level (highest
  // available — the project logger has no native ALERT level) + 200 ack.
  // This case should be impossible if OAuth-init is wired correctly;
  // surfacing it lets us notice broken state. Don't throw — Svix retry
  // would produce the same outcome (retry storm).
  if (existing.length === 0) {
    logger.error(
      'connection.created received for unknown OW user (no bridge row) — OAuth-init flow may be broken',
      {
        owUserId,
        source: 'wearable',
        eventType: 'connection.created',
        provider,
      }
    );
    return { skipped: 'unknown_user' };
  }

  const { id: connectionId, userId, status: previousStatus } = existing[0];

  // UPDATE the existing row to status='connected'. This is a confirmation/
  // idempotent ack — Path B's atomic OAuth-init already ensured the row
  // exists; we just flip status (and clear sync-error tracking) if it
  // isn't 'connected' yet.
  await db
    .update(wearableConnections)
    .set({
      status: 'connected' as WearableStatus,
      provider: provider as WearableProvider,
      connectedAt,
      disconnectedAt: null,
      syncErrorCount: 0,
      lastSyncError: null,
    })
    .where(eq(wearableConnections.id, connectionId));

  // Dispatch on transition (not on idempotent ack of an already-connected row).
  if (previousStatus !== 'connected') {
    await dispatch(userId, 'wearable_connected', { provider });
  }
}

export async function ingestBodyCompositionCreated(
  data: BodyCompositionCreatedData
): Promise<{ inserted_count: number; skipped?: 'unknown_user' }> {
  const db = await getDb();
  const owUserId = data.user_id;
  const provider = data.provider;

  // Bridge resolution: OW's UUID → our user_id.
  const userId = await resolveUserIdFromOwUserId(owUserId);
  if (!userId) {
    logger.warn('body_composition.created received for unknown OW user (no bridge row)', {
      owUserId,
      source: 'wearable',
      eventType: 'body_composition.created',
      provider,
    });
    return { inserted_count: 0, skipped: 'unknown_user' };
  }
  let insertedCount = 0;

  // Each sample becomes (or updates) one bodyMetrics row keyed on
  // (user_id, source_provider, recorded_at::date) WHERE source IN
  // ('wearable', 'smart_scale') — the partial UNIQUE added in migration 014.5.
  // Multiple samples on the same calendar day collapse to one row (last write
  // wins for that day's reading per provider).
  for (const sample of data.samples) {
    const recordedAt = asDate(sample.timestamp);
    if (!recordedAt) {
      logger.warn('body_composition.created: invalid sample timestamp; skipping', {
        userId,
        provider,
        timestamp: sample.timestamp,
      });
      continue;
    }

    // Map sample.type → bodyMetrics column. Multi-sample payloads for the
    // same day fold into one row via the UPSERT — the COALESCE on the
    // EXCLUDED side preserves earlier-set fields when later samples don't
    // include them.
    let weightKg: string | null = null;
    let bodyFatPercentage: string | null = null;
    let muscleMassKg: string | null = null;
    let boneMassKg: string | null = null;
    let bodyWaterPercentage: string | null = null;
    let visceralFatRating: number | null = null;

    switch (sample.type) {
      case 'weight':
        weightKg = sample.unit === 'kg' ? String(sample.value) : null;
        break;
      case 'body_fat':
      case 'body_fat_percentage':
        bodyFatPercentage = sample.unit === 'percent' ? String(sample.value) : null;
        break;
      case 'muscle_mass':
      case 'lean_mass':
      case 'lean_body_mass':
        muscleMassKg = sample.unit === 'kg' ? String(sample.value) : null;
        break;
      case 'bone_mass':
        boneMassKg = sample.unit === 'kg' ? String(sample.value) : null;
        break;
      case 'body_water':
      case 'body_water_percentage':
        bodyWaterPercentage = sample.unit === 'percent' ? String(sample.value) : null;
        break;
      case 'visceral_fat':
      case 'visceral_fat_rating':
        visceralFatRating = typeof sample.value === 'number' ? Math.round(sample.value) : null;
        break;
      default:
        // Unknown sample type; log + skip (forward-compat with OW additions).
        logger.info('body_composition.created: unknown sample type; skipping', {
          userId,
          provider,
          sampleType: sample.type,
        });
        continue;
    }

    // UPSERT against the partial UNIQUE index from migration 014.5
    // (idx_body_metrics_wearable_dedup ON body_metrics (user_id,
    // source_provider, (recorded_at::date)) WHERE source IN ('wearable',
    // 'smart_scale')). The conflict target spec MUST match the index's
    // expression including the WHERE clause for Postgres to use it.
    const result = await db.execute(sql`
      INSERT INTO body_metrics (
        user_id, recorded_at, weight_kg, body_fat_percentage,
        muscle_mass_kg, bone_mass_kg, body_water_percentage,
        visceral_fat_rating, source, source_provider
      ) VALUES (
        ${userId}, ${recordedAt}, ${weightKg}, ${bodyFatPercentage},
        ${muscleMassKg}, ${boneMassKg}, ${bodyWaterPercentage},
        ${visceralFatRating}, 'wearable', ${provider}
      )
      ON CONFLICT (user_id, source_provider, (recorded_at::date))
        WHERE source IN ('wearable', 'smart_scale')
      DO UPDATE SET
        weight_kg = COALESCE(EXCLUDED.weight_kg, body_metrics.weight_kg),
        body_fat_percentage = COALESCE(EXCLUDED.body_fat_percentage, body_metrics.body_fat_percentage),
        muscle_mass_kg = COALESCE(EXCLUDED.muscle_mass_kg, body_metrics.muscle_mass_kg),
        bone_mass_kg = COALESCE(EXCLUDED.bone_mass_kg, body_metrics.bone_mass_kg),
        body_water_percentage = COALESCE(EXCLUDED.body_water_percentage, body_metrics.body_water_percentage),
        visceral_fat_rating = COALESCE(EXCLUDED.visceral_fat_rating, body_metrics.visceral_fat_rating),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `);
    const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
    if (row.inserted) {
      insertedCount += 1;
    }
  }

  if (insertedCount > 0) {
    await maybeDispatchFirstSyncComplete(userId, 'body_composition');
  }

  const connectionId = await findConnectionId(userId, provider);
  if (connectionId) {
    await recordSuccessfulSync(connectionId);
  } else {
    logger.warn('body_composition.created received for user with no matching wearable_connection', {
      userId,
      provider,
    });
  }

  return { inserted_count: insertedCount };
}
