import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { User as UserIcon, ChevronRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';
import { useSoloDashboardData } from '@/hooks/useSoloDashboardData';
import { DashboardSkeleton } from '@/components/solo-dashboard/DashboardSkeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { BlurFade } from '@/components/ui/blur-fade';
import { StreakCalendar } from '@/components/ui/streak-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

// Phase 2 redesign components
import { MobileHero } from '@/components/redesign/dashboard/MobileHero';
import { ActionZone } from '@/components/redesign/dashboard/ActionZone';
import { QuickStats } from '@/components/redesign/dashboard/QuickStats';
import { WeekStrip } from '@/components/redesign/dashboard/WeekStrip';
import { WidgetScroller } from '@/components/redesign/dashboard/WidgetScroller';

// Existing components kept for sections not yet redesigned
import { WeeklyOverview } from '@/components/solo-dashboard/WeeklyOverview';
import { RecoveryBodyStatus } from '@/components/solo-dashboard/RecoveryBodyStatus';
import { BodyIntelligencePanel } from '@/components/solo-dashboard/BodyIntelligencePanel';
import { RecentActivityFeed } from '@/components/solo-dashboard/RecentActivityFeed';

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
          <div className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
            Get Started
            <ChevronRight className="w-4 h-4" />
          </div>
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
    <div className="max-w-6xl mx-auto space-y-3 md:space-y-6 pb-6">
      {user && !user.onboardingCompleted && (
        <BlurFade delay={0}>
          <OnboardingPrompt />
        </BlurFade>
      )}

      {/* Phase 2: Mobile-first hero */}
      <BlurFade delay={0.05}>
        <MobileHero
          user={user}
          gamification={data.gamification}
          fitnessProfile={data.fitnessProfile}
        />
      </BlurFade>

      {/* Phase 2: Full-width workout CTA — above fold */}
      <BlurFade delay={0.1}>
        <ActionZone />
      </BlurFade>

      {/* Phase 2: Horizontal scroll stat strip (mobile only — desktop uses WeeklyOverview) */}
      <BlurFade delay={0.15} className="md:hidden">
        <QuickStats
          stats={data.soloStats}
          strengthSummary={data.strengthSummary}
          gamification={data.gamification}
        />
      </BlurFade>

      {/* Phase 2: Compact 7-day week strip (mobile only — desktop uses WeeklyOverview) */}
      <BlurFade delay={0.2} className="md:hidden">
        <WeekStrip weeklyActivity={data.weeklyActivity} />
      </BlurFade>

      {/* Existing: Volume chart + detailed weekly log (desktop) */}
      <BlurFade delay={0.2}>
        <WeeklyOverview
          stats={data.soloStats}
          strengthSummary={data.strengthSummary}
          gamification={data.gamification}
          progress={data.progress}
          weeklyActivity={data.weeklyActivity}
          loading={data.weeklyLoading}
        />
      </BlurFade>

      {/* Streak Calendar — contribution graph */}
      <BlurFade delay={0.22}>
        <Card className="border-border/30 bg-background/40 backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-light flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Training Consistency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StreakCalendar weeks={12} />
          </CardContent>
        </Card>
      </BlurFade>

      <BlurFade delay={0.25}>
        <RecoveryBodyStatus fatigueData={data.fatigueData} loading={data.recoveryLoading} />
      </BlurFade>

      <BlurFade delay={0.3}>
        <BodyIntelligencePanel
          data={data.bodyIntelligence}
          fitnessProfile={data.fitnessProfile}
          loading={data.bodyIntelLoading}
        />
      </BlurFade>

      {/* Phase 2: Compact quick-access nav */}
      <BlurFade delay={0.35}>
        <WidgetScroller />
      </BlurFade>

      <BlurFade delay={0.4}>
        <RecentActivityFeed
          progress={data.progress}
          xpHistory={data.xpHistory}
          mealPlans={data.mealPlans}
          loading={data.activityLoading}
        />
      </BlurFade>
    </div>
  );
}

export default SoloDashboard;
