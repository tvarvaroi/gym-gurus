import { cn } from '@/lib/utils';

interface EquipmentItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface EquipmentSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

// SVG line illustrations — technical diagram aesthetic, consistent 1.5px stroke
function BarbellSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      <line x1="8" y1="32" x2="56" y2="32" stroke={stroke} />
      <rect x="4" y="22" width="8" height="20" rx="1.5" stroke={stroke} />
      <rect x="52" y="22" width="8" height="20" rx="1.5" stroke={stroke} />
      <rect x="12" y="25" width="5" height="14" rx="1" stroke={stroke} />
      <rect x="47" y="25" width="5" height="14" rx="1" stroke={stroke} />
    </svg>
  );
}

function DumbbellsSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      {/* Top dumbbell */}
      <line x1="18" y1="22" x2="46" y2="22" stroke={stroke} />
      <rect x="10" y="17" width="8" height="10" rx="1.5" stroke={stroke} />
      <rect x="46" y="17" width="8" height="10" rx="1.5" stroke={stroke} />
      {/* Bottom dumbbell */}
      <line x1="18" y1="42" x2="46" y2="42" stroke={stroke} />
      <rect x="10" y="37" width="8" height="10" rx="1.5" stroke={stroke} />
      <rect x="46" y="37" width="8" height="10" rx="1.5" stroke={stroke} />
    </svg>
  );
}

function KettlebellSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      <path d="M24 20 C24 12, 40 12, 40 20" stroke={stroke} strokeLinecap="round" />
      <ellipse cx="32" cy="38" rx="14" ry="16" stroke={stroke} />
      <line x1="28" y1="38" x2="36" y2="38" stroke={stroke} strokeLinecap="round" />
    </svg>
  );
}

function ResistanceBandsSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      <path d="M12 16 C12 16, 20 32, 12 48" stroke={stroke} strokeLinecap="round" />
      <path d="M22 16 C22 16, 30 32, 22 48" stroke={stroke} strokeLinecap="round" />
      <path d="M42 16 C42 16, 34 32, 42 48" stroke={stroke} strokeLinecap="round" />
      <path d="M52 16 C52 16, 44 32, 52 48" stroke={stroke} strokeLinecap="round" />
      <line x1="10" y1="16" x2="24" y2="16" stroke={stroke} strokeLinecap="round" />
      <line x1="10" y1="48" x2="24" y2="48" stroke={stroke} strokeLinecap="round" />
      <line x1="40" y1="16" x2="54" y2="16" stroke={stroke} strokeLinecap="round" />
      <line x1="40" y1="48" x2="54" y2="48" stroke={stroke} strokeLinecap="round" />
    </svg>
  );
}

function PullUpBarSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      <line x1="8" y1="20" x2="56" y2="20" stroke={stroke} strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="52" stroke={stroke} strokeLinecap="round" />
      <line x1="52" y1="20" x2="52" y2="52" stroke={stroke} strokeLinecap="round" />
      {/* Grip marks */}
      <line x1="24" y1="18" x2="24" y2="22" stroke={stroke} strokeLinecap="round" />
      <line x1="32" y1="18" x2="32" y2="22" stroke={stroke} strokeLinecap="round" />
      <line x1="40" y1="18" x2="40" y2="22" stroke={stroke} strokeLinecap="round" />
    </svg>
  );
}

function BenchSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      {/* Bench pad */}
      <rect x="8" y="26" width="48" height="8" rx="2" stroke={stroke} />
      {/* Legs */}
      <line x1="14" y1="34" x2="10" y2="50" stroke={stroke} strokeLinecap="round" />
      <line x1="50" y1="34" x2="54" y2="50" stroke={stroke} strokeLinecap="round" />
      {/* Support */}
      <line x1="32" y1="34" x2="32" y2="50" stroke={stroke} strokeLinecap="round" />
      {/* Back rest */}
      <path d="M8 26 L4 14" stroke={stroke} strokeLinecap="round" />
      <rect x="2" y="12" width="6" height="4" rx="1" stroke={stroke} />
    </svg>
  );
}

function CableMachineSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      {/* Frame */}
      <rect x="10" y="8" width="44" height="48" rx="2" stroke={stroke} />
      {/* Weight stack */}
      <rect x="16" y="14" width="12" height="3" rx="0.5" stroke={stroke} />
      <rect x="16" y="19" width="12" height="3" rx="0.5" stroke={stroke} />
      <rect x="16" y="24" width="12" height="3" rx="0.5" stroke={stroke} />
      <rect x="16" y="29" width="12" height="3" rx="0.5" stroke={stroke} />
      {/* Cable */}
      <path d="M28 16 L44 16 L44 40" stroke={stroke} strokeLinecap="round" strokeDasharray="2 2" />
      {/* Handle */}
      <line x1="40" y1="40" x2="48" y2="40" stroke={stroke} strokeLinecap="round" />
      <circle cx="44" cy="44" r="2" stroke={stroke} />
    </svg>
  );
}

function BodyweightSvg({ active }: { active: boolean }) {
  const stroke = active ? 'var(--equipment-active)' : 'currentColor';
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="1.5" className="w-10 h-10">
      {/* Head */}
      <circle cx="32" cy="14" r="6" stroke={stroke} />
      {/* Body */}
      <line x1="32" y1="20" x2="32" y2="38" stroke={stroke} />
      {/* Arms */}
      <line x1="32" y1="26" x2="20" y2="18" stroke={stroke} strokeLinecap="round" />
      <line x1="32" y1="26" x2="44" y2="18" stroke={stroke} strokeLinecap="round" />
      {/* Legs */}
      <line x1="32" y1="38" x2="22" y2="54" stroke={stroke} strokeLinecap="round" />
      <line x1="32" y1="38" x2="42" y2="54" stroke={stroke} strokeLinecap="round" />
    </svg>
  );
}

const equipmentItems: EquipmentItem[] = [
  { id: 'barbell', label: 'Barbell', icon: <BarbellSvg active={false} /> },
  { id: 'dumbbells', label: 'Dumbbells', icon: <DumbbellsSvg active={false} /> },
  { id: 'kettlebell', label: 'Kettlebell', icon: <KettlebellSvg active={false} /> },
  {
    id: 'resistance_bands',
    label: 'Resistance Bands',
    icon: <ResistanceBandsSvg active={false} />,
  },
  { id: 'pull_up_bar', label: 'Pull-up Bar', icon: <PullUpBarSvg active={false} /> },
  { id: 'bench', label: 'Bench', icon: <BenchSvg active={false} /> },
  { id: 'cable_machine', label: 'Cable Machine', icon: <CableMachineSvg active={false} /> },
  { id: 'bodyweight', label: 'Bodyweight', icon: <BodyweightSvg active={false} /> },
];

// Active versions with accent color
const ActiveIcon: Record<string, React.ReactNode> = {
  barbell: <BarbellSvg active />,
  dumbbells: <DumbbellsSvg active />,
  kettlebell: <KettlebellSvg active />,
  resistance_bands: <ResistanceBandsSvg active />,
  pull_up_bar: <PullUpBarSvg active />,
  bench: <BenchSvg active />,
  cable_machine: <CableMachineSvg active />,
  bodyweight: <BodyweightSvg active />,
};

export function EquipmentSelector({ selected, onChange, className }: EquipmentSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div
      className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}
      style={{ '--equipment-active': 'hsl(var(--primary))' } as React.CSSProperties}
    >
      {equipmentItems.map((item) => {
        const isSelected = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
              'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isSelected
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-white/[0.03] border-white/[0.08] text-white/50'
            )}
          >
            <div className="text-current">{isSelected ? ActiveIcon[item.id] : item.icon}</div>
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                isSelected ? 'text-primary' : 'text-white/60'
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
