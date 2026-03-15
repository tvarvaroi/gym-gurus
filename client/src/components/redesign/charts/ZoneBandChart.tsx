import { useMemo, useState, useCallback } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface Zone {
  label: string;
  min: number;
  max: number;
  color: string;
}

interface ZoneBandChartProps {
  data: DataPoint[];
  zones?: Zone[];
  height?: number;
  accentColor?: string;
  showAverage?: boolean;
  unit?: string;
  className?: string;
}

const PADDING = { top: 16, right: 24, bottom: 28, left: 44 };

function getPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  // Catmull-Rom → cubic bezier for smooth curves
  const d: string[] = [`M ${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return d.join(' ');
}

export function ZoneBandChart({
  data,
  zones,
  height = 220,
  accentColor = 'hsl(var(--primary))',
  showAverage = true,
  unit = '',
  className = '',
}: ZoneBandChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    label: string;
  } | null>(null);

  const width = 600; // SVG viewBox width — responsive via CSS

  const chartArea = useMemo(
    () => ({
      x: PADDING.left,
      y: PADDING.top,
      w: width - PADDING.left - PADDING.right,
      h: height - PADDING.top - PADDING.bottom,
    }),
    [height]
  );

  const { yMin, yMax, avg, points, yTicks } = useMemo(() => {
    if (data.length === 0) return { yMin: 0, yMax: 100, avg: 0, points: [], yTicks: [] };

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin || 1;
    const pad = range * 0.15;
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;

    const pts = data.map((d, i) => ({
      x:
        chartArea.x + (data.length === 1 ? chartArea.w / 2 : (i / (data.length - 1)) * chartArea.w),
      y: chartArea.y + chartArea.h - ((d.value - yMin) / (yMax - yMin)) * chartArea.h,
      value: d.value,
      label: d.label,
    }));

    // Generate ~4 y-axis ticks
    const tickCount = 4;
    const step = (yMax - yMin) / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + step * i);

    return { yMin, yMax, avg, points: pts, yTicks: ticks };
  }, [data, chartArea]);

  const avgY = useMemo(
    () => chartArea.y + chartArea.h - ((avg - yMin) / (yMax - yMin)) * chartArea.h,
    [avg, yMin, yMax, chartArea]
  );

  const linePath = useMemo(() => getPath(points), [points]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length === 0) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * width;
      // Find closest point
      let closest = points[0];
      let minDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(p.x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      if (minDist < chartArea.w / points.length + 10) {
        setTooltip({ x: closest.x, y: closest.y, value: closest.value, label: closest.label });
      } else {
        setTooltip(null);
      }
    },
    [points, chartArea, width]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const lastPoint = points[points.length - 1];
  const xLabels =
    data.length <= 8
      ? data
      : data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Glow filter for endpoint */}
          <filter id="endpoint-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Line gradient with subtle opacity */}
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={1} />
          </linearGradient>
          {/* Fill gradient below line */}
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.12} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Zone bands */}
        {zones?.map((zone, i) => {
          const bandTop =
            chartArea.y +
            chartArea.h -
            ((Math.min(zone.max, yMax) - yMin) / (yMax - yMin)) * chartArea.h;
          const bandBottom =
            chartArea.y +
            chartArea.h -
            ((Math.max(zone.min, yMin) - yMin) / (yMax - yMin)) * chartArea.h;
          const bandH = bandBottom - bandTop;
          if (bandH <= 0) return null;
          return (
            <g key={i}>
              <rect
                x={chartArea.x}
                y={bandTop}
                width={chartArea.w}
                height={bandH}
                fill={zone.color}
                rx={2}
              />
              <text
                x={chartArea.x + chartArea.w - 4}
                y={bandTop + 12}
                textAnchor="end"
                className="text-[9px]"
                fill="currentColor"
                opacity={0.3}
              >
                {zone.label}
              </text>
            </g>
          );
        })}

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => {
          const y = chartArea.y + chartArea.h - ((tick - yMin) / (yMax - yMin)) * chartArea.h;
          return (
            <g key={i}>
              <line
                x1={chartArea.x}
                y1={y}
                x2={chartArea.x + chartArea.w}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.06}
              />
              <text
                x={chartArea.x - 6}
                y={y + 3}
                textAnchor="end"
                fill="currentColor"
                opacity={0.35}
                className="text-[10px]"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Dashed average line */}
        {showAverage && data.length >= 2 && (
          <g>
            <line
              x1={chartArea.x}
              y1={avgY}
              x2={chartArea.x + chartArea.w}
              y2={avgY}
              stroke={accentColor}
              strokeWidth={1}
              strokeDasharray="6 4"
              strokeOpacity={0.35}
            />
            <text
              x={chartArea.x + 4}
              y={avgY - 5}
              fill={accentColor}
              opacity={0.5}
              className="text-[9px]"
            >
              avg {avg >= 1000 ? `${(avg / 1000).toFixed(1)}k` : Math.round(avg)}
              {unit ? ` ${unit}` : ''}
            </text>
          </g>
        )}

        {/* Subtle fill below line */}
        {points.length >= 2 && (
          <path
            d={`${linePath} L ${lastPoint.x},${chartArea.y + chartArea.h} L ${points[0].x},${chartArea.y + chartArea.h} Z`}
            fill="url(#area-fill)"
          />
        )}

        {/* Main line */}
        {points.length >= 2 && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#line-grad)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        {/* Single point fallback */}
        {points.length === 1 && (
          <circle cx={points[0].x} cy={points[0].y} r={4} fill={accentColor} />
        )}

        {/* Glowing endpoint */}
        {lastPoint && points.length >= 2 && (
          <g filter="url(#endpoint-glow)">
            <circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={accentColor} />
            <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill="white" fillOpacity={0.9} />
          </g>
        )}

        {/* X-axis labels */}
        {xLabels.map((d) => {
          const idx = data.indexOf(d);
          const x =
            chartArea.x +
            (data.length === 1 ? chartArea.w / 2 : (idx / (data.length - 1)) * chartArea.w);
          return (
            <text
              key={idx}
              x={x}
              y={chartArea.y + chartArea.h + 18}
              textAnchor="middle"
              fill="currentColor"
              opacity={0.35}
              className="text-[10px]"
            >
              {d.label}
            </text>
          );
        })}

        {/* Tooltip hover line + dot */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x}
              y1={chartArea.y}
              x2={tooltip.x}
              y2={chartArea.y + chartArea.h}
              stroke={accentColor}
              strokeWidth={1}
              strokeOpacity={0.3}
              strokeDasharray="3 3"
            />
            <circle cx={tooltip.x} cy={tooltip.y} r={5} fill={accentColor} fillOpacity={0.8} />
            {/* Tooltip box */}
            <rect
              x={tooltip.x - 36}
              y={tooltip.y - 32}
              width={72}
              height={22}
              rx={6}
              fill="hsl(var(--card))"
              stroke={accentColor}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 17}
              textAnchor="middle"
              fill="currentColor"
              className="text-[11px] font-medium"
            >
              {tooltip.value.toLocaleString()}
              {unit ? ` ${unit}` : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// Period toggle pills component
export type Period = '7D' | '4W' | '6M' | '1Y';

interface PeriodToggleProps {
  value: Period;
  onChange: (p: Period) => void;
}

const periods: Period[] = ['7D', '4W', '6M', '1Y'];

export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04]">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            value === p
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
