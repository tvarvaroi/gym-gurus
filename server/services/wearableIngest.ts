/**
 * Wearable Ingest Service — Sprint 4 BATCH 5a (rewrite — OW canonical event types)
 *
 * Four exported ingest functions, one per Open Wearables canonical event type:
 *   - ingestWorkoutCreated         (writes activity_sessions)
 *   - ingestSleepCreated           (writes sleep_sessions)
 *   - ingestConnectionCreated      (UPSERTs wearable_connections + dispatches wearable_connected)
 *   - ingestBodyCompositionCreated (writes bodyMetrics — smart-scale path)
 *
 * Replaces BATCH 2's three functions (ingestSleepSession, ingestDailyVitals,
 * ingestActivity) which were keyed off our own `(userId, connectionId,
 * source, payload)` envelope. The new shape matches OW upstream's webhook
 * payload — `data.id`, `data.user_id`, `data.source.provider`, etc. Per OW's
 * canonical webhooks guide (the-momentum/open-wearables docs/api-reference/
 * guides/webhooks.mdx).
 *
 * OW user ID bridge — Path A assumption (verification target Q2 in spike):
 * OW supports `external_id` lookup. When a Disciple first connects via the
 * wearables OAuth flow we POST /api/v1/users with {external_id: <our user
 * UUID>}; OW stores the bridge and echoes our UUID back in `data.user_id`
 * on every webhook. Path B fallback (separate column on wearable_connections
 * + lookup) is held in reserve pending live spike confirmation. For BATCH 5a
 * the code assumes Path A — `data.user_id` is OUR internal user UUID.
 *
 * Each function:
 *   1. Maps OW canonical fields → our column names
 *   2. UPSERT via raw SQL with `RETURNING (xmax = 0) AS inserted` to detect
 *      first-row vs conflict-update path (BATCH 2 pattern preserved)
 *   3. If `inserted=true` AND this is the user's FIRST row of this dataType
 *      ever → fires `wearable_first_sync_complete`
 *   4. Calls recordSuccessfulSync on the matching wearable_connections row
 *      (looked up by userId + provider; the row exists because OAuth runs
 *      before any data event)
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

// ─── Ingest functions ───────────────────────────────────────────────────────

export async function ingestWorkoutCreated(
  data: WorkoutCreatedData
): Promise<{ inserted: boolean }> {
  const db = await getDb();
  const userId = data.user_id;
  const provider = data.source?.provider ?? 'unknown';
  const sourceRecordId = data.id;

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

export async function ingestSleepCreated(data: SleepCreatedData): Promise<{ inserted: boolean }> {
  const db = await getDb();
  const userId = data.user_id;
  const provider = data.source?.provider ?? 'unknown';
  const sourceRecordId = data.id;

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

export async function ingestConnectionCreated(data: ConnectionCreatedData): Promise<void> {
  const db = await getDb();
  const userId = data.user_id;
  const provider = data.provider;
  const connectedAt = asDate(data.connected_at) ?? new Date();

  // OW reports the user's connection is healthy. Two possibilities:
  //   (a) Our row exists (OAuth callback already fired handleOAuthCallback).
  //       The webhook is a confirmation/idempotent ack — flip status if it's
  //       not 'connected' yet (rare, but defends against OAuth-callback race).
  //   (b) Our row doesn't exist (rare in v1 — would mean OW created the
  //       connection ahead of us). INSERT a 'connected' row.
  //
  // UPSERT on the existing UNIQUE (user_id, provider) index — Sprint 4 BATCH 2
  // already created this index for idempotent reconnect.
  const before = await db
    .select({ status: wearableConnections.status })
    .from(wearableConnections)
    .where(
      and(
        eq(wearableConnections.userId, userId),
        eq(wearableConnections.provider, provider as WearableProvider)
      )
    );
  const previousStatus: WearableStatus | null = (before[0]?.status as WearableStatus) ?? null;

  await db
    .insert(wearableConnections)
    .values({
      userId,
      provider: provider as WearableProvider,
      status: 'connected' as WearableStatus,
      connectedAt,
      disconnectedAt: null,
      syncErrorCount: 0,
      lastSyncError: null,
    })
    .onConflictDoUpdate({
      target: [wearableConnections.userId, wearableConnections.provider],
      set: {
        status: 'connected' as WearableStatus,
        connectedAt,
        disconnectedAt: null,
        syncErrorCount: 0,
        lastSyncError: null,
      },
    });

  // Dispatch on transition (not on idempotent ack of an already-connected row).
  if (previousStatus !== 'connected') {
    await dispatch(userId, 'wearable_connected', { provider });
  }
}

export async function ingestBodyCompositionCreated(
  data: BodyCompositionCreatedData
): Promise<{ inserted_count: number }> {
  const db = await getDb();
  const userId = data.user_id;
  const provider = data.provider;
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
