import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Dumbbell, Zap, UtensilsCrossed, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface RecentActivityFeedProps {
  progress: any;
  xpHistory: any[] | undefined;
  mealPlans: any[] | undefined;
  loading?: boolean;
}

interface ActivityItem {
  type: 'workout' | 'xp' | 'meal_plan';
  title: string;
  subtitle: string;
  timestamp: Date;
  xpEarned?: number;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'workout':
      return <Dumbbell className="w-4 h-4 text-primary" />;
    case 'xp':
      return <Zap className="w-4 h-4 text-amber-500" />;
    case 'meal_plan':
      return <UtensilsCrossed className="w-4 h-4 text-green-500" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function formatXpReason(reason: string): string {
  const map: Record<string, string> = {
    workout_completed: 'Workout Completed',
    personal_record: 'Personal Record',
    streak_bonus: 'Streak Bonus',
    achievement_earned: 'Achievement Earned',
  };
  return map[reason] || reason.replace(/_/g, ' ');
}

function ActivityFeedSkeleton() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border/50 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
      <div className="space-y-0">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-3 ${i < 3 ? 'border-b border-border/30' : ''}`}
          >
            <div className="w-8 h-8 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-muted rounded mb-1" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-14 bg-muted rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentActivityFeed({
  progress,
  xpHistory,
  mealPlans,
  loading,
}: RecentActivityFeedProps) {
  const prefersReducedMotion = useReducedMotion();

  if (loading) return <ActivityFeedSkeleton />;

  // Merge activities from multiple sources
  const activities: ActivityItem[] = [];

  // Add workout completions
  if (progress?.history) {
    for (const workout of progress.history.slice(0, 5)) {
      activities.push({
        type: 'workout',
        title: workout.name || workout.workoutName || 'Workout',
        subtitle: `${workout.totalSets || 0} sets · ${
          workout.totalVolumeKg ? `${Number(workout.totalVolumeKg).toLocaleString()} kg` : ''
        }`,
        timestamp: new Date(workout.endedAt || workout.startedAt || workout.createdAt),
        xpEarned: workout.xpEarned,
      });
    }
  }

  // Add XP events (non-workout ones to avoid duplication)
  if (xpHistory) {
    for (const tx of xpHistory.slice(0, 10)) {
      if (tx.reason !== 'workout_completed') {
        activities.push({
          type: 'xp',
          title: formatXpReason(tx.reason),
          subtitle: `+${tx.amount} XP`,
          timestamp: new Date(tx.createdAt),
          xpEarned: tx.amount,
        });
      }
    }
  }

  // Add meal plans
  if (mealPlans) {
    for (const plan of mealPlans.slice(0, 3)) {
      activities.push({
        type: 'meal_plan',
        title: plan.name || 'Meal Plan',
        subtitle: plan.targetCalories ? `${plan.targetCalories} kcal` : 'Saved plan',
        timestamp: new Date(plan.createdAt),
      });
    }
  }

  // Sort by timestamp desc and take top 5
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentActivities = activities.slice(0, 5);

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.5 },
      };

  return (
    <motion.div {...animProps} className="bg-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">Recent Activity</h3>
        <Link href="/progress">
          <a className="text-xs text-primary hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>

      {recentActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-0">
          {recentActivities.map((activity, index) => (
            <div
              key={`${activity.type}-${index}`}
              className={`flex items-center gap-3 py-3 ${
                index < recentActivities.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatTimeAgo(activity.timestamp)}
                  {activity.subtitle ? ` · ${activity.subtitle}` : ''}
                </p>
              </div>
              {activity.xpEarned && activity.xpEarned > 0 && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-xs flex-shrink-0"
                >
                  +{activity.xpEarned} XP
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
