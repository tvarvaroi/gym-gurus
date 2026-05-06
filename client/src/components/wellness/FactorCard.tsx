/**
 * FactorCard — Sprint 3 BATCH 5
 *
 * Single component, two variants: present and missing-input.
 *
 * The v0 readiness algorithm produces a `factors[]` array of present
 * components AND a separate `missingInputs[]` array of strings naming the
 * components the user couldn't provide data for (e.g. no wearable connected
 * → no training-load data → 'training_load' goes into missingInputs).
 *
 * The UI rule (locked, see design doc Decision 3 + BATCH 5 contract):
 *   "We don't know" must NEVER read like "you scored low."
 *
 * Present-factor card — shows score + role-color bar + contribution percent.
 * Missing-input card  — shows em-dash + "Add data to refine." link, NO bar.
 *   The absence of the bar is deliberate: a 0-width bar would read as a low
 *   score; no bar reads as no data.
 *
 * Layout responsibility lives in the parent (WellnessSummary) — vertical
 * stack on mobile, horizontal row on desktop. The card itself is layout-
 * agnostic; it fills whatever container it's placed in.
 */

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentFactorCardProps {
  variant: 'present';
  label: string;
  score: number; // 0-100
  weight: number; // 0..1
  contribution: number; // score × weight, rounded
  icon?: LucideIcon;
}

interface MissingFactorCardProps {
  variant: 'missing';
  label: string;
  /** Optional: where the user can connect data to fill this factor. */
  refineHref?: string;
  icon?: LucideIcon;
}

type FactorCardProps = PresentFactorCardProps | MissingFactorCardProps;

export function FactorCard(props: FactorCardProps) {
  if (props.variant === 'present') {
    return <PresentCard {...props} />;
  }
  return <MissingCard {...props} />;
}

function PresentCard({ label, score, weight, contribution, icon: Icon }: PresentFactorCardProps) {
  return (
    <div
      className="flex-1 rounded-2xl border border-border/40 bg-card px-4 py-3.5 min-w-0"
      data-testid="wellness-factor-card-present"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium truncate">
          {label}
        </p>
      </div>
      <p className="text-2xl font-light tracking-tight tabular-nums text-foreground">{score}</p>

      {/* Role-color bar at width = score%. Subtle, matches BodyMetricsTrends visual idiom. */}
      <div className="mt-2.5 h-1 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground/70">
        contributes {Math.round(weight * 100)}% to your readiness
        <span className="sr-only">
          {' '}
          (component score {score}, weighted contribution {contribution})
        </span>
      </p>
    </div>
  );
}

function MissingCard({ label, refineHref, icon: Icon }: MissingFactorCardProps) {
  return (
    <div
      className={cn(
        'flex-1 rounded-2xl border border-dashed border-border/40 bg-card/50 px-4 py-3.5 min-w-0'
      )}
      data-testid="wellness-factor-card-missing"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/50" aria-hidden="true" />}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium truncate">
          {label}
        </p>
      </div>
      {/* em-dash, NOT a number — never let "we don't know" read like "you scored low" */}
      <p
        className="text-2xl font-light tracking-tight text-muted-foreground/50"
        aria-label="No data yet"
      >
        —
      </p>

      {/* No band-color bar. The bar's absence is the signal. */}

      {refineHref ? (
        <a
          href={refineHref}
          className="mt-3 block text-[11px] text-primary hover:text-primary/80 transition-colors"
        >
          Add data to refine →
        </a>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground/60">Add data to refine.</p>
      )}
    </div>
  );
}
