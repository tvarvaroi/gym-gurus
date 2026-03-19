/**
 * ExerciseMuscleDisplay — anatomy visualization for exercises.
 *
 * Two modes:
 *   "display"     — read-only body diagram showing primary/secondary muscles
 *   "interactive"  — chip-based muscle picker with live SVG feedback (Peloton pattern)
 *
 * Uses react-body-highlighter (CJS-only, Vite dep-optimizer handles it).
 */

import { useMemo, useState } from 'react';
import Model, { type IExerciseData } from 'react-body-highlighter';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_DISPLAY_NAMES,
  BODY_REGIONS,
  BODY_REGION_NAMES,
  type MuscleGroup,
  type BodyRegion,
} from '@/lib/constants/muscleGroups';

// ── Map our muscle group names → react-body-highlighter slugs ──
const MUSCLE_SLUG_MAP: Record<string, string[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  abs: ['abs'],
  obliques: ['obliques'],
  lower_back: ['lower-back'],
  traps: ['trapezius'],
  lats: ['upper-back'],
};

function getSlugs(muscle: string): string[] {
  const key = muscle.toLowerCase().replace(/\s+/g, '_');
  return MUSCLE_SLUG_MAP[key] ?? [];
}

// ── Props ──

interface ExerciseMuscleDisplayProps {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  mode: 'display' | 'interactive';
  size?: 'sm' | 'md' | 'lg';
  showToggle?: boolean;
  showLegend?: boolean;
  className?: string;
  // Interactive-mode callbacks
  onPrimaryChange?: (muscles: string[]) => void;
  onSecondaryChange?: (muscles: string[]) => void;
}

// ── Size presets ──

const SIZE_CONFIG = {
  sm: { maxWidth: '120px', toggleSize: 'text-[10px]', legendSize: 'text-[9px]' },
  md: { maxWidth: '200px', toggleSize: 'text-xs', legendSize: 'text-[10px]' },
  lg: { maxWidth: '280px', toggleSize: 'text-xs', legendSize: 'text-xs' },
} as const;

// ── Main component ──

export function ExerciseMuscleDisplay({
  primaryMuscles,
  secondaryMuscles,
  mode,
  size = 'md',
  showToggle = true,
  showLegend = true,
  className = '',
  onPrimaryChange,
  onSecondaryChange,
}: ExerciseMuscleDisplayProps) {
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior');
  const cfg = SIZE_CONFIG[size];

  // Build exercise data for react-body-highlighter
  const exerciseData: IExerciseData[] = useMemo(() => {
    const result: IExerciseData[] = [];

    for (const m of primaryMuscles) {
      const slugs = getSlugs(m);
      if (slugs.length === 0) continue;
      result.push({ name: m, muscles: slugs as any, frequency: 2 });
    }

    for (const m of secondaryMuscles) {
      const slugs = getSlugs(m);
      if (slugs.length === 0) continue;
      // Only add if not already added as primary
      if (!primaryMuscles.includes(m)) {
        result.push({ name: m, muscles: slugs as any, frequency: 1 });
      }
    }

    return result;
  }, [primaryMuscles, secondaryMuscles]);

  // Primary = bright role color, secondary = dimmer
  const highlightedColors = [
    'rgba(168, 85, 247, 0.35)', // freq 1 = secondary (dimmer purple)
    'rgba(168, 85, 247, 0.7)', // freq 2 = primary (brighter purple)
  ];

  // No muscles = render nothing in display mode
  if (mode === 'display' && primaryMuscles.length === 0 && secondaryMuscles.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Interactive mode: muscle picker chips */}
      {mode === 'interactive' && (
        <MusclePicker
          primaryMuscles={primaryMuscles}
          secondaryMuscles={secondaryMuscles}
          onPrimaryChange={onPrimaryChange!}
          onSecondaryChange={onSecondaryChange!}
        />
      )}

      {/* Body diagram */}
      <div className="flex justify-center">
        <div style={{ maxWidth: cfg.maxWidth, width: '100%' }}>
          <Model
            data={exerciseData}
            type={view}
            bodyColor="rgba(255, 255, 255, 0.08)"
            highlightedColors={highlightedColors}
            style={{ width: '100%' }}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
        </div>
      </div>

      {/* View toggle */}
      {showToggle && (
        <div className="flex justify-center gap-1 mt-2">
          <button
            type="button"
            onClick={() => setView('anterior')}
            className={`px-2.5 py-0.5 ${cfg.toggleSize} font-medium rounded-md transition-all ${
              view === 'anterior'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setView('posterior')}
            className={`px-2.5 py-0.5 ${cfg.toggleSize} font-medium rounded-md transition-all ${
              view === 'posterior'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
            }`}
          >
            Back
          </button>
        </div>
      )}

      {/* Legend */}
      {showLegend && (primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
        <div className={`flex justify-center gap-4 mt-2 ${cfg.legendSize} text-muted-foreground`}>
          {primaryMuscles.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.7)' }}
              />
              Primary
            </span>
          )}
          {secondaryMuscles.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.35)' }}
              />
              Secondary
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── MusclePicker — chip-based selection UI (Peloton pattern) ──

interface MusclePickerProps {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  onPrimaryChange: (muscles: string[]) => void;
  onSecondaryChange: (muscles: string[]) => void;
}

function MusclePicker({
  primaryMuscles,
  secondaryMuscles,
  onPrimaryChange,
  onSecondaryChange,
}: MusclePickerProps) {
  const [activeRegion, setActiveRegion] = useState<BodyRegion | null>(null);

  const displayedMuscles: MuscleGroup[] = activeRegion
    ? BODY_REGIONS[activeRegion]
    : [...MUSCLE_GROUPS];

  function toggleMuscle(muscle: MuscleGroup) {
    const isPrimary = primaryMuscles.includes(muscle);
    const isSecondary = secondaryMuscles.includes(muscle);

    if (!isPrimary && !isSecondary) {
      // Not selected → add as primary
      onPrimaryChange([...primaryMuscles, muscle]);
    } else if (isPrimary) {
      // Primary → move to secondary
      onPrimaryChange(primaryMuscles.filter((m) => m !== muscle));
      onSecondaryChange([...secondaryMuscles, muscle]);
    } else {
      // Secondary → remove entirely
      onSecondaryChange(secondaryMuscles.filter((m) => m !== muscle));
    }
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Region filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveRegion(null)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border ${
            activeRegion === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
          }`}
        >
          All
        </button>
        {(Object.keys(BODY_REGIONS) as BodyRegion[]).map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => setActiveRegion(activeRegion === region ? null : region)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border ${
              activeRegion === region
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
            }`}
          >
            {BODY_REGION_NAMES[region]}
          </button>
        ))}
      </div>

      {/* Muscle chips — 3-state toggle: off → primary → secondary → off */}
      <div className="flex flex-wrap gap-1.5">
        {displayedMuscles.map((muscle) => {
          const isPrimary = primaryMuscles.includes(muscle);
          const isSecondary = secondaryMuscles.includes(muscle);

          let chipClass = 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20';
          let label = '';
          if (isPrimary) {
            chipClass = 'bg-primary/20 text-primary border-primary/40';
            label = ' ●';
          } else if (isSecondary) {
            chipClass = 'bg-primary/10 text-primary/60 border-primary/20';
            label = ' ○';
          }

          return (
            <button
              key={muscle}
              type="button"
              onClick={() => toggleMuscle(muscle)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border ${chipClass}`}
            >
              {MUSCLE_GROUP_DISPLAY_NAMES[muscle]}
              {label}
            </button>
          );
        })}
      </div>

      {/* Cycle hint */}
      <p className="text-[10px] text-muted-foreground/60">
        Tap to cycle: primary ● → secondary ○ → remove
      </p>
    </div>
  );
}

// ── Utility: aggregate muscle data from a workout's exercises ──

export function aggregateWorkoutMuscles(
  exercises: Array<{
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    muscleGroup?: string;
    muscleGroups?: string[];
  }>
): { primary: string[]; secondary: string[] } {
  const primarySet = new Set<string>();
  const secondarySet = new Set<string>();

  for (const ex of exercises) {
    const primary = ex.primaryMuscles?.length
      ? ex.primaryMuscles
      : ex.muscleGroups?.length
        ? ex.muscleGroups
        : ex.muscleGroup
          ? [ex.muscleGroup]
          : [];

    const secondary = ex.secondaryMuscles ?? [];

    for (const m of primary) primarySet.add(m);
    for (const m of secondary) secondarySet.add(m);
  }

  // If a muscle appears as both primary and secondary, keep it as primary only
  primarySet.forEach((m) => {
    secondarySet.delete(m);
  });

  return {
    primary: Array.from(primarySet),
    secondary: Array.from(secondarySet),
  };
}
