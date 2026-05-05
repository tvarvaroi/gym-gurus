/**
 * Notification categories card — Sprint 2 BATCH 5
 *
 * Five toggles, one per category (workouts / recovery / achievements / social /
 * billing). Each toggle persists immediately via deep-partial PATCH; no
 * "Save preferences" button — autosave is the established pattern in BATCH 5
 * because every other card does the same.
 */

import {
  useNotificationPreferences,
  NOTIFICATION_CATEGORIES,
} from '@/hooks/useNotificationPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { NotificationCategory } from '@/hooks/useNotificationPreferences';

const CATEGORY_COPY: Record<NotificationCategory, { label: string; desc: string }> = {
  workouts: {
    label: 'Workouts',
    desc: 'Reminders, assignments, and missed-workout nudges.',
  },
  recovery: {
    label: 'Recovery',
    desc: 'Low-readiness alerts and sleep summaries.',
  },
  achievements: {
    label: 'Achievements',
    desc: 'Streaks, level-ups, PRs, and weekly summaries.',
  },
  social: {
    label: 'Social',
    desc: 'Messages, new Disciples, completed assignments.',
  },
  billing: {
    label: 'Billing',
    desc: 'Payments and subscription events.',
  },
};

export function NotificationCategoriesCard() {
  const { data: prefs, isLoading, update } = useNotificationPreferences();
  const { toast } = useToast();

  function toggle(key: NotificationCategory, next: boolean) {
    update.mutate(
      { categories: { [key]: next } },
      {
        onError: (err) =>
          toast({
            title: 'Save failed',
            description: err.message,
            variant: 'destructive',
          }),
      }
    );
  }

  return (
    <Card data-testid="notification-categories-card">
      <CardHeader>
        <CardTitle className="text-base">Categories</CardTitle>
        <CardDescription className="text-xs">
          Pick which kinds of alerts you want. Off categories never push or email you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !prefs ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          NOTIFICATION_CATEGORIES.map((key) => {
            const copy = CATEGORY_COPY[key];
            const checked = prefs.categories[key];
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium">{copy.label}</p>
                  <p className="text-muted-foreground text-xs">{copy.desc}</p>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={(next) => toggle(key, next)}
                  aria-label={copy.label}
                  data-testid={`category-toggle-${key}`}
                  className="cursor-pointer flex-shrink-0"
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
