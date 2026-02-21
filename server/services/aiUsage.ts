/**
 * AI Usage Tracking and Cost Control Service
 *
 * Enforces per-user, per-day request limits based on subscription tier.
 * Tracks token consumption and logs estimated cost of every AI request.
 */
import { getDb } from '../db';
import { aiUsage, users } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// ---------- Types ----------

type UserLike = {
  id: string;
  role?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  trialEndsAt?: Date | string | null;
  trainerId?: string | null;
};

// ---------- Tier Limits ----------

/** Daily AI request limits per subscription tier */
export const AI_DAILY_LIMITS: Record<string, number> = {
  pro: 50,
  trainer: 0, // Trainer tier: no AI — upgrade to Pro
  solo_ai: 20, // Ronin AI plan
  solo: 0, // Ronin Standard: no AI — upgrade to solo_ai
  trial: 5,
  none: 0,
};

/** Max output tokens per AI request (cost control) */
export const MAX_OUTPUT_TOKENS = 4000;

/** Max messages to include in conversation context */
export const MAX_CONVERSATION_MESSAGES = 20;

// ---------- Concurrent request tracking (in-memory) ----------

const concurrentMap = new Map<string, number>();

// ---------- Helpers ----------

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasActiveSubscription(user: UserLike): boolean {
  return user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
}

function isInTrial(user: UserLike): boolean {
  if (!user.trialEndsAt) return false;
  if (hasActiveSubscription(user)) return false;
  return new Date(user.trialEndsAt) > new Date();
}

// ---------- Public API ----------

/**
 * Returns the daily AI request limit for a user.
 * Disciples (role==='client') inherit the trainer's tier — Pro trainer = 5 req/day for disciple.
 */
export async function getDailyLimit(user: UserLike): Promise<number> {
  // Disciples: check their trainer's subscription
  if (user.role === 'client') {
    if (!user.trainerId) return 0;
    try {
      const db = await getDb();
      const [trainer] = await db
        .select({
          subscriptionStatus: users.subscriptionStatus,
          subscriptionTier: users.subscriptionTier,
        })
        .from(users)
        .where(eq(users.id, user.trainerId));
      if (
        trainer &&
        (trainer.subscriptionStatus === 'active' || trainer.subscriptionStatus === 'trialing') &&
        trainer.subscriptionTier === 'pro'
      ) {
        return AI_DAILY_LIMITS.disciple_pro_trainer;
      }
    } catch {
      // fall through to 0
    }
    return 0;
  }

  if (hasActiveSubscription(user)) {
    return AI_DAILY_LIMITS[user.subscriptionTier ?? ''] ?? 0;
  }
  if (isInTrial(user)) return AI_DAILY_LIMITS.trial;
  return 0;
}

/**
 * Returns today's request and token counts for a user.
 */
export async function getTodayUsage(
  userId: string
): Promise<{ requestCount: number; tokenCount: number }> {
  try {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.date, getTodayString())));
    return row
      ? { requestCount: row.requestCount, tokenCount: row.tokenCount }
      : { requestCount: 0, tokenCount: 0 };
  } catch {
    return { requestCount: 0, tokenCount: 0 };
  }
}

/**
 * Check if a user is allowed to make an AI request.
 * If allowed, reserves a concurrent slot (call releaseConcurrentSlot when done).
 */
export async function checkAndReserveSlot(user: UserLike): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: 'no_subscription' | 'trial_expired' | 'daily_limit_reached' | 'too_many_concurrent';
}> {
  const limit = await getDailyLimit(user);

  if (limit === 0) {
    const trialExpired =
      !!user.trialEndsAt &&
      new Date(user.trialEndsAt) <= new Date() &&
      !hasActiveSubscription(user);
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      reason: trialExpired ? 'trial_expired' : 'no_subscription',
    };
  }

  const { requestCount } = await getTodayUsage(user.id);
  const remaining = Math.max(0, limit - requestCount);

  if (remaining === 0) {
    return { allowed: false, remaining: 0, limit, reason: 'daily_limit_reached' };
  }

  const concurrent = concurrentMap.get(user.id) ?? 0;
  if (concurrent >= 3) {
    return { allowed: false, remaining, limit, reason: 'too_many_concurrent' };
  }

  concurrentMap.set(user.id, concurrent + 1);
  return { allowed: true, remaining, limit };
}

/** Release a concurrent slot after a request completes or errors. */
export function releaseConcurrentSlot(userId: string): void {
  const n = concurrentMap.get(userId) ?? 0;
  if (n > 0) concurrentMap.set(userId, n - 1);
  else concurrentMap.delete(userId);
}

/**
 * Increment today's usage counters for a user (upsert).
 * Also logs estimated cost to server console.
 */
export async function recordUsage(userId: string, tokensUsed: number): Promise<void> {
  const today = getTodayString();
  // ~$3/M input + $15/M output → use $15/M as conservative output-only estimate
  const estimatedCostUSD = (tokensUsed / 1_000_000) * 15;
  console.log(
    `[AI Cost] userId=${userId} tokens=${tokensUsed} est=$${estimatedCostUSD.toFixed(5)}`
  );
  try {
    const db = await getDb();
    await db.execute(sql`
      INSERT INTO ai_usage (id, user_id, date, request_count, token_count, updated_at)
      VALUES (gen_random_uuid(), ${userId}, ${today}, 1, ${tokensUsed}, NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        request_count = ai_usage.request_count + 1,
        token_count   = ai_usage.token_count + ${tokensUsed},
        updated_at    = NOW()
    `);
  } catch (err) {
    console.error('[aiUsage] Failed to record usage:', err);
  }
}

/**
 * Build a usage summary object suitable for JSON API responses.
 */
export async function getUsageSummary(user: UserLike): Promise<{
  requestCount: number;
  tokenCount: number;
  limit: number;
  remaining: number;
  resetAt: string; // ISO string of next midnight UTC
}> {
  const [limit, { requestCount, tokenCount }] = await Promise.all([
    getDailyLimit(user),
    getTodayUsage(user.id),
  ]);
  const remaining = Math.max(0, limit - requestCount);
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return { requestCount, tokenCount, limit, remaining, resetAt: tomorrow.toISOString() };
}
