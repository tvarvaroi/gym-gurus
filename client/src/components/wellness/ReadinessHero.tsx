/**
 * ReadinessHero — Sprint 3 BATCH 5
 *
 * State B's emotional payoff. Composition:
 *   - Apple-Watch-style open ring (reuses CircularProgressRing) with role-locked
 *     gradient (no auto-color shift — brand cohesion over redundant signal)
 *   - Playfair Display number inside the ring with count-up animation
 *   - "/100" suffix in muted Inter
 *   - Band headline copy below: "Today's a green-light day." / "Solid base —
 *     listen to your body." / "Recovery first." (locked, see design doc)
 *
 * Streak-aware reveal timing — locked at the constants block below. NOT a
 * refactor target. Two tiers exist by design:
 *   - First-time / no streak (streak.current ≤ 1): 1.2s total reveal
 *   - Returning user (streak.current > 1):           0.6s total reveal
 *   - prefers-reduced-motion: instant, no count-up, no animation
 *
 * Why two tiers: a 1.5s reveal is delight on day 1 and friction on day 30.
 * The fast tier preserves the choreography for users who already know the
 * payoff. DO NOT "harmonize" these values. Detect via streak.current from
 * the POST /api/wellness/log response.
 *
 * See docs/specs/2026-05-06-sprint-3-wellness-ui-design.md Decision 4.
 */

import { useEffect, useState } from 'react';
import { CircularProgressRing } from '@/components/solo-dashboard/CircularProgressRing';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ─── Locked timing constants ──────────────────────────────────────────────
// Two-tier reveal timing. NOT a refactor target — the slow tier is for
// first-time users (emotional payoff); the fast tier is for daily returners
// (a 1.5s reveal every day for a year becomes friction, not delight). DO NOT
// "harmonize" these values. Detect via streak.current from the POST /log
// response. See docs/specs/2026-05-06-sprint-3-wellness-ui-design.md Decision 4.
const TIMING = {
  firstTime: {
    formFadeMs: 200,
    arcAndCountMs: 1000,
    headlineMs: 700,
    factorStaggerBeatMs: 100,
  },
  returning: {
    formFadeMs: 100,
    arcAndCountMs: 500,
    headlineMs: 350,
    factorStaggerBeatMs: 50,
  },
} as const;

export type RevealTier = 'firstTime' | 'returning' | 'instant';

export function getRevealTier(streakCurrent: number, prefersReducedMotion: boolean): RevealTier {
  if (prefersReducedMotion) return 'instant';
  return streakCurrent <= 1 ? 'firstTime' : 'returning';
}

export function getRevealTiming(tier: RevealTier) {
  return tier === 'instant' ? null : TIMING[tier];
}

// ─── Locked band headline copy (FQ3) ──────────────────────────────────────
// Source-controlled here. Future copy A/B tests are a separate decision in
// a separate doc, not implementation-time edits. Three thresholds match the
// existing CircularProgressRing auto-color split for consistency with the
// Recovery widget elsewhere in the app.
function bandHeadlineFor(score: number): string {
  if (score >= 80) return "Today's a green-light day.";
  if (score >= 50) return 'Solid base — listen to your body.';
  return 'Recovery first.';
}

// ─── Count-up animation ───────────────────────────────────────────────────
// Plain rAF loop, no framer-motion. Linear-ease (the ring arc is animated
// by CircularProgressRing's framer-motion already, so the number follows
// the same timing visually). On prefers-reduced-motion, the final value
// is rendered immediately with no animation.
function useCountUp(target: number, durationMs: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    setValue(0);
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setValue(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, enabled]);

  return value;
}

interface ReadinessHeroProps {
  /** 0-100 readiness score. */
  score: number;
  /** From the POST /log response — drives reveal-tier selection. */
  streakCurrent: number;
  /** True when this hero appears as a fresh post-submit reveal (vs. revisit of an existing entry). */
  animateOnMount?: boolean;
}

export function ReadinessHero({ score, streakCurrent, animateOnMount = true }: ReadinessHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const tier = getRevealTier(streakCurrent, prefersReducedMotion);
  const timing = getRevealTiming(tier);
  const shouldAnimate = animateOnMount && tier !== 'instant';

  // The ring's stroke-dasharray reveal is driven by CircularProgressRing's
  // own framer-motion (it accepts an `animated` flag). The count-up uses the
  // same effective duration so number + arc finish in lock-step.
  const countUpMs = timing?.arcAndCountMs ?? 0;
  const displayed = useCountUp(score, countUpMs, shouldAnimate);

  const headline = bandHeadlineFor(score);

  // Headline fade-in delay matches the design doc: starts at 800ms in
  // first-time tier (overlap with count-up tail) → at 70% of arcAndCountMs
  // generally so the reveal feels natural.
  const headlineDelayMs = timing ? Math.round(timing.arcAndCountMs * 0.7) : 0;

  return (
    <div className="flex flex-col items-center text-center" data-testid="wellness-readiness-hero">
      <div className="md:hidden">
        <CircularProgressRing
          value={score}
          size={160}
          strokeWidth={12}
          gradient
          id="wellness-mobile"
          animated={shouldAnimate}
        >
          <div className="flex flex-col items-center justify-center">
            <span className="text-[64px] leading-none font-light tracking-tight tabular-nums font-['Playfair_Display']">
              {displayed}
            </span>
            <span className="text-xs text-muted-foreground mt-1">/ 100</span>
          </div>
        </CircularProgressRing>
      </div>
      <div className="hidden md:block">
        <CircularProgressRing
          value={score}
          size={200}
          strokeWidth={14}
          gradient
          id="wellness-desktop"
          animated={shouldAnimate}
        >
          <div className="flex flex-col items-center justify-center">
            <span className="text-[80px] leading-none font-light tracking-tight tabular-nums font-['Playfair_Display']">
              {displayed}
            </span>
            <span className="text-sm text-muted-foreground mt-1">/ 100</span>
          </div>
        </CircularProgressRing>
      </div>

      <h2
        className="mt-6 text-2xl md:text-3xl font-['Playfair_Display'] font-light tracking-tight text-foreground"
        style={
          shouldAnimate
            ? ({
                animation: `wellnessHeadlineFade 350ms ease-out ${headlineDelayMs}ms both`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {headline}
      </h2>

      {/* Inline keyframes — kept local to the component since this animation
          only exists in this surface. If a second surface ever needs it,
          extract to global CSS. */}
      <style>
        {`@keyframes wellnessHeadlineFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }`}
      </style>
    </div>
  );
}
