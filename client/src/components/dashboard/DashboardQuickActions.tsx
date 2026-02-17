import { memo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewClientButton } from '../ClientFormModal';

// ProgressRing Component
const ProgressRing = memo(({ progress, size = 60, strokeWidth = 4, color = 'text-primary' }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-semibold">{Math.round(progress)}%</span>
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';

// AchievementBadge Component
const AchievementBadge = memo(({ icon: Icon, title, description, unlocked = false, glow = false }: {
  icon: any;
  title: string;
  description: string;
  unlocked?: boolean;
  glow?: boolean;
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="relative"
  >
    <Card className={`
      transition-all duration-300 cursor-pointer
      ${unlocked ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/50' : 'bg-muted/30 border-muted'}
      ${glow ? 'shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pulse-glow' : ''}
    `}>
      <CardContent className="p-4 text-center space-y-2">
        <div className={`
          mx-auto w-12 h-12 rounded-full flex items-center justify-center
          ${unlocked ? 'bg-gradient-to-br from-primary to-purple-500' : 'bg-muted'}
        `}>
          <Icon className={`h-6 w-6 ${unlocked ? 'text-white' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className={`font-semibold text-sm ${unlocked ? '' : 'text-muted-foreground'}`}>{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));
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

const DashboardQuickActions = memo(({
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
      {/* Quick Actions - Enhanced Premium Design */}
      <Card className="glass-strong border-border/40 hover:border-primary/20 transition-all duration-500">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-light tracking-tight">Quick Actions</CardTitle>
            <Badge variant="secondary" className="font-light text-xs bg-primary/10 text-primary border-primary/20">
              <Zap className="h-3 w-3 mr-1" />
              Shortcuts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              action.action === 'add-client' ? (
                <motion.div
                  key={action.action}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <NewClientButton
                    trainerId={user?.id}
                    className="w-full h-full p-0"
                  />
                </motion.div>
              ) : (
                <motion.button
                  key={action.action}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onQuickAction(action.action)}
                  className={`
                    relative overflow-hidden
                    ${action.color}
                    text-white rounded-xl p-4
                    shadow-lg hover:shadow-2xl
                    transition-all duration-300
                    flex flex-col items-center justify-center gap-2
                    group
                  `}
                  data-testid={`quick-action-${action.action}`}
                >
                  {/* Shine effect on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                  <action.icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 relative z-10" />
                  <span className="text-xs font-medium leading-tight text-center relative z-10">{action.label}</span>
                </motion.button>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements - Compact */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-light">Achievements</CardTitle>
            <Badge variant="outline" className="font-light text-xs">
              {trainerAchievements.filter(a => a.unlocked).length} / {trainerAchievements.length}
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
      {/* Streak Counter Card - More Compact */}
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

      {/* Weekly Goal Progress - Compact */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-light">Weekly Goal</CardTitle>
          <CardDescription className="text-xs">
            {completedSessionsThisWeek} / {weeklyGoal} sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-center">
            <ProgressRing progress={weeklyProgress} size={60} strokeWidth={5} color="text-primary" />
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            {weeklyProgress >= 100 ? '🎉 Goal achieved!' : `${Math.round(weeklyGoal - completedSessionsThisWeek)} to go`}
          </p>
        </CardContent>
      </Card>

      {/* Performance Insight - Compact */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm border-emerald-500/30">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-emerald-600">Performance Insight</h3>
          </div>
          <p className="text-xs leading-relaxed">
            {performanceInsight?.label || 'Start completing sessions to see performance insights.'}
            {(performanceInsight?.value || 0) > 0 && ' Your personalized approach is working!'}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
));

DashboardQuickActions.displayName = 'DashboardQuickActions';

export default DashboardQuickActions;
