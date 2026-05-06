/**
 * StreakBadge — Sprint 3 BATCH 5
 *
 * Three states (locked, see design doc BATCH 5 contract):
 *
 *   currentWellnessStreakDays === 0 → "Start a streak"  (no flame, muted)
 *   currentWellnessStreakDays === 1 → "Day 1"            + flame
 *   currentWellnessStreakDays >= 2  → "Day N"            + flame
 *
 * Never render "Day 0" — that's a meaningless state. The 0 case is the
 * entry point, not a count.
 *
 * Visual matches the existing achievement streak idiom (flame emoji, role-
 * color text). Renders inline below the readiness hero.
 */

import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  /** Wellness check-in streak count from `userGamification.currentWellnessStreakDays`. */
  days: number;
}

export function StreakBadge({ days }: StreakBadgeProps) {
  if (days === 0) {
    return (
      <p
        className="text-sm text-muted-foreground/70 font-medium"
        data-testid="wellness-streak-zero"
      >
        Start a streak
      </p>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 text-sm text-foreground/90 font-medium"
      data-testid={`wellness-streak-day-${days}`}
    >
      <Flame className="w-4 h-4 text-primary fill-primary/20" aria-hidden="true" />
      <span>
        Day {days}
        {days === 1 && <span className="text-muted-foreground/70 font-normal"> — first day</span>}
      </span>
    </div>
  );
}
