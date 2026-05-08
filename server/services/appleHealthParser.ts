/**
 * Apple Health export.xml streaming SAX parser — Sprint 5 BATCH 2.
 *
 * Pure parser: takes a Readable stream of XML bytes, fires per-record-type
 * callbacks, never loads the whole document into memory. No DB writes here
 * (BATCH 3 wires the callbacks to ingest functions). No R2 fetching here
 * (BATCH 3 wires the upstream zip→stream from R2).
 *
 * STREAMING GUARANTEE
 *   sax (ISC, pinned to 1.4.1) processes input incrementally — chunks fed via
 *   parser.write() trigger element callbacks as soon as the SAX state machine
 *   recognises an open or close tag. No internal buffering of the whole
 *   document. Memory stays bounded regardless of input size. Verified on a
 *   programmatically-generated 10MB+ fixture in
 *   `appleHealthParser.test.ts` "memory profile".
 *
 * APPLE HEALTH XML SHAPE (relevant subset)
 *   <HealthData locale="en_US">
 *     <ExportDate value="2026-01-15 10:00:00 -0500"/>
 *     <Me HKCharacteristicTypeIdentifierBiologicalSex="..." .../>
 *
 *     -- Quantity records (weight, vitals, etc.) --
 *     <Record type="HKQuantityTypeIdentifierBodyMass"
 *             sourceName="Withings" sourceVersion="1.0"
 *             unit="lb"
 *             startDate="2026-01-15 08:32:00 -0500"
 *             endDate="2026-01-15 08:32:00 -0500"
 *             value="178.5"
 *             HKAttributeKeyExternalUUID="..."/>
 *
 *     -- Category records (sleep stages) --
 *     <Record type="HKCategoryTypeIdentifierSleepAnalysis"
 *             sourceName="Apple Watch"
 *             startDate="..."
 *             endDate="..."
 *             value="HKCategoryValueSleepAnalysisAsleepDeep"/>
 *
 *     -- Workouts (DISTINCT element, NOT a Record) --
 *     <Workout workoutActivityType="HKWorkoutActivityTypeRunning"
 *              duration="32.5" durationUnit="min"
 *              totalDistance="5.2" totalDistanceUnit="km"
 *              totalEnergyBurned="320" totalEnergyBurnedUnit="kcal"
 *              sourceName="Apple Watch" startDate="..." endDate="...">
 *       <MetadataEntry key="..." value="..."/>
 *       <WorkoutEvent type="HKWorkoutEventTypePause" date="..."/>
 *     </Workout>
 *   </HealthData>
 *
 * CALLBACK SCOPE (intentionally narrow — per-record-type for ingest BATCH 3)
 *   Sprint 5 v1 ingest writes to wearable schema's existing tables:
 *     - activity_sessions ← onWorkout
 *     - sleep_sessions    ← onSleepAnalysis
 *     - body_metrics      ← onBodyMass / onBodyFatPercentage / onLeanBodyMass
 *     - daily_vitals      ← onRestingHeartRate / onHRV / onVO2Max / onBloodOxygen
 *
 *   Excluded by design (would be over-fitting; no destination in BATCH 3):
 *     - onHeartRate (per-second stream during workouts; daily_vitals tracks
 *       resting only). Add when a future sprint introduces per-workout HR.
 *     - onActiveEnergyBurned / onStepCount / onDistanceWalkingRunning. Add
 *       when a future sprint tracks daily activity rollups.
 *
 * UNIT NORMALIZATION (parser layer, not ingest layer)
 *   - BodyMass: lb → kg via 0.45359237. kg passthrough.
 *   - Workout distance: mi → m via 1609.344. km → m via 1000. m passthrough.
 *   - Workout energy: kcal passthrough. kJ → kcal via 0.239006.
 *   - HR / RHR: count/min → bpm (passthrough as integer).
 *   - HRV (SDNN): ms passthrough as decimal.
 *   - VO2Max: mL/min·kg passthrough as decimal.
 *   - BloodOxygen (SpO2): % passthrough as percent. Some exporters write
 *     fractions (0.97); heuristic — multiply by 100 if value < 2.
 *   Records with unrecognised units are skipped + counted in
 *   stats.unparseable. The error is logged but does not abort the parse.
 *
 * TIMEZONE HANDLING
 *   Apple Health timestamps include offset:
 *     "2026-01-15 08:32:00 -0500"
 *   parseHealthDate() returns BOTH:
 *     utc       — Date object in UTC for timestamp columns (recorded_at, started_at)
 *     localDate — YYYY-MM-DD in the user's local zone for date-bucketed columns
 *                 (sleep_sessions.date, daily_vitals.date)
 *   For date buckets we MUST use the user-local date, otherwise a user who
 *   weighs in at 11pm Eastern would have it bucketed into the next UTC day.
 *
 * TIMING vs DTD: Apple Health export.xml has a DOCTYPE with an internal DTD
 * subset listing all entities. sax's default behaviour (resolveExternals=false
 * implicit) is to NOT fetch external DTDs and to ignore the internal subset's
 * markup declarations. No external HTTP fetch happens at parse time.
 */
import sax from 'sax';
import { logger } from '../logger';
import type { Readable } from 'node:stream';

// ─── Public types ──────────────────────────────────────────────────────────

export interface ParsedDate {
  /** UTC Date object — use for timestamp columns. */
  utc: Date;
  /**
   * YYYY-MM-DD in the timestamp's recorded local zone (the offset present in
   * the original Apple Health string). Use for date-bucketed columns.
   */
  localDate: string;
}

/** Common attributes present on all Records and Workouts. */
export interface AppleHealthRecordCommon {
  sourceName: string;
  sourceVersion?: string;
  device?: string;
  /**
   * Apple Health's per-record UUID, present on iOS 15+ exports as
   * `HKAttributeKeyExternalUUID` attribute. Older exports omit it.
   */
  externalUuid?: string;
  startDate: ParsedDate;
  endDate: ParsedDate;
  /**
   * The original `<creationDate>` attribute if present on this record.
   * System-clock time when Apple Health stored the record, distinct from
   * `startDate` (which is when the data semantically occurred).
   */
  creationDate?: ParsedDate;
}

export interface QuantityRecord extends AppleHealthRecordCommon {
  /** Normalized to canonical unit (kg, m, bpm, etc.) — see unit table in module header. */
  value: number;
  /** Original Apple Health unit string (for forensic record_id hashing if no UUID). */
  rawUnit: string;
  /** The HK*Identifier* type string (preserved for forensic record_id hashing). */
  recordType: string;
}

export interface SleepRecord extends AppleHealthRecordCommon {
  /** HKCategoryValueSleepAnalysis* — see Apple's enum. */
  stage: string;
  recordType: 'HKCategoryTypeIdentifierSleepAnalysis';
}

export interface WorkoutRecord extends AppleHealthRecordCommon {
  /** HKWorkoutActivityType* — Apple's activity enum. */
  activityType: string;
  /** Duration in MINUTES (Apple Health serialises as minutes by default). */
  durationMinutes: number;
  /** Distance in METERS (normalized from mi/km/m). Optional — not all workouts have distance. */
  distanceMeters?: number;
  /** Energy in KCAL (normalized from kcal/kJ). Optional. */
  totalEnergyKcal?: number;
}

/** Final stats reported via onComplete. */
export interface ParseStats {
  recordsParsed: number;
  recordsEmittedWorkout: number;
  recordsEmittedSleep: number;
  recordsEmittedBody: number;
  recordsEmittedVital: number;
  recordsSkippedUnparseable: number;
  /** Earliest record startDate seen, in localDate form. NULL if no records. */
  dateRangeStart: string | null;
  /** Latest record startDate seen, in localDate form. NULL if no records. */
  dateRangeEnd: string | null;
}

export interface ParseCallbacks {
  onWorkout?: (record: WorkoutRecord) => void;
  onSleepAnalysis?: (record: SleepRecord) => void;
  onBodyMass?: (record: QuantityRecord) => void;
  onBodyFatPercentage?: (record: QuantityRecord) => void;
  onLeanBodyMass?: (record: QuantityRecord) => void;
  onRestingHeartRate?: (record: QuantityRecord) => void;
  onHRV?: (record: QuantityRecord) => void;
  onVO2Max?: (record: QuantityRecord) => void;
  onBloodOxygen?: (record: QuantityRecord) => void;
  /** Fires every PROGRESS_INTERVAL records. */
  onProgress?: (parsed: number) => void;
  onComplete?: (stats: ParseStats) => void;
  onError?: (error: Error) => void;
}

const PROGRESS_INTERVAL = 5000;

// ─── Unit conversion constants ─────────────────────────────────────────────
// Inlined here rather than reused from client/src/lib/units.ts. Of the four
// constants this parser needs, only KG_PER_LB is in client/src/lib/units.ts —
// the rest (M_PER_MI, KCAL_PER_KJ, distance unit normalisation) are parser-
// specific. Extracting to shared/lib/units.ts would create one shared file
// for one shared constant. Inlining is the smaller surface change.

const KG_PER_LB = 0.45359237;
const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const KCAL_PER_KJ = 0.239005736;

// ─── Date parsing ──────────────────────────────────────────────────────────

const APPLE_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/;

/**
 * Parse Apple Health's date format `YYYY-MM-DD HH:MM:SS ±HHMM` into both
 * UTC Date and user-local YYYY-MM-DD. Returns null on malformed input or
 * out-of-range field values — caller should treat the record as unparseable.
 *
 * Sprint 5 BATCH 8: regex validates SHAPE only (4-digit year, 2-digit MM/DD/HH/MM/SS,
 * ±HHMM offset). Out-of-range values that are syntactically correct (month=13,
 * day=99, hour=99) get rolled forward by JS Date.UTC semantics (e.g.
 * `Date.UTC(2026, 12, 99, 99, 99, 99)` resolves to a valid Date in 2027).
 *
 * Without explicit bounds, a maliciously-crafted export with insane field
 * values would be ingested with rolled-over timestamps — polluting
 * date-bucketed columns and skewing charts. Bounds enforced here:
 *   1<=M<=12, 1<=D<=31, 0<=h<=23, 0<=mm<=59, 0<=ss<=59
 *   1990 <= year <= currentYear+1 (defends against year-typo + far-future)
 *   0 <= offset minutes <= 24*60 (rejects nonsense like ±9999)
 */
export function parseHealthDate(s: string): ParsedDate | null {
  const m = APPLE_DATE_REGEX.exec(s);
  if (!m) return null;
  const [, Y, M, D, h, mm, ss, sign, oh, om] = m;

  const year = parseInt(Y, 10);
  const month = parseInt(M, 10);
  const day = parseInt(D, 10);
  const hour = parseInt(h, 10);
  const minute = parseInt(mm, 10);
  const second = parseInt(ss, 10);
  const offsetH = parseInt(oh, 10);
  const offsetM = parseInt(om, 10);

  // Field bounds — reject out-of-range values that JS Date would silently
  // roll over.
  const currentYear = new Date().getUTCFullYear();
  if (year < 1990 || year > currentYear + 1) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  if (second < 0 || second > 59) return null;
  // Offset is normally in [-1200, +1400] for real-world TZs; bound generously
  // to 24h either side, which still rejects ±9999 + similar nonsense.
  if (offsetH < 0 || offsetH > 24) return null;
  if (offsetM < 0 || offsetM > 59) return null;

  const offsetMinutes = (offsetH * 60 + offsetM) * (sign === '+' ? 1 : -1);
  // Original string is in user-local time. UTC = local - offset.
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60 * 1000;
  const utc = new Date(utcMs);
  if (Number.isNaN(utc.getTime())) return null;
  // localDate is the YYYY-MM-DD already present in the string — that IS the
  // user-local date. Don't re-derive from utc, which would shift across day
  // boundaries for late-night entries.
  const localDate = `${Y}-${M}-${D}`;
  return { utc, localDate };
}

// ─── Unit normalization ────────────────────────────────────────────────────

interface NormalizedQuantity {
  value: number;
  ok: boolean;
  /** Reason for failure (logged when ok=false). */
  reason?: string;
}

function normalizeBodyMass(raw: string, unit: string): NormalizedQuantity {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return { value: 0, ok: false, reason: 'unparseable value' };
  const u = unit.toLowerCase();
  if (u === 'kg') return { value: n, ok: true };
  if (u === 'lb' || u === 'lbs') return { value: n * KG_PER_LB, ok: true };
  return { value: 0, ok: false, reason: `unrecognised body mass unit: ${unit}` };
}

function normalizeWorkoutDistance(raw: string, unit: string): NormalizedQuantity {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return { value: 0, ok: false, reason: 'unparseable value' };
  const u = unit.toLowerCase();
  if (u === 'mi') return { value: n * M_PER_MI, ok: true };
  if (u === 'km') return { value: n * M_PER_KM, ok: true };
  if (u === 'm') return { value: n, ok: true };
  return { value: 0, ok: false, reason: `unrecognised distance unit: ${unit}` };
}

function normalizeWorkoutEnergy(raw: string, unit: string): NormalizedQuantity {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return { value: 0, ok: false, reason: 'unparseable value' };
  const u = unit.toLowerCase();
  if (u === 'kcal' || u === 'cal') return { value: n, ok: true };
  if (u === 'kj') return { value: n * KCAL_PER_KJ, ok: true };
  return { value: 0, ok: false, reason: `unrecognised energy unit: ${unit}` };
}

function normalizeBloodOxygen(raw: string, unit: string): NormalizedQuantity {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return { value: 0, ok: false, reason: 'unparseable value' };
  const u = unit.toLowerCase();
  // Some exports write fractions (0.97), most write percent (97). Normalize to percent.
  if (u === '%' || u === '') {
    return n < 2 ? { value: n * 100, ok: true } : { value: n, ok: true };
  }
  return { value: 0, ok: false, reason: `unrecognised blood oxygen unit: ${unit}` };
}

/** Generic passthrough for units we accept as-is (HRV ms, VO2Max mL/min·kg, BPM). */
function normalizePassthrough(raw: string): NormalizedQuantity {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return { value: 0, ok: false, reason: 'unparseable value' };
  return { value: n, ok: true };
}

// ─── HK Identifier → callback dispatcher ───────────────────────────────────
// Maps record `type` attribute string to the parser's emit logic. Unrecognised
// types pass through silently (NOT counted as unparseable) — Sprint 5 v1
// only consumes the types it can route, others are valid-but-ignored.

const QUANTITY_TYPES = new Set([
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierOxygenSaturation',
]);

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis';

// ─── Main parser ───────────────────────────────────────────────────────────

/**
 * Stream-parse an Apple Health export.xml from a Readable byte stream, firing
 * callbacks per known record type. Resolves when the underlying stream ends
 * and the SAX parser has flushed all events (or rejects on a fatal error).
 *
 * Memory bounded: chunks of any size are pumped through sax incrementally;
 * the parser holds at most one record's worth of attributes in memory at any
 * point.
 */
export async function parseHealthExport(
  xmlStream: Readable,
  callbacks: ParseCallbacks
): Promise<ParseStats> {
  const stats: ParseStats = {
    recordsParsed: 0,
    recordsEmittedWorkout: 0,
    recordsEmittedSleep: 0,
    recordsEmittedBody: 0,
    recordsEmittedVital: 0,
    recordsSkippedUnparseable: 0,
    dateRangeStart: null,
    dateRangeEnd: null,
  };

  const updateDateRange = (localDate: string) => {
    if (stats.dateRangeStart === null || localDate < stats.dateRangeStart) {
      stats.dateRangeStart = localDate;
    }
    if (stats.dateRangeEnd === null || localDate > stats.dateRangeEnd) {
      stats.dateRangeEnd = localDate;
    }
  };

  const incrementProgress = () => {
    stats.recordsParsed += 1;
    if (stats.recordsParsed % PROGRESS_INTERVAL === 0) {
      callbacks.onProgress?.(stats.recordsParsed);
    }
  };

  // sax options: STRICT mode (true) so tag and attribute names preserve
  // their original case. sax's loose mode unilaterally normalises names
  // (UPPERCASE by default, lowercase if `lowercase:true`), which would
  // mangle Apple Health's case-sensitive `HKQuantityTypeIdentifier*` and
  // `HKAttributeKeyExternalUUID` strings. Apple Health XML is well-formed
  // (UTF-8, properly closed elements, valid attribute syntax), so strict
  // mode is the right default. Caller can still recover from in-record
  // malformation via the per-record skip-and-count fallback.
  const parser = sax.parser(true, {
    trim: false,
    normalize: false,
    lowercase: false,
    position: false,
  });

  return new Promise<ParseStats>((resolve, reject) => {
    let aborted = false;
    // Sprint 5 BATCH 8: close-tag sentinel + non-empty stream assertion.
    // sax permissively completes parsing on truncated input and silently
    // resolves on empty input. Both produce misleading "succeeded with 0
    // records" outcomes when the input is structurally malformed. We track
    // whether </HealthData> was observed; if neither close-tag nor any
    // emitted records were seen at onend, the input was incomplete and we
    // reject with a clear error.
    let sawHealthDataClose = false;

    const fail = (err: Error) => {
      if (aborted) return;
      aborted = true;
      callbacks.onError?.(err);
      reject(err);
    };

    parser.onerror = (err: Error) => {
      // sax surfaces parser errors via onerror; sax also still fires onend
      // afterwards if we don't tear down. Calling parser.resume() recovers
      // for non-fatal errors but for malformed top-level XML we abort.
      fail(new Error(`SAX parse error: ${err.message}`));
    };

    parser.onopentag = (node) => {
      if (aborted) return;
      // sax's Tag type allows attributes to be QualifiedAttribute when not
      // in lowercase mode; normalise to plain Record<string, string> via
      // the runtime shape (sax always exposes string values for our purposes
      // since this is non-namespaced XML).
      const attrs = node.attributes as Record<string, string>;
      if (node.name === 'Record') {
        handleRecord(attrs);
      } else if (node.name === 'Workout') {
        handleWorkout(attrs);
      }
      // ExportDate / Me / HealthData / MetadataEntry / WorkoutEvent / etc.
      // pass through silently.
    };

    parser.onclosetag = (tagName: string) => {
      if (tagName === 'HealthData') {
        sawHealthDataClose = true;
      }
    };

    parser.onend = () => {
      if (aborted) return;
      // Truncation guard: a structurally valid Apple Health export ends with
      // </HealthData>. If sax reached onend without seeing the close tag,
      // the stream was truncated mid-document — reject so the cron marks
      // the import 'failed' with a clear error_message instead of
      // 'completed' with misleading partial stats.
      if (!sawHealthDataClose) {
        fail(
          new Error(
            'Truncated or malformed export: input ended before </HealthData> close tag was observed.'
          )
        );
        return;
      }
      callbacks.onComplete?.(stats);
      resolve(stats);
    };

    function handleRecord(attrs: Record<string, string>) {
      incrementProgress();
      const recordType = attrs.type;
      if (!recordType) {
        stats.recordsSkippedUnparseable += 1;
        return;
      }

      // Sleep records — category type
      if (recordType === SLEEP_TYPE) {
        const sleep = buildSleep(attrs);
        if (!sleep) {
          stats.recordsSkippedUnparseable += 1;
          return;
        }
        updateDateRange(sleep.startDate.localDate);
        stats.recordsEmittedSleep += 1;
        callbacks.onSleepAnalysis?.(sleep);
        return;
      }

      // Quantity records — known types only
      if (!QUANTITY_TYPES.has(recordType)) {
        // Unknown type but well-formed — silently ignore (NOT unparseable).
        return;
      }

      const quantity = buildQuantity(attrs, recordType);
      if (!quantity) {
        stats.recordsSkippedUnparseable += 1;
        return;
      }
      updateDateRange(quantity.startDate.localDate);

      switch (recordType) {
        case 'HKQuantityTypeIdentifierBodyMass':
          stats.recordsEmittedBody += 1;
          callbacks.onBodyMass?.(quantity);
          break;
        case 'HKQuantityTypeIdentifierBodyFatPercentage':
          stats.recordsEmittedBody += 1;
          callbacks.onBodyFatPercentage?.(quantity);
          break;
        case 'HKQuantityTypeIdentifierLeanBodyMass':
          stats.recordsEmittedBody += 1;
          callbacks.onLeanBodyMass?.(quantity);
          break;
        case 'HKQuantityTypeIdentifierRestingHeartRate':
          stats.recordsEmittedVital += 1;
          callbacks.onRestingHeartRate?.(quantity);
          break;
        case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
          stats.recordsEmittedVital += 1;
          callbacks.onHRV?.(quantity);
          break;
        case 'HKQuantityTypeIdentifierVO2Max':
          stats.recordsEmittedVital += 1;
          callbacks.onVO2Max?.(quantity);
          break;
        case 'HKQuantityTypeIdentifierOxygenSaturation':
          stats.recordsEmittedVital += 1;
          callbacks.onBloodOxygen?.(quantity);
          break;
      }
    }

    function buildCommon(attrs: Record<string, string>): AppleHealthRecordCommon | null {
      const startDate = attrs.startDate ? parseHealthDate(attrs.startDate) : null;
      const endDate = attrs.endDate ? parseHealthDate(attrs.endDate) : null;
      if (!startDate || !endDate) return null;
      return {
        sourceName: attrs.sourceName ?? 'unknown',
        sourceVersion: attrs.sourceVersion,
        device: attrs.device,
        externalUuid: attrs.HKAttributeKeyExternalUUID,
        startDate,
        endDate,
        creationDate: attrs.creationDate
          ? (parseHealthDate(attrs.creationDate) ?? undefined)
          : undefined,
      };
    }

    function buildQuantity(
      attrs: Record<string, string>,
      recordType: string
    ): QuantityRecord | null {
      const common = buildCommon(attrs);
      if (!common) return null;
      const rawValue = attrs.value;
      const rawUnit = attrs.unit ?? '';
      if (rawValue === undefined) return null;

      let normalized: NormalizedQuantity;
      switch (recordType) {
        case 'HKQuantityTypeIdentifierBodyMass':
        case 'HKQuantityTypeIdentifierLeanBodyMass':
          normalized = normalizeBodyMass(rawValue, rawUnit);
          break;
        case 'HKQuantityTypeIdentifierBodyFatPercentage':
          // Apple stores body-fat % as a fraction (0.18) with unit '%'.
          // Multiply by 100 to get conventional percent.
          normalized = (() => {
            const n = parseFloat(rawValue);
            if (!Number.isFinite(n)) return { value: 0, ok: false };
            return { value: n < 1 ? n * 100 : n, ok: true };
          })();
          break;
        case 'HKQuantityTypeIdentifierOxygenSaturation':
          normalized = normalizeBloodOxygen(rawValue, rawUnit);
          break;
        case 'HKQuantityTypeIdentifierRestingHeartRate':
        case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
        case 'HKQuantityTypeIdentifierVO2Max':
          normalized = normalizePassthrough(rawValue);
          break;
        default:
          return null;
      }

      if (!normalized.ok) {
        if (normalized.reason) {
          logger.warn(
            `[appleHealthParser] skipping record: ${normalized.reason} (type=${recordType}, value=${rawValue}, unit=${rawUnit})`
          );
        }
        return null;
      }

      return { ...common, value: normalized.value, rawUnit, recordType };
    }

    function buildSleep(attrs: Record<string, string>): SleepRecord | null {
      const common = buildCommon(attrs);
      if (!common) return null;
      const stage = attrs.value;
      if (!stage) return null;
      return {
        ...common,
        stage,
        recordType: 'HKCategoryTypeIdentifierSleepAnalysis',
      };
    }

    function handleWorkout(attrs: Record<string, string>) {
      incrementProgress();
      const common = buildCommon(attrs);
      const activityType = attrs.workoutActivityType;
      const durationRaw = attrs.duration;
      if (!common || !activityType || durationRaw === undefined) {
        stats.recordsSkippedUnparseable += 1;
        return;
      }
      // Apple workouts ALWAYS serialise duration in 'min' since iOS 9, but
      // we still accept the attribute defensively.
      const durationUnit = (attrs.durationUnit ?? 'min').toLowerCase();
      const durationMinutes = parseFloat(durationRaw);
      if (!Number.isFinite(durationMinutes) || durationUnit !== 'min') {
        stats.recordsSkippedUnparseable += 1;
        return;
      }

      const workout: WorkoutRecord = {
        ...common,
        activityType,
        durationMinutes,
      };

      if (attrs.totalDistance !== undefined && attrs.totalDistanceUnit !== undefined) {
        const dist = normalizeWorkoutDistance(attrs.totalDistance, attrs.totalDistanceUnit);
        if (dist.ok) workout.distanceMeters = dist.value;
        // Distance unit failures don't skip the whole workout — duration is the
        // load-bearing field. Distance is optional in the schema (activity_sessions.distance_meters nullable).
      }

      if (attrs.totalEnergyBurned !== undefined && attrs.totalEnergyBurnedUnit !== undefined) {
        const energy = normalizeWorkoutEnergy(attrs.totalEnergyBurned, attrs.totalEnergyBurnedUnit);
        if (energy.ok) workout.totalEnergyKcal = energy.value;
      }

      updateDateRange(common.startDate.localDate);
      stats.recordsEmittedWorkout += 1;
      callbacks.onWorkout?.(workout);
    }

    // Pump the byte stream into sax. Use for-await for ergonomics + automatic
    // backpressure (sax processes synchronously; the await yields between
    // chunks, letting the event loop tick).
    (async () => {
      try {
        for await (const chunk of xmlStream) {
          if (aborted) return;
          parser.write(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
        }
        parser.close();
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });
}
