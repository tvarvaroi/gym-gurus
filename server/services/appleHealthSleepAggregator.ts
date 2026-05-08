/**
 * Apple Health sleep-session aggregator — Sprint 5 BATCH 3.
 *
 * STRUCTURAL DIVERGENCE THIS FILE EXISTS TO RECONCILE
 *   Apple Health stores sleep as PER-STAGE records (one per InBed/AsleepCore/
 *   AsleepDeep/AsleepREM/Awake transition). Open Wearables and other modern
 *   wearable webhooks deliver PRE-AGGREGATED per-session payloads. Our
 *   `sleep_sessions` schema is per-session.
 *
 *   For Apple Health imports we MUST aggregate the raw per-stage records into
 *   per-session shape BEFORE any DB write. Doing so incrementally via
 *   UPSERT-WITH-INCREMENT would silently double the stage totals on a re-import
 *   (same record consumed twice → +stage_minutes twice → bad data) — so the
 *   aggregation has to live in-memory at cron-tick scope, with a single
 *   UPSERT per assembled session.
 *
 * INBED-ANCHORED SESSION KEYING (PRIMARY PATH)
 *   Modern iOS exports include `HKCategoryValueSleepAnalysisInBed` records that
 *   bracket each sleep period. These envelopes are stable across re-exports:
 *   the InBed record's startDate is the same byte for byte every time the
 *   user re-runs the Apple Health export. This makes the InBed startDate a
 *   perfect session key — re-import produces identical keys, hits ON CONFLICT,
 *   becomes a no-op.
 *
 *   `${sourceName}|${inBedStartUtcMs}` is the session key. Stage records
 *   (AsleepCore/Deep/REM/Awake) whose startDate falls within an InBed window
 *   get folded into that session.
 *
 * MULTI-SEGMENT-NIGHT HANDLING
 *   Real users wake at 3am, get up, go back to sleep at 3:30am. Apple writes
 *   TWO InBed records on the same calendar night. Naive `wakeLocalDate`
 *   grouping would collapse them with bizarre stage totals. The InBed-anchored
 *   algorithm produces TWO sessions, one per InBed envelope. Stage minutes for
 *   each segment are correct. Both sessions write to the same `date` (wake
 *   local date) but with distinct source_record_id — schema's UNIQUE on
 *   (user_id, source, source_record_id) keeps them as separate rows.
 *
 * FALLBACK FOR EXPORTS WITHOUT INBED ENVELOPES (LEGACY PATH)
 *   Pre-iOS 13 exports and exports from third-party sleep apps (Pillow,
 *   AutoSleep before they switched to InBed) write Asleep records without an
 *   enclosing InBed bracket. Those records fall back to bucket-by-wakeLocalDate
 *   keying — `${sourceName}|fallback|${wakeLocalDate}`. Multi-segment nights
 *   collapse to one session under this fallback (acceptable trade-off — those
 *   sources don't expose enough info to disambiguate).
 *
 * LEGACY ASLEEP-ONLY RECORDS (PRE-iOS 13)
 *   Old exports use `HKCategoryValueSleepAnalysisAsleep` (or
 *   `HKCategoryValueSleepAnalysisAsleepUnspecified`) — a single record per
 *   session with no stage breakdown. We set `total_sleep_minutes` from the
 *   record's duration and leave deep/rem/light/awake as NULL (NOT 0 — NULL
 *   means "unknown / not measured", 0 would mean "measured as zero").
 *
 * MEMORY BOUND
 *   Session map size is bounded by the number of sessions in the import,
 *   which is in turn bounded by the import file size (200MB cap → ~50k
 *   sessions worst case under maximum tracking density). Defensive cap at
 *   50,000 sessions catches pathological inputs that synthesize millions of
 *   fake records to OOM the cron worker. Realistic inputs (10y of nightly
 *   tracking with one source ≈ 3650 sessions; 5 sources ≈ 18,250) stay far
 *   under the cap.
 */
import type { SleepRecord } from './appleHealthParser';
import { logger } from '../logger';

// ─── Apple Health stage value strings ────────────────────────────────────────

const STAGE_IN_BED = 'HKCategoryValueSleepAnalysisInBed';
const STAGE_ASLEEP_CORE = 'HKCategoryValueSleepAnalysisAsleepCore';
const STAGE_ASLEEP_DEEP = 'HKCategoryValueSleepAnalysisAsleepDeep';
const STAGE_ASLEEP_REM = 'HKCategoryValueSleepAnalysisAsleepREM';
const STAGE_ASLEEP_LEGACY = 'HKCategoryValueSleepAnalysisAsleep';
const STAGE_ASLEEP_UNSPECIFIED = 'HKCategoryValueSleepAnalysisAsleepUnspecified';
const STAGE_AWAKE = 'HKCategoryValueSleepAnalysisAwake';

const LEGACY_STAGES = new Set([STAGE_ASLEEP_LEGACY, STAGE_ASLEEP_UNSPECIFIED]);
const STAGE_BREAKDOWN = new Set([
  STAGE_ASLEEP_CORE,
  STAGE_ASLEEP_DEEP,
  STAGE_ASLEEP_REM,
  STAGE_AWAKE,
]);

/**
 * Defensive cap: throws if exceeded. 50k sessions ≈ 137 years of nightly
 * tracking with one source, or 27 years across 5 simultaneous sources.
 * Realistic max ~ 18k. Cap is for pathological-input DoS protection.
 */
export const MAX_SESSIONS_PER_IMPORT = 50_000;

// ─── Output shape (what ingestAppleHealthSleep consumes) ─────────────────────

export interface AggregatedSleepSession {
  /** Stable across re-imports — derives source_record_id directly. */
  sessionKey: string;
  sourceName: string;
  /** UTC bedtime — start of InBed envelope, or earliest stage start in fallback. */
  bedtime: Date | null;
  /** UTC wake — end of InBed envelope, or latest stage end in fallback. */
  wakeTime: Date | null;
  /** YYYY-MM-DD in user-local zone. Derived from wakeTime's local-date attribute. */
  wakeLocalDate: string;
  /** Sum of stage minutes (Core+Deep+REM); for legacy single-record sessions, the record's duration. */
  totalSleepMinutes: number | null;
  /** NULL for legacy sessions (pre-iOS 13) — stage breakdown not measured. */
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  /** True if assembled from the legacy single-Asleep-record path. */
  isLegacy: boolean;
  /** True if no InBed envelope existed and we keyed by wakeLocalDate fallback. */
  isFallback: boolean;
  /** Number of raw Apple Health records that contributed (diagnostics). */
  rawRecordCount: number;
}

// ─── Internal accumulator shape ──────────────────────────────────────────────

interface SessionAccumulator {
  sessionKey: string;
  sourceName: string;
  bedtime: Date | null;
  wakeTime: Date | null;
  wakeLocalDate: string;
  /** Track per-stage sums in MINUTES. NULL means "no record of this stage seen yet". */
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  /** Set when a legacy Asleep/AsleepUnspecified record was the basis of this session. */
  legacyTotalMinutes: number | null;
  rawRecordCount: number;
  isLegacy: boolean;
  isFallback: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function bumpStageMinutes(acc: SessionAccumulator, stage: string, start: Date, end: Date): void {
  const m = durationMinutes(start, end);
  if (stage === STAGE_ASLEEP_CORE) {
    acc.lightMinutes = (acc.lightMinutes ?? 0) + m;
  } else if (stage === STAGE_ASLEEP_DEEP) {
    acc.deepMinutes = (acc.deepMinutes ?? 0) + m;
  } else if (stage === STAGE_ASLEEP_REM) {
    acc.remMinutes = (acc.remMinutes ?? 0) + m;
  } else if (stage === STAGE_AWAKE) {
    acc.awakeMinutes = (acc.awakeMinutes ?? 0) + m;
  }
}

function sumStages(acc: SessionAccumulator): number | null {
  if (acc.isLegacy) {
    return acc.legacyTotalMinutes;
  }
  // total_sleep = Core + Deep + REM (NOT Awake — Awake time isn't sleep).
  // If we have any stage data, return the sum (treating NULLs as 0). If we
  // have nothing, return null (legacy path covers that case separately).
  const haveAny = acc.lightMinutes !== null || acc.deepMinutes !== null || acc.remMinutes !== null;
  if (!haveAny) return null;
  return (acc.lightMinutes ?? 0) + (acc.deepMinutes ?? 0) + (acc.remMinutes ?? 0);
}

function finalize(acc: SessionAccumulator): AggregatedSleepSession {
  return {
    sessionKey: acc.sessionKey,
    sourceName: acc.sourceName,
    bedtime: acc.bedtime,
    wakeTime: acc.wakeTime,
    wakeLocalDate: acc.wakeLocalDate,
    totalSleepMinutes: sumStages(acc),
    deepMinutes: acc.deepMinutes,
    remMinutes: acc.remMinutes,
    lightMinutes: acc.lightMinutes,
    awakeMinutes: acc.awakeMinutes,
    isLegacy: acc.isLegacy,
    isFallback: acc.isFallback,
    rawRecordCount: acc.rawRecordCount,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Aggregate raw Apple Health sleep records into per-session shape suitable
 * for `ingestAppleHealthSleep`. Pure function — no DB writes, no side effects
 * beyond the safety-threshold throw.
 *
 * Throws if the resulting session count would exceed MAX_SESSIONS_PER_IMPORT
 * — pathological-input safety. Realistic exports stay far below this.
 */
export function aggregateSleepRecords(records: SleepRecord[]): AggregatedSleepSession[] {
  if (records.length === 0) return [];

  // Sort by startDate UTC ASC. Stable sort matters: for ties (same start time
  // from same source — rare but possible) we want deterministic ordering so
  // re-imports produce identical session keys.
  const sorted = [...records].sort((a, b) => {
    const d = a.startDate.utc.getTime() - b.startDate.utc.getTime();
    if (d !== 0) return d;
    // Tiebreak on stage order to keep the assembly deterministic. InBed first
    // so it opens the envelope before any stage records share the timestamp.
    if (a.stage === STAGE_IN_BED && b.stage !== STAGE_IN_BED) return -1;
    if (b.stage === STAGE_IN_BED && a.stage !== STAGE_IN_BED) return 1;
    return 0;
  });

  // Sessions keyed by `${sourceName}|${inBedStartUtcMs}` (InBed-anchored) or
  // `${sourceName}|fallback|${wakeLocalDate}` (fallback path). Map ordering
  // is insertion-ordered; output preserves it.
  const sessions = new Map<string, SessionAccumulator>();

  // Currently-open InBed envelope (most recent InBed record we've seen).
  // Stage records fold into this if they fall within window; otherwise they
  // route to the fallback path.
  let openInBed: {
    sessionKey: string;
    windowStart: Date;
    windowEnd: Date;
  } | null = null;

  const sessionsCount = (): number => sessions.size;

  const guardThreshold = () => {
    if (sessionsCount() > MAX_SESSIONS_PER_IMPORT) {
      throw new Error(
        `[appleHealthSleepAggregator] session count exceeded safety threshold ` +
          `(${MAX_SESSIONS_PER_IMPORT}); aborting import. This indicates ` +
          `either a pathological input or a corrupt export — contact support.`
      );
    }
  };

  for (const r of sorted) {
    const stage = r.stage;
    const sourceName = r.sourceName;

    // Path 1: InBed record opens a new session.
    if (stage === STAGE_IN_BED) {
      const sessionKey = `${sourceName}|${r.startDate.utc.getTime()}`;
      const wakeLocalDate = r.endDate.localDate;
      // It's possible (rare) for two InBed records to share the same start
      // millisecond. The Map keying collapses them — accept that as
      // last-write-wins; the durations are usually identical.
      sessions.set(sessionKey, {
        sessionKey,
        sourceName,
        bedtime: r.startDate.utc,
        wakeTime: r.endDate.utc,
        wakeLocalDate,
        deepMinutes: null,
        remMinutes: null,
        lightMinutes: null,
        awakeMinutes: null,
        legacyTotalMinutes: null,
        rawRecordCount: 1,
        isLegacy: false,
        isFallback: false,
      });
      openInBed = {
        sessionKey,
        windowStart: r.startDate.utc,
        windowEnd: r.endDate.utc,
      };
      guardThreshold();
      continue;
    }

    // Path 2: legacy single-record sleep (pre-iOS 13). One record IS the
    // session — fold its duration into total_sleep_minutes, leave stage
    // breakdown NULL (not 0).
    if (LEGACY_STAGES.has(stage)) {
      const sessionKey = `${sourceName}|legacy|${r.startDate.utc.getTime()}`;
      const wakeLocalDate = r.endDate.localDate;
      const minutes = durationMinutes(r.startDate.utc, r.endDate.utc);
      sessions.set(sessionKey, {
        sessionKey,
        sourceName,
        bedtime: r.startDate.utc,
        wakeTime: r.endDate.utc,
        wakeLocalDate,
        deepMinutes: null,
        remMinutes: null,
        lightMinutes: null,
        awakeMinutes: null,
        legacyTotalMinutes: minutes,
        rawRecordCount: 1,
        isLegacy: true,
        isFallback: false,
      });
      guardThreshold();
      continue;
    }

    // Path 3: stage record (Core/Deep/REM/Awake). Try to fold into open InBed
    // session; otherwise route to fallback bucket.
    if (STAGE_BREAKDOWN.has(stage)) {
      const inWindow =
        openInBed !== null &&
        r.startDate.utc.getTime() >= openInBed.windowStart.getTime() &&
        r.startDate.utc.getTime() <= openInBed.windowEnd.getTime();

      if (inWindow && openInBed) {
        const acc = sessions.get(openInBed.sessionKey);
        if (acc) {
          bumpStageMinutes(acc, stage, r.startDate.utc, r.endDate.utc);
          acc.rawRecordCount += 1;
        }
        continue;
      }

      // Fallback: bucket by wakeLocalDate. The fallback session collapses
      // multi-segment nights but that's an acceptable trade-off for sources
      // that don't bracket sleep with InBed. Stable across re-imports — the
      // wakeLocalDate is derived from the record's endDate, which doesn't
      // change.
      const wakeLocalDate = r.endDate.localDate;
      const fallbackKey = `${sourceName}|fallback|${wakeLocalDate}`;
      let acc = sessions.get(fallbackKey);
      if (!acc) {
        acc = {
          sessionKey: fallbackKey,
          sourceName,
          bedtime: r.startDate.utc,
          wakeTime: r.endDate.utc,
          wakeLocalDate,
          deepMinutes: null,
          remMinutes: null,
          lightMinutes: null,
          awakeMinutes: null,
          legacyTotalMinutes: null,
          rawRecordCount: 0,
          isLegacy: false,
          isFallback: true,
        };
        sessions.set(fallbackKey, acc);
        guardThreshold();
      }
      // Update bedtime/wakeTime to the envelope of all records in this bucket.
      if (acc.bedtime === null || r.startDate.utc < acc.bedtime) acc.bedtime = r.startDate.utc;
      if (acc.wakeTime === null || r.endDate.utc > acc.wakeTime) acc.wakeTime = r.endDate.utc;
      bumpStageMinutes(acc, stage, r.startDate.utc, r.endDate.utc);
      acc.rawRecordCount += 1;
      continue;
    }

    // Unknown stage value — log + skip (forward-compat with future Apple
    // additions). NOT counted as unparseable here; the parser layer is the
    // source of truth for "skipped" stats.
    logger.warn(`[appleHealthSleepAggregator] unknown sleep stage value: ${stage}`);
  }

  return Array.from(sessions.values()).map(finalize);
}
