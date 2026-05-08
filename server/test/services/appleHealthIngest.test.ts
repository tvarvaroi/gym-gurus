/**
 * Apple Health ingest service tests — Sprint 5 BATCH 3.
 *
 * Strategy: pure source_record_id derivation tests (no DB), plus ingest-
 * function tests that mock db.execute to capture the call + return shape. We
 * deliberately do NOT introspect the drizzle sql template's internal chunks
 * (that's fragile across drizzle upgrades — see wearableIngest.bridge.test.ts
 * for the full walker pattern, scoped to mutation testing in BATCH 7).
 *
 * Coverage:
 *   - quantitySourceRecordId uses externalUuid when present
 *   - quantitySourceRecordId derives stable hash when externalUuid missing (re-call → same hash)
 *   - quantitySourceRecordId distinguishes records by recordType (no cross-type collision)
 *   - workoutSourceRecordId same pattern
 *   - ingestAppleHealthBody returns {inserted:true} on xmax=0
 *   - ingestAppleHealthBody returns {skippedDuplicate:true} on xmax!=0
 *   - ingestAppleHealthSleep happy path
 *   - ingestAppleHealthWorkout happy path
 *   - ingestAppleHealthVital happy path
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ────────────────────────────────────────────────────────────────

const { dbMock, executeMock } = vi.hoisted(() => {
  const executeMock = vi.fn(async () => ({ rows: [{ inserted: true }] }));
  const dbMock = {
    execute: executeMock,
  };
  return { dbMock, executeMock };
});

vi.mock('../../db', () => ({
  getDb: vi.fn(async () => dbMock),
  db: dbMock,
  getPool: vi.fn(),
  pool: null,
}));

// ─── Imports — must come AFTER vi.mock ──────────────────────────────────────

import {
  quantitySourceRecordId,
  workoutSourceRecordId,
  ingestAppleHealthBody,
  ingestAppleHealthSleep,
  ingestAppleHealthWorkout,
  ingestAppleHealthVital,
} from '../../services/appleHealthIngest';
import type { QuantityRecord, WorkoutRecord } from '../../services/appleHealthParser';
import type { AggregatedSleepSession } from '../../services/appleHealthSleepAggregator';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function isoDate(s: string) {
  const d = new Date(s);
  return { utc: d, localDate: d.toISOString().slice(0, 10) };
}

function makeQuantityRecord(opts: Partial<QuantityRecord> = {}): QuantityRecord {
  return {
    sourceName: opts.sourceName ?? 'Apple Watch',
    sourceVersion: '10.0',
    device: undefined,
    externalUuid: opts.externalUuid,
    startDate: opts.startDate ?? isoDate('2026-01-15T08:00:00Z'),
    endDate: opts.endDate ?? isoDate('2026-01-15T08:00:00Z'),
    creationDate: undefined,
    value: opts.value ?? 75,
    rawUnit: opts.rawUnit ?? 'kg',
    recordType: opts.recordType ?? 'HKQuantityTypeIdentifierBodyMass',
  };
}

function makeWorkoutRecord(opts: Partial<WorkoutRecord> = {}): WorkoutRecord {
  return {
    sourceName: opts.sourceName ?? 'Apple Watch',
    sourceVersion: '10.0',
    device: undefined,
    externalUuid: opts.externalUuid,
    startDate: opts.startDate ?? isoDate('2026-01-15T07:00:00Z'),
    endDate: opts.endDate ?? isoDate('2026-01-15T07:30:00Z'),
    creationDate: undefined,
    activityType: opts.activityType ?? 'HKWorkoutActivityTypeRunning',
    durationMinutes: opts.durationMinutes ?? 30,
    distanceMeters: opts.distanceMeters,
    totalEnergyKcal: opts.totalEnergyKcal,
  };
}

function makeAggregatedSleep(): AggregatedSleepSession {
  return {
    sessionKey: 'Apple Watch|1736924400000',
    sourceName: 'Apple Watch',
    bedtime: new Date('2026-01-15T22:00:00Z'),
    wakeTime: new Date('2026-01-16T06:00:00Z'),
    wakeLocalDate: '2026-01-16',
    totalSleepMinutes: 420,
    deepMinutes: 60,
    remMinutes: 90,
    lightMinutes: 270,
    awakeMinutes: 30,
    isLegacy: false,
    isFallback: false,
    rawRecordCount: 5,
  };
}

beforeEach(() => {
  executeMock.mockClear();
  executeMock.mockImplementation(async () => ({ rows: [{ inserted: true }] }));
});

// ─── source_record_id derivation ────────────────────────────────────────────

describe('quantitySourceRecordId', () => {
  it('returns externalUuid verbatim when present', () => {
    const r = makeQuantityRecord({ externalUuid: 'A1B2C3D4-E5F6-7890-1234-567890ABCDEF' });
    expect(quantitySourceRecordId(r)).toBe('A1B2C3D4-E5F6-7890-1234-567890ABCDEF');
  });

  it('derives stable hash when externalUuid missing', () => {
    const r = makeQuantityRecord({ externalUuid: undefined });
    const id1 = quantitySourceRecordId(r);
    const id2 = quantitySourceRecordId(r);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{32}$/); // 32 hex chars
  });

  it('distinguishes by recordType (no cross-type collision)', () => {
    const a = makeQuantityRecord({
      externalUuid: undefined,
      recordType: 'HKQuantityTypeIdentifierBodyMass',
    });
    const b = makeQuantityRecord({
      externalUuid: undefined,
      recordType: 'HKQuantityTypeIdentifierBodyFatPercentage',
    });
    expect(quantitySourceRecordId(a)).not.toBe(quantitySourceRecordId(b));
  });

  it('distinguishes by sourceName (Apple Watch vs Withings same timestamp)', () => {
    const a = makeQuantityRecord({ externalUuid: undefined, sourceName: 'Apple Watch' });
    const b = makeQuantityRecord({ externalUuid: undefined, sourceName: 'Withings' });
    expect(quantitySourceRecordId(a)).not.toBe(quantitySourceRecordId(b));
  });

  it('distinguishes by value (two records same instant + source, different value)', () => {
    const a = makeQuantityRecord({ externalUuid: undefined, value: 75.0 });
    const b = makeQuantityRecord({ externalUuid: undefined, value: 75.5 });
    expect(quantitySourceRecordId(a)).not.toBe(quantitySourceRecordId(b));
  });

  it('treats empty-string externalUuid as missing (falls through to hash)', () => {
    const r = makeQuantityRecord({ externalUuid: '' });
    const id = quantitySourceRecordId(r);
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe('workoutSourceRecordId', () => {
  it('returns externalUuid verbatim when present', () => {
    const r = makeWorkoutRecord({ externalUuid: 'WORKOUT-UUID-1' });
    expect(workoutSourceRecordId(r)).toBe('WORKOUT-UUID-1');
  });

  it('derives stable hash when externalUuid missing', () => {
    const r = makeWorkoutRecord({ externalUuid: undefined });
    const id1 = workoutSourceRecordId(r);
    const id2 = workoutSourceRecordId(r);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{32}$/);
  });

  it('distinguishes by activityType', () => {
    const a = makeWorkoutRecord({
      externalUuid: undefined,
      activityType: 'HKWorkoutActivityTypeRunning',
    });
    const b = makeWorkoutRecord({
      externalUuid: undefined,
      activityType: 'HKWorkoutActivityTypeCycling',
    });
    expect(workoutSourceRecordId(a)).not.toBe(workoutSourceRecordId(b));
  });
});

// ─── Ingest functions return shape ──────────────────────────────────────────

describe('ingestAppleHealthBody', () => {
  it('returns inserted=true on xmax=0 (fresh insert)', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthBody(
      'user-1',
      makeQuantityRecord(),
      'HKQuantityTypeIdentifierBodyMass'
    );
    expect(r).toEqual({ inserted: true, skippedDuplicate: false });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it('returns skippedDuplicate=true when ON CONFLICT fires (xmax != 0)', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: false }] });
    const r = await ingestAppleHealthBody(
      'user-1',
      makeQuantityRecord(),
      'HKQuantityTypeIdentifierBodyMass'
    );
    expect(r).toEqual({ inserted: false, skippedDuplicate: true });
  });

  it('handles empty rows array defensively (returns skippedDuplicate)', async () => {
    executeMock.mockResolvedValueOnce({ rows: [] });
    const r = await ingestAppleHealthBody(
      'user-1',
      makeQuantityRecord(),
      'HKQuantityTypeIdentifierBodyMass'
    );
    expect(r).toEqual({ inserted: false, skippedDuplicate: true });
  });
});

describe('ingestAppleHealthSleep', () => {
  it('returns inserted=true on fresh insert', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthSleep('user-1', makeAggregatedSleep());
    expect(r).toEqual({ inserted: true, skippedDuplicate: false });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it('returns skippedDuplicate=true on conflict', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: false }] });
    const r = await ingestAppleHealthSleep('user-1', makeAggregatedSleep());
    expect(r).toEqual({ inserted: false, skippedDuplicate: true });
  });
});

describe('ingestAppleHealthWorkout', () => {
  it('returns inserted=true on fresh insert', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthWorkout('user-1', makeWorkoutRecord());
    expect(r).toEqual({ inserted: true, skippedDuplicate: false });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it('handles workout without distanceMeters/totalEnergyKcal (both undefined)', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthWorkout(
      'user-1',
      makeWorkoutRecord({ distanceMeters: undefined, totalEnergyKcal: undefined })
    );
    expect(r.inserted).toBe(true);
  });
});

describe('ingestAppleHealthVital', () => {
  it('returns inserted=true on fresh insert (resting HR)', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthVital(
      'user-1',
      makeQuantityRecord({
        recordType: 'HKQuantityTypeIdentifierRestingHeartRate',
        value: 60,
        rawUnit: 'count/min',
      }),
      'HKQuantityTypeIdentifierRestingHeartRate'
    );
    expect(r).toEqual({ inserted: true, skippedDuplicate: false });
  });

  it('returns inserted=true for HRV record', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthVital(
      'user-1',
      makeQuantityRecord({
        recordType: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        value: 45.5,
        rawUnit: 'ms',
      }),
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'
    );
    expect(r.inserted).toBe(true);
  });

  it('returns inserted=true for VO2Max record', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthVital(
      'user-1',
      makeQuantityRecord({
        recordType: 'HKQuantityTypeIdentifierVO2Max',
        value: 42.5,
        rawUnit: 'mL/min·kg',
      }),
      'HKQuantityTypeIdentifierVO2Max'
    );
    expect(r.inserted).toBe(true);
  });

  it('returns inserted=true for blood oxygen record', async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ inserted: true }] });
    const r = await ingestAppleHealthVital(
      'user-1',
      makeQuantityRecord({
        recordType: 'HKQuantityTypeIdentifierOxygenSaturation',
        value: 98,
        rawUnit: '%',
      }),
      'HKQuantityTypeIdentifierOxygenSaturation'
    );
    expect(r.inserted).toBe(true);
  });
});
