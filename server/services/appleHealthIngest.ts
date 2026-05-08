/**
 * Apple Health Ingest Service — Sprint 5 BATCH 3.
 *
 * Four ingest functions, one per destination table. Each takes a userId
 * (pre-resolved from the import row by the cron — there's no bridge resolver
 * here, unlike wearableIngest's Open Wearables UUID bridge) plus the parsed
 * Apple Health record, derives a stable source_record_id, and UPSERTs against
 * the matching UNIQUE index. Re-import safe by construction:
 *
 *   - body_metrics:      partial UNIQUE (user_id, source, source_record_id) WHERE source != 'manual' (014.6 Path C)
 *   - sleep_sessions:    UNIQUE (user_id, source, source_record_id)
 *   - activity_sessions: UNIQUE (user_id, source, source_record_id)
 *   - daily_vitals:      UNIQUE (user_id, date, source) — folds multiple
 *                        Apple Health vital types onto the same (user, date)
 *                        row via per-column COALESCE. Last-write-wins for
 *                        multi-records-per-day same-type case. Re-import
 *                        flows through the same path with the same values:
 *                        idempotent.
 *
 * SOURCE_RECORD_ID DERIVATION (stable across re-exports of the same data)
 *   Body / Workout / Vital records:
 *     externalUuid (HKAttributeKeyExternalUUID) if present (iOS 15+ exports),
 *     else sha256("apple-health:" || recordType || ":" || sourceName || ":"
 *                 || startMs || ":" || rawValue || ":" || rawUnit) sliced
 *     to 32 hex chars. The hash is deterministic over the record's identity
 *     fields — same record in two exports → same id.
 *
 *   Sleep sessions:
 *     The aggregator's `sessionKey` IS the source_record_id (already
 *     designed to be stable: InBed-anchored uses the InBed startDate, the
 *     fallback path uses wakeLocalDate). No additional hashing needed.
 *
 * RETURN SHAPE
 *   Each function returns { inserted: boolean, skippedDuplicate: boolean }.
 *   `skippedDuplicate=true` means the row already existed AND no fields
 *   changed (Postgres' xmax=0 returns false for the already-existing row;
 *   we map that to skipped). `inserted=true` means a fresh row landed. Both
 *   are mutually exclusive.
 *
 *   The cron uses these counters to populate the user-facing import stats
 *   (records_ingested_* / records_skipped_duplicate columns on
 *   apple_health_imports).
 *
 * NOTIFICATIONS
 *   Apple Health imports DO NOT fire `wearable_first_sync_complete` per
 *   record — that notification is reserved for webhook-driven integrations
 *   (Open Wearables) where the user expects the data to flow in over time.
 *   The Apple Health flow has its own completion notification
 *   (`apple_health_import_complete`) dispatched once at the end of the
 *   entire import. See processAppleHealthImports cron.
 */
import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { getDb } from '../db';
import type { QuantityRecord, WorkoutRecord } from './appleHealthParser';
import type { AggregatedSleepSession } from './appleHealthSleepAggregator';

export const APPLE_HEALTH_SOURCE = 'apple_health' as const;

export interface IngestResult {
  inserted: boolean;
  skippedDuplicate: boolean;
}

// ─── source_record_id derivation ─────────────────────────────────────────────

/**
 * Stable hash over a record's identity fields. 32 hex chars (= 128 bits) is
 * comfortably collision-free for any realistic export size.
 *
 * Includes the recordType so a body_mass and a body_fat_percentage record
 * with otherwise-identical fields don't collide. Includes rawValue so two
 * records taken at the same instant with different values don't collide
 * either (rare but possible across multiple sources writing to the same
 * timestamp).
 */
function hashIdentity(parts: (string | number)[]): string {
  const h = createHash('sha256');
  h.update(parts.map((p) => String(p)).join('::'));
  return h.digest('hex').slice(0, 32);
}

export function quantitySourceRecordId(record: QuantityRecord): string {
  if (record.externalUuid && record.externalUuid.length > 0) {
    return record.externalUuid;
  }
  return hashIdentity([
    'apple-health',
    record.recordType,
    record.sourceName,
    record.startDate.utc.getTime(),
    record.value,
    record.rawUnit,
  ]);
}

export function workoutSourceRecordId(record: WorkoutRecord): string {
  if (record.externalUuid && record.externalUuid.length > 0) {
    return record.externalUuid;
  }
  return hashIdentity([
    'apple-health',
    'workout',
    record.activityType,
    record.sourceName,
    record.startDate.utc.getTime(),
    record.durationMinutes,
  ]);
}

// ─── BODY ────────────────────────────────────────────────────────────────────

type BodyRecordType =
  | 'HKQuantityTypeIdentifierBodyMass'
  | 'HKQuantityTypeIdentifierBodyFatPercentage'
  | 'HKQuantityTypeIdentifierLeanBodyMass';

/**
 * Ingest one Apple Health body-related record into body_metrics.
 *
 * Per-record dedup via 014.6 Path C partial UNIQUE on
 * (user_id, source, source_record_id) WHERE source != 'manual'. Multiple
 * weighings on the same day are preserved as separate rows (Apple Health
 * users with smart scales writing several measurements per day shouldn't
 * lose data to per-day collapse).
 */
export async function ingestAppleHealthBody(
  userId: string,
  record: QuantityRecord,
  bodyType: BodyRecordType
): Promise<IngestResult> {
  const db = await getDb();
  const sourceRecordId = quantitySourceRecordId(record);

  // Map record type to the right body_metrics column. Other columns stay null;
  // ON CONFLICT path uses COALESCE so a re-import touching the same row never
  // wipes out fields populated by other record types or by a manual entry.
  const weightKg = bodyType === 'HKQuantityTypeIdentifierBodyMass' ? String(record.value) : null;
  const bodyFatPercentage =
    bodyType === 'HKQuantityTypeIdentifierBodyFatPercentage' ? String(record.value) : null;
  const muscleMassKg =
    bodyType === 'HKQuantityTypeIdentifierLeanBodyMass' ? String(record.value) : null;

  // The conflict target MUST match the partial UNIQUE index expression
  // exactly — including the WHERE clause — for Postgres to use it.
  const result = await db.execute(sql`
    INSERT INTO body_metrics (
      user_id, recorded_at, weight_kg, body_fat_percentage, muscle_mass_kg,
      source, source_provider, source_record_id
    ) VALUES (
      ${userId}, ${record.startDate.utc}, ${weightKg}, ${bodyFatPercentage}, ${muscleMassKg},
      ${APPLE_HEALTH_SOURCE}, ${record.sourceName}, ${sourceRecordId}
    )
    ON CONFLICT (user_id, source, source_record_id) WHERE source != 'manual'
    DO UPDATE SET
      weight_kg = COALESCE(EXCLUDED.weight_kg, body_metrics.weight_kg),
      body_fat_percentage = COALESCE(EXCLUDED.body_fat_percentage, body_metrics.body_fat_percentage),
      muscle_mass_kg = COALESCE(EXCLUDED.muscle_mass_kg, body_metrics.muscle_mass_kg),
      source_provider = COALESCE(EXCLUDED.source_provider, body_metrics.source_provider),
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
  const inserted = Boolean(row.inserted);
  return { inserted, skippedDuplicate: !inserted };
}

// ─── SLEEP ───────────────────────────────────────────────────────────────────

/**
 * Ingest one aggregated sleep session into sleep_sessions.
 *
 * Aggregation happens upstream in `appleHealthSleepAggregator.aggregateSleepRecords`
 * (BEFORE this function is called). This function consumes the per-session
 * shape and is identical in structure to wearableIngest.ingestSleepCreated —
 * just keyed on `apple_health` source.
 */
export async function ingestAppleHealthSleep(
  userId: string,
  session: AggregatedSleepSession
): Promise<IngestResult> {
  const db = await getDb();
  // sessionKey IS the source_record_id — designed to be stable in the
  // aggregator. See appleHealthSleepAggregator.ts header doc.
  const sourceRecordId = session.sessionKey;

  const result = await db.execute(sql`
    INSERT INTO sleep_sessions (
      user_id, date, bedtime, wake_time, total_sleep_minutes,
      deep_minutes, rem_minutes, light_minutes, awake_minutes,
      source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${session.wakeLocalDate}, ${session.bedtime}, ${session.wakeTime},
      ${session.totalSleepMinutes},
      ${session.deepMinutes}, ${session.remMinutes},
      ${session.lightMinutes}, ${session.awakeMinutes},
      ${APPLE_HEALTH_SOURCE}, ${sourceRecordId},
      ${JSON.stringify({
        sourceName: session.sourceName,
        isLegacy: session.isLegacy,
        isFallback: session.isFallback,
        rawRecordCount: session.rawRecordCount,
      })}::jsonb
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
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
  const inserted = Boolean(row.inserted);
  return { inserted, skippedDuplicate: !inserted };
}

// ─── WORKOUT ─────────────────────────────────────────────────────────────────

export async function ingestAppleHealthWorkout(
  userId: string,
  record: WorkoutRecord
): Promise<IngestResult> {
  const db = await getDb();
  const sourceRecordId = workoutSourceRecordId(record);

  // duration_minutes is INTEGER in the schema (mirrors Sprint 4's wearable
  // shape). Apple Health serialises duration as decimal (32.5 for a 32:30
  // workout); round here to satisfy the column type. We accept the loss of
  // sub-minute precision — duration in minutes is rarely a load-bearing
  // metric at sub-minute resolution.
  const durationMinutesInt = Math.round(record.durationMinutes);

  const result = await db.execute(sql`
    INSERT INTO activity_sessions (
      user_id, started_at, duration_minutes, activity_type,
      distance_meters, calories,
      source, source_record_id, raw_payload
    ) VALUES (
      ${userId}, ${record.startDate.utc}, ${durationMinutesInt}, ${record.activityType},
      ${record.distanceMeters !== undefined ? Math.round(record.distanceMeters) : null},
      ${record.totalEnergyKcal !== undefined ? Math.round(record.totalEnergyKcal) : null},
      ${APPLE_HEALTH_SOURCE}, ${sourceRecordId},
      ${JSON.stringify({
        sourceName: record.sourceName,
        sourceVersion: record.sourceVersion,
        device: record.device,
        endDate: record.endDate.utc.toISOString(),
      })}::jsonb
    )
    ON CONFLICT (user_id, source, source_record_id) DO UPDATE SET
      started_at = EXCLUDED.started_at,
      duration_minutes = EXCLUDED.duration_minutes,
      activity_type = EXCLUDED.activity_type,
      distance_meters = EXCLUDED.distance_meters,
      calories = EXCLUDED.calories,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
  const inserted = Boolean(row.inserted);
  return { inserted, skippedDuplicate: !inserted };
}

// ─── VITAL ───────────────────────────────────────────────────────────────────

export type VitalRecordType =
  | 'HKQuantityTypeIdentifierRestingHeartRate'
  | 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'
  | 'HKQuantityTypeIdentifierVO2Max'
  | 'HKQuantityTypeIdentifierOxygenSaturation';

/**
 * Ingest one Apple Health vital record into daily_vitals.
 *
 * daily_vitals is keyed UNIQUE (user_id, date, source). Multiple Apple Health
 * vital types for the same date fold onto the same row via per-column
 * COALESCE: resting HR + HRV + VO2Max + SpO2 on the same day → one row with
 * four populated columns. Multi-records-per-day same-type (e.g. two resting
 * HR measurements) → last-write-wins on that column (Apple Health typically
 * writes one resting HR per day per source, so this is rarely exercised).
 *
 * Note: source_record_id on daily_vitals is NOT the dedup key (the date+source
 * UNIQUE is). We still store one source_record_id per row — first-write wins,
 * subsequent records on the same day don't overwrite it. Forensic-only.
 */
export async function ingestAppleHealthVital(
  userId: string,
  record: QuantityRecord,
  vitalType: VitalRecordType
): Promise<IngestResult> {
  const db = await getDb();
  const sourceRecordId = quantitySourceRecordId(record);
  const date = record.startDate.localDate;

  // Map record type to the right column. Vitals stored as decimal in schema
  // — passed as string for Drizzle-driver type compat (decimal columns
  // bind as `numeric` in pg, which is wire-format text).
  const restingHeartRate =
    vitalType === 'HKQuantityTypeIdentifierRestingHeartRate' ? Math.round(record.value) : null;
  const morningHrvRmssd =
    vitalType === 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' ? String(record.value) : null;
  const vo2max = vitalType === 'HKQuantityTypeIdentifierVO2Max' ? String(record.value) : null;
  const bloodOxygenAvg =
    vitalType === 'HKQuantityTypeIdentifierOxygenSaturation' ? String(record.value) : null;

  const result = await db.execute(sql`
    INSERT INTO daily_vitals (
      user_id, date, resting_heart_rate, morning_hrv_rmssd, vo2max, blood_oxygen_avg,
      source, source_record_id
    ) VALUES (
      ${userId}, ${date}, ${restingHeartRate}, ${morningHrvRmssd}, ${vo2max}, ${bloodOxygenAvg},
      ${APPLE_HEALTH_SOURCE}, ${sourceRecordId}
    )
    ON CONFLICT (user_id, date, source) DO UPDATE SET
      resting_heart_rate = COALESCE(EXCLUDED.resting_heart_rate, daily_vitals.resting_heart_rate),
      morning_hrv_rmssd = COALESCE(EXCLUDED.morning_hrv_rmssd, daily_vitals.morning_hrv_rmssd),
      vo2max = COALESCE(EXCLUDED.vo2max, daily_vitals.vo2max),
      blood_oxygen_avg = COALESCE(EXCLUDED.blood_oxygen_avg, daily_vitals.blood_oxygen_avg),
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  const row = (result.rows?.[0] ?? {}) as { inserted?: boolean };
  const inserted = Boolean(row.inserted);
  return { inserted, skippedDuplicate: !inserted };
}
