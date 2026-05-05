/**
 * Wellness Service — Sprint 3 BATCH 2
 *
 * Pure orchestration over `daily_wellness_log` + `userGamification` wellness streak fields.
 *
 * "Today" is defined per `_brain/notes/decisions.md` "Today definition":
 * always read from `users.notification_preferences.quietHours.timezone`. Browser
 * timezone is NEVER consulted. Caller passes `tz` explicitly so this service
 * stays pure (no users-table fetch hidden inside).
 *
 * v0 readiness algorithm: weighted average of
 *   - subjective inputs (40%): avg of provided 1-10 sliders, normalised to 0-100,
 *     stress/soreness inverted (10=bad → 0; 1=good → 100); other fields direct.
 *   - training load via existing ACWR (30%): pulled from userMuscleVolume + userMuscleFatigue.
 *   - muscle recovery (30%): inverted average of userMuscleFatigue.fatigueLevel.
 *
 * Sprint 6 will replace this with Recovery Engine v2; the on-disk
 * `readiness_score_factors` shape carries `algorithm: 'v0'` so historical entries
 * stay traceable to the algorithm that produced them.
 */

import { sql, eq, and, desc, isNotNull } from 'drizzle-orm';
import { getDb } from '../db';
import {
  dailyWellnessLog,
  userGamification,
  userMuscleFatigue,
  type DailyWellnessLog,
  type InsertDailyWellnessLog,
  type ReadinessScoreFactors,
  type ReadinessScoreFactor,
} from '../../shared/schema';
import { awardXp, initializeUserGamification } from './gamification/xpService';

const ALGORITHM_VERSION = 'v0';
const SUBJECTIVE_WEIGHT = 0.4;
const TRAINING_LOAD_WEIGHT = 0.3;
const RECOVERY_WEIGHT = 0.3;

const WELLNESS_CHECK_IN_XP = 10;

// ─── Time helpers ─────────────────────────────────────────────────────────────
// 'YYYY-MM-DD' in the user's IANA timezone via Intl.DateTimeFormat. en-CA locale
// gives ISO date format directly (2026-05-06), no manual padding needed.
export function todayInTimezone(tz: string, now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

// Yesterday in user's timezone — for streak continuity check.
function yesterdayInTimezone(tz: string, now: Date = new Date()): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return todayInTimezone(tz, yesterday);
}

// Days difference between two YYYY-MM-DD date strings (positive if a > b).
function dateDiffDays(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00Z`);
  const bDate = new Date(`${b}T00:00:00Z`);
  return Math.round((aDate.getTime() - bDate.getTime()) / (24 * 60 * 60 * 1000));
}

// ─── v0 Readiness Score ───────────────────────────────────────────────────────
//
// Returns the labeled-factors shape per `decisions.md` Sprint 3 entry. The UI
// in BATCH 5 reads `factors[].label` directly — labels are derived once at
// compute time, not at every render.
//
// Inputs that aren't available reduce the COMPONENT count, not the score —
// missing inputs are listed in `missingInputs` for the future "connect a
// wearable for better readiness scores" upsell.

const SUBJECTIVE_FIELDS = {
  energyLevel: { invert: false, label: 'Energy' },
  moodScore: { invert: false, label: 'Mood' },
  stressLevel: { invert: true, label: 'Stress (inverted)' },
  sleepQualitySubjective: { invert: false, label: 'Sleep quality' },
  motivationLevel: { invert: false, label: 'Motivation' },
  sorenessOverall: { invert: true, label: 'Soreness (inverted)' },
} as const;

type SubjectiveKey = keyof typeof SUBJECTIVE_FIELDS;

export function computeReadinessScoreV0(
  entry: Partial<DailyWellnessLog>,
  recentTrainingLoad: number | null,
  recentMuscleFatigue: number | null
): { score: number; factors: ReadinessScoreFactors } {
  const presentFactors: ReadinessScoreFactor[] = [];
  const missingInputs: string[] = [];

  // ─── (1) Subjective component ───────────────────────────────────────────
  const subjectiveValues: number[] = [];
  for (const key of Object.keys(SUBJECTIVE_FIELDS) as SubjectiveKey[]) {
    const v = (entry as any)[key] as number | null | undefined;
    if (v == null) {
      missingInputs.push(key);
      continue;
    }
    // Normalize 1-10 → 0-100, inverting stress/soreness
    const cfg = SUBJECTIVE_FIELDS[key];
    const normalised = cfg.invert ? ((10 - v) / 9) * 100 : ((v - 1) / 9) * 100;
    subjectiveValues.push(normalised);
  }
  const subjectiveScore =
    subjectiveValues.length > 0
      ? Math.round(subjectiveValues.reduce((a, b) => a + b, 0) / subjectiveValues.length)
      : null;
  if (subjectiveScore !== null) {
    presentFactors.push({
      label: 'Subjective wellness',
      score: subjectiveScore,
      weight: SUBJECTIVE_WEIGHT,
      contribution: round1(subjectiveScore * SUBJECTIVE_WEIGHT),
    });
  } else {
    missingInputs.push('subjective_avg');
  }

  // ─── (2) Training load (ACWR) component ─────────────────────────────────
  if (recentTrainingLoad !== null) {
    const tlScore = Math.max(0, Math.min(100, Math.round(recentTrainingLoad)));
    presentFactors.push({
      label: 'Training load (ACWR)',
      score: tlScore,
      weight: TRAINING_LOAD_WEIGHT,
      contribution: round1(tlScore * TRAINING_LOAD_WEIGHT),
    });
  } else {
    missingInputs.push('trainingLoad');
  }

  // ─── (3) Muscle recovery component ──────────────────────────────────────
  if (recentMuscleFatigue !== null) {
    // userMuscleFatigue.fatigueLevel is 0-100 where 0=fresh, 100=fully fatigued.
    // Invert so 0=worst-recovery, 100=best-recovery to align with the score axis.
    const recoveryScore = Math.max(0, Math.min(100, Math.round(100 - recentMuscleFatigue)));
    presentFactors.push({
      label: 'Muscle recovery',
      score: recoveryScore,
      weight: RECOVERY_WEIGHT,
      contribution: round1(recoveryScore * RECOVERY_WEIGHT),
    });
  } else {
    missingInputs.push('muscleRecovery');
  }

  // ─── (4) Combine ────────────────────────────────────────────────────────
  // If we have all three components, the simple weighted sum is the score.
  // If we're missing components, renormalise against the SUM of present weights
  // so the result still lands on 0-100 instead of being arbitrarily depressed.
  let score: number;
  if (presentFactors.length === 0) {
    score = 50; // safe neutral default — should be unreachable given .refine() requires at least one input
  } else {
    const totalWeight = presentFactors.reduce((s, f) => s + f.weight, 0);
    const weightedSum = presentFactors.reduce((s, f) => s + f.contribution, 0);
    score = Math.round(weightedSum / totalWeight);
  }

  return {
    score,
    factors: {
      factors: presentFactors,
      missingInputs,
      computedAt: new Date().toISOString(),
      algorithm: ALGORITHM_VERSION,
    },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Recent context for the v0 algorithm ─────────────────────────────────────
// Pull what we need from existing tables. Returns null components if data is
// genuinely absent; never throws.
async function getRecentContext(userId: string): Promise<{
  trainingLoad: number | null;
  muscleFatigueAvg: number | null;
}> {
  const db = await getDb();

  // Muscle fatigue average across recent muscle groups. NULL if no rows.
  const fatigueRows = await db
    .select({ fatigueLevel: userMuscleFatigue.fatigueLevel })
    .from(userMuscleFatigue)
    .where(eq(userMuscleFatigue.userId, userId));
  const numericFatigue = fatigueRows
    .map((r) => (r.fatigueLevel == null ? null : parseFloat(r.fatigueLevel)))
    .filter((n): n is number => n !== null && !Number.isNaN(n));
  const muscleFatigueAvg =
    numericFatigue.length > 0
      ? numericFatigue.reduce((a, b) => a + b, 0) / numericFatigue.length
      : null;

  // Training load: v0 derives a coarse 0-100 from the same fatigue rows
  // (high training load shows up as elevated fatigue). Sprint 6 will replace
  // with the proper ACWR computation that already exists in the recovery
  // service. For v0 we keep this self-contained — no cross-service calls.
  const trainingLoad =
    muscleFatigueAvg !== null ? Math.max(0, Math.min(100, Math.round(muscleFatigueAvg))) : null;

  return { trainingLoad, muscleFatigueAvg };
}

// ─── Read paths ──────────────────────────────────────────────────────────────
export async function getTodayEntry(userId: string, tz: string): Promise<DailyWellnessLog | null> {
  const db = await getDb();
  const today = todayInTimezone(tz);
  const [row] = await db
    .select()
    .from(dailyWellnessLog)
    .where(and(eq(dailyWellnessLog.userId, userId), eq(dailyWellnessLog.date, today)))
    .limit(1);
  return row ?? null;
}

export async function getWellnessHistory(
  userId: string,
  days: number
): Promise<DailyWellnessLog[]> {
  const db = await getDb();
  const clamped = Math.max(1, Math.min(365, Math.floor(days || 30)));
  return db
    .select()
    .from(dailyWellnessLog)
    .where(eq(dailyWellnessLog.userId, userId))
    .orderBy(desc(dailyWellnessLog.date))
    .limit(clamped);
}

export async function getWellnessStreak(
  userId: string
): Promise<{ current: number; longest: number; lastCheckIn: string | null }> {
  const db = await getDb();
  const [row] = await db
    .select({
      current: userGamification.currentWellnessStreakDays,
      longest: userGamification.longestWellnessStreakDays,
      lastCheckIn: userGamification.lastWellnessCheckInDate,
    })
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);
  if (!row) return { current: 0, longest: 0, lastCheckIn: null };
  return {
    current: row.current ?? 0,
    longest: row.longest ?? 0,
    lastCheckIn: row.lastCheckIn,
  };
}

// ─── Write paths ─────────────────────────────────────────────────────────────
//
// upsertTodayEntry returns isNewInsert so the route can grant XP exactly once
// per day per user. XP grants only on isNewInsert=true; edits don't re-reward.
// See `_brain/notes/decisions.md` Sprint 3 entry for the rationale and
// `routes/wellness.ts` POST /log for the call site.
export interface UpsertTodayResult {
  entry: DailyWellnessLog;
  isNewInsert: boolean;
  score: { score: number; factors: ReadinessScoreFactors };
}

export async function upsertTodayEntry(
  userId: string,
  tz: string,
  partial: InsertDailyWellnessLog
): Promise<UpsertTodayResult> {
  const db = await getDb();
  const today = todayInTimezone(tz);

  // Check if today's row already exists. ON CONFLICT (user_id, date) DO UPDATE
  // would be slicker but gives us no clean way to detect insert-vs-update
  // (Postgres' xmax-on-conflict trick is fragile across drivers). Two-step
  // pattern is dead simple and the UNIQUE constraint guarantees correctness:
  //   1. SELECT existing
  //   2. INSERT or UPDATE accordingly
  const [existing] = await db
    .select()
    .from(dailyWellnessLog)
    .where(and(eq(dailyWellnessLog.userId, userId), eq(dailyWellnessLog.date, today)))
    .limit(1);

  // Compute readiness using the merged shape (existing values overlaid by partial).
  const merged: Partial<DailyWellnessLog> = {
    ...(existing ?? {}),
    ...partial,
  };
  const ctx = await getRecentContext(userId);
  const score = computeReadinessScoreV0(merged, ctx.trainingLoad, ctx.muscleFatigueAvg);

  const writeValues = {
    ...partial,
    readinessScore: score.score,
    readinessScoreFactors: score.factors,
  };

  let entry: DailyWellnessLog;
  let isNewInsert: boolean;

  if (existing) {
    isNewInsert = false;
    const [updated] = await db
      .update(dailyWellnessLog)
      .set(writeValues)
      .where(and(eq(dailyWellnessLog.userId, userId), eq(dailyWellnessLog.date, today)))
      .returning();
    entry = updated;
  } else {
    isNewInsert = true;
    const [inserted] = await db
      .insert(dailyWellnessLog)
      .values({
        userId,
        date: today,
        ...writeValues,
      })
      .returning();
    entry = inserted;
  }

  return { entry, isNewInsert, score };
}

export async function deleteTodayEntry(
  userId: string,
  tz: string
): Promise<DailyWellnessLog | null> {
  const db = await getDb();
  const today = todayInTimezone(tz);
  const [deleted] = await db
    .delete(dailyWellnessLog)
    .where(and(eq(dailyWellnessLog.userId, userId), eq(dailyWellnessLog.date, today)))
    .returning();
  return deleted ?? null;
}

// ─── Streak orchestration ────────────────────────────────────────────────────
//
// Belt-and-suspenders pattern from `decisions.md` retry-cron entry: explicitly
// write the settled state, never derive from null. After a check-in:
//   - If lastCheckIn = today: no-op (user re-saved same day, idempotent)
//   - If lastCheckIn = yesterday: increment current; bump longest if exceeded
//   - Else: reset current to 1 (today is a fresh streak start)
export interface WellnessStreakUpdate {
  current: number;
  longest: number;
  isNewStreakStart: boolean;
}

export async function updateWellnessStreakAfterCheckIn(
  userId: string,
  tz: string
): Promise<WellnessStreakUpdate> {
  const db = await getDb();
  const today = todayInTimezone(tz);
  const yesterday = yesterdayInTimezone(tz);

  // Ensure userGamification row exists (idempotent)
  const [existing] = await db
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  if (!existing) {
    await initializeUserGamification(userId);
  }

  const [row] = await db
    .select({
      current: userGamification.currentWellnessStreakDays,
      longest: userGamification.longestWellnessStreakDays,
      lastCheckIn: userGamification.lastWellnessCheckInDate,
    })
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  const currentBefore = row?.current ?? 0;
  const longestBefore = row?.longest ?? 0;
  const lastCheckIn = row?.lastCheckIn ?? null;

  let nextCurrent: number;
  let isNewStreakStart = false;
  if (lastCheckIn === today) {
    // Idempotent re-save — streak unchanged.
    nextCurrent = currentBefore;
  } else if (lastCheckIn === yesterday) {
    nextCurrent = currentBefore + 1;
  } else {
    // Either first check-in ever or streak broken — start fresh at 1.
    nextCurrent = 1;
    isNewStreakStart = true;
  }
  const nextLongest = Math.max(longestBefore, nextCurrent);

  await db
    .update(userGamification)
    .set({
      currentWellnessStreakDays: nextCurrent,
      longestWellnessStreakDays: nextLongest,
      lastWellnessCheckInDate: today,
      updatedAt: new Date(),
    })
    .where(eq(userGamification.userId, userId));

  return { current: nextCurrent, longest: nextLongest, isNewStreakStart };
}

// Best-effort streak recompute after deleting today's entry. Reads recent rows
// in date-DESC order; the streak is the longest run ending on yesterday-in-tz.
// (After deleting today, the streak's "today" reference shifts to yesterday;
// next check-in tomorrow will correctly extend.)
export async function recomputeWellnessStreakAfterDelete(
  userId: string,
  tz: string
): Promise<WellnessStreakUpdate> {
  const db = await getDb();
  const yesterday = yesterdayInTimezone(tz);

  // Fetch dates of recent entries (we don't need full rows, just dates)
  const rows = await db
    .select({ date: dailyWellnessLog.date })
    .from(dailyWellnessLog)
    .where(eq(dailyWellnessLog.userId, userId))
    .orderBy(desc(dailyWellnessLog.date))
    .limit(400); // > 1 year — more than enough to bound the longest possible streak

  // Walk backward from yesterday; count consecutive days.
  let nextCurrent = 0;
  let cursor = yesterday;
  const dates = new Set(rows.map((r) => r.date));
  while (dates.has(cursor)) {
    nextCurrent += 1;
    const prev = new Date(`${cursor}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursor = todayInTimezone(tz, prev);
  }

  const [existing] = await db
    .select({
      longest: userGamification.longestWellnessStreakDays,
    })
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);
  const longestBefore = existing?.longest ?? 0;
  // Don't shrink the longest streak ever — it's a historical record.
  const nextLongest = Math.max(longestBefore, nextCurrent);

  // lastCheckIn shifts to whatever the most recent remaining entry is.
  const newLastCheckIn = rows[0]?.date ?? null;

  await db
    .update(userGamification)
    .set({
      currentWellnessStreakDays: nextCurrent,
      longestWellnessStreakDays: nextLongest,
      lastWellnessCheckInDate: newLastCheckIn,
      updatedAt: new Date(),
    })
    .where(eq(userGamification.userId, userId));

  return { current: nextCurrent, longest: nextLongest, isNewStreakStart: false };
}

// ─── XP grant (idempotent per day) ───────────────────────────────────────────
// Awards WELLNESS_CHECK_IN_XP only when isNewInsert=true. Caller in
// routes/wellness.ts POST /log invokes this AFTER upsertTodayEntry.
export async function grantWellnessXpIfFirstCheckInToday(
  userId: string,
  isNewInsert: boolean
): Promise<{ xpAwarded: number }> {
  if (!isNewInsert) return { xpAwarded: 0 };
  await awardXp(userId, WELLNESS_CHECK_IN_XP, 'wellness_check_in');
  return { xpAwarded: WELLNESS_CHECK_IN_XP };
}
