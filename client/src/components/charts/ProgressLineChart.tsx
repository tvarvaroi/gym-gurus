import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface ProgressLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  showArea?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  lineColor?: string;
  areaColor?: string;
  animated?: boolean;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
}

export function ProgressLineChart({
  data,
  width = 400,
  height = 200,
  showArea = true,
  showDots = true,
  showGrid = true,
  showLabels = true,
  lineColor = 'rgb(59, 130, 246)',
  areaColor = 'rgba(59, 130, 246, 0.2)',
  animated = true,
  formatValue = (v) => v.toFixed(1),
  formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
}: ProgressLineChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const { minValue, maxValue, points, linePath, areaPath, gridLines } = useMemo(() => {
    if (data.length === 0) {
      return { minValue: 0, maxValue: 100, points: [], linePath: '', areaPath: '', gridLines: [] };
    }

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const minVal = min - range * 0.1;
    const maxVal = max + range * 0.1;

    const xStep = chartWidth / (data.length - 1 || 1);

    const pts = data.map((d, i) => ({
      x: padding.left + i * xStep,
      y: padding.top + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight,
      value: d.value,
      date: d.date,
      label: d.label,
    }));

    // Generate path for line
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    // Generate path for area
    const area =
      line +
      ` L ${pts[pts.length - 1].x},${padding.top + chartHeight}` +
      ` L ${pts[0].x},${padding.top + chartHeight} Z`;

    // Generate horizontal grid lines (5 lines)
    const gridCount = 5;
    const grid = Array.from({ length: gridCount }).map((_, i) => {
      const y = padding.top + (chartHeight / (gridCount - 1)) * i;
      const value = maxVal - ((maxVal - minVal) / (gridCount - 1)) * i;
      return { y, value };
    });

    return { minValue: minVal, maxValue: maxVal, points: pts, linePath: line, areaPath: area, gridLines: grid };
  }, [data, chartWidth, chartHeight, padding]);

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height}>
        {/* Grid */}
        {showGrid && (
          <g>
            {gridLines.map((line, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={line.y}
                  x2={width - padding.right}
                  y2={line.y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeWidth={1}
                />
                {showLabels && (
                  <text
                    x={padding.left - 8}
                    y={line.y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {formatValue(line.value)}
                  </text>
                )}
              </g>
            ))}
          </g>
        )}

        {/* Area */}
        {showArea && areaPath && (
          <motion.path
            d={areaPath}
            fill={areaColor}
            initial={animated ? { opacity: 0 } : undefined}
            animate={animated ? { opacity: 1 } : undefined}
            transition={{ duration: 0.5 }}
          />
        )}

        {/* Line */}
        {linePath && (
          <motion.path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animated ? { pathLength: 0 } : undefined}
            animate={animated ? { pathLength: 1 } : undefined}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}

        {/* Dots */}
        {showDots &&
          points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={lineColor}
              stroke="white"
              strokeWidth={2}
              initial={animated ? { scale: 0 } : undefined}
              animate={animated ? { scale: 1 } : undefined}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            />
          ))}

        {/* X-axis labels */}
        {showLabels &&
          points.map((point, i) => {
            // Only show some labels if there are many points
            const showLabel = data.length <= 7 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 5) === 0;
            if (!showLabel) return null;

            return (
              <text
                key={i}
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                {formatDate(point.date)}
              </text>
            );
          })}
      </svg>

      {/* Tooltip layer - would be implemented with state/hover */}
    </div>
  );
}

// Multi-line version for comparing multiple metrics
interface MultiLineData {
  id: string;
  label: string;
  color: string;
  data: DataPoint[];
}

interface MultiLineChartProps {
  series: MultiLineData[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  animated?: boolean;
}

export function MultiLineChart({
  series,
  width = 400,
  height = 250,
  showLegend = true,
  showGrid = true,
  animated = true,
}: MultiLineChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom - (showLegend ? 30 : 0);

  // Calculate combined scales
  const { minValue, maxValue, seriesData, gridLines } = useMemo(() => {
    const allValues = series.flatMap((s) => s.data.map((d) => d.value));
    if (allValues.length === 0) {
      return { minValue: 0, maxValue: 100, seriesData: [], gridLines: [] };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min || 1;
    const minVal = min - range * 0.1;
    const maxVal = max + range * 0.1;

    const processed = series.map((s) => {
      const xStep = chartWidth / (s.data.length - 1 || 1);
      const points = s.data.map((d, i) => ({
        x: padding.left + i * xStep,
        y: padding.top + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight,
        value: d.value,
        date: d.date,
      }));
      const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
      return { ...s, points, path };
    });

    const gridCount = 5;
    const grid = Array.from({ length: gridCount }).map((_, i) => {
      const y = padding.top + (chartHeight / (gridCount - 1)) * i;
      const value = maxVal - ((maxVal - minVal) / (gridCount - 1)) * i;
      return { y, value };
    });

    return { minValue: minVal, maxValue: maxVal, seriesData: processed, gridLines: grid };
  }, [series, chartWidth, chartHeight, padding]);

  return (
    <div className="space-y-2">
      <svg width={width} height={height - (showLegend ? 30 : 0)}>
        {/* Grid */}
        {showGrid && (
          <g>
            {gridLines.map((line, i) => (
              <line
                key={i}
                x1={padding.left}
                y1={line.y}
                x2={width - padding.right}
                y2={line.y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Lines */}
        {seriesData.map((s, seriesIndex) => (
          <motion.path
            key={s.id}
            d={s.path}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animated ? { pathLength: 0 } : undefined}
            animate={animated ? { pathLength: 1 } : undefined}
            transition={{ duration: 1, delay: seriesIndex * 0.2, ease: 'easeOut' }}
          />
        ))}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex justify-center gap-4 flex-wrap">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sparkline for compact display
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showMinMax?: boolean;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = 'rgb(59, 130, 246)',
  showMinMax = false,
}: SparklineProps) {
  const { path, minPoint, maxPoint } = useMemo(() => {
    if (data.length === 0) return { path: '', minPoint: null, maxPoint: null };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const xStep = chartWidth / (data.length - 1 || 1);

    const points = data.map((value, i) => ({
      x: padding + i * xStep,
      y: padding + chartHeight - ((value - min) / range) * chartHeight,
      value,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    const minPt = points.find((p) => p.value === min);
    const maxPt = points.find((p) => p.value === max);

    return { path: linePath, minPoint: minPt, maxPoint: maxPt };
  }, [data, width, height]);

  return (
    <svg width={width} height={height}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {showMinMax && minPoint && (
        <circle cx={minPoint.x} cy={minPoint.y} r={2} fill="rgb(239, 68, 68)" />
      )}
      {showMinMax && maxPoint && (
        <circle cx={maxPoint.x} cy={maxPoint.y} r={2} fill="rgb(34, 197, 94)" />
      )}
    </svg>
  );
}

export default ProgressLineChart;
