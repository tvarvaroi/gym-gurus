import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Zap, Users, Star, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SubscriptionStatus {
  status: string | null;
  tier: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isInTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
}

const TIERS = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    color: 'text-gray-400',
    borderColor: 'border-gray-600',
    icon: Star,
    description: 'Try everything free for 14 days.',
    features: [
      'All platform features',
      'Workout builder & tracking',
      'Progress analytics',
      'Premium calculators',
      '5 AI requests/day',
    ],
  },
  {
    id: 'solo',
    name: 'Ronin',
    price: '$6.99',
    period: 'per month',
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgGradient: 'from-purple-900/20 to-transparent',
    icon: Zap,
    description: 'For solo fitness enthusiasts.',
    features: [
      'Progress tracking',
      'Recovery & gamification',
      'Premium calculators',
      'Personal dashboard',
      'Workout logging',
    ],
  },
  {
    id: 'solo_ai',
    name: 'Ronin AI',
    price: '$17.99',
    period: 'per month',
    color: 'text-violet-400',
    borderColor: 'border-violet-500',
    bgGradient: 'from-violet-900/20 to-transparent',
    icon: Crown,
    description: 'Ronin with AI-powered coaching.',
    features: [
      'Everything in Ronin',
      'AI workout generation',
      'AI coaching chat',
      '20 AI requests/day',
      'Personalized programs',
    ],
    recommended: true,
  },
  {
    id: 'trainer',
    name: 'Guru',
    price: '$24.99',
    period: 'per month',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500',
    bgGradient: 'from-yellow-900/20 to-transparent',
    icon: Users,
    description: 'For personal trainers with clients.',
    features: [
      'Up to 10 clients',
      'Client management',
      'Workout assignment',
      'Payment plans',
      'Session scheduling',
      'Progress reports',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Guru',
    price: '$29.99',
    period: 'per month',
    color: 'text-amber-400',
    borderColor: 'border-amber-500',
    bgGradient: 'from-amber-900/20 to-transparent',
    icon: Crown,
    description: 'For established trainers scaling up.',
    features: [
      'Unlimited clients',
      'Everything in Guru',
      'AI coaching tools',
      '50 AI requests/day',
      'Advanced analytics',
    ],
  },
];

export default function PricingPage() {
  const { user, isClient, refetchUser } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Handle ?success=true after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: 'Subscription activated!',
        description: 'Welcome to GymGurus Premium. Your plan is now active.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      refetchUser();
      // Clean up query param
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  // Disciples never see payment UI
  if (isClient) {
    navigate('/dashboard');
    return null;
  }

  const currentTier = user?.subscriptionTier ?? null;
  const subscriptionStatus = user?.subscriptionStatus ?? null;
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const now = new Date();
  const isInTrial = trialEndsAt ? trialEndsAt > now && !isActive : false;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  async function handleSubscribe(tier: string) {
    setLoadingTier(tier);
    try {
      const res = await apiRequest('POST', '/api/payments/create-checkout-session', { tier });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL returned');
      }
    } catch (err: any) {
      toast({
        title: 'Could not start checkout',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
      setLoadingTier(null);
    }
  }

  async function handleManage() {
    setLoadingPortal(true);
    try {
      const res = await apiRequest('POST', '/api/payments/create-portal-session', {});
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No portal URL returned');
      }
    } catch (err: any) {
      toast({
        title: 'Could not open billing portal',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
      setLoadingPortal(false);
    }
  }

  function getTierAction(tierId: string) {
    if (tierId === 'free') {
      if (isInTrial) {
        return { label: `${trialDaysRemaining}d remaining`, disabled: true };
      }
      return { label: 'Current plan', disabled: true };
    }

    if (isActive && currentTier === tierId) {
      return { label: 'Current plan', disabled: true, isCurrent: true };
    }

    if (isActive) {
      return { label: 'Switch plan', action: () => handleManage() };
    }

    return { label: 'Subscribe', action: () => handleSubscribe(tierId) };
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          {isInTrial && (
            <p className="text-yellow-400 text-lg font-medium">
              {trialDaysRemaining} days left in your free trial
            </p>
          )}
          {!isInTrial && !isActive && (
            <p className="text-gray-400 text-lg">
              Your trial has ended. Choose a plan to continue.
            </p>
          )}
          {isActive && (
            <p className="text-green-400 text-lg">
              You&apos;re subscribed to the{' '}
              <span className="font-semibold capitalize">{currentTier}</span> plan.
            </p>
          )}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {TIERS.map((tier) => {
            const action = getTierAction(tier.id);
            const isCurrent = isActive && currentTier === tier.id;
            const Icon = tier.icon;

            return (
              <Card
                key={tier.id}
                className={`relative border-2 bg-[#1a1a1a] transition-all ${
                  isCurrent ? tier.borderColor : 'border-gray-700 hover:border-gray-500'
                } ${tier.recommended ? 'ring-2 ring-yellow-500/30' : ''}`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-black text-xs font-bold px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      tier.id === 'solo'
                        ? 'bg-purple-900/40'
                        : tier.id === 'solo_ai'
                          ? 'bg-violet-900/40'
                          : tier.id === 'trainer'
                            ? 'bg-yellow-900/40'
                            : tier.id === 'pro'
                              ? 'bg-amber-900/40'
                              : 'bg-gray-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${tier.color}`} />
                  </div>
                  <CardTitle className={`text-lg ${tier.color}`}>{tier.name}</CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    {tier.description}
                  </CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                    <span className="text-gray-400 text-sm ml-1">/{tier.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={action.disabled || loadingTier === tier.id}
                    onClick={action.action}
                  >
                    {loadingTier === tier.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {action.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Manage subscription */}
        {isActive && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleManage}
              disabled={loadingPortal}
              className="border-gray-600 text-gray-300 hover:text-white"
            >
              {loadingPortal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Manage Subscription &amp; Billing
            </Button>
            <p className="text-gray-500 text-xs mt-2">
              Cancel, change plan, or update payment method via Stripe.
            </p>
          </div>
        )}

        {/* Disciple note */}
        <p className="text-center text-gray-600 text-xs mt-10">
          Disciples (clients) access GymGurus through their trainer&apos;s invitation. No
          subscription needed.
        </p>
      </div>
    </div>
  );
}
