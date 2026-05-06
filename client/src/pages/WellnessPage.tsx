/**
 * WellnessPage — Sprint 3 BATCH 4 + BATCH 5
 *
 * Surface for the daily wellness check-in. State machine:
 *
 *   - State C (Empty): no entry today → role-distinct empty state +
 *     "Start today's check-in" CTA
 *   - State A (Ritual): user is filling the form (fresh check-in OR edit) →
 *     6 sliders + 3 toggles + notes + "See my readiness" CTA
 *   - State B (Summary): user submitted → readiness hero + factor cards +
 *     streak badge + mini-trend + edit CTA
 *
 * BATCH 4 shipped State A + State C with a SummaryStub for State B.
 * BATCH 5 replaces the stub with the full WellnessSummary composition and
 * wires the edit-existing-entry flow:
 *
 *   - "Edit today's entry" from Summary → returns to Ritual pre-populated
 *     with the existing entry's values; touched flags fire for fields that
 *     were non-null (so the upsert includes them)
 *   - "See my readiness" submits via the same POST /api/wellness/log; the
 *     backend recomputes readiness on save only, returns the new entry +
 *     streak + xp; client transitions back to Summary with `animateOnMount`
 *
 * Auth-gated by AuthGuard at AppShell. /wellness is in isKnownAuthRoute,
 * not isPublicRoute. "Today" is server-derived from
 * users.notification_preferences.quietHours.timezone — client never
 * computes today.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { WellnessEmptyState } from '@/components/wellness/WellnessEmptyState';
import { WellnessRitual, type SubmitResponse } from '@/components/wellness/WellnessRitual';
import { WellnessSummary } from '@/components/wellness/WellnessSummary';
import type { DailyWellnessLog } from '@shared/schema';

interface TodayResponse {
  entry: DailyWellnessLog | null;
  streak: { current: number; longest: number; lastCheckIn: string | null };
  hasCheckedInToday: boolean;
  timezone: string;
}

// Three-way state machine.
// `summary` carries either a fresh POST response (animate on mount = true)
// or a server-loaded entry (animate on mount = false — user is just revisiting).
type ViewState =
  | { kind: 'empty' }
  | { kind: 'ritual'; initial: DailyWellnessLog | null }
  | { kind: 'summary'; entry: DailyWellnessLog; streakCurrent: number; animateOnMount: boolean };

export default function WellnessPage() {
  const { user } = useUser();
  const todayQuery = useQuery<TodayResponse>({
    queryKey: ['/api/wellness/today'],
    staleTime: 1000 * 60, // 1 minute
  });

  const [view, setView] = useState<ViewState | null>(null);

  const isLoading = todayQuery.isLoading;
  const today = todayQuery.data;

  // Resolve the current view. Local state wins (user clicked Start, Edit, or
  // submitted). When local state is null, derive from server data: if the
  // server has an entry for today, drop directly into Summary (no animation,
  // user is revisiting); otherwise show the Empty state.
  const resolvedView: ViewState = view ?? deriveFromServer(today);

  const handleSubmitted = (response: SubmitResponse) => {
    setView({
      kind: 'summary',
      entry: response.entry,
      streakCurrent: response.streak.current,
      // Animate the reveal on a fresh submit. Edit-resaves still animate
      // because the user just took an action and deserves the payoff —
      // the animation timing tier (1.2s vs 0.6s) is chosen by streak count,
      // and a returning streaker re-saving an edit gets the fast tier
      // automatically.
      animateOnMount: true,
    });
  };

  const handleEdit = () => {
    if (resolvedView.kind !== 'summary') return;
    setView({ kind: 'ritual', initial: resolvedView.entry });
  };

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
          <WellnessEmptyState
            role={user?.role}
            onStart={() => setView({ kind: 'ritual', initial: null })}
          />
        )}

        {!isLoading && resolvedView.kind === 'ritual' && (
          <WellnessRitual onSubmitted={handleSubmitted} initial={resolvedView.initial} />
        )}

        {!isLoading && resolvedView.kind === 'summary' && (
          <WellnessSummary
            entry={resolvedView.entry}
            streakCurrent={resolvedView.streakCurrent}
            animateOnMount={resolvedView.animateOnMount}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}

// ─── View derivation ──────────────────────────────────────────────────────
function deriveFromServer(today: TodayResponse | undefined): ViewState {
  if (today?.hasCheckedInToday && today.entry) {
    return {
      kind: 'summary',
      entry: today.entry,
      streakCurrent: today.streak.current,
      // No animation when user lands on /wellness with an existing entry —
      // they're not seeing this for the first time today, no count-up
      // payoff is owed.
      animateOnMount: false,
    };
  }
  return { kind: 'empty' };
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
