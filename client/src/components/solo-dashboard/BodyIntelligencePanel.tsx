import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface BodyIntelligencePanelProps {
  data: any;
  loading?: boolean;
}

interface MetricItem {
  label: string;
  value: string;
  sub: string;
  missing?: boolean;
  missingHref?: string;
  missingLabel?: string;
}

function BodyIntelligenceSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/20 p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-2.5 w-10 bg-muted rounded" />
            <div className="h-7 w-14 bg-muted rounded" />
            <div className="h-2.5 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BodyIntelligencePanel({ data, loading }: BodyIntelligencePanelProps) {
  const prefersReducedMotion = useReducedMotion();

  if (loading) return <BodyIntelligenceSkeleton />;

  const computed = data?.computed;
  if (!computed) return null;

  // Build metrics array from computed data
  const metrics: MetricItem[] = [];

  if (computed.bmi) {
    metrics.push({
      label: 'BMI',
      value: `${computed.bmi.value}`,
      sub: computed.bmi.category,
    });
  }

  if (computed.bmr) {
    metrics.push({
      label: 'BMR',
      value: computed.bmr.value.toLocaleString(),
      sub: 'kcal/day',
    });
  }

  if (computed.tdee) {
    metrics.push({
      label: 'TDEE',
      value: computed.tdee.value.toLocaleString(),
      sub: 'kcal/day',
    });
  }

  if (computed.macros) {
    metrics.push({
      label: 'Protein',
      value: `${computed.macros.protein.grams}g`,
      sub: '/day',
    });
    metrics.push({
      label: 'Water',
      value: computed.waterIntake ? `${computed.waterIntake.value}L` : '\u2014',
      sub: '/day',
    });
    metrics.push({
      label: 'Fat',
      value: `${computed.macros.fat.grams}g`,
      sub: '/day',
    });
    metrics.push({
      label: 'Carbs',
      value: `${computed.macros.carbs.grams}g`,
      sub: '/day',
    });
  } else if (computed.waterIntake) {
    metrics.push({
      label: 'Water',
      value: `${computed.waterIntake.value}L`,
      sub: '/day',
    });
  }

  if (computed.idealWeight) {
    metrics.push({
      label: 'Ideal Weight',
      value: `${computed.idealWeight.value} kg`,
      sub: 'Devine formula',
    });
  }

  if (computed.ffmi) {
    metrics.push({
      label: 'FFMI',
      value: `${computed.ffmi.value}`,
      sub: computed.ffmi.category,
    });
  } else if (computed.macros) {
    // Only show missing FFMI if user has other data
    metrics.push({
      label: 'FFMI',
      value: '\u2014',
      sub: '',
      missing: true,
      missingHref: '/settings',
      missingLabel: 'Set body fat',
    });
  }

  // Nothing to show if no metrics computed
  if (metrics.length === 0) return null;

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.1 },
      };

  return (
    <motion.div {...animProps} className="bg-card rounded-2xl border border-border/20 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium">
          Body Intelligence
        </p>
        <Link href="/dashboard/calculators">
          <a className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
            View all calculators <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-y-6">
        {metrics.map((metric, index) => (
          <div key={metric.label} className="flex items-start">
            {/* Vertical divider on desktop (not for first item or first in row) */}
            {index > 0 && (
              <div className="hidden md:block h-12 w-px bg-border/15 mr-6 mt-1 flex-shrink-0" />
            )}
            {/* Mobile dividers for items after first in each row */}
            {index % 3 !== 0 && (
              <div className="md:hidden h-12 w-px bg-border/15 mr-4 mt-1 flex-shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mb-1">
                {metric.label}
              </span>
              {metric.missing ? (
                <>
                  <span className="text-2xl font-bold tabular-nums leading-none text-muted-foreground/30">
                    {metric.value}
                  </span>
                  <Link href={metric.missingHref || '/settings'}>
                    <a className="text-[11px] text-primary hover:text-primary/80 mt-1 transition-colors">
                      {metric.missingLabel}
                    </a>
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold tabular-nums leading-none">
                    {metric.value}
                  </span>
                  <span className="text-[11px] text-muted-foreground/40 mt-1">{metric.sub}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Macro bar visualization */}
      {computed.macros && (
        <div className="mt-6">
          <div className="h-1 w-full rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary"
              style={{ width: `${computed.macros.protein.percent}%` }}
            />
            <div
              className="h-full bg-amber-500/60"
              style={{ width: `${computed.macros.fat.percent}%` }}
            />
            <div
              className="h-full bg-blue-500/60"
              style={{ width: `${computed.macros.carbs.percent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/40">
            <span>Protein {computed.macros.protein.percent}%</span>
            <span>Fat {computed.macros.fat.percent}%</span>
            <span>Carbs {computed.macros.carbs.percent}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
