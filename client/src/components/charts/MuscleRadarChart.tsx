import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MuscleData {
  muscle: string;
  value: number; // 0-100
  label?: string;
}

interface MuscleRadarChartProps {
  data: MuscleData[];
  size?: number;
  showLabels?: boolean;
  showValues?: boolean;
  fillColor?: string;
  strokeColor?: string;
  animated?: boolean;
}

// Default muscle groups for a full body chart
export const DEFAULT_MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Core',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
];

export function MuscleRadarChart({
  data,
  size = 300,
  showLabels = true,
  showValues = false,
  fillColor = 'rgba(59, 130, 246, 0.3)',
  strokeColor = 'rgb(59, 130, 246)',
  animated = true,
}: MuscleRadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.75; // Leave room for labels
  const numAxes = data.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Calculate points for each data point
  const points = useMemo(() => {
    return data.map((item, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const normalizedValue = Math.min(100, Math.max(0, item.value)) / 100;
      const x = center + radius * normalizedValue * Math.cos(angle);
      const y = center + radius * normalizedValue * Math.sin(angle);
      return { x, y, value: item.value, muscle: item.muscle, label: item.label };
    });
  }, [data, center, radius, numAxes, angleStep]);

  // Create polygon path
  const polygonPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';
  }, [points]);

  // Generate concentric circles for reference
  const circles = [0.25, 0.5, 0.75, 1].map((scale) => ({
    r: radius * scale,
    label: `${Math.round(scale * 100)}%`,
  }));

  // Generate axis lines
  const axes = data.map((_, index) => {
    const angle = index * angleStep - Math.PI / 2;
    return {
      x1: center,
      y1: center,
      x2: center + radius * Math.cos(angle),
      y2: center + radius * Math.sin(angle),
    };
  });

  // Label positions
  const labelPositions = data.map((item, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelRadius = radius + 25;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      muscle: item.muscle,
      value: item.value,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Reference circles */}
        {circles.map((circle, index) => (
          <circle
            key={index}
            cx={center}
            cy={center}
            r={circle.r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {axes.map((axis, index) => (
          <line
            key={index}
            x1={axis.x1}
            y1={axis.y1}
            x2={axis.x2}
            y2={axis.y2}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        ))}

        {/* Data polygon */}
        {animated ? (
          <motion.path
            d={polygonPath}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          />
        ) : (
          <path
            d={polygonPath}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
          />
        )}

        {/* Data points */}
        {points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={strokeColor}
            initial={animated ? { opacity: 0, scale: 0 } : undefined}
            animate={animated ? { opacity: 1, scale: 1 } : undefined}
            transition={animated ? { delay: index * 0.05, duration: 0.2 } : undefined}
          />
        ))}
      </svg>

      {/* Labels */}
      {showLabels &&
        labelPositions.map((label, index) => {
          // Adjust text anchor based on position
          const isLeft = label.x < center - 10;
          const isRight = label.x > center + 10;

          return (
            <div
              key={index}
              className="absolute text-xs"
              style={{
                left: label.x,
                top: label.y,
                transform: `translate(${isLeft ? '-100%' : isRight ? '0%' : '-50%'}, -50%)`,
              }}
            >
              <span className="font-medium text-foreground">{label.muscle}</span>
              {showValues && (
                <span className="ml-1 text-muted-foreground">({label.value}%)</span>
              )}
            </div>
          );
        })}
    </div>
  );
}

// Simplified version showing muscle activation levels
interface MuscleHeatmapProps {
  data: MuscleData[];
}

export function MuscleHeatmap({ data }: MuscleHeatmapProps) {
  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  const getColor = (value: number) => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-orange-500';
    if (value >= 40) return 'bg-yellow-500';
    if (value >= 20) return 'bg-green-500';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-2">
      {sortedData.map((item, index) => (
        <motion.div
          key={item.muscle}
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <span className="w-24 text-sm text-muted-foreground truncate">{item.muscle}</span>
          <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getColor(item.value)} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
            />
          </div>
          <span className="w-10 text-sm font-medium text-right">{item.value}%</span>
        </motion.div>
      ))}
    </div>
  );
}

// Body outline with highlighted muscles
interface MuscleBodyMapProps {
  activeMuscles: string[];
  fatigueLevel?: Record<string, number>;
}

export function MuscleBodyMap({ activeMuscles, fatigueLevel = {} }: MuscleBodyMapProps) {
  const getMuscleColor = (muscle: string) => {
    if (!activeMuscles.includes(muscle)) return 'fill-secondary';
    const fatigue = fatigueLevel[muscle] || 0;
    if (fatigue >= 80) return 'fill-red-500';
    if (fatigue >= 60) return 'fill-orange-500';
    if (fatigue >= 40) return 'fill-yellow-500';
    return 'fill-green-500';
  };

  // Simplified body map using rectangles
  const muscleMap = [
    { id: 'Shoulders', x: 15, y: 20, w: 20, h: 15 },
    { id: 'Shoulders', x: 65, y: 20, w: 20, h: 15 },
    { id: 'Chest', x: 30, y: 25, w: 40, h: 25 },
    { id: 'Biceps', x: 10, y: 35, w: 15, h: 25 },
    { id: 'Biceps', x: 75, y: 35, w: 15, h: 25 },
    { id: 'Triceps', x: 10, y: 35, w: 15, h: 25 },
    { id: 'Triceps', x: 75, y: 35, w: 15, h: 25 },
    { id: 'Core', x: 35, y: 50, w: 30, h: 30 },
    { id: 'Back', x: 35, y: 25, w: 30, h: 35 },
    { id: 'Quads', x: 30, y: 85, w: 15, h: 35 },
    { id: 'Quads', x: 55, y: 85, w: 15, h: 35 },
    { id: 'Hamstrings', x: 30, y: 85, w: 15, h: 35 },
    { id: 'Hamstrings', x: 55, y: 85, w: 15, h: 35 },
    { id: 'Glutes', x: 35, y: 80, w: 30, h: 15 },
    { id: 'Calves', x: 32, y: 120, w: 12, h: 20 },
    { id: 'Calves', x: 56, y: 120, w: 12, h: 20 },
  ];

  return (
    <div className="relative w-[100px] h-[150px]">
      <svg viewBox="0 0 100 150" className="w-full h-full">
        {/* Body outline */}
        <ellipse cx="50" cy="10" rx="12" ry="10" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />
        <rect x="35" y="20" width="30" height="60" rx="5" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />
        <rect x="30" y="80" width="15" height="55" rx="3" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />
        <rect x="55" y="80" width="15" height="55" rx="3" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />
        <rect x="15" y="25" width="12" height="35" rx="3" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />
        <rect x="73" y="25" width="12" height="35" rx="3" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />

        {/* Highlighted muscles - overlay */}
        {muscleMap.map((muscle, index) => (
          <motion.rect
            key={`${muscle.id}-${index}`}
            x={muscle.x}
            y={muscle.y}
            width={muscle.w}
            height={muscle.h}
            rx="2"
            className={`${getMuscleColor(muscle.id)} opacity-60`}
            initial={{ opacity: 0 }}
            animate={{ opacity: activeMuscles.includes(muscle.id) ? 0.6 : 0 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </svg>
    </div>
  );
}

export default MuscleRadarChart;
