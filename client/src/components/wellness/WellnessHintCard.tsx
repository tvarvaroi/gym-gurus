/**
 * WellnessHintCard — Sprint 3 BATCH 6
 *
 * Dashboard hint card for the daily wellness check-in. Two variants:
 *
 *   - Not-checked-in: "How are you feeling today?" + "Quick check-in" CTA
 *     → drives user to /wellness for State C → State A flow
 *   - Checked-in:     small inline readiness score + streak + "View today's
 *     wellness" CTA → drives user to /wellness for State B revisit
 *
 * Typography rule (locked, BATCH 3 FQ4): the score number here uses
 * **Inter tabular-nums**, NOT Playfair Display. Playfair is reserved for
 * the hero on /wellness — the moment when the score IS the experience.
 * On the dashboard the score is informational ("you're at 73 today")
 * not emotional ("here is your score"). Different surface, different font.
 *
 * Role scope (locked, BATCH 6 contract): rendered for Ronin + Disciple
 * only. NOT rendered on Guru dashboards. The Guru dashboard's mental
 * model is "what do my clients need" not "how am I feeling" — adding a
 * "your readiness" prompt where Gurus expect to see roster status would
 * pull their attention away from the work they came to the dashboard
 * to do. Gurus can still check in via /wellness directly (sidebar
 * entry is in all 3 role menus); they just don't get a daily nudge
 * surfaced on their home dashboard. This is a deliberate role-shape
 * decision — DO NOT add the card to Dashboard.tsx Guru branch as a
 * "fix" for the inconsistency.
 *
 * Visual idiom: shadcn `Card` with `border-border/30` to match the
 * existing dashboard cards (RecoveryBodyStatus, ClientDashboard's
 * Workout/Sessions cards). No special framer-motion entrance —
 * inherits the parent's animate-in fade.
 */

import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, HeartPulse, Sparkles, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DailyWellnessLog } from '@shared/schema';

interface TodayResponse {
  entry: DailyWellnessLog | null;
  streak: { current: number; longest: number; lastCheckIn: string | null };
  hasCheckedInToday: boolean;
  timezone: string;
}

export function WellnessHintCard() {
  // Reuse the same query key the wellness page uses so cache is shared —
  // visiting /wellness then returning to dashboard hits cache, no refetch.
  const todayQuery = useQuery<TodayResponse>({
    queryKey: ['/api/wellness/today'],
    staleTime: 1000 * 60 * 2, // 2 minutes — dashboard is allowed slightly staler
  });

  // Don't render anything while loading — the card flickering in late
  // would be more disruptive than waiting. Skeleton would be wasted
  // visual real estate for a 200ms wait.
  if (todayQuery.isLoading) return null;

  const today = todayQuery.data;
  const hasCheckedIn = today?.hasCheckedInToday ?? false;

  if (hasCheckedIn && today?.entry) {
    return <CheckedInVariant entry={today.entry} streakCurrent={today.streak.current} />;
  }
  return <NotCheckedInVariant />;
}

// ─── Not-checked-in: "Start the daily ritual" ────────────────────────────
function NotCheckedInVariant() {
  return (
    <Card
      className="border border-border/30 hover:border-primary/40 transition-colors"
      data-testid="wellness-hint-card-not-checked-in"
    >
      <CardContent className="p-4 sm:p-5">
        <Link href="/wellness">
          <div className="flex items-center gap-4 cursor-pointer group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <HeartPulse className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">How are you feeling today?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                30-second check-in feeds your AI coach.
              </p>
            </div>
            <div className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:text-primary/80 transition-colors">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Quick check-in</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Checked-in: "Today's readiness, view full" ──────────────────────────
function CheckedInVariant({
  entry,
  streakCurrent,
}: {
  entry: DailyWellnessLog;
  streakCurrent: number;
}) {
  const score = entry.readinessScore ?? 0;

  return (
    <Card
      className="border border-border/30 hover:border-primary/40 transition-colors"
      data-testid="wellness-hint-card-checked-in"
    >
      <CardContent className="p-4 sm:p-5">
        <Link href="/wellness">
          <div className="flex items-center gap-4 cursor-pointer group">
            {/* Inline readiness number — Inter tabular-nums per locked typography rule.
                Playfair is reserved for the /wellness hero; here the number is data. */}
            <div className="flex-shrink-0 flex items-baseline gap-1">
              <span className="text-2xl font-light tabular-nums text-foreground leading-none">
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Today's readiness</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                {streakCurrent > 0 && (
                  <>
                    <Flame className="w-3 h-3 text-primary" aria-hidden="true" />
                    Day {streakCurrent}
                    <span className="mx-1">·</span>
                  </>
                )}
                Checked in.
              </p>
            </div>
            <div className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:text-primary/80 transition-colors">
              <span className="hidden sm:inline">View today's wellness</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
