import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BarData {
  label: string;
  value: number;
  color?: string;
  secondaryValue?: number;
}

interface VolumeBarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  showValues?: boolean;
  showLabels?: boolean;
  barColor?: string;
  secondaryBarColor?: string;
  animated?: boolean;
  formatValue?: (value: number) => string;
  maxValue?: number;
}

export function VolumeBarChart({
  data,
  width = 400,
  height = 200,
  orientation = 'vertical',
  showValues = true,
  showLabels = true,
  barColor = 'rgb(59, 130, 246)',
  secondaryBarColor = 'rgb(147, 197, 253)',
  animated = true,
  formatValue = (v) => v.toLocaleString(),
  maxValue: propMaxValue,
}: VolumeBarChartProps) {
  const isVertical = orientation === 'vertical';
  const padding = { top: 20, right: 20, bottom: showLabels ? 40 : 20, left: showValues ? 50 : 20 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { maxValue, bars } = useMemo(() => {
    const allValues = data.flatMap((d) => [d.value, d.secondaryValue || 0]);
    const max = propMaxValue || Math.max(...allValues, 1);

    const barWidth = isVertical
      ? (chartWidth / data.length) * 0.7
      : chartHeight / data.length * 0.7;
    const barGap = isVertical
      ? (chartWidth / data.length) * 0.3
      : (chartHeight / data.length) * 0.3;

    const processedBars = data.map((d, i) => {
      const primary = (d.value / max) * (isVertical ? chartHeight : chartWidth);
      const secondary = d.secondaryValue
        ? (d.secondaryValue / max) * (isVertical ? chartHeight : chartWidth)
        : 0;

      if (isVertical) {
        const x = padding.left + i * (barWidth + barGap) + barGap / 2;
        return {
          ...d,
          x,
          y: padding.top + chartHeight - primary,
          width: barWidth,
          height: primary,
          secondaryHeight: secondary,
          secondaryY: padding.top + chartHeight - secondary,
        };
      } else {
        const y = padding.top + i * (barWidth + barGap) + barGap / 2;
        return {
          ...d,
          x: padding.left,
          y,
          width: primary,
          height: barWidth,
          secondaryWidth: secondary,
        };
      }
    });

    return { maxValue: max, bars: processedBars };
  }, [data, chartWidth, chartHeight, isVertical, padding, propMaxValue]);

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {isVertical ? (
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + chartHeight * (1 - ratio);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.1}
                  />
                  {showValues && (
                    <text
                      x={padding.left - 8}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {formatValue(maxValue * ratio)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ) : (
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const x = padding.left + chartWidth * ratio;
              return (
                <line
                  key={i}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                />
              );
            })}
          </g>
        )}

        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={i}>
            {/* Secondary bar (background) */}
            {bar.secondaryValue && isVertical && 'secondaryY' in bar && 'secondaryHeight' in bar && (
              <motion.rect
                x={bar.x}
                y={(bar as any).secondaryY}
                width={bar.width}
                height={(bar as any).secondaryHeight}
                fill={bar.color || secondaryBarColor}
                opacity={0.3}
                rx={4}
                initial={animated ? { height: 0, y: padding.top + chartHeight } : undefined}
                animate={animated ? { height: (bar as any).secondaryHeight, y: (bar as any).secondaryY } : undefined}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            )}

            {/* Primary bar */}
            {isVertical ? (
              <motion.rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={bar.color || barColor}
                rx={4}
                initial={animated ? { height: 0, y: padding.top + chartHeight } : undefined}
                animate={animated ? { height: bar.height, y: bar.y } : undefined}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            ) : (
              <motion.rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={bar.color || barColor}
                rx={4}
                initial={animated ? { width: 0 } : undefined}
                animate={animated ? { width: bar.width } : undefined}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            )}

            {/* Value label */}
            {showValues && isVertical && (
              <motion.text
                x={bar.x + bar.width / 2}
                y={bar.y - 8}
                textAnchor="middle"
                className="text-xs font-medium fill-foreground"
                initial={animated ? { opacity: 0 } : undefined}
                animate={animated ? { opacity: 1 } : undefined}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                {formatValue(bar.value)}
              </motion.text>
            )}

            {/* Label */}
            {showLabels && (
              <text
                x={isVertical ? bar.x + bar.width / 2 : padding.left - 8}
                y={isVertical ? height - 15 : bar.y + bar.height / 2}
                textAnchor={isVertical ? 'middle' : 'end'}
                dominantBaseline={isVertical ? 'auto' : 'middle'}
                className="text-xs fill-muted-foreground"
              >
                {bar.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// Weekly volume comparison chart
interface WeeklyVolumeData {
  week: string;
  volume: number;
  previousVolume?: number;
}

interface WeeklyVolumeChartProps {
  data: WeeklyVolumeData[];
  width?: number;
  height?: number;
}

export function WeeklyVolumeChart({ data, width = 400, height = 200 }: WeeklyVolumeChartProps) {
  const chartData = data.map((d) => ({
    label: d.week,
    value: d.volume,
    secondaryValue: d.previousVolume,
  }));

  return (
    <div className="space-y-2">
      <VolumeBarChart
        data={chartData}
        width={width}
        height={height}
        formatValue={(v) => `${(v / 1000).toFixed(1)}k`}
      />
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-300" />
          <span className="text-muted-foreground">Previous</span>
        </div>
      </div>
    </div>
  );
}

// Muscle group volume distribution
interface MuscleVolumeData {
  muscle: string;
  sets: number;
  targetSets?: number;
  color?: string;
}

interface MuscleVolumeChartProps {
  data: MuscleVolumeData[];
  width?: number;
  height?: number;
}

export function MuscleVolumeChart({ data, width = 300, height = 250 }: MuscleVolumeChartProps) {
  const sortedData = [...data].sort((a, b) => b.sets - a.sets);

  return (
    <div className="space-y-3">
      {sortedData.map((item, index) => {
        const maxSets = Math.max(...data.map((d) => d.targetSets || d.sets));
        const percentage = (item.sets / maxSets) * 100;
        const targetPercentage = item.targetSets ? (item.targetSets / maxSets) * 100 : null;

        const getStatusColor = () => {
          if (!item.targetSets) return 'bg-blue-500';
          if (item.sets >= item.targetSets) return 'bg-green-500';
          if (item.sets >= item.targetSets * 0.8) return 'bg-yellow-500';
          return 'bg-red-500';
        };

        return (
          <motion.div
            key={item.muscle}
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.muscle}</span>
              <span className="text-muted-foreground">
                {item.sets} sets
                {item.targetSets && ` / ${item.targetSets}`}
              </span>
            </div>
            <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
              {/* Target indicator */}
              {targetPercentage && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
                  style={{ left: `${targetPercentage}%` }}
                />
              )}
              {/* Actual bar */}
              <motion.div
                className={`h-full ${item.color || getStatusColor()} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Stacked bar for exercise breakdown
interface StackedBarData {
  label: string;
  segments: Array<{
    value: number;
    color: string;
    label: string;
  }>;
}

interface StackedBarChartProps {
  data: StackedBarData[];
  width?: number;
  height?: number;
  showLegend?: boolean;
}

export function StackedBarChart({
  data,
  width = 400,
  height = 200,
  showLegend = true,
}: StackedBarChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom - (showLegend ? 30 : 0);

  // Get unique segment labels for legend
  const legendItems = useMemo(() => {
    const items = new Map<string, string>();
    data.forEach((d) => {
      d.segments.forEach((s) => {
        if (!items.has(s.label)) {
          items.set(s.label, s.color);
        }
      });
    });
    return Array.from(items.entries()).map(([label, color]) => ({ label, color }));
  }, [data]);

  const { maxValue, bars } = useMemo(() => {
    const totals = data.map((d) => d.segments.reduce((sum, s) => sum + s.value, 0));
    const max = Math.max(...totals, 1);

    const barWidth = (chartWidth / data.length) * 0.7;
    const barGap = (chartWidth / data.length) * 0.3;

    const processedBars = data.map((d, i) => {
      const x = padding.left + i * (barWidth + barGap) + barGap / 2;
      let currentY = padding.top + chartHeight;

      const segments = d.segments.map((s) => {
        const height = (s.value / max) * chartHeight;
        currentY -= height;
        return {
          ...s,
          x,
          y: currentY,
          width: barWidth,
          height,
        };
      });

      return { label: d.label, x, segments };
    });

    return { maxValue: max, bars: processedBars };
  }, [data, chartWidth, chartHeight, padding]);

  return (
    <div className="space-y-2">
      <svg width={width} height={height - (showLegend ? 30 : 0)}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * (1 - ratio);
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
          );
        })}

        {/* Stacked bars */}
        {bars.map((bar, barIndex) => (
          <g key={barIndex}>
            {bar.segments.map((segment, segIndex) => (
              <motion.rect
                key={segIndex}
                x={segment.x}
                y={segment.y}
                width={segment.width}
                height={segment.height}
                fill={segment.color}
                rx={segIndex === bar.segments.length - 1 ? 4 : 0}
                initial={{ height: 0, y: padding.top + chartHeight }}
                animate={{ height: segment.height, y: segment.y }}
                transition={{ duration: 0.5, delay: barIndex * 0.1 + segIndex * 0.05 }}
              />
            ))}
            <text
              x={bar.x + bar.segments[0]?.width / 2 || 0}
              y={height - (showLegend ? 45 : 15)}
              textAnchor="middle"
              className="text-xs fill-muted-foreground"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex justify-center gap-4 flex-wrap">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VolumeBarChart;
