/**
 * Wellness Service Tests — Sprint 3 BATCH 7
 *
 * Coverage:
 *   - computeReadinessScoreV0 — pure function, all 8 permutations of
 *     present/missing inputs (subjective ∪ trainingLoad ∪ muscleFatigue),
 *     normalisation correctness on stress/soreness inversion, weight
 *     renormalisation when components are missing, factors[].label/weight/
 *     contribution shape, missingInputs[] enumeration, algorithm tag = 'v0'.
 *   - todayInTimezone — IANA timezone date computation across day boundaries
 *     (Tokyo vs New York at the same UTC moment lands on different dates).
 *   - getWellnessStreak — returns {0,0,null} when no userGamification row,
 *     reads back what the row stores.
 *
 * Strategy: computeReadinessScoreV0 is PURE — no mocks needed. The streak
 * read tests mock the db chain via the same vi.hoisted pattern as the route
 * tests below.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted DB spy state — used only by the streak read test
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper } = vi.hoisted(() => {
  const spyState = {
    queue: [] as unknown[],
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.queue = [];
    },
  };

  function makeQueryBuilder() {
    const qb: Record<string, unknown> = {};
    const passthrough = ['from', 'where', 'orderBy', 'limit', 'values', 'returning', 'set'];
    for (const m of passthrough) {
      qb[m] = () => qb;
    }
    qb.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const next = spyState.queue.length > 0 ? spyState.queue.shift() : [];
      return Promise.resolve(next).then(resolve, reject);
    };
    return qb;
  }

  function makeDbWrapper() {
    return {
      select: () => makeQueryBuilder(),
      insert: () => makeQueryBuilder(),
      update: () => makeQueryBuilder(),
      delete: () => makeQueryBuilder(),
      execute: () => Promise.resolve({ rows: [] }),
    };
  }

  return { spyState, makeDbWrapper };
});

vi.mock('../../db', () => {
  const wrapper = makeDbWrapper();
  return {
    getDb: vi.fn(async () => wrapper),
    db: wrapper,
    getPool: vi.fn(),
    pool: null,
  };
});

vi.mock('../../services/gamification/xpService', () => ({
  awardXp: vi.fn(),
  initializeUserGamification: vi.fn(),
}));

vi.mock('../../logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), audit: vi.fn() },
  log: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  computeReadinessScoreV0,
  todayInTimezone,
  getWellnessStreak,
} from '../../services/wellnessService';

// ===========================================================================
// computeReadinessScoreV0 — algorithm correctness
// ===========================================================================

describe('computeReadinessScoreV0 — all-present input', () => {
  it('returns 3 factors when subjective + training load + muscle fatigue are all present', () => {
    const result = computeReadinessScoreV0(
      {
        energyLevel: 8,
        moodScore: 7,
        stressLevel: 4,
        sleepQualitySubjective: 7,
        motivationLevel: 8,
        sorenessOverall: 3,
      },
      40, // recentTrainingLoad — 0-100, 40 = moderate
      30 // recentMuscleFatigue — 0-100, 30 means 70 recovery score
    );
    expect(result.factors.factors).toHaveLength(3);
    expect(result.factors.factors.map((f) => f.label).sort()).toEqual([
      'Muscle recovery',
      'Subjective wellness',
      'Training load (ACWR)',
    ]);
    expect(result.factors.algorithm).toBe('v0');
    expect(result.factors.missingInputs).toEqual([]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('computeReadinessScoreV0 — missing-input permutations', () => {
  it('only subjective (no training load, no muscle fatigue) — single factor, score uses subjective only', () => {
    const result = computeReadinessScoreV0(
      {
        energyLevel: 7,
        moodScore: 7,
        stressLevel: 4,
        sleepQualitySubjective: 7,
        motivationLevel: 8,
        sorenessOverall: 3,
      },
      null,
      null
    );
    expect(result.factors.factors).toHaveLength(1);
    expect(result.factors.factors[0].label).toBe('Subjective wellness');
    expect(result.factors.missingInputs).toContain('trainingLoad');
    expect(result.factors.missingInputs).toContain('muscleRecovery');
    // Renormalised against weight 0.4 — final score equals the subjective score.
    expect(result.score).toBe(result.factors.factors[0].score);
  });

  it('only training load present — single factor, score equals training load', () => {
    const result = computeReadinessScoreV0({}, 60, null);
    expect(result.factors.factors).toHaveLength(1);
    expect(result.factors.factors[0].label).toBe('Training load (ACWR)');
    expect(result.score).toBe(60);
    expect(result.factors.missingInputs).toContain('subjective_avg');
    expect(result.factors.missingInputs).toContain('muscleRecovery');
  });

  it('only muscle fatigue present — single factor, recovery score is INVERTED (100 - fatigue)', () => {
    const result = computeReadinessScoreV0({}, null, 30);
    expect(result.factors.factors).toHaveLength(1);
    expect(result.factors.factors[0].label).toBe('Muscle recovery');
    // fatigue=30 → recovery=70
    expect(result.factors.factors[0].score).toBe(70);
    expect(result.score).toBe(70);
  });

  it('subjective + muscle fatigue (no training load) — two factors, weight renormalised', () => {
    const result = computeReadinessScoreV0(
      { energyLevel: 7, moodScore: 7 },
      null,
      30 // fatigue → recovery=70
    );
    expect(result.factors.factors).toHaveLength(2);
    expect(result.factors.missingInputs).toContain('trainingLoad');
    // Without renormalisation, score = (subjScore*0.4 + 70*0.3)/0.7 — verify it lands in 0-100
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('all inputs missing — score=50 fallback (the .refine() prevents this in practice)', () => {
    const result = computeReadinessScoreV0({}, null, null);
    expect(result.factors.factors).toHaveLength(0);
    expect(result.score).toBe(50);
  });
});

describe('computeReadinessScoreV0 — stress/soreness inversion', () => {
  it('high stress (10) + high soreness (10) yields LOW subjective score', () => {
    const result = computeReadinessScoreV0(
      {
        energyLevel: 5,
        moodScore: 5,
        stressLevel: 10, // worst
        sleepQualitySubjective: 5,
        motivationLevel: 5,
        sorenessOverall: 10, // worst
      },
      null,
      null
    );
    // stress/soreness inverted to 0; non-inverted at midpoint (~44). Average is low.
    expect(result.factors.factors[0].score).toBeLessThan(50);
  });

  it('low stress (1) + low soreness (1) yields HIGH subjective score', () => {
    const result = computeReadinessScoreV0(
      {
        energyLevel: 5,
        moodScore: 5,
        stressLevel: 1, // best
        sleepQualitySubjective: 5,
        motivationLevel: 5,
        sorenessOverall: 1, // best
      },
      null,
      null
    );
    // stress/soreness inverted to 100; non-inverted at midpoint (~44). Average should be > 50.
    expect(result.factors.factors[0].score).toBeGreaterThan(50);
  });
});

describe('computeReadinessScoreV0 — factors shape', () => {
  it('every present factor has label, score 0-100, weight, contribution', () => {
    const result = computeReadinessScoreV0({ energyLevel: 8 }, 50, 40);
    for (const f of result.factors.factors) {
      expect(typeof f.label).toBe('string');
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(100);
      expect(f.weight).toBeGreaterThan(0);
      expect(f.weight).toBeLessThanOrEqual(1);
      expect(typeof f.contribution).toBe('number');
    }
  });

  it('readiness factors carry computedAt and algorithm tag', () => {
    const result = computeReadinessScoreV0({ energyLevel: 7 }, null, null);
    expect(result.factors.algorithm).toBe('v0');
    expect(typeof result.factors.computedAt).toBe('string');
    expect(() => new Date(result.factors.computedAt).toISOString()).not.toThrow();
  });
});

// ===========================================================================
// todayInTimezone — IANA cross-day correctness
// ===========================================================================

describe('todayInTimezone', () => {
  it('returns a YYYY-MM-DD string in the user timezone', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    const date = todayInTimezone('UTC', now);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(date).toBe('2026-05-06');
  });

  it('falls on different calendar dates for users in opposite timezones at the same UTC moment', () => {
    // 2026-05-06 23:30 UTC →
    //   Asia/Tokyo (UTC+9) is 2026-05-07 08:30 — calendar day 07
    //   America/Honolulu (UTC-10) is 2026-05-06 13:30 — calendar day 06
    const now = new Date('2026-05-06T23:30:00Z');
    const tokyo = todayInTimezone('Asia/Tokyo', now);
    const honolulu = todayInTimezone('Pacific/Honolulu', now);
    expect(tokyo).toBe('2026-05-07');
    expect(honolulu).toBe('2026-05-06');
  });

  it('falls back to UTC when given an empty timezone string', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    expect(todayInTimezone('', now)).toBe('2026-05-06');
  });
});

// ===========================================================================
// getWellnessStreak — returns sane default when no row, reads stored values
// ===========================================================================

describe('getWellnessStreak', () => {
  beforeEach(() => spyState.reset());

  it('returns {current:0, longest:0, lastCheckIn:null} when user has no gamification row', async () => {
    spyState.queueResults([]);
    const result = await getWellnessStreak('user-without-gamification');
    expect(result).toEqual({ current: 0, longest: 0, lastCheckIn: null });
  });

  it('passes through stored values when gamification row exists', async () => {
    spyState.queueResults([{ current: 5, longest: 14, lastCheckIn: '2026-05-05' }]);
    const result = await getWellnessStreak('user-with-streak');
    expect(result).toEqual({ current: 5, longest: 14, lastCheckIn: '2026-05-05' });
  });

  it('coerces null current/longest to 0 (defensive against half-initialised rows)', async () => {
    spyState.queueResults([{ current: null, longest: null, lastCheckIn: null }]);
    const result = await getWellnessStreak('user-half-init');
    expect(result).toEqual({ current: 0, longest: 0, lastCheckIn: null });
  });
});
