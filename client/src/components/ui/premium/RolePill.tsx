import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * §DS-7 RolePill — role-aware filter / toggle / selection pill.
 *
 * Unifies three previously-duplicated inline implementations:
 *   - PhotosTab pose filter   (role="radio", sm)
 *   - BodyMetricsTrends range (role="radio", sm)
 *   - WellnessRitual behavior (role="switch", md, with leading icon)
 *
 * Active state uses the role accent (`bg-primary text-primary-foreground`)
 * inheriting from the per-role CSS variable. Inactive uses muted card-bg
 * with a hover edge that previews the accent. The active/inactive treatment
 * is identical to all three pre-extraction sites — no opacity vs muted-fg
 * divergence to reconcile.
 *
 * Touch target: sm renders visually at 36px but exposes a 44px effective
 * hit area via `before:absolute before:-inset-1 before:content-['']` (8px
 * vertical expansion brings 36 → 44). md renders natively at 44px and
 * needs no expansion. Both meet WCAG 2.5.5. The hit-area expansion is the
 * Sprint 3 BATCH 8 pattern (slider thumb pseudo-element padding).
 *
 * ARIA role is REQUIRED — `'switch'` for free toggles (not part of a
 * single-select group), `'radio'` for radio-group members. There's no safe
 * default; picking the wrong one ships invalid ARIA semantics.
 */
export interface RolePillProps {
  /** Selection or on state. Drives both visual treatment and `aria-checked`. */
  active: boolean;
  /** Click handler. */
  onSelect: () => void;
  /**
   * ARIA role. Use `'radio'` when the pill is one of N options in a
   * `<div role="radiogroup">` parent. Use `'switch'` for an independent
   * boolean toggle that isn't part of a group.
   */
  role: 'switch' | 'radio';
  /** Visible label. */
  children: ReactNode;
  /** Optional leading icon (lucide). Renders at `w-4 h-4`, `opacity-70` when inactive. */
  icon?: LucideIcon;
  /**
   * Visual size. `sm` (36px tall, text-xs, px-3.5) for compact filter chips;
   * `md` (44px tall, text-sm, px-4) for prominent toggle pills. Both expose
   * a ≥44px effective tap area. Defaults to `sm` since filter sites are the
   * majority pattern.
   */
  size?: 'sm' | 'md';
  /** Optional override class — escape hatch for site-specific spacing. Avoid for visual changes. */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'min-h-[36px] px-3.5 text-xs before:absolute before:-inset-1 before:content-[""]',
  md: 'min-h-[44px] px-4 text-sm',
} as const;

const ACTIVE_CLASSES = 'bg-primary text-primary-foreground';
const INACTIVE_CLASSES =
  'bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40';

export const RolePill = forwardRef<HTMLButtonElement, RolePillProps>(
  ({ active, onSelect, role, children, icon: Icon, size = 'sm', className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role={role}
        aria-checked={active}
        onClick={onSelect}
        className={cn(
          'relative rounded-full font-medium transition-colors cursor-pointer flex items-center gap-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          SIZE_CLASSES[size],
          active ? ACTIVE_CLASSES : INACTIVE_CLASSES,
          className
        )}
      >
        {Icon && <Icon className={cn('w-4 h-4', !active && 'opacity-70')} aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

RolePill.displayName = 'RolePill';
