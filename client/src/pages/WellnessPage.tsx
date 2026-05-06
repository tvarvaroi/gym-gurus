/**
 * WellnessPage — Sprint 3 BATCH 4
 *
 * Surface for the daily wellness check-in. State machine:
 *
 *   - State C (Empty): no entry today → show role-distinct empty state +
 *     "Start today's check-in" CTA
 *   - State A (Ritual): user has tapped "Start" but not submitted yet →
 *     show 6 sliders + 3 toggles + notes + "See my readiness" CTA
 *   - State B (Summary): user submitted → readiness hero + factor cards
 *
 * BATCH 4 ships State A + State C. State B is a TEMPORARY STUB rendering
 * just the score number + "(full summary in BATCH 5)" placeholder. The
 * data flow is honest: POST /api/wellness/log → response carries score +
 * streak + xp → we render. BATCH 5 will replace the stub rendering only,
 * not the data flow.
 *
 * Auth-gated by AuthGuard at the AppShell level (the route is in
 * isKnownAuthRoute, not isPublicRoute).
 *
 * "Today" definition: server-derived from
 * users.notification_preferences.quietHours.timezone. The client never
 * computes today — see decisions.md "Today definition" entry.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { WellnessEmptyState } from '@/components/wellness/WellnessEmptyState';
import { WellnessRitual } from '@/components/wellness/WellnessRitual';
import type { DailyWellnessLog } from '@shared/schema';

interface TodayResponse {
  entry: DailyWellnessLog | null;
  streak: { current: number; longest: number; lastCheckIn: string | null };
  hasCheckedInToday: boolean;
  timezone: string;
}

interface SubmitResponse {
  entry: { id: string; date: string; readinessScore: number | null };
  isNewInsert: boolean;
  streak: { current: number; longest: number; isNewStreakStart: boolean };
  xpAwarded: number;
}

type ViewState =
  | { kind: 'empty' }
  | { kind: 'ritual' }
  | { kind: 'summary-stub'; submitted: SubmitResponse };

export default function WellnessPage() {
  const { user } = useUser();
  const todayQuery = useQuery<TodayResponse>({
    queryKey: ['/api/wellness/today'],
    staleTime: 1000 * 60, // 1 minute
  });

  // Local view state machine. Initial value is derived from server data
  // once it arrives — useState lazy-initialiser pattern would race with
  // the query, so we render based on the resolved state below.
  const [view, setView] = useState<ViewState | null>(null);

  const isLoading = todayQuery.isLoading;
  const today = todayQuery.data;
  const hasEntryToday = today?.hasCheckedInToday ?? false;

  // Resolve current view: explicit local state wins, otherwise derive from server.
  const resolvedView: ViewState =
    view ??
    (hasEntryToday ? { kind: 'summary-stub', submitted: stubFromEntry(today) } : { kind: 'empty' });

  return (
    <div className="container max-w-2xl mx-auto px-4 md:px-6 pt-10 md:pt-8 pb-6 md:pb-8">
      <PageHeader
        icon={<Activity className="w-full h-full" />}
        title="Daily"
        titleAccent="readiness"
        subtitle="A 30-second ritual that feeds your AI coach."
      />

      <div className="mt-6 md:mt-10">
        {isLoading && <WellnessSkeleton />}

        {!isLoading && resolvedView.kind === 'empty' && (
          <WellnessEmptyState role={user?.role} onStart={() => setView({ kind: 'ritual' })} />
        )}

        {!isLoading && resolvedView.kind === 'ritual' && (
          <WellnessRitual
            onSubmitted={(response) => setView({ kind: 'summary-stub', submitted: response })}
          />
        )}

        {!isLoading && resolvedView.kind === 'summary-stub' && (
          <SummaryStub data={resolvedView.submitted} />
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function WellnessSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}

// ─── Summary stub ─────────────────────────────────────────────────────────
// BATCH 5 replaces this entire block with the readiness hero + factor cards
// + headline copy + streak chip. The data flow into State B is locked here:
// SubmitResponse from POST /api/wellness/log carries everything State B
// needs (score, isNewInsert, streak.current, xpAwarded). Don't rewrite the
// data shape in BATCH 5 — only the rendering.
function SummaryStub({ data }: { data: SubmitResponse }) {
  const score = data.entry.readinessScore ?? 0;
  return (
    <div className="text-center py-16 space-y-4" data-testid="wellness-summary-stub">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's readiness</p>
      <p className="text-7xl font-light font-['Playfair_Display'] tracking-tight tabular-nums text-foreground">
        {score}
      </p>
      <p className="text-sm text-muted-foreground">/ 100</p>
      {data.streak.current > 0 && (
        <p className="text-sm text-foreground/80">
          🔥 {data.streak.current}-day streak
          {data.streak.isNewStreakStart && data.streak.current === 1 && ' — first day!'}
        </p>
      )}
      <p className="text-xs text-muted-foreground/60 pt-6">
        State B (full summary with factor breakdown) ships in BATCH 5.
      </p>
    </div>
  );
}

// Build the stub payload from a server entry (used when the user already
// checked in today and we land directly on summary view, no fresh submit).
function stubFromEntry(today: TodayResponse | undefined): SubmitResponse {
  const score = today?.entry?.readinessScore ?? 0;
  return {
    entry: {
      id: today?.entry?.id ?? '',
      date: today?.entry?.date ?? '',
      readinessScore: score,
    },
    isNewInsert: false,
    streak: {
      current: today?.streak.current ?? 0,
      longest: today?.streak.longest ?? 0,
      isNewStreakStart: false,
    },
    xpAwarded: 0,
  };
}
