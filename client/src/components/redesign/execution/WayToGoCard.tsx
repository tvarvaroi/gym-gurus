import { useEffect } from 'react';
import { Check } from 'lucide-react';

interface WayToGoCardProps {
  setNumber: number;
  totalSets: number;
  weight: number;
  reps: number;
  weightUnit: 'kg' | 'lbs';
  onDismiss: () => void;
}

export function WayToGoCard({
  setNumber,
  totalSets,
  weight,
  reps,
  weightUnit,
  onDismiss,
}: WayToGoCardProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 1200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="absolute inset-0 z-[80] flex flex-col items-center justify-center text-center px-8 animate-in fade-in duration-200 cursor-pointer"
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--primary) / 0.20) 0%, hsl(var(--primary) / 0.08) 50%, #0A0A0A 100%)',
      }}
      onClick={onDismiss}
      role="status"
      aria-label="Set completed"
    >
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
        <Check className="w-8 h-8 text-primary" strokeWidth={3} />
      </div>

      <h2
        className="text-4xl font-bold text-white mb-2"
        style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}
      >
        Way To Go
      </h2>

      <p className="text-neutral-400 text-sm mt-3">
        Set {setNumber} of {totalSets}
        {weight > 0 && (
          <span className="text-neutral-300 ml-2">
            &middot; {weight}
            {weightUnit} &times; {reps}
          </span>
        )}
      </p>

      <p className="text-neutral-600 text-xs mt-8">Tap to continue</p>
    </div>
  );
}
