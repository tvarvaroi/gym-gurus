/**
 * Subscription Service & Middleware Tests
 *
 * Tests for:
 *   1. Pure helpers in server/services/subscription.ts
 *   2. requireSubscription() middleware from server/middleware/auth.ts
 *   3. GET /api/payments/subscription handler logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  resetFactoryCounters,
} from '../helpers';

// ---------------------------------------------------------------------------
// Mocks — must be declared before module imports (Vitest hoists vi.mock)
// ---------------------------------------------------------------------------

vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
    }),
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(null) },
      passwordResetTokens: { findFirst: vi.fn().mockResolvedValue(null) },
    },
  },
}));

vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    getClient: vi.fn(),
    getClientsByTrainer: vi.fn(),
  },
}));

vi.mock('../../auth', () => ({
  getUserById: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  isInTrial,
  isTrialExpired,
  trialDaysRemaining,
  hasActiveSubscription,
  canAccessTier,
} from '../../services/subscription';

import { requireSubscription } from '../../middleware/auth';

// ---------------------------------------------------------------------------
// Helpers — build user-like objects with subscription fields
// ---------------------------------------------------------------------------

const FUTURE_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // +14 days
const PAST_DATE = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // -1 day

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@gymgurus.com',
    role: 'trainer',
    stripeCustomerId: null,
    subscriptionStatus: null,
    subscriptionTier: null,
    trialEndsAt: null,
    subscriptionCurrentPeriodEnd: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Subscription service — pure helper functions
// ---------------------------------------------------------------------------

describe('isInTrial()', () => {
  beforeEach(() => resetFactoryCounters());

  it('returns true when trialEndsAt is in the future and no active subscription', () => {
    const user = makeUser({ trialEndsAt: FUTURE_DATE });
    expect(isInTrial(user)).toBe(true);
  });

  it('returns false when trialEndsAt is in the past', () => {
    const user = makeUser({ trialEndsAt: PAST_DATE });
    expect(isInTrial(user)).toBe(false);
  });

  it('returns false when user has an active subscription (even if trial date is future)', () => {
    const user = makeUser({ trialEndsAt: FUTURE_DATE, subscriptionStatus: 'active' });
    expect(isInTrial(user)).toBe(false);
  });

  it('returns false when trialEndsAt is null', () => {
    const user = makeUser({ trialEndsAt: null });
    expect(isInTrial(user)).toBe(false);
  });

  it('returns false when subscription status is "trialing"', () => {
    const user = makeUser({ trialEndsAt: FUTURE_DATE, subscriptionStatus: 'trialing' });
    expect(isInTrial(user)).toBe(false);
  });
});

describe('isTrialExpired()', () => {
  it('returns true when trialEndsAt is in the past and no active subscription', () => {
    const user = makeUser({ trialEndsAt: PAST_DATE });
    expect(isTrialExpired(user)).toBe(true);
  });

  it('returns false when trialEndsAt is in the future', () => {
    const user = makeUser({ trialEndsAt: FUTURE_DATE });
    expect(isTrialExpired(user)).toBe(false);
  });

  it('returns false when user has an active subscription', () => {
    const user = makeUser({ trialEndsAt: PAST_DATE, subscriptionStatus: 'active' });
    expect(isTrialExpired(user)).toBe(false);
  });

  it('returns false when trialEndsAt is null', () => {
    const user = makeUser({ trialEndsAt: null });
    expect(isTrialExpired(user)).toBe(false);
  });
});

describe('trialDaysRemaining()', () => {
  it('returns ~14 for a fresh 14-day trial', () => {
    const user = makeUser({ trialEndsAt: FUTURE_DATE });
    const days = trialDaysRemaining(user);
    expect(days).toBeGreaterThanOrEqual(13);
    expect(days).toBeLessThanOrEqual(14);
  });

  it('returns 0 for an expired trial', () => {
    const user = makeUser({ trialEndsAt: PAST_DATE });
    expect(trialDaysRemaining(user)).toBe(0);
  });

  it('returns 0 when trialEndsAt is null', () => {
    const user = makeUser({ trialEndsAt: null });
    expect(trialDaysRemaining(user)).toBe(0);
  });
});

describe('hasActiveSubscription()', () => {
  it('returns true for status "active"', () => {
    expect(hasActiveSubscription(makeUser({ subscriptionStatus: 'active' }))).toBe(true);
  });

  it('returns true for status "trialing"', () => {
    expect(hasActiveSubscription(makeUser({ subscriptionStatus: 'trialing' }))).toBe(true);
  });

  it('returns false for status "canceled"', () => {
    expect(hasActiveSubscription(makeUser({ subscriptionStatus: 'canceled' }))).toBe(false);
  });

  it('returns false for status "past_due"', () => {
    expect(hasActiveSubscription(makeUser({ subscriptionStatus: 'past_due' }))).toBe(false);
  });

  it('returns false for null status', () => {
    expect(hasActiveSubscription(makeUser({ subscriptionStatus: null }))).toBe(false);
  });
});

describe('canAccessTier()', () => {
  it('pro user can access pro tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'pro' });
    expect(canAccessTier(user, 'pro')).toBe(true);
  });

  it('pro user can access trainer tier (higher rank covers lower)', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'pro' });
    expect(canAccessTier(user, 'trainer')).toBe(true);
  });

  it('pro user can access solo tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'pro' });
    expect(canAccessTier(user, 'solo')).toBe(true);
  });

  it('trainer user can access trainer tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'trainer' });
    expect(canAccessTier(user, 'trainer')).toBe(true);
  });

  it('trainer user can access solo tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'trainer' });
    expect(canAccessTier(user, 'solo')).toBe(true);
  });

  it('trainer user cannot access pro tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'trainer' });
    expect(canAccessTier(user, 'pro')).toBe(false);
  });

  it('solo user can access solo tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'solo' });
    expect(canAccessTier(user, 'solo')).toBe(true);
  });

  it('solo user cannot access trainer tier', () => {
    const user = makeUser({ subscriptionStatus: 'active', subscriptionTier: 'solo' });
    expect(canAccessTier(user, 'trainer')).toBe(false);
  });

  it('user with no subscription cannot access any tier', () => {
    const user = makeUser({ subscriptionStatus: null, subscriptionTier: null });
    expect(canAccessTier(user, 'solo')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. requireSubscription() middleware
// ---------------------------------------------------------------------------

describe('requireSubscription() middleware', () => {
  beforeEach(() => resetFactoryCounters());

  it('returns 401 when no user on request', () => {
    const req = createMockRequest({ user: undefined as any });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for client role regardless of subscription', () => {
    const req = createMockRequest({ user: makeUser({ role: 'client' }) as any });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for a user with active subscription at the required tier', () => {
    const req = createMockRequest({
      user: makeUser({ subscriptionStatus: 'active', subscriptionTier: 'trainer' }) as any,
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for a user with a higher-tier subscription (pro → trainer route)', () => {
    const req = createMockRequest({
      user: makeUser({ subscriptionStatus: 'active', subscriptionTier: 'pro' }) as any,
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 402 for a user with a lower-tier subscription (solo → trainer route)', () => {
    const req = createMockRequest({
      user: makeUser({ subscriptionStatus: 'active', subscriptionTier: 'solo' }) as any,
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.error).toBe('subscription_required');
    expect(jsonArg.tier).toBe('trainer');
  });

  it('calls next() for a user in a valid trial (no subscription yet)', () => {
    const req = createMockRequest({
      user: makeUser({ trialEndsAt: FUTURE_DATE }) as any,
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 402 with trialExpired: true when trial has expired', () => {
    const req = createMockRequest({
      user: makeUser({ trialEndsAt: PAST_DATE }) as any,
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('trainer')(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.error).toBe('subscription_required');
    expect(jsonArg.trialExpired).toBe(true);
  });

  it('returns 402 when user has no trial and no subscription', () => {
    const req = createMockRequest({
      user: makeUser({ trialEndsAt: null, subscriptionStatus: null }) as any,
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireSubscription('solo')(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.error).toBe('subscription_required');
    expect(jsonArg.trialExpired).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. GET /api/payments/subscription — handler logic
//    Reproduced inline (same pattern as existing auth route tests).
// ---------------------------------------------------------------------------

// Inline handler (mirrors server/routes/payments.ts GET /subscription)
async function subscriptionStatusHandler(req: any, res: any) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    res.json({
      status: user.subscriptionStatus ?? null,
      tier: user.subscriptionTier ?? null,
      trialEndsAt: user.trialEndsAt ?? null,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd ?? null,
      isInTrial: isInTrial(user),
      isTrialExpired: isTrialExpired(user),
      trialDaysRemaining: trialDaysRemaining(user),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
}

describe('GET /api/payments/subscription handler', () => {
  beforeEach(() => resetFactoryCounters());

  it('returns 401 when no authenticated user', async () => {
    const req: any = { user: undefined };
    const res = createMockResponse();

    await subscriptionStatusHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns correct fields for a user in trial', async () => {
    const req: any = { user: makeUser({ trialEndsAt: FUTURE_DATE }) };
    const res = createMockResponse();

    await subscriptionStatusHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: null,
        tier: null,
        isInTrial: true,
        isTrialExpired: false,
      })
    );
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.trialDaysRemaining).toBeGreaterThanOrEqual(13);
  });

  it('returns correct fields for an active subscriber', async () => {
    const req: any = {
      user: makeUser({ subscriptionStatus: 'active', subscriptionTier: 'trainer' }),
    };
    const res = createMockResponse();

    await subscriptionStatusHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        tier: 'trainer',
        isInTrial: false,
        isTrialExpired: false,
        trialDaysRemaining: 0,
      })
    );
  });

  it('returns correct fields for a user with an expired trial', async () => {
    const req: any = { user: makeUser({ trialEndsAt: PAST_DATE }) };
    const res = createMockResponse();

    await subscriptionStatusHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: null,
        isInTrial: false,
        isTrialExpired: true,
        trialDaysRemaining: 0,
      })
    );
  });
});
