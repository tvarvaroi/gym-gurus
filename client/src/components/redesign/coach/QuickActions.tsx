import { Dumbbell, Apple, Moon, Target } from 'lucide-react';

interface QuickActionsProps {
  onSelect: (prompt: string) => void;
  visible: boolean;
}

const CHIPS = [
  { icon: Dumbbell, label: 'Workout Tips', prompt: 'Give me tips to improve my workout performance', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { icon: Apple, label: 'Nutrition', prompt: 'What should I eat before and after my workout?', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  { icon: Moon, label: 'Recovery', prompt: 'How can I optimize my recovery between workouts?', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { icon: Target, label: 'Goals', prompt: 'Help me set realistic fitness goals for the next month', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
] as const;

export function QuickActions({ onSelect, visible }: QuickActionsProps) {
  if (!visible) return null;

  return (
    <>
      {/* Mobile: horizontal scroll chips */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-3 px-3 py-2 md:hidden">
        {CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.label}
              onClick={() => onSelect(chip.prompt)}
              className={`snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-colors active:scale-95 ${chip.color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-2 py-2">
        {CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.label}
              onClick={() => onSelect(chip.prompt)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/30 bg-card/50 hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors text-left min-h-[44px]"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{chip.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
