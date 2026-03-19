import { memo } from 'react';
import { Zap, Flame, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewClientButton } from '../ClientFormModal';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';

// AchievementBadge Component — CSS transitions, no framer-motion
const AchievementBadge = memo(
  ({
    icon: Icon,
    title,
    description,
    unlocked = false,
    glow = false,
  }: {
    icon: any;
    title: string;
    description: string;
    unlocked?: boolean;
    glow?: boolean;
  }) => (
    <div className="relative hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer">
      <Card
        className={`
          transition-all duration-300
          ${unlocked ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-muted'}
          ${glow ? 'shadow-[0_0_20px_hsl(var(--primary)/0.4)] animate-pulse-glow' : ''}
        `}
      >
        <CardContent className="p-4 text-center space-y-2">
          <div
            className={`
              mx-auto w-12 h-12 rounded-full flex items-center justify-center
              ${unlocked ? 'bg-primary' : 'bg-muted'}
            `}
          >
            <Icon
              className={`h-6 w-6 ${unlocked ? 'text-primary-foreground' : 'text-muted-foreground'}`}
            />
          </div>
          <div>
            <p className={`font-semibold text-sm ${unlocked ? '' : 'text-muted-foreground'}`}>
              {title}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
);
AchievementBadge.displayName = 'AchievementBadge';

export interface QuickAction {
  label: string;
  icon: any;
  action: string;
  color: string;
  description: string;
}

export interface Achievement {
  icon: any;
  title: string;
  description: string;
  unlocked: boolean;
  glow?: boolean;
}

interface DashboardQuickActionsProps {
  quickActions: QuickAction[];
  onQuickAction: (action: string) => void;
  user: any;
  trainerAchievements: Achievement[];
  currentStreak: number;
  weeklyProgress: number;
  weeklyGoal: number;
  completedSessionsThisWeek: number;
  performanceInsight: { label?: string; value?: number } | undefined;
}

const DashboardQuickActions = memo(
  ({
    quickActions,
    onQuickAction,
    user,
    trainerAchievements,
    currentStreak,
    weeklyProgress,
    weeklyGoal,
    completedSessionsThisWeek,
    performanceInsight,
  }: DashboardQuickActionsProps) => (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Quick Actions + Achievements (3/5 width) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Quick Actions */}
        <Card className="glass-strong border-border/40 hover:border-primary/20 transition-all duration-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-light tracking-tight">Quick Actions</CardTitle>
              <Badge
                variant="secondary"
                className="font-light text-xs bg-primary/10 text-primary border-primary/20"
              >
                <Zap className="h-3 w-3 mr-1" />
                Shortcuts
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {quickActions.map((action) =>
                action.action === 'add-client' ? (
                  <div key={action.action} className="animate-in fade-in zoom-in-95 duration-300">
                    <NewClientButton trainerId={user?.id} className="w-full h-full p-0" />
                  </div>
                ) : (
                  <button
                    key={action.action}
                    onClick={() => onQuickAction(action.action)}
                    className={`
                      relative overflow-hidden
                      ${action.color}
                      text-white rounded-xl p-4
                      shadow-lg hover:shadow-2xl
                      hover:scale-105 hover:-translate-y-0.5 active:scale-95
                      transition-all duration-300
                      flex flex-col items-center justify-center gap-2
                      group
                      animate-in fade-in zoom-in-95 duration-300
                    `}
                    data-testid={`quick-action-${action.action}`}
                  >
                    {/* Shine effect on hover */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                    <action.icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 relative z-10" />
                    <span className="text-xs font-medium leading-tight text-center relative z-10">
                      {action.label}
                    </span>
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Achievements - Compact */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-light">Achievements</CardTitle>
              <Badge variant="outline" className="font-light text-xs">
                {trainerAchievements.filter((a) => a.unlocked).length} /{' '}
                {trainerAchievements.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trainerAchievements.map((achievement, index) => (
                <AchievementBadge key={index} {...achievement} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Compact Progress Widgets (2/5 width) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Streak Counter Card */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm border-orange-500/30">
          <CardContent className="p-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="relative">
                <Flame className="h-12 w-12 text-orange-500" />
                <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {currentStreak}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold">{currentStreak}-Day Streak!</h3>
              <p className="text-xs text-muted-foreground">Keep it up</p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Goal Progress — using AnimatedCircularProgressBar */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-light">Weekly Goal</CardTitle>
            <CardDescription className="text-xs">
              {completedSessionsThisWeek} / {weeklyGoal} sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-center">
              <AnimatedCircularProgressBar
                max={100}
                value={Math.round(weeklyProgress)}
                gaugePrimaryColor="hsl(var(--primary))"
                gaugeSecondaryColor="hsl(var(--muted))"
                className="size-16 text-sm"
              />
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              {weeklyProgress >= 100
                ? 'Goal achieved!'
                : `${Math.round(weeklyGoal - completedSessionsThisWeek)} to go`}
            </p>
          </CardContent>
        </Card>

        {/* Performance Insight */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary">Performance Insight</h3>
            </div>
            <p className="text-xs leading-relaxed">
              {performanceInsight?.label ||
                'Start completing sessions to see performance insights.'}
              {(performanceInsight?.value || 0) > 0 && ' Your personalized approach is working!'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
);

DashboardQuickActions.displayName = 'DashboardQuickActions';

export default DashboardQuickActions;
