import { useMemo, useState } from 'react';
import { format, isThisYear } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PremiumCard } from '@/components/ui/premium/PremiumCard';
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { displayWeight, displayPercent, type UnitSystem } from '@/lib/units';
import type { BodyMetrics } from '@shared/schema';

type Range = '30d' | '90d' | '1y';

const RANGE_DAYS: Record<Range, number> = { '30d': 30, '90d': 90, '1y': 365 };
const RANGE_LABELS: Record<Range, string> = { '30d': '30d', '90d': '90d', '1y': '1y' };

interface BodyMetricsTrendsProps {
  entries: BodyMetrics[];
  units: UnitSystem;
  defaultRange?: Range;
  /** Render compact empty state without log CTA — used in trainer/read-only view. */
  readOnly?: boolean;
  /** Called from the empty-state CTA when readOnly is false. */
  onLog?: () => void;
}

interface ChartPoint {
  ts: number;
  dateStr: string;
  weight: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
}

function kgToDisplay(kg: number, units: UnitSystem): number {
  return units === 'metric' ? kg : kg / 0.45359237;
}

function buildChartData(entries: BodyMetrics[], range: Range, units: UnitSystem): ChartPoint[] {
  const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
  const filtered = entries.filter((e) => new Date(e.recordedAt).getTime() >= cutoff);
  return filtered
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((e) => {
      const d = new Date(e.recordedAt);
      return {
        ts: d.getTime(),
        dateStr: format(d, isThisYear(d) ? 'MMM d' : 'MMM d, yy'),
        weight: e.weightKg ? Number(kgToDisplay(parseFloat(e.weightKg), units).toFixed(1)) : null,
        bodyFat: e.bodyFatPercentage ? Number(parseFloat(e.bodyFatPercentage).toFixed(1)) : null,
        muscleMass: e.muscleMassKg
          ? Number(kgToDisplay(parseFloat(e.muscleMassKg), units).toFixed(1))
          : null,
      };
    });
}

// Pad a single-point dataset so recharts has a visible domain. The "ghost"
// trailing point keeps the dot centered and gives the axes room to breathe.
function padSinglePoint(data: ChartPoint[]): ChartPoint[] {
  if (data.length !== 1) return data;
  const [only] = data;
  return [
    { ...only, ts: only.ts - 86_400_000 * 7, weight: null, bodyFat: null, muscleMass: null },
    only,
  ];
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  units: UnitSystem;
}

function ChartTooltip({ active, payload, label, units }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border/50 bg-popover/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-foreground font-medium mb-1">{label}</p>
      {payload.map((p) => {
        if (p.value == null) return null;
        let formatted = String(p.value);
        if (p.dataKey === 'weight' || p.dataKey === 'muscleMass') {
          formatted = `${p.value} ${units === 'metric' ? 'kg' : 'lb'}`;
        } else if (p.dataKey === 'bodyFat') {
          formatted = `${p.value}%`;
        }
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span>{p.name}:</span>
            <span className="text-foreground tabular-nums">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

interface MetricChartProps {
  data: ChartPoint[];
  units: UnitSystem;
  metric: 'weight' | 'bodyFat' | 'muscleMass';
  height?: number;
}

function MetricChart({ data, units, metric, height = 220 }: MetricChartProps) {
  const filtered = data.filter((p) => p[metric] != null);
  if (filtered.length === 0) {
    const labels: Record<typeof metric, string> = {
      weight: 'Weight',
      bodyFat: 'Body fat',
      muscleMass: 'Muscle mass',
    };
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/30 rounded-lg"
        style={{ height }}
      >
        No {labels[metric]} entries yet.
      </div>
    );
  }

  const padded = padSinglePoint(filtered);
  const colorVar =
    metric === 'weight'
      ? 'hsl(var(--primary))'
      : metric === 'bodyFat'
        ? 'hsl(var(--muted-foreground))'
        : 'hsl(var(--primary) / 0.6)';
  const yLabel = metric === 'bodyFat' ? '%' : units === 'metric' ? 'kg' : 'lb';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={padded} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
        <XAxis
          dataKey="dateStr"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border) / 0.4)' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{
            value: yLabel,
            position: 'insideTopLeft',
            offset: 0,
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10,
          }}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip content={<ChartTooltip units={units} />} />
        <Line
          type="monotone"
          dataKey={metric}
          name={metric === 'weight' ? 'Weight' : metric === 'bodyFat' ? 'Body fat' : 'Muscle mass'}
          stroke={colorVar}
          strokeWidth={2}
          dot={{ fill: colorVar, r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DualAxisChartProps {
  data: ChartPoint[];
  units: UnitSystem;
  height?: number;
}

function DualAxisChart({ data, units, height = 320 }: DualAxisChartProps) {
  const padded = padSinglePoint(data);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={padded} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
        <XAxis
          dataKey="dateStr"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border) / 0.4)' }}
        />
        <YAxis
          yAxisId="weight"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
          label={{
            value: units === 'metric' ? 'kg' : 'lb',
            position: 'insideTopLeft',
            offset: -8,
            fill: 'hsl(var(--primary))',
            fontSize: 11,
          }}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <YAxis
          yAxisId="bodyFat"
          orientation="right"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{
            value: '%',
            position: 'insideTopRight',
            offset: -8,
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 11,
          }}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip content={<ChartTooltip units={units} />} />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name="Weight"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          yAxisId="bodyFat"
          type="monotone"
          dataKey="bodyFat"
          name="Body fat"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BodyMetricsTrends({
  entries,
  units,
  defaultRange = '30d',
  readOnly,
  onLog,
}: BodyMetricsTrendsProps) {
  const [range, setRange] = useState<Range>(defaultRange);
  const data = useMemo(() => buildChartData(entries, range, units), [entries, range, units]);

  const totalEntries = entries.length;
  const inRange = data.length;

  // Stat strip — most-recent value across all entries (not just the range)
  const mostRecent = entries[0];
  const mostRecentWeight = mostRecent?.weightKg ? parseFloat(mostRecent.weightKg) : null;
  const mostRecentBodyFat = mostRecent?.bodyFatPercentage
    ? parseFloat(mostRecent.bodyFatPercentage)
    : null;
  const mostRecentMuscle = mostRecent?.muscleMassKg ? parseFloat(mostRecent.muscleMassKg) : null;

  // ─── Empty state (no entries at all) ──────────────────────────────────────
  if (totalEntries === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <p className="text-base font-medium text-foreground mb-1">Your trends will live here.</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-4">
          {readOnly
            ? 'No body metrics shared yet.'
            : 'Log a few entries to see weight, body fat, and muscle mass over time.'}
        </p>
        {!readOnly && onLog && (
          <ActionButton variant="primary" size="sm" onClick={onLog}>
            Log your first entry
          </ActionButton>
        )}
      </div>
    );
  }

  // ─── Out-of-range state (entries exist but none in selected window) ───────
  const outOfRange = inRange === 0 && totalEntries > 0;

  return (
    <div className="space-y-4 md:space-y-5 pb-24 md:pb-6">
      {/* Stat strip — at-a-glance most-recent values */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatTile
          label="Weight"
          value={mostRecentWeight != null ? displayWeight(mostRecentWeight, units, 1) : '—'}
        />
        <StatTile
          label="Body fat"
          value={mostRecentBodyFat != null ? displayPercent(mostRecentBodyFat, 1) : '—'}
        />
        <StatTile
          label="Muscle"
          value={mostRecentMuscle != null ? displayWeight(mostRecentMuscle, units, 1) : '—'}
        />
      </div>

      {/* Range chips */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div role="radiogroup" aria-label="Time range" className="flex gap-2">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={`min-h-[36px] px-4 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                range === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {inRange} {inRange === 1 ? 'entry' : 'entries'} in range
        </span>
      </div>

      {/* Out-of-range nudge */}
      {outOfRange && (
        <PremiumCard variant="default" padding="md">
          <p className="text-sm text-muted-foreground text-center">
            No entries in the last {RANGE_DAYS[range]} days.{' '}
            <button
              onClick={() => setRange('1y')}
              className="text-primary hover:underline cursor-pointer"
            >
              Try the 1y view
            </button>
            .
          </p>
        </PremiumCard>
      )}

      {!outOfRange && (
        <>
          {/* Single-point caption */}
          {inRange === 1 && (
            <p className="text-xs text-muted-foreground text-center italic">
              Log another to see the line.
            </p>
          )}

          {/* ── Desktop: dual-axis combined chart + muscle mass below ── */}
          <div className="hidden md:block space-y-5">
            <PremiumCard variant="default" padding="md">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="text-sm font-medium text-foreground">Weight & Body fat</h3>
                <p className="text-xs text-muted-foreground">
                  Weight on the left axis. Body fat on the right.
                </p>
              </div>
              <DualAxisChart data={data} units={units} height={320} />
            </PremiumCard>
            {data.some((p) => p.muscleMass != null) && (
              <PremiumCard variant="default" padding="md">
                <h3 className="text-sm font-medium text-foreground mb-2">Muscle mass</h3>
                <MetricChart data={data} units={units} metric="muscleMass" height={200} />
              </PremiumCard>
            )}
          </div>

          {/* ── Mobile: 3 stacked single-axis charts ── */}
          <div className="md:hidden space-y-4">
            <PremiumCard variant="default" padding="md">
              <h3 className="text-sm font-medium text-foreground mb-2">Weight</h3>
              <MetricChart data={data} units={units} metric="weight" height={200} />
            </PremiumCard>
            {data.some((p) => p.bodyFat != null) && (
              <PremiumCard variant="default" padding="md">
                <h3 className="text-sm font-medium text-foreground mb-2">Body fat</h3>
                <MetricChart data={data} units={units} metric="bodyFat" height={200} />
              </PremiumCard>
            )}
            {data.some((p) => p.muscleMass != null) && (
              <PremiumCard variant="default" padding="md">
                <h3 className="text-sm font-medium text-foreground mb-2">Muscle mass</h3>
                <MetricChart data={data} units={units} metric="muscleMass" height={200} />
              </PremiumCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <PremiumCard variant="default" padding="sm">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
        {label}
      </p>
      <p className="text-base md:text-lg font-light tabular-nums text-foreground">{value}</p>
    </PremiumCard>
  );
}
