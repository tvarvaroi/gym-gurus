/**
 * Subscription helper service
 * Provides trial/subscription status helpers and Stripe customer management.
 */
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

type UserLike = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  trialEndsAt?: Date | null;
  subscriptionCurrentPeriodEnd?: Date | null;
};

/** 14-day trial is active: trialEndsAt in the future and no subscription yet */
export function isInTrial(user: UserLike): boolean {
  if (!user.trialEndsAt) return false;
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') return false;
  return new Date(user.trialEndsAt) > new Date();
}

/** Trial has expired and no active subscription */
export function isTrialExpired(user: UserLike): boolean {
  if (!user.trialEndsAt) return false;
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') return false;
  return new Date(user.trialEndsAt) <= new Date();
}

/** User has a live Stripe subscription */
export function hasActiveSubscription(user: UserLike): boolean {
  return user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
}

/** Tier hierarchy: pro > trainer > solo_ai = solo */
const TIER_RANK: Record<string, number> = { solo: 1, solo_ai: 1, trainer: 2, pro: 3 };

export function canAccessTier(
  user: UserLike,
  requiredTier: 'solo' | 'solo_ai' | 'trainer' | 'pro'
): boolean {
  if (!hasActiveSubscription(user)) return false;
  const userRank = TIER_RANK[user.subscriptionTier ?? ''] ?? 0;
  const requiredRank = TIER_RANK[requiredTier] ?? 99;
  return userRank >= requiredRank;
}

/** Days remaining in trial (0 if expired or no trial) */
export function trialDaysRemaining(user: UserLike): number {
  if (!user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Find or create a Stripe Customer for the user; persists stripeCustomerId to DB */
export async function getOrCreateStripeCustomer(user: UserLike): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    metadata: { userId: user.id },
  });

  const database = await db;
  await database.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));

  return customer.id;
}
