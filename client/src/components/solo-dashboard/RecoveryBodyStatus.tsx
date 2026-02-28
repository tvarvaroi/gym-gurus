import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Heart, Activity, ChevronRight } from 'lucide-react';
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
      .slice(0, 5)
      .map((m: any) => {
        const recovery = 100 - m.fatigueLevel;
        return {
          name: m.muscleGroup.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          recovery,
          dotColor:
            recovery >= 80 ? 'bg-green-500' : recovery >= 50 ? 'bg-amber-500' : 'bg-red-500',
          barColor:
            recovery >= 80 ? 'bg-green-500' : recovery >= 50 ? 'bg-amber-500' : 'bg-red-500',
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
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.3 },
      };

  return (
    <motion.div {...animProps} className="bg-card rounded-xl p-6 border border-border/50 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          Recovery Status
        </h3>
        <Link href="/solo/recovery">
          <a className="text-xs text-primary hover:underline flex items-center gap-1">
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
          {/* Large Recovery Ring */}
          <div className="mb-4">
            <CircularProgressRing
              value={overallRecovery}
              size={140}
              strokeWidth={10}
              label="Overall"
              animated={!prefersReducedMotion}
            />
          </div>

          {/* Muscle Group List */}
          <div className="w-full space-y-2.5">
            {muscleStatus.map((muscle) => (
              <div key={muscle.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${muscle.dotColor}`} />
                    <span className="font-medium">{muscle.name}</span>
                  </span>
                  <span className="text-muted-foreground">{muscle.recovery}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${muscle.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${muscle.recovery}%` }}
                  />
                </div>
              </div>
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

  // Calculate BMI
  const bmi = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : null;
  const bmiPercent = bmi ? Math.min(100, ((parseFloat(bmi) - 15) / 25) * 100) : 0;

  // Body fat ring (0-50% scale)
  const bodyFatPercent = bodyFat ? Math.min(100, (bodyFat / 50) * 100) : 0;

  // TDEE ring (out of 4000)
  const tdeePercent = tdee ? Math.min(100, (tdee / 4000) * 100) : 0;

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.35 },
      };

  const hasAnyData = weight || height || tdee;

  return (
    <motion.div {...animProps} className="bg-card rounded-xl p-6 border border-border/50 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Body Stats
        </h3>
        <Link href="/settings">
          <a className="text-xs text-primary hover:underline flex items-center gap-1">
            Update <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>

      {!hasAnyData ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No body stats set</p>
          <Link href="/solo/onboarding">
            <a className="text-primary hover:underline text-xs mt-1 block">Complete your profile</a>
          </Link>
        </div>
      ) : (
        <>
          {/* Mini Gauges Row */}
          <div className="flex justify-around mb-5">
            <div className="flex flex-col items-center">
              <CircularProgressRing
                value={bmiPercent}
                size={72}
                strokeWidth={6}
                displayValue={bmi || '--'}
                color="text-primary"
                animated={!prefersReducedMotion}
              />
              <span className="text-[10px] text-muted-foreground mt-1">BMI</span>
            </div>
            <div className="flex flex-col items-center">
              <CircularProgressRing
                value={bodyFatPercent}
                size={72}
                strokeWidth={6}
                displayValue={bodyFat ? `${bodyFat}%` : '--'}
                color="text-primary"
                animated={!prefersReducedMotion}
              />
              <span className="text-[10px] text-muted-foreground mt-1">Body Fat</span>
            </div>
            <div className="flex flex-col items-center">
              <CircularProgressRing
                value={tdeePercent}
                size={72}
                strokeWidth={6}
                displayValue={tdee ? `${(tdee / 1000).toFixed(1)}k` : '--'}
                color="text-primary"
                animated={!prefersReducedMotion}
              />
              <span className="text-[10px] text-muted-foreground mt-1">TDEE</span>
            </div>
          </div>

          {/* Key Stats */}
          <div className="space-y-2 text-sm">
            {weight && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-medium">{weight} kg</span>
              </div>
            )}
            {height && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Height</span>
                <span className="font-medium">{height} cm</span>
              </div>
            )}
            {fitnessProfile?.primaryGoal && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="font-medium capitalize">
                  {fitnessProfile.primaryGoal.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function RecoveryBodySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
      <div className="bg-card rounded-xl p-6 border border-border/50">
        <div className="h-5 w-36 bg-muted rounded mb-4" />
        <div className="flex flex-col items-center">
          <div className="w-[140px] h-[140px] rounded-full border-[10px] border-muted mb-4" />
          <div className="w-full space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-muted rounded mb-1" />
                <div className="h-1.5 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl p-6 border border-border/50">
        <div className="h-5 w-28 bg-muted rounded mb-4" />
        <div className="flex justify-around mb-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-[72px] h-[72px] rounded-full border-[6px] border-muted" />
              <div className="h-3 w-8 bg-muted rounded mt-1" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RecoveryWidget fatigueData={fatigueData} />
      <BodyStatsWidget fitnessProfile={fitnessProfile} />
    </div>
  );
}
