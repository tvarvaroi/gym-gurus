/**
 * WellnessSummary — Sprint 3 BATCH 5
 *
 * State B of the wellness state machine. Composes:
 *   - ReadinessHero (ring + Playfair number + count-up + band copy)
 *   - StreakBadge (3 states)
 *   - 3 FactorCards (Subjective / Training Load / Muscle Recovery), each
 *     present-or-missing based on the algorithm's factors[] vs missingInputs[]
 *   - WellnessMiniTrend (last 7 readiness scores, or null if <2 entries)
 *   - "Edit today's entry" CTA (returns user to State A pre-populated)
 *
 * Factor card layout: vertical stack on mobile, horizontal row on desktop.
 *
 * The factors[] / missingInputs[] split comes from the v0 readiness algorithm
 * in server/services/wellnessService.ts. The three component slots in this
 * UI are fixed (Subjective / Training Load / Muscle Recovery) so the user
 * always sees three cards and the absent ones surface the data-source upsell.
 *
 * See docs/specs/2026-05-06-sprint-3-wellness-ui-design.md (BATCH 5 contract).
 */

import { Pencil, Heart, Activity, Dumbbell } from 'lucide-react';
import type { DailyWellnessLog, ReadinessScoreFactors } from '@shared/schema';
import { ReadinessHero } from './ReadinessHero';
import { FactorCard } from './FactorCard';
import { StreakBadge } from './StreakBadge';
import { WellnessMiniTrend } from './WellnessMiniTrend';

// The three conceptual factor slots, in display order.
// Maps the algorithm's `label` strings to UI slot positions + icons.
const FACTOR_SLOTS = [
  { id: 'subjective_avg', label: 'Subjective wellness', shortLabel: 'Subjective', icon: Heart },
  {
    id: 'training_load',
    label: 'Training load (ACWR)',
    shortLabel: 'Training load',
    icon: Activity,
  },
  {
    id: 'muscle_recovery',
    label: 'Muscle recovery',
    shortLabel: 'Recovery',
    icon: Dumbbell,
  },
] as const;

interface WellnessSummaryProps {
  /** The full server-side wellness log entry (carries readinessScore + readinessScoreFactors). */
  entry: DailyWellnessLog;
  /** Streak count from `POST /log` response or `GET /today` server fetch. */
  streakCurrent: number;
  /** True when this summary appears as a fresh post-submit reveal. */
  animateOnMount: boolean;
  /** "Edit today's entry" handler — transitions back to State A pre-populated. */
  onEdit: () => void;
}

export function WellnessSummary({
  entry,
  streakCurrent,
  animateOnMount,
  onEdit,
}: WellnessSummaryProps) {
  const score = entry.readinessScore ?? 0;
  const factorPayload = (entry.readinessScoreFactors as ReadinessScoreFactors | null) ?? null;
  const presentByLabel = new Map<string, ReadinessScoreFactors['factors'][number]>();
  for (const f of factorPayload?.factors ?? []) {
    presentByLabel.set(f.label, f);
  }
  const missingSet = new Set(factorPayload?.missingInputs ?? []);

  return (
    <div className="space-y-8 md:space-y-10 pb-20 md:pb-12" data-testid="wellness-summary">
      <ReadinessHero score={score} streakCurrent={streakCurrent} animateOnMount={animateOnMount} />

      <div className="flex justify-center">
        <StreakBadge days={streakCurrent} />
      </div>

      {/* Factor cards. Vertical on mobile, horizontal on md+. */}
      <div
        className="flex flex-col md:flex-row gap-3 md:gap-4"
        role="list"
        aria-label="Readiness factor breakdown"
      >
        {FACTOR_SLOTS.map((slot) => {
          const present = presentByLabel.get(slot.label);
          const isMissing = !present || missingSet.has(slot.id);
          if (present) {
            return (
              <FactorCard
                key={slot.id}
                variant="present"
                label={slot.shortLabel}
                score={present.score}
                weight={present.weight}
                contribution={present.contribution}
                icon={slot.icon}
              />
            );
          }
          // Missing — render the no-data treatment so "we don't know" never
          // visually reads like "you scored low".
          return (
            <FactorCard
              key={slot.id}
              variant="missing"
              label={slot.shortLabel}
              icon={slot.icon}
              // refineHref left undefined for now — wearables onboarding lands
              // in Phase B Sensor Web later sprints. When that lands, point at
              // /settings?tab=wearables or similar.
            />
          );
        })}
      </div>

      {/* 7-day mini-trend. Renders null when <2 entries — don't surface absence. */}
      <WellnessMiniTrend />

      {/* Edit CTA — secondary text button. Pencil icon, role-color, no fill. */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
          data-testid="wellness-edit-cta"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          Edit today's entry
        </button>
      </div>
    </div>
  );
}
