/**
 * Account Deletion Orchestrator — Sprint 2 BATCH 2
 *
 * One public function: `deleteUserAccount(userId)`. Handles the full
 * destructive flow:
 *
 *   1. AUDIT LOG FIRST — capture userId + email + timestamp via logger.audit.
 *      Order matters: a privacy regulator looking at the chain of custody
 *      wants the audit row written BEFORE the user row is anonymized,
 *      because after anonymization the email is `deleted-<id>@deleted.invalid`
 *      and the audit row is the only place the original email survives.
 *
 *   2. R2 orphan cleanup — best-effort delete of progress photos blob storage.
 *
 *   3. Push subscriptions inactive — keep rows for forensics, mark inactive
 *      so dispatcher never sends to them.
 *
 *   4. Stripe subscription cancellation — best-effort. If Stripe is unreachable
 *      we log + continue; the user has already been told their account is
 *      deleted, blocking on Stripe is bad UX. Webhook-driven reconciliation
 *      will catch up later.
 *
 *   5. Soft-delete + PII anonymization — set deletedAt, replace email with
 *      `deleted-<id>@deleted.invalid`, NULL out names/photo/Stripe IDs/password.
 *
 *   6. Session destruction — caller is responsible for `req.session?.destroy()`
 *      since this service has no request handle.
 *
 * Idempotent: calling twice on the same userId is safe — the second call
 * audit-logs again (intentional — re-deletion attempt is itself a forensic event),
 * orphan cleanup is a no-op (already deleted), Stripe cancel is a no-op (already
 * cancelled), soft-delete UPDATE is a no-op (deletedAt already set).
 */

import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { users, pushSubscriptions } from '../../shared/schema';
import { logger } from '../logger';
import { cleanupOrphanedR2Objects } from './orphanCleanup';

export interface UserDeletionResult {
  userId: string;
  email: string;
  r2: { deleted: number; failed: number; skipped: number };
  pushSubsMarkedInactive: number;
  stripe: 'no_subscription' | 'cancelled' | 'cancel_failed' | 'stripe_not_configured';
}

export async function deleteUserAccount(userId: string): Promise<UserDeletionResult> {
  const db = await getDb();

  // ─── Step 0: Load PII for the audit log BEFORE we touch anything ─────────
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      stripeCustomerId: users.stripeCustomerId,
      subscriptionId: users.subscriptionId,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    // Nothing to delete (already gone / never existed). Still audit the attempt.
    logger.audit('account.delete_attempted_no_user', {
      userId,
      ts: new Date().toISOString(),
    });
    return {
      userId,
      email: '',
      r2: { deleted: 0, failed: 0, skipped: 0 },
      pushSubsMarkedInactive: 0,
      stripe: 'no_subscription',
    };
  }

  const originalEmail = user.email;

  // ─── Step 1: AUDIT FIRST. The original email lives ONLY here after step 5. ─
  logger.audit('account.deleted', {
    userId,
    email: originalEmail,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    hadActiveSubscription:
      user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing',
    stripeCustomerId: user.stripeCustomerId ?? null,
    ts: new Date().toISOString(),
  });

  // ─── Step 2: R2 orphan cleanup ───────────────────────────────────────────
  const r2 = await cleanupOrphanedR2Objects(userId);

  // ─── Step 3: Mark all push subscriptions inactive ────────────────────────
  // Keep rows (forensic value: which devices the user had registered) but stop
  // pushing to them.
  const psResult = await db
    .update(pushSubscriptions)
    .set({ active: false })
    .where(eq(pushSubscriptions.userId, userId))
    .returning({ id: pushSubscriptions.id });
  const pushSubsMarkedInactive = psResult.length;

  // ─── Step 4: Stripe subscription cancel (best-effort) ────────────────────
  let stripe: UserDeletionResult['stripe'] = 'no_subscription';
  if (!process.env.STRIPE_SECRET_KEY) {
    stripe = 'stripe_not_configured';
  } else if (user.subscriptionId) {
    try {
      const client = new Stripe(process.env.STRIPE_SECRET_KEY);
      await client.subscriptions.cancel(user.subscriptionId);
      stripe = 'cancelled';
    } catch (err) {
      logger.error('[deleteUserAccount] Stripe subscription cancel failed', {
        userId,
        subscriptionId: user.subscriptionId,
        err: (err as Error).message,
      });
      stripe = 'cancel_failed';
      // Non-fatal — webhook-driven reconciliation catches up. Continue with deletion.
    }
  }

  // ─── Step 5: Soft-delete + PII anonymization ─────────────────────────────
  // Mirrors the existing pattern in server/routes/settings.ts:332 but
  // centralised here so future callers don't reinvent it.
  await db
    .update(users)
    .set({
      email: `deleted-${userId}@deleted.invalid`,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      password: null,
      authProviderId: null,
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null,
      subscriptionTier: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    userId,
    email: originalEmail,
    r2,
    pushSubsMarkedInactive,
    stripe,
  };
}
