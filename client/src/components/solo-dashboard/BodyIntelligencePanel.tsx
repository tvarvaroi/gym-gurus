import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { formatNum } from '@/lib/format';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface BodyIntelligencePanelProps {
  data: any;
  fitnessProfile?: any;
  loading?: boolean;
}

interface MetricItem {
  label: string;
  value: string;
  sub: string;
  href: string;
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
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-6">
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

export function BodyIntelligencePanel({
  data,
  fitnessProfile,
  loading,
}: BodyIntelligencePanelProps) {
  const prefersReducedMotion = useReducedMotion();

  if (loading) return <BodyIntelligenceSkeleton />;

  const computed = data?.computed;
  if (!computed) return null;

  // Build metrics array from computed data
  const metrics: MetricItem[] = [];

  if (computed.bmi) {
    metrics.push({
      label: 'BMI',
      value: formatNum(computed.bmi.value),
      sub: computed.bmi.category,
      href: '/dashboard/calculators/bmi',
    });
  }

  // Body Fat % from fitness profile (moved from removed Body Stats widget)
  if (fitnessProfile?.bodyFatPercentage) {
    metrics.push({
      label: 'Body Fat',
      value: `${formatNum(fitnessProfile.bodyFatPercentage)}%`,
      sub: 'measured',
      href: '/dashboard/calculators/body-fat',
    });
  }

  if (computed.bmr) {
    metrics.push({
      label: 'BMR',
      value: formatNum(computed.bmr.value),
      sub: 'kcal/day',
      href: '/dashboard/calculators/tdee',
    });
  }

  if (computed.tdee) {
    metrics.push({
      label: 'TDEE',
      value: formatNum(computed.tdee.value),
      sub: 'kcal/day',
      href: '/dashboard/calculators/tdee',
    });
  }

  if (computed.macros) {
    metrics.push({
      label: 'Protein',
      value: `${formatNum(computed.macros.protein.grams)}g`,
      sub: '/day',
      href: '/dashboard/calculators/macros',
    });
    metrics.push({
      label: 'Water',
      value: computed.waterIntake ? `${formatNum(computed.waterIntake.value)}L` : '\u2014',
      sub: '/day',
      href: '/dashboard/calculators/water-intake',
    });
    metrics.push({
      label: 'Fat',
      value: `${formatNum(computed.macros.fat.grams)}g`,
      sub: '/day',
      href: '/dashboard/calculators/macros',
    });
    metrics.push({
      label: 'Carbs',
      value: `${formatNum(computed.macros.carbs.grams)}g`,
      sub: '/day',
      href: '/dashboard/calculators/macros',
    });
  } else if (computed.waterIntake) {
    metrics.push({
      label: 'Water',
      value: `${formatNum(computed.waterIntake.value)}L`,
      sub: '/day',
      href: '/dashboard/calculators/water-intake',
    });
  }

  if (computed.idealWeight) {
    metrics.push({
      label: 'Ideal Weight',
      value: `${formatNum(computed.idealWeight.value)} kg`,
      sub: 'Devine formula',
      href: '/dashboard/calculators/ideal-weight',
    });
  }

  if (computed.ffmi) {
    metrics.push({
      label: 'FFMI',
      value: formatNum(computed.ffmi.value),
      sub: computed.ffmi.category,
      href: '/dashboard/calculators/body-fat',
    });
  } else if (computed.macros) {
    // Only show missing FFMI if user has other data
    metrics.push({
      label: 'FFMI',
      value: '\u2014',
      sub: '',
      href: '/dashboard/calculators/body-fat',
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
    <motion.div
      {...animProps}
      className="bg-card rounded-2xl border border-border/20 p-4 sm:p-6 md:p-8"
    >
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-6">
        {metrics.map((metric, index) => (
          <div key={metric.label} className="flex items-start">
            {/* Vertical divider on desktop (not for first item or first in row) */}
            {index > 0 && (
              <div className="hidden md:block h-12 w-px bg-border/15 mr-6 mt-1 flex-shrink-0" />
            )}
            {/* Mobile dividers: odd items in 2-col grid, non-first-in-row for sm 3-col */}
            {index % 2 !== 0 && (
              <div className="sm:hidden h-12 w-px bg-border/15 mr-4 mt-1 flex-shrink-0" />
            )}
            {index % 3 !== 0 && (
              <div className="hidden sm:block md:hidden h-12 w-px bg-border/15 mr-4 mt-1 flex-shrink-0" />
            )}
            <Link href={metric.href}>
              <a className="flex flex-col cursor-pointer group hover:bg-white/[0.03] rounded-lg px-1.5 py-1 -mx-1.5 -my-1 transition-colors">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mb-1">
                  {metric.label}
                </span>
                {metric.missing ? (
                  <>
                    <span className="text-2xl font-bold tabular-nums leading-none text-muted-foreground/30">
                      {metric.value}
                    </span>
                    <span className="text-[11px] text-primary hover:text-primary/80 mt-1 transition-colors">
                      {metric.missingLabel}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold tabular-nums leading-none group-hover:text-primary transition-colors">
                      {metric.value}
                    </span>
                    <span className="text-[11px] text-muted-foreground/40 mt-1">{metric.sub}</span>
                  </>
                )}
              </a>
            </Link>
          </div>
        ))}
      </div>

      {/* Macro bar visualization */}
      {computed.macros && (
        <Link href="/dashboard/calculators/macros">
          <a className="block mt-6 cursor-pointer group hover:bg-white/[0.02] rounded-lg p-1 -mx-1 transition-colors">
            <div className="h-2 w-full rounded-full overflow-hidden flex">
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
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-primary/70">
                Protein {computed.macros.protein.percent}%
              </span>
              <span className="text-[11px] text-amber-500/70">
                Fat {computed.macros.fat.percent}%
              </span>
              <span className="text-[11px] text-blue-500/70">
                Carbs {computed.macros.carbs.percent}%
              </span>
            </div>
          </a>
        </Link>
      )}
    </motion.div>
  );
}
