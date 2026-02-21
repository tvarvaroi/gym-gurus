import { useState } from 'react';
import { useLocation } from 'wouter';
import { X, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

export function TrialBanner() {
  const { user, isClient } = useUser();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Never show for disciples (clients)
  if (isClient || !user) return null;

  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const now = new Date();
  const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';

  // Don't show if they have an active subscription
  if (isActive) return null;

  const isInTrial = trialEndsAt ? trialEndsAt > now : false;
  const isTrialExpired = trialEndsAt ? trialEndsAt <= now : false;

  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Nothing to show
  if (!isInTrial && !isTrialExpired) return null;

  // Trial expired — non-dismissable sticky banner
  if (isTrialExpired) {
    return (
      <div className="w-full bg-red-900/80 border-b border-red-700 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-red-100 flex-1 min-w-0">
          <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
          <span className="font-medium">Your free trial has ended.</span>
          <span className="hidden sm:inline text-red-200">
            Subscribe to continue using GymGurus.
          </span>
        </div>
        <Button
          size="sm"
          className="bg-red-500 hover:bg-red-400 text-white font-semibold flex-shrink-0"
          onClick={() => navigate('/pricing')}
        >
          Upgrade now
        </Button>
      </div>
    );
  }

  // Trial active — dismissable banner
  if (dismissed) return null;

  return (
    <div className="w-full bg-[#1a1400] border-b border-yellow-800/60 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-yellow-100 flex-1 min-w-0">
        <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        <span className="font-medium">
          {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your free trial.
        </span>
        <span className="hidden sm:inline text-yellow-200">
          Unlock full access with a subscription.
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
          onClick={() => navigate('/pricing')}
        >
          Upgrade
        </Button>
        <button
          aria-label="Dismiss"
          className="text-yellow-500 hover:text-yellow-300 transition-colors"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
