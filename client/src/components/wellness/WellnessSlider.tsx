/**
 * WellnessSlider — Sprint 3 BATCH 4
 *
 * Single 1–10 slider used 6× on the wellness check-in. Wrapper around the
 * shadcn `Slider` (Radix-based) with three layers added on top:
 *
 *   1. Large value readout above the track (text-3xl, tabular-nums, Inter).
 *      The readout IS the slider's identity — it's the thing the user reads
 *      while sliding. The track and thumb are secondary feedback.
 *   2. Custom thumb sizing — 24px desktop, 32px mobile — for thumb-friendly
 *      touch targets without breaking the design system. Track stays at
 *      the shadcn 2px height; making it bigger competed visually with the
 *      readout above it.
 *   3. Icon-only anchors at the two ends. Per Sprint 3 BATCH 3 FQ1: words
 *      were dropped because 24 anchor elements (6 sliders × 2 ends × icon+word)
 *      compete on mobile 390px. The slider's value readout above carries the
 *      "what does this number mean" signal; the icons are universal mobile
 *      vocabulary and don't need text reinforcement.
 *
 * Tap-to-set works out of the box via Radix — the user can tap anywhere on
 * the track and the value snaps to that position. Critical for completing
 * 6 sliders in <30s on mobile.
 *
 * Accessibility comes free from Radix: role="slider", aria-valuemin/max/now,
 * keyboard arrows, focus-visible ring. Screen-reader announcements work via
 * aria-label which we wire up to the question text.
 *
 * The `value` is held in a single integer 1–10 number. Schema column type is
 * `integer` and CHECK constraint enforces 1–10.
 *
 * See docs/specs/2026-05-06-sprint-3-wellness-ui-design.md Decision 1.
 */

import { Slider } from '@/components/ui/slider';
import type { LucideIcon } from 'lucide-react';

interface WellnessSliderProps {
  /** Question label rendered next to the readout. e.g. "Energy" */
  label: string;
  /** Current 1–10 integer. */
  value: number;
  /** Setter for the integer value. */
  onChange: (next: number) => void;
  /** Lucide icon at the low end (visually left). */
  lowIcon: LucideIcon;
  /** Lucide icon at the high end (visually right). */
  highIcon: LucideIcon;
  /** Accessible label text for screen readers — also tooltip on the readout. */
  ariaLabel?: string;
}

export function WellnessSlider({
  label,
  value,
  onChange,
  lowIcon: LowIcon,
  highIcon: HighIcon,
  ariaLabel,
}: WellnessSliderProps) {
  return (
    <div className="flex flex-col gap-2 py-1">
      {/* Top row: question label on left, value readout on right */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground/90">{label}</span>
        <span
          className="text-3xl font-light tracking-tight tabular-nums text-foreground"
          aria-live="polite"
        >
          {value}
        </span>
      </div>

      {/* Slider row: low icon · slider · high icon */}
      <div className="flex items-center gap-3">
        <LowIcon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />
        <Slider
          // Custom thumb sizing via className override.
          // Radix exposes the thumb through SliderPrimitive.Thumb, which the
          // shadcn wrapper renders with `h-5 w-5` (20px). We bump to 24/32px
          // via Tailwind's `[&>span:last-child]:h-6 [&>span:last-child]:w-6`
          // selector against the slot element. The wellness-specific bump
          // doesn't affect the body-metrics or other usages.
          className="
            wellness-slider flex-1
            [&>span:last-child]:h-6 [&>span:last-child]:w-6
            md:[&>span:last-child]:h-6 md:[&>span:last-child]:w-6
            max-md:[&>span:last-child]:h-8 max-md:[&>span:last-child]:w-8
            [&>span:first-child]:h-1.5
          "
          min={1}
          max={10}
          step={1}
          value={[value]}
          onValueChange={(next) => onChange(next[0] ?? value)}
          aria-label={ariaLabel ?? label}
        />
        <HighIcon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
