import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { CircularProgressRing } from './CircularProgressRing';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface RecoveryBodyStatusProps {
  fatigueData: any[] | undefined;
  fitnessProfile: any;
  loading?: boolean;
}

function RecoveryWidget({ fatigueData }: { fatigueData: any[] | undefined }) {
  const prefersReducedMotion = useReducedMotion();

  const muscleStatus =
    fatigueData
      ?.filter((m: any) => m.fatigueLevel > 0 || m.lastTrainedAt)
      .sort((a: any, b: any) => b.fatigueLevel - a.fatigueLevel)
      .slice(0, 6)
      .map((m: any) => {
        const recovery = 100 - m.fatigueLevel;
        return {
          name: m.muscleGroup.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          recovery,
          dotColor:
            recovery >= 80 ? 'text-green-500' : recovery >= 50 ? 'text-amber-500' : 'text-red-500',
        };
      }) || [];

  // Compute overall recovery
  const overallRecovery =
    fatigueData && fatigueData.length > 0
      ? Math.round(
          100 -
            fatigueData.reduce((sum: number, m: any) => sum + (m.fatigueLevel || 0), 0) /
              fatigueData.length
        )
      : 0;
  const hasData = muscleStatus.length > 0;

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.1 },
      };

  return (
    <motion.div {...animProps} className="bg-card rounded-2xl p-6 border border-border/20 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Recovery Status
        </p>
        <Link href="/solo/recovery">
          <a className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
            Full View <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No recovery data yet</p>
          <p className="text-xs mt-1">Complete a workout to track recovery</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Large Recovery Ring with gradient */}
          <div className="mb-5">
            <CircularProgressRing
              value={overallRecovery}
              size={180}
              strokeWidth={10}
              gradient
              id="recovery"
              animated={!prefersReducedMotion}
            >
              <div className="flex flex-col items-center">
                <span className="text-[40px] font-bold tabular-nums leading-none">
                  {overallRecovery}
                </span>
                <span className="text-base text-muted-foreground">%</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1">
                  recovered
                </span>
              </div>
            </CircularProgressRing>
          </div>

          {/* Compact inline muscle tags */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
            {muscleStatus.map((muscle) => (
              <span key={muscle.name} className="flex items-center gap-1">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${muscle.dotColor.replace('text-', 'bg-')}`}
                />
                <span className="text-muted-foreground">{muscle.name}</span>
                <span className="tabular-nums font-medium">{muscle.recovery}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function BodyStatsWidget({ fitnessProfile }: { fitnessProfile: any }) {
  const prefersReducedMotion = useReducedMotion();

  const weight = fitnessProfile?.weightKg;
  const height = fitnessProfile?.heightCm;
  const bodyFat = fitnessProfile?.bodyFatPercentage;
  const tdee = fitnessProfile?.dailyCalorieTarget;
  const bmi = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : null;

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.15 },
      };

  const hasAnyData = weight || height || tdee;

  const rows: { label: string; value: string | null; unit?: string }[] = [
    { label: 'BMI', value: bmi, unit: '' },
    { label: 'Body Fat', value: bodyFat ? `${bodyFat}` : null, unit: '%' },
    { label: 'TDEE', value: tdee ? `${tdee}` : null, unit: 'kcal' },
    { label: 'Weight', value: weight ? `${weight}` : null, unit: 'kg' },
    { label: 'Height', value: height ? `${height}` : null, unit: 'cm' },
  ];

  return (
    <motion.div {...animProps} className="bg-card rounded-2xl p-6 border border-border/20 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Body Stats
        </p>
        <Link href="/settings">
          <a className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
            Update <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>

      {!hasAnyData ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No body stats set</p>
          <Link href="/solo/onboarding">
            <a className="text-primary hover:text-primary/80 text-xs mt-1 block transition-colors">
              Complete your profile
            </a>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              {row.value ? (
                <span className="text-sm font-medium tabular-nums">
                  {row.value}
                  {row.unit && (
                    <span className="text-muted-foreground/60 ml-0.5 font-normal">{row.unit}</span>
                  )}
                </span>
              ) : (
                <Link href="/settings">
                  <a className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Set
                  </a>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function RecoveryBodySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      <div className="bg-card rounded-2xl p-6 border border-border/20">
        <div className="h-3 w-28 bg-muted rounded mb-6" />
        <div className="flex flex-col items-center">
          <div className="w-[180px] h-[180px] rounded-full border-[10px] border-muted mb-5" />
          <div className="flex flex-wrap justify-center gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 w-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card rounded-2xl p-6 border border-border/20">
        <div className="h-3 w-20 bg-muted rounded mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecoveryBodyStatus({
  fatigueData,
  fitnessProfile,
  loading,
}: RecoveryBodyStatusProps) {
  if (loading) return <RecoveryBodySkeleton />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RecoveryWidget fatigueData={fatigueData} />
      <BodyStatsWidget fitnessProfile={fitnessProfile} />
    </div>
  );
}
