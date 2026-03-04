import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { CircularProgressRing } from './CircularProgressRing';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface RecoveryBodyStatusProps {
  fatigueData: any[] | undefined;
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
          dotBg: recovery >= 80 ? 'bg-green-500' : recovery >= 50 ? 'bg-amber-500' : 'bg-red-500',
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
    <motion.div {...animProps} className="bg-card rounded-2xl p-4 sm:p-6 border border-border/20">
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
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Large Recovery Ring with gradient */}
          <Link href="/solo/recovery">
            <a className="flex-shrink-0 cursor-pointer group block">
              <CircularProgressRing
                value={overallRecovery}
                size={150}
                strokeWidth={10}
                gradient
                id="recovery"
                animated={!prefersReducedMotion}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[40px] font-bold tabular-nums leading-none group-hover:text-primary transition-colors">
                    {overallRecovery}
                  </span>
                  <span className="text-base text-muted-foreground">%</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1">
                    recovered
                  </span>
                </div>
              </CircularProgressRing>
            </a>
          </Link>

          {/* Compact inline muscle tags + recommendation */}
          <div className="flex-1">
            <div className="flex flex-wrap justify-center md:justify-start gap-x-3 gap-y-1.5 text-xs">
              {muscleStatus.map((muscle) => (
                <Link key={muscle.name} href="/solo/recovery">
                  <a className="flex items-center gap-1 cursor-pointer group hover:bg-white/[0.04] rounded px-1 -mx-1 py-0.5 transition-colors">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${muscle.dotBg}`} />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {muscle.name}
                    </span>
                    <span className="tabular-nums font-medium group-hover:text-primary transition-colors">
                      {muscle.recovery}%
                    </span>
                  </a>
                </Link>
              ))}
            </div>

            {/* Ready to train recommendation */}
            {(() => {
              const readyMuscles =
                fatigueData
                  ?.filter((m: any) => m.lastTrainedAt && 100 - (m.fatigueLevel || 0) >= 80)
                  .map((m: any) =>
                    m.muscleGroup
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())
                  )
                  .slice(0, 3) || [];

              if (readyMuscles.length === 0) return null;
              return (
                <div className="mt-4 pt-3 border-t border-border/10">
                  <p className="text-xs text-muted-foreground/60">
                    <span className="text-green-500 font-medium">Ready to train: </span>
                    {readyMuscles.join(', ')}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RecoveryBodySkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-card rounded-2xl p-6 border border-border/20">
        <div className="h-3 w-28 bg-muted rounded mb-6" />
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-[180px] h-[180px] rounded-full border-[10px] border-muted flex-shrink-0" />
          <div className="flex flex-wrap justify-center gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 w-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecoveryBodyStatus({ fatigueData, loading }: RecoveryBodyStatusProps) {
  if (loading) return <RecoveryBodySkeleton />;

  return <RecoveryWidget fatigueData={fatigueData} />;
}
