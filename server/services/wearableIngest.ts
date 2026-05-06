/**
 * Wearable Ingest Service — Sprint 4 BATCH 2
 *
 * Three exported ingest functions, one per data type:
 *   - ingestSleepSession      (writes sleep_sessions)
 *   - ingestDailyVitals       (writes daily_vitals; smart-scale path also writes body_metrics)
 *   - ingestActivity          (writes activity_sessions)
 *
 * Each function:
 *   1. Normalizes the provider's payload into our canonical shape
 *   2. UPSERT via raw SQL (Drizzle's ORM doesn't yet expose RETURNING (xmax=0)
 *      cleanly in the upsert chain; raw SQL gives us first-row detection)
 *   3. If `inserted=true` AND this is the user's FIRST row of this dataType
 *      ever (count===1 across all sources) → fire `wearable_first_sync_complete`
 *   4. recordSuccessfulSync(connectionId) at the end
 *
 * `inserted` detection: PostgreSQL's `xmax` system column is 0 when the row
 * was newly INSERTed. On UPDATE-via-conflict it's the txid that updated the
 * row (non-zero). `RETURNING (xmax = 0) AS inserted` yields a clean boolean
 * per row.
 *
 * SQL alias rule: every alias is lowercase (`inserted`, `source_record_id`).
 * Postgres folds unquoted identifiers to lowercase; capitalized aliases would
 * silently lose-the-case in the result key.
 *
 * First-sync-complete dispatch is per-(user, dataType) — NOT per-connection.
 * If a user connects Whoop and gets sleep data, then later connects Garmin
 * and Garmin's first sleep ingest also writes a row, the notification does
 * NOT re-fire (count is already ≥1).
 *
 * Race-condition acceptance: two simultaneous webhooks for the same
 * (user, dataType) could both pass the inserted-AND-count===1 gate before
 * either sees the other's row. Notification fires twice; the OS notification
 * tray collapses on tag = `wearable_first_sync_complete:<dataType>`. Server
 * notifications table will have two rows. Accepted for v1 (low-frequency,
 * low-cost duplication; documented).
 */
import { sql, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { sleepSessions, dailyVitals, activitySessions, bodyMetrics } from '../../shared/schema';
import { recordSuccessfulSync } from './wearableConnections';
import { dispatch } from './notificationDispatcher';

// ─── Normalized payload shapes ──────────────────────────────────────────────

interface NormalizedSleep {
  date: string; // YYYY-MM-DD wake date in user tz
  bedtime: Date | null;
  wakeTime: Date | null;
  totalSleepMinutes: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  avgHeartRate: number | null;
  minHeartRate: number | null;
  hrvOvernightMs: string | null;
  respiratoryRate: string | null;
  bloodOxygenMin: string | null;
  bodyTemperatureDeviation: string | null;
  sleepScore: number | null;
  sourceRecordId: string;
}

interface NormalizedVitals {
  date: string;
  restingHeartRate: number | null;
  morningHrvRmssd: string | null;
  vo2max: string | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  bloodOxygenAvg: string | null;
  bodyTemperature: string | null;
  weightKg: string | null; // smart-scale path
  bodyFatPercentage: string | null; // smart-scale path
  sourceRecordId: string;
}

interface NormalizedActivity {
  startedAt: Date;
  durationMinutes: number | null;
  activityType: string | null;
  distanceMeters: number | null;
  calories: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  steps: number | null;
  elevationGainMeters: number | null;
  strainScore: string | null;
  trainingLoadScore: string | null;
  routePolyline: string | null;
  sourceRecordId: string;
}

// ─── Normalization helpers ──────────────────────────────────────────────────
// Provider-side schemas vary; for v1 we accept already-canonical payloads
// (Open Wearables does the per-provider mapping) and just defensively coerce
// types. BATCH 5+ may add per-provider normalize functions when we wire each
// provider end-to-end.

type AnyPayload = Record<string, unknown>;
const asPayload = (p: unknown): AnyPayload => (p && typeof p === 'object' ? (p as AnyPayload) : {});

const asString = (v: unknown): string | null =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null;
const asNumber = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const asDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};
const asDecimalString = (v: unknown): string | null => {
  const n = asNumber(v);
  return n === null ? (asString(v) ?? null) : String(n);
};

function normalizeSleepPayload(payload: unknown, _source: string): NormalizedSleep {
  const p = asPayload(payload);
  return {
    date: asString(p.date) ?? '',
    bedtime: asDate(p.bedtime),
    wakeTime: asDate(p.wakeTime ?? p.wake_time),
    totalSleepMinutes: asNumber(p.totalSleepMinutes ?? p.total_sleep_minutes),
    deepMinutes: asNumber(p.deepMinutes ?? p.deep_minutes),
    remMinutes: asNumber(p.remMinutes ?? p.rem_minutes),
    lightMinutes: asNumber(p.lightMinutes ?? p.light_minutes),
    awakeMinutes: asNumber(p.awakeMinutes ?? p.awake_minutes),
    avgHeartRate: asNumber(p.avgHeartRate ?? p.avg_heart_rate),
    minHeartRate: asNumber(p.minHeartRate ?? p.min_heart_rate),
    hrvOvernightMs: asDecimalString(p.hrvOvernightMs ?? p.hrv_overnight_ms),
    respiratoryRate: asDecimalString(p.respiratoryRate ?? p.respiratory_rate),
    bloodOxygenMin: asDecimalString(p.bloodOxygenMin ?? p.blood_oxygen_min),
    bodyTemperatureDeviation: asDecimalString(
      p.bodyTemperatureDeviation ?? p.body_temperature_deviation
    ),
    sleepScore: asNumber(p.sleepScore ?? p.sleep_score),
    sourceRecordId: asString(p.sourceRecordId ?? p.source_record_id ?? p.id) ?? '',
  };
}

function normalizeVitalsPayload(payload: unknown, _source: string): NormalizedVitals {
  const p = asPayload(payload);
  return {
    date: asString(p.date) ?? '',
    restingHeartRate: asNumber(p.restingHeartRate ?? p.resting_heart_rate),
    morningHrvRmssd: asDecimalString(p.morningHrvRmssd ?? p.morning_hrv_rmssd),
    vo2max: asDecimalString(p.vo2max),
    bloodPressureSystolic: asNumber(p.bloodPressureSystolic ?? p.blood_pressure_systolic),
    bloodPressureDiastolic: asNumber(p.bloodPressureDiastolic ?? p.blood_pressure_diastolic),
    bloodOxygenAvg: asDecimalString(p.bloodOxygenAvg ?? p.blood_oxygen_avg),
    bodyTemperature: asDecimalString(p.bodyTemperature ?? p.body_temperature),
    weightKg: asDecimalString(p.weightKg ?? p.weight_kg),
    bodyFatPercentage: asDecimalString(p.bodyFatPercentage ?? p.body_fat_percentage),
    sourceRecordId: asString(p.sourceRecordId ?? p.source_record_id ?? p.id) ?? '',
  };
}

function normalizeActivityPayload(payload: unknown, _source: string): NormalizedActivity {
  const p = asPayload(payload);
  return {
    startedAt: asDate(p.startedAt ?? p.started_at) ?? new Date(0),
    durationMinutes: asNumber(p.durationMinutes ?? p.duration_minutes),
    activityType: asString(p.activityType ?? p.activity_type),
    distanceMeters: asNumber(p.distanceMeters ?? p.distance_meters),
    calories: asNumber(p.calories),
    avgHeartRate: asNumber(p.avgHeartRate ?? p.avg_heart_rate),
    maxHeartRate: asNumber(p.maxHeartRate ?? p.max_heart_rate),
    steps: asNumber(p.steps),
    elevationGainMeters: asNumber(p.elevationGainMeters ?? p.elevation_gain_meters),
    strainScore: asDecimalString(p.strainScore ?? p.strain_score),
    trainingLoadScore: asDecimalString(p.trainingLoadScore ?? p.training_load_score),
    routePolyline: asString(p.routePolyline ?? p.route_polyline),
    sourceRecordId: asString(p.sourceRecordId ?? p.source_record_id ?? p.id) ?? '',
  };
}

// ─── First-sync-complete dispatch helper ────────────────────────────────────

type WearableDataType = 'sleep' | 'vitals' | 'activity';

/**
 * Fires `wearable_first_sync_complete` exactly once per (userId, dataType)
 * pair, the first time the user has any row of that data type from any
 * wearable source.
 *
 * The "inserted=true" gate at each call site is the primary defense: it
 * prevents the notification firing on a re-delivered webhook (the conflict-
 * update path of the UPSERT). The count===1 check here is the SECONDARY
 * defense — it ensures we only fire on the actual first row.
 *
 * Race window note: Postgres MVCC means two simultaneous INSERTs for the
 * same (user, dataType) could both see count===0 then both pass the gate
 * → notification fires twice. The notification `tag` collapses duplicates
 * on the OS notification tray; the user sees one banner. Server-side
 * notifications-table row count of 2 is accepted for v1 — see file header.
 */
async function maybeDispatchFirstSyncComplete(
  userId: string,
  dataType: WearableDataType
): Promise<void> {
  const db = await getDb();
  const tableMap = {
    sleep: sleepSessions,
    vitals: dailyVitals,
    activity: activitySessions,
  };
  const table = tableMap[dataType];
  // Count includes the row we just inserted (already committed); we want
  // exactly 1 → "first row ever for this dataType".
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.userId, userId));
  if (c === 1) {
    // v1: we know the user has exactly 1 row right now. Future enrichment
    // (Sprint 4.5) may count distinct dates from the last 30 days for a
    // richer "X days of data pulled" body — for now `days = 1`.
    await dispatch(userId, 'wearable_first_sync_complete', { dataType, days: c });
  }
}

// ─── Ingest functions ───────────────────────────────────────────────────────

export async function ingestSleepSession(
  userId: string,
  connectionId: string,
  source: string,
  payload: unknown
): Promise<{ inserted: boolean; recordId: string }> {
  const normalized = normalizeSleepPayload(payload, source);
  const db = await getDb();
  const result = await db.execute(sql`
    INSERT INTO sleep_sessions (
      user_id, date, bedtime, wake_time, total_sleep_minutes,
      deep_minutes, rem_minutes, light_minutes, awake_minutes,
      avg_heart_rate, min_heart_rate, hrv_overnight_ms,
      respiratory_rate, blood_oxygen_min, body_temperature_deviation,
      sleep_score, source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${normalized.date}, ${normalized.bedtime}, ${normalized.wakeTime},
      ${normalized.totalSleepMinutes}, ${normalized.deepMinutes}, ${normalized.remMinutes},
      ${normalized.lightMinutes}, ${normalized.awakeMinutes}, ${normalized.avgHeartRate},
      ${normalized.minHeartRate}, ${normalized.hrvOvernightMs},
      ${normalized.respiratoryRate}, ${normalized.bloodOxygenMin},
      ${normalized.bodyTemperatureDeviation}, ${normalized.sleepScore},
      ${source}, ${normalized.sourceRecordId}, ${JSON.stringify(payload)}::jsonb
    )
    ON CONFLICT (user_id, source, source_record_id) DO UPDATE SET
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
    RETURNING (xmax = 0) AS inserted, source_record_id
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean; source_record_id?: string };
  const inserted = Boolean(row.inserted);
  const recordId = row.source_record_id ?? normalized.sourceRecordId;

  if (inserted) {
    await maybeDispatchFirstSyncComplete(userId, 'sleep');
  }

  await recordSuccessfulSync(connectionId);
  return { inserted, recordId };
}

export async function ingestDailyVitals(
  userId: string,
  connectionId: string,
  source: string,
  payload: unknown
): Promise<{ inserted: boolean; recordId: string }> {
  const normalized = normalizeVitalsPayload(payload, source);
  const db = await getDb();
  const result = await db.execute(sql`
    INSERT INTO daily_vitals (
      user_id, date, resting_heart_rate, morning_hrv_rmssd, vo2max,
      blood_pressure_systolic, blood_pressure_diastolic, blood_oxygen_avg,
      body_temperature, source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${normalized.date}, ${normalized.restingHeartRate},
      ${normalized.morningHrvRmssd}, ${normalized.vo2max},
      ${normalized.bloodPressureSystolic}, ${normalized.bloodPressureDiastolic},
      ${normalized.bloodOxygenAvg}, ${normalized.bodyTemperature},
      ${source}, ${normalized.sourceRecordId}, ${JSON.stringify(payload)}::jsonb
    )
    ON CONFLICT (user_id, date, source) DO UPDATE SET
      resting_heart_rate = EXCLUDED.resting_heart_rate,
      morning_hrv_rmssd = EXCLUDED.morning_hrv_rmssd,
      vo2max = EXCLUDED.vo2max,
      blood_pressure_systolic = EXCLUDED.blood_pressure_systolic,
      blood_pressure_diastolic = EXCLUDED.blood_pressure_diastolic,
      blood_oxygen_avg = EXCLUDED.blood_oxygen_avg,
      body_temperature = EXCLUDED.body_temperature,
      source_record_id = EXCLUDED.source_record_id,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted, source_record_id
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean; source_record_id?: string };
  const inserted = Boolean(row.inserted);
  const recordId = row.source_record_id ?? normalized.sourceRecordId;

  if (inserted) {
    await maybeDispatchFirstSyncComplete(userId, 'vitals');
  }

  // Smart-scale path: if the vitals payload includes a weight reading, ALSO
  // insert into bodyMetrics so the user's body-metrics chart picks up the
  // wearable-sourced point alongside manual entries. We tag source='wearable'
  // and sourceProvider=<source> so the UI can disambiguate origin.
  //
  // Sprint 4 BATCH 2 reviewer items 3 + 4 — fold into amend:
  //   3. Gate on `inserted` to prevent duplicate bodyMetrics rows on
  //      re-delivery. The vitals UPSERT collapses duplicates via
  //      UNIQUE(user_id, date, source); without the gate, the bodyMetrics
  //      insert (which has no analogous UNIQUE) would accumulate.
  //   4. Pass recordedAt from the vitals date so a smart-scale reading
  //      arriving 6h late doesn't display on the wrong day. Midpoint UTC
  //      (12:00) avoids both midnight-edge timezones biasing one direction.
  if (inserted && normalized.weightKg) {
    await db.insert(bodyMetrics).values({
      userId,
      weightKg: normalized.weightKg,
      bodyFatPercentage: normalized.bodyFatPercentage ?? undefined,
      source: 'wearable',
      sourceProvider: source,
      recordedAt: new Date(`${normalized.date}T12:00:00Z`),
    });
  }

  await recordSuccessfulSync(connectionId);
  return { inserted, recordId };
}

export async function ingestActivity(
  userId: string,
  connectionId: string,
  source: string,
  payload: unknown
): Promise<{ inserted: boolean; recordId: string }> {
  const normalized = normalizeActivityPayload(payload, source);
  const db = await getDb();
  const result = await db.execute(sql`
    INSERT INTO activity_sessions (
      user_id, started_at, duration_minutes, activity_type,
      distance_meters, calories, avg_heart_rate, max_heart_rate,
      steps, elevation_gain_meters, strain_score, training_load_score,
      route_polyline, source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${normalized.startedAt}, ${normalized.durationMinutes},
      ${normalized.activityType}, ${normalized.distanceMeters},
      ${normalized.calories}, ${normalized.avgHeartRate},
      ${normalized.maxHeartRate}, ${normalized.steps},
      ${normalized.elevationGainMeters}, ${normalized.strainScore},
      ${normalized.trainingLoadScore}, ${normalized.routePolyline},
      ${source}, ${normalized.sourceRecordId}, ${JSON.stringify(payload)}::jsonb
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
    RETURNING (xmax = 0) AS inserted, source_record_id
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean; source_record_id?: string };
  const inserted = Boolean(row.inserted);
  const recordId = row.source_record_id ?? normalized.sourceRecordId;

  if (inserted) {
    await maybeDispatchFirstSyncComplete(userId, 'activity');
  }

  await recordSuccessfulSync(connectionId);
  return { inserted, recordId };
}
