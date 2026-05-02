import { ActionButton } from '@/components/ui/premium/ActionButton';
import { RoninIcon } from '@/components/icons/RoninIcon';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { Plus } from 'lucide-react';

interface BodyMetricsEmptyStateProps {
  role: 'trainer' | 'solo' | 'client' | undefined;
  onLog: () => void;
}

const COPY: Record<'trainer' | 'solo' | 'client', { headline: string; subtitle: string }> = {
  solo: {
    headline: 'Track every change.',
    subtitle:
      'Weight, body fat, measurements — log them as often as you want. Your story unfolds with the data.',
  },
  trainer: {
    headline: 'Track your own progress.',
    subtitle: "Same fields you'd use with clients — for yourself.",
  },
  client: {
    headline: 'Your progress, on your terms.',
    subtitle:
      'Log when you want. Your trainer sees the trends — you can change that anytime in Settings.',
  },
};

export function BodyMetricsEmptyState({ role, onLog }: BodyMetricsEmptyStateProps) {
  const copy = COPY[role ?? 'solo'];
  const Icon = role === 'trainer' ? GuruIcon : role === 'client' ? DiscipleIcon : RoninIcon;

  return (
    <div className="flex flex-col items-center text-center py-12 md:py-20 px-6">
      <div className="mb-6 opacity-90">
        <Icon size={128} variant="default" />
      </div>
      <h2 className="text-2xl md:text-3xl font-['Playfair_Display'] font-light tracking-tight text-foreground">
        {copy.headline}
      </h2>
      <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-[420px] leading-relaxed">
        {copy.subtitle}
      </p>
      <ActionButton
        variant="primary"
        size="md"
        className="mt-8"
        onClick={onLog}
        icon={<Plus className="w-4 h-4" />}
      >
        Log first entry
      </ActionButton>
    </div>
  );
}
