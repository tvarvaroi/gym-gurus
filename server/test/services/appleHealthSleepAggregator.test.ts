/**
 * Apple Health sleep aggregator tests — Sprint 5 BATCH 3.
 *
 * Pure function tests, no DB mocks needed. The aggregator is a deterministic
 * transform from per-stage SleepRecord[] to per-session AggregatedSleepSession[].
 *
 * Coverage matrix:
 *   - Empty input → empty output
 *   - Single InBed envelope with stages → one session, correct stage totals
 *   - Multi-segment night (2 InBed records same calendar night) → 2 sessions
 *   - Legacy single-Asleep record (pre-iOS 13) → session with total_sleep_minutes
 *     populated, stage minutes NULL
 *   - Stage records with NO InBed bracket → fallback session bucketed by wakeLocalDate
 *   - Stable session keys across re-runs (idempotency contract for re-import)
 *   - 50,000-session safety threshold throws
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateSleepRecords,
  MAX_SESSIONS_PER_IMPORT,
} from '../../services/appleHealthSleepAggregator';
import type { SleepRecord } from '../../services/appleHealthParser';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(s: string): { utc: Date; localDate: string } {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`bad date ${s}`);
  // For test purposes use UTC date as the "local" date — fine because we
  // synthesize records with deterministic UTC times.
  const localDate = d.toISOString().slice(0, 10);
  return { utc: d, localDate };
}

interface MakeRecordOpts {
  stage: string;
  start: string;
  end: string;
  sourceName?: string;
  externalUuid?: string;
}

function makeRecord(opts: MakeRecordOpts): SleepRecord {
  return {
    sourceName: opts.sourceName ?? 'Apple Watch',
    sourceVersion: '10.0',
    device: undefined,
    externalUuid: opts.externalUuid,
    startDate: isoDate(opts.start),
    endDate: isoDate(opts.end),
    creationDate: undefined,
    stage: opts.stage,
    recordType: 'HKCategoryTypeIdentifierSleepAnalysis',
  };
}

const STAGES = {
  IN_BED: 'HKCategoryValueSleepAnalysisInBed',
  CORE: 'HKCategoryValueSleepAnalysisAsleepCore',
  DEEP: 'HKCategoryValueSleepAnalysisAsleepDeep',
  REM: 'HKCategoryValueSleepAnalysisAsleepREM',
  AWAKE: 'HKCategoryValueSleepAnalysisAwake',
  ASLEEP_LEGACY: 'HKCategoryValueSleepAnalysisAsleep',
  ASLEEP_UNSPECIFIED: 'HKCategoryValueSleepAnalysisAsleepUnspecified',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('aggregateSleepRecords — empty + sentinel', () => {
  it('returns empty array on empty input', () => {
    expect(aggregateSleepRecords([])).toEqual([]);
  });

  it('logs + skips records with unknown stage values without throwing', () => {
    const result = aggregateSleepRecords([
      makeRecord({
        stage: 'HKCategoryValueSleepAnalysisFutureStageNotYetReleased',
        start: '2026-01-15T22:00:00Z',
        end: '2026-01-16T06:00:00Z',
      }),
    ]);
    // Unknown stage records produce no session — they're not InBed, not legacy,
    // not a known breakdown. Skipped silently with a logger.warn.
    expect(result).toEqual([]);
  });
});

describe('aggregateSleepRecords — InBed-anchored single session', () => {
  it('produces one session for an InBed envelope with all four stages', () => {
    const records = [
      makeRecord({
        stage: STAGES.IN_BED,
        start: '2026-01-15T22:00:00Z',
        end: '2026-01-16T06:00:00Z',
      }),
      makeRecord({
        stage: STAGES.CORE,
        start: '2026-01-15T22:30:00Z',
        end: '2026-01-15T23:30:00Z',
      }), // 60 min light
      makeRecord({
        stage: STAGES.DEEP,
        start: '2026-01-15T23:30:00Z',
        end: '2026-01-16T00:30:00Z',
      }), // 60 min deep
      makeRecord({
        stage: STAGES.REM,
        start: '2026-01-16T00:30:00Z',
        end: '2026-01-16T01:30:00Z',
      }), // 60 min rem
      makeRecord({
        stage: STAGES.AWAKE,
        start: '2026-01-16T01:30:00Z',
        end: '2026-01-16T01:45:00Z',
      }), // 15 min awake
    ];
    const sessions = aggregateSleepRecords(records);
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.lightMinutes).toBe(60);
    expect(s.deepMinutes).toBe(60);
    expect(s.remMinutes).toBe(60);
    expect(s.awakeMinutes).toBe(15);
    // total = light + deep + rem (NOT awake — awake isn't sleep)
    expect(s.totalSleepMinutes).toBe(180);
    expect(s.isLegacy).toBe(false);
    expect(s.isFallback).toBe(false);
    expect(s.bedtime?.toISOString()).toBe('2026-01-15T22:00:00.000Z');
    expect(s.wakeTime?.toISOString()).toBe('2026-01-16T06:00:00.000Z');
    expect(s.wakeLocalDate).toBe('2026-01-16');
  });

  it('session key is stable across re-aggregation (idempotent re-import)', () => {
    const records = [
      makeRecord({
        stage: STAGES.IN_BED,
        start: '2026-01-15T22:00:00Z',
        end: '2026-01-16T06:00:00Z',
        sourceName: 'Apple Watch',
      }),
      makeRecord({
        stage: STAGES.CORE,
        start: '2026-01-15T22:30:00Z',
        end: '2026-01-15T23:30:00Z',
      }),
    ];
    const first = aggregateSleepRecords(records);
    const second = aggregateSleepRecords(records);
    expect(first[0].sessionKey).toBe(second[0].sessionKey);
    expect(first[0].sessionKey).toContain('Apple Watch');
    // Key embeds the InBed startDate UTC ms — derivable from input deterministically.
    const expectedKey = `Apple Watch|${new Date('2026-01-15T22:00:00Z').getTime()}`;
    expect(first[0].sessionKey).toBe(expectedKey);
  });

  it('session key changes with sourceName (Apple Watch vs AutoSleep paired with same envelope)', () => {
    const recA = makeRecord({
      stage: STAGES.IN_BED,
      start: '2026-01-15T22:00:00Z',
      end: '2026-01-16T06:00:00Z',
      sourceName: 'Apple Watch',
    });
    const recB = makeRecord({
      stage: STAGES.IN_BED,
      start: '2026-01-15T22:00:00Z',
      end: '2026-01-16T06:00:00Z',
      sourceName: 'AutoSleep',
    });
    const sessions = aggregateSleepRecords([recA, recB]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].sessionKey).not.toBe(sessions[1].sessionKey);
  });
});

describe('aggregateSleepRecords — multi-segment night', () => {
  it('produces two sessions when user wakes mid-night and goes back to sleep', () => {
    // Real-world: user goes to bed at 10pm, wakes at 3am, gets up, back to bed
    // at 3:30am, sleeps until 6am. Two distinct InBed envelopes, same calendar
    // wake date.
    const records = [
      makeRecord({
        stage: STAGES.IN_BED,
        start: '2026-01-15T22:00:00Z',
        end: '2026-01-16T03:00:00Z',
      }),
      makeRecord({
        stage: STAGES.CORE,
        start: '2026-01-15T22:30:00Z',
        end: '2026-01-15T23:30:00Z',
      }),
      makeRecord({
        stage: STAGES.DEEP,
        start: '2026-01-15T23:30:00Z',
        end: '2026-01-16T00:30:00Z',
      }),
      // ─── User up between 3am-3:30am ─────────────────────────────
      makeRecord({
        stage: STAGES.IN_BED,
        start: '2026-01-16T03:30:00Z',
        end: '2026-01-16T06:00:00Z',
      }),
      makeRecord({
        stage: STAGES.CORE,
        start: '2026-01-16T04:00:00Z',
        end: '2026-01-16T05:00:00Z',
      }),
      makeRecord({
        stage: STAGES.REM,
        start: '2026-01-16T05:00:00Z',
        end: '2026-01-16T05:30:00Z',
      }),
    ];
    const sessions = aggregateSleepRecords(records);
    expect(sessions).toHaveLength(2);
    // First segment: 60 light + 60 deep + 0 rem = 120 total
    expect(sessions[0].totalSleepMinutes).toBe(120);
    expect(sessions[0].lightMinutes).toBe(60);
    expect(sessions[0].deepMinutes).toBe(60);
    expect(sessions[0].remMinutes).toBe(null);
    // Second segment: 60 light + 0 deep + 30 rem = 90 total
    expect(sessions[1].totalSleepMinutes).toBe(90);
    expect(sessions[1].lightMinutes).toBe(60);
    expect(sessions[1].remMinutes).toBe(30);
    // Distinct session keys despite same wake date.
    expect(sessions[0].sessionKey).not.toBe(sessions[1].sessionKey);
    // Both wake on 2026-01-16.
    expect(sessions[0].wakeLocalDate).toBe(sessions[1].wakeLocalDate);
  });
});

describe('aggregateSleepRecords — legacy single-record sessions (pre-iOS 13)', () => {
  it('produces a session with total_sleep_minutes from duration, stages NULL', () => {
    const records = [
      makeRecord({
        stage: STAGES.ASLEEP_LEGACY,
        start: '2026-01-15T22:00:00Z',
        end: '2026-01-16T05:30:00Z', // 7.5 hours = 450 min
        sourceName: 'iPhone',
      }),
    ];
    const sessions = aggregateSleepRecords(records);
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.isLegacy).toBe(true);
    expect(s.totalSleepMinutes).toBe(450);
    // Crucial: stages are NULL (not 0). NULL means "not measured", 0 would
    // wrongly mean "measured as zero".
    expect(s.deepMinutes).toBeNull();
    expect(s.remMinutes).toBeNull();
    expect(s.lightMinutes).toBeNull();
    expect(s.awakeMinutes).toBeNull();
  });

  it('AsleepUnspecified value also routes to legacy path', () => {
    const records = [
      makeRecord({
        stage: STAGES.ASLEEP_UNSPECIFIED,
        start: '2026-01-15T23:00:00Z',
        end: '2026-01-16T07:00:00Z', // 8 hours = 480 min
      }),
    ];
    const sessions = aggregateSleepRecords(records);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].isLegacy).toBe(true);
    expect(sessions[0].totalSleepMinutes).toBe(480);
    expect(sessions[0].deepMinutes).toBeNull();
  });
});

describe('aggregateSleepRecords — fallback path (no InBed envelope)', () => {
  it('groups stage records by wakeLocalDate when no InBed bracket exists', () => {
    // Third-party app writes Asleep stages without an InBed wrapper. All three
    // stages end on the same calendar date (Jan 16) so they share a fallback
    // bucket. The bucket key is derived from each record's endDate.localDate.
    const records = [
      makeRecord({
        stage: STAGES.CORE,
        start: '2026-01-15T23:00:00Z',
        end: '2026-01-16T00:00:00Z',
        sourceName: 'Pillow',
      }),
      makeRecord({
        stage: STAGES.DEEP,
        start: '2026-01-16T00:00:00Z',
        end: '2026-01-16T01:00:00Z',
        sourceName: 'Pillow',
      }),
      makeRecord({
        stage: STAGES.REM,
        start: '2026-01-16T01:00:00Z',
        end: '2026-01-16T02:00:00Z',
        sourceName: 'Pillow',
      }),
    ];
    const sessions = aggregateSleepRecords(records);
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.isFallback).toBe(true);
    expect(s.lightMinutes).toBe(60);
    expect(s.deepMinutes).toBe(60);
    expect(s.remMinutes).toBe(60);
    expect(s.totalSleepMinutes).toBe(180);
    // Fallback session key embeds the wakeLocalDate (NOT a record timestamp).
    expect(s.sessionKey).toContain('fallback');
    expect(s.sessionKey).toContain(s.wakeLocalDate);
  });

  it('stage record outside InBed window routes to fallback bucket', () => {
    const records = [
      makeRecord({
        stage: STAGES.IN_BED,
        start: '2026-01-15T22:00:00Z',
        end: '2026-01-16T06:00:00Z',
      }),
      makeRecord({
        stage: STAGES.CORE,
        start: '2026-01-15T22:30:00Z',
        end: '2026-01-15T23:30:00Z',
      }),
      // This Awake at noon is NOT part of the night session
      makeRecord({
        stage: STAGES.AWAKE,
        start: '2026-01-16T12:00:00Z',
        end: '2026-01-16T12:30:00Z',
      }),
    ];
    const sessions = aggregateSleepRecords(records);
    // Two sessions: the InBed-anchored night session + the fallback midday-awake bucket
    expect(sessions).toHaveLength(2);
    const inBedSession = sessions.find((s) => !s.isFallback);
    const fallbackSession = sessions.find((s) => s.isFallback);
    expect(inBedSession).toBeDefined();
    expect(fallbackSession).toBeDefined();
    expect(inBedSession!.lightMinutes).toBe(60);
    expect(inBedSession!.awakeMinutes).toBeNull(); // midday awake didn't fold here
    expect(fallbackSession!.awakeMinutes).toBe(30);
  });
});

describe('aggregateSleepRecords — pathological-input safety', () => {
  it('throws when session count exceeds MAX_SESSIONS_PER_IMPORT', () => {
    // Synthesize one extra past the threshold to trigger the guard. We use
    // unique InBed start times so each record opens its own session.
    const synthetic: SleepRecord[] = [];
    for (let i = 0; i <= MAX_SESSIONS_PER_IMPORT; i += 1) {
      const startMs = new Date('2000-01-01T00:00:00Z').getTime() + i * 60_000;
      const endMs = startMs + 60_000;
      synthetic.push(
        makeRecord({
          stage: STAGES.IN_BED,
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
          sourceName: 'PathologicalInput',
        })
      );
    }
    expect(() => aggregateSleepRecords(synthetic)).toThrow(/safety threshold/);
  });

  it('does NOT throw at exactly MAX_SESSIONS_PER_IMPORT (boundary check)', () => {
    // Boundary: exactly the cap should pass. We synthesize MAX_SESSIONS records.
    // This test is potentially slow at 50,000 records — keep it for boundary
    // proof, accept the cost.
    const synthetic: SleepRecord[] = [];
    for (let i = 0; i < MAX_SESSIONS_PER_IMPORT; i += 1) {
      const startMs = new Date('2000-01-01T00:00:00Z').getTime() + i * 60_000;
      const endMs = startMs + 60_000;
      synthetic.push(
        makeRecord({
          stage: STAGES.IN_BED,
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
          sourceName: 'BoundaryInput',
        })
      );
    }
    expect(() => aggregateSleepRecords(synthetic)).not.toThrow();
  });
});

describe('aggregateSleepRecords — tiebreak ordering', () => {
  it('InBed sorts before stages with identical startDate (deterministic envelope opening)', () => {
    const sameStart = '2026-01-15T22:00:00Z';
    // Stages first in input array, but InBed shares the exact start time.
    const records = [
      makeRecord({
        stage: STAGES.CORE,
        start: sameStart,
        end: '2026-01-15T23:00:00Z',
      }),
      makeRecord({
        stage: STAGES.IN_BED,
        start: sameStart,
        end: '2026-01-16T06:00:00Z',
      }),
    ];
    const sessions = aggregateSleepRecords(records);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].isFallback).toBe(false);
    // Core record (60 min) should fold into the InBed session, not fallback.
    expect(sessions[0].lightMinutes).toBe(60);
  });
});
