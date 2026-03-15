import { useMemo, useState } from 'react';
import Model, { type IExerciseData, type IMuscleStats } from 'react-body-highlighter';

interface MuscleStatus {
  muscleGroup: string;
  fatigueLevel: number;
  recoveryStatus: 'recovered' | 'recovering' | 'fatigued';
  lastTrainedAt: string | null;
}

interface MuscleAnatomyDiagramProps {
  fatigueData: MuscleStatus[];
  className?: string;
  onMuscleClick?: (muscle: string) => void;
}

// Map our API muscle group names → react-body-highlighter slugs
const MUSCLE_MAP: Record<string, string[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back'],
  upper_back: ['upper-back', 'trapezius'],
  lower_back: ['lower-back'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  front_deltoids: ['front-deltoids'],
  back_deltoids: ['back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  forearm: ['forearm'],
  abs: ['abs'],
  core: ['abs', 'obliques'],
  obliques: ['obliques'],
  quadriceps: ['quadriceps'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  hamstring: ['hamstring'],
  glutes: ['gluteal'],
  gluteal: ['gluteal'],
  calves: ['calves'],
  adductors: ['adductor'],
  adductor: ['adductor'],
  abductors: ['abductors'],
  traps: ['trapezius'],
  trapezius: ['trapezius'],
  neck: ['neck'],
  legs: ['quadriceps', 'hamstring', 'calves', 'gluteal'],
};

function getMappedMuscles(apiName: string): string[] {
  const lower = apiName.toLowerCase().replace(/\s+/g, '_');
  return MUSCLE_MAP[lower] || [];
}

export function MuscleAnatomyDiagram({
  fatigueData,
  className = '',
  onMuscleClick,
}: MuscleAnatomyDiagramProps) {
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior');

  // Convert fatigue data to exercise data format
  // We use frequency to represent fatigue level buckets:
  // frequency 1 = recovered (green), 2 = recovering (amber), 3 = fatigued (red)
  const exerciseData: IExerciseData[] = useMemo(() => {
    const result: IExerciseData[] = [];

    for (const muscle of fatigueData) {
      const mapped = getMappedMuscles(muscle.muscleGroup);
      if (mapped.length === 0) continue;

      const freq =
        muscle.recoveryStatus === 'fatigued' ? 3 : muscle.recoveryStatus === 'recovering' ? 2 : 1;

      result.push({
        name: muscle.muscleGroup,
        muscles: mapped as any,
        frequency: freq,
      });
    }

    return result;
  }, [fatigueData]);

  const handleClick = (data: IMuscleStats) => {
    if (onMuscleClick && data.muscle) {
      onMuscleClick(data.muscle);
    }
  };

  // Colors indexed by frequency-1: [recovered, recovering, fatigued]
  const highlightedColors = [
    'rgba(34, 197, 94, 0.6)', // green — recovered
    'rgba(245, 158, 11, 0.6)', // amber — recovering
    'rgba(239, 68, 68, 0.6)', // red — fatigued
  ];

  return (
    <div className={className}>
      {/* View toggle */}
      <div className="flex justify-center gap-1 mb-3">
        <button
          onClick={() => setView('anterior')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            view === 'anterior'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
          }`}
        >
          Front
        </button>
        <button
          onClick={() => setView('posterior')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            view === 'posterior'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
          }`}
        >
          Back
        </button>
      </div>

      {/* Body model */}
      <div className="flex justify-center">
        <Model
          data={exerciseData}
          type={view}
          bodyColor="rgba(255, 255, 255, 0.08)"
          highlightedColors={highlightedColors}
          onClick={handleClick}
          style={{ width: '100%', maxWidth: '280px' }}
          svgStyle={{ width: '100%', height: 'auto' }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }}
          />
          Recovered
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.6)' }}
          />
          Recovering
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }}
          />
          Fatigued
        </span>
      </div>
    </div>
  );
}
