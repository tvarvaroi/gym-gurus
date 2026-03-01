import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { User as UserIcon, ChevronRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';
import { useSoloDashboardData } from '@/hooks/useSoloDashboardData';
import { DashboardSkeleton } from '@/components/solo-dashboard/DashboardSkeleton';
import { HeroHeader } from '@/components/solo-dashboard/HeroHeader';
import { TodaysActionZone } from '@/components/solo-dashboard/TodaysActionZone';
import { WeeklyOverview } from '@/components/solo-dashboard/WeeklyOverview';
import { RecoveryBodyStatus } from '@/components/solo-dashboard/RecoveryBodyStatus';
import { FeatureWidgetsGrid } from '@/components/solo-dashboard/FeatureWidgetsGrid';
import { RecentActivityFeed } from '@/components/solo-dashboard/RecentActivityFeed';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

function OnboardingPrompt() {
  const prefersReducedMotion = useReducedMotion();
  const animProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...animProps}
      className="rounded-xl p-4 border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg">
          <UserIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Complete Your Fitness Profile</h3>
          <p className="text-xs text-muted-foreground">
            Set your goals and preferences so we can personalize your workouts.
          </p>
        </div>
        <Link href="/solo/onboarding">
          <a className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Get Started
            <ChevronRight className="w-4 h-4" />
          </a>
        </Link>
      </div>
    </motion.div>
  );
}

export function SoloDashboard() {
  const { user } = useUser();
  const data = useSoloDashboardData();

  if (data.hasError) {
    return <QueryErrorState error={data.hasError} onRetry={() => window.location.reload()} />;
  }

  if (data.isInitialLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 space-y-10 pb-20">
      {user && !user.onboardingCompleted && <OnboardingPrompt />}

      <HeroHeader
        user={user}
        gamification={data.gamification}
        fitnessProfile={data.fitnessProfile}
      />

      <TodaysActionZone />

      <WeeklyOverview
        stats={data.soloStats}
        strengthSummary={data.strengthSummary}
        gamification={data.gamification}
        progress={data.progress}
        weeklyActivity={data.weeklyActivity}
        loading={data.weeklyLoading}
      />

      <RecoveryBodyStatus
        fatigueData={data.fatigueData}
        fitnessProfile={data.fitnessProfile}
        loading={data.recoveryLoading}
      />

      <FeatureWidgetsGrid />

      <RecentActivityFeed
        progress={data.progress}
        xpHistory={data.xpHistory}
        mealPlans={data.mealPlans}
        loading={data.activityLoading}
      />
    </div>
  );
}

export default SoloDashboard;
