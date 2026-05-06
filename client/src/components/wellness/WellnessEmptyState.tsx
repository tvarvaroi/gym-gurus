/**
 * WellnessEmptyState — Sprint 3 BATCH 4
 *
 * State C of the wellness state machine: no entry today, ritual not yet started.
 * Three role-distinct copies (locked in BATCH 3 design doc).
 *
 *   - Ronin: "How are you feeling today?" — direct, motivational, AI-coach
 *     payoff promised
 *   - Guru: "Track your own readiness." — business-grounded, recognizes the
 *     trainer-spends-day-on-clients context
 *   - Disciple: "How are you feeling today?" — frames value (better coaching)
 *     and control (you decide) in one breath, with a conditional privacy
 *     pointer when the user has opted OUT of sharing
 *
 * The Disciple privacy pointer "Currently private. Change in Settings → Privacy."
 * is gated on `user.shareWellnessWithTrainer === false`. That flag will be
 * added to the `clients` table in Sprint 4 alongside granular consent —
 * until then the field doesn't exist on the user object and the condition
 * is always falsy, so the line renders only when the flag lands. Default
 * sharing behavior matches Sprint 1's biometrics precedent (default true).
 *
 * See docs/specs/2026-05-06-sprint-3-wellness-ui-design.md FQ2 (locked copy)
 * and the Sprint 1 BodyMetricsEmptyState shape we mirror.
 */

import { ActionButton } from '@/components/ui/premium/ActionButton';
import { RoninIcon } from '@/components/icons/RoninIcon';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { Sparkles } from 'lucide-react';

interface WellnessEmptyStateProps {
  role: 'trainer' | 'solo' | 'client' | undefined;
  /** Sprint-4-future flag. Currently undefined on user objects → privacy line stays hidden. */
  shareWellnessWithTrainer?: boolean;
  onStart: () => void;
}

interface RoleCopy {
  headline: string;
  subtitle: string;
  cta: string;
}

const COPY: Record<'trainer' | 'solo' | 'client', RoleCopy> = {
  solo: {
    headline: 'How are you feeling today?',
    subtitle:
      '30 seconds. Six sliders, three toggles, one note. Your AI coach learns from this — and so do you.',
    cta: "Start today's check-in",
  },
  trainer: {
    headline: 'Track your own readiness.',
    subtitle:
      'Same wellness check-in your clients get — for yourself. Daily readiness data feeds your own dashboards.',
    cta: "Start today's check-in",
  },
  client: {
    headline: 'How are you feeling today?',
    subtitle:
      '30 seconds tells your trainer how to coach you better. You control what they see — change anytime in Privacy.',
    cta: "Start today's check-in",
  },
};

export function WellnessEmptyState({
  role,
  shareWellnessWithTrainer,
  onStart,
}: WellnessEmptyStateProps) {
  const resolvedRole: 'trainer' | 'solo' | 'client' = role ?? 'solo';
  const copy = COPY[resolvedRole];
  const Icon =
    resolvedRole === 'trainer' ? GuruIcon : resolvedRole === 'client' ? DiscipleIcon : RoninIcon;

  // Disciple-only conditional privacy pointer. Activates when Sprint 4 adds
  // the shareWellnessWithTrainer flag to the clients table.
  const showPrivacyLine = resolvedRole === 'client' && shareWellnessWithTrainer === false;

  return (
    <div className="flex flex-col items-center text-center py-12 md:py-20 px-6">
      <div className="mb-6 opacity-90">
        <Icon size={128} variant="default" />
      </div>
      <h2 className="text-2xl md:text-3xl font-['Playfair_Display'] font-light tracking-tight text-foreground">
        {copy.headline}
      </h2>
      <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-[460px] leading-relaxed">
        {copy.subtitle}
      </p>
      <ActionButton
        variant="primary"
        size="md"
        className="mt-8"
        onClick={onStart}
        icon={<Sparkles className="w-4 h-4" />}
      >
        {copy.cta}
      </ActionButton>
      {showPrivacyLine && (
        <p className="mt-3 text-xs text-muted-foreground/70" data-testid="wellness-privacy-line">
          Currently private. Change in Settings → Privacy.
        </p>
      )}
    </div>
  );
}
