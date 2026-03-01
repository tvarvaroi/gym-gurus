import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
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

function formatXpReason(reason: string): string {
  const map: Record<string, string> = {
    workout_completed: 'Workout Completed',
    personal_record: 'Personal Record',
    streak_bonus: 'Streak Bonus',
    achievement_earned: 'Achievement Earned',
  };
  return map[reason] || reason.replace(/_/g, ' ');
}

function getDayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ActivityFeedSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-3 w-24 bg-muted rounded" />
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="h-2.5 w-16 bg-muted rounded mb-2" />
          <div className="flex items-center justify-between py-2">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        </div>
      ))}
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

  if (progress?.history) {
    for (const workout of progress.history.slice(0, 5)) {
      const setsCount = workout.sets || workout.totalSets || 0;
      const volumeKg = workout.volume || workout.totalVolumeKg || 0;
      const dateStr = workout.date || workout.endedAt || workout.startedAt || workout.createdAt;
      activities.push({
        type: 'workout',
        title: workout.name || workout.workoutName || 'Workout',
        subtitle: `${setsCount} sets${volumeKg ? ` \u00B7 ${Number(volumeKg).toLocaleString()} kg` : ''}`,
        timestamp: dateStr ? new Date(dateStr) : new Date(),
        xpEarned: workout.xpEarned,
      });
    }
  }

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

  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentActivities = activities.slice(0, 5);

  // Group by day
  const grouped: { label: string; items: ActivityItem[] }[] = [];
  for (const activity of recentActivities) {
    const label = getDayLabel(activity.timestamp);
    const existing = grouped.find((g) => g.label === label);
    if (existing) {
      existing.items.push(activity);
    } else {
      grouped.push({ label, items: [activity] });
    }
  }

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.2 },
      };

  return (
    <motion.div {...animProps}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Recent Activity
        </p>
        <Link href="/progress">
          <a className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>

      {recentActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No recent activity</p>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/40 mb-2">
                {group.label}
              </p>
              <div className="space-y-0">
                {group.items.map((activity, index) => (
                  <div
                    key={`${activity.type}-${index}`}
                    className={`flex items-center justify-between py-2.5 ${
                      index < group.items.length - 1 ? 'border-b border-border/10' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">
                        {activity.subtitle}
                      </p>
                    </div>
                    {activity.xpEarned && activity.xpEarned > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 ml-3">
                        +{activity.xpEarned} XP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
