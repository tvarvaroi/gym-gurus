import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Moon,
  Droplets,
  Activity,
  Zap,
  Clock,
  ThermometerSun,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Dumbbell,
  Loader2,
} from 'lucide-react';

interface MuscleFatigue {
  muscleGroup: string;
  fatigueLevel: number;
  lastTrainedAt: string | null;
  estimatedFullRecoveryAt: string | null;
  volumeLastSession: number;
  setsLastSession: number;
  recoveryStatus: 'recovered' | 'recovering' | 'fatigued';
}

interface Recommendation {
  readyToTrain: string[];
  needsRest: { muscleGroup: string; recoveryProgress: number }[];
  suggestedWorkout: string;
  muscleStatus: { muscleGroup: string; recoveryProgress: number; isRecovered: boolean }[];
}

// Recovery tips (static content)
const recoveryTips = [
  {
    icon: Moon,
    title: 'Sleep Quality',
    description:
      'Aim for 7-9 hours of quality sleep. Your muscles recover and grow during deep sleep.',
    color: 'indigo',
  },
  {
    icon: Droplets,
    title: 'Hydration',
    description: 'Drink at least 3L of water daily. Dehydration can slow recovery by up to 50%.',
    color: 'cyan',
  },
  {
    icon: ThermometerSun,
    title: 'Active Recovery',
    description: 'Light walks, stretching, or yoga can increase blood flow and speed up recovery.',
    color: 'orange',
  },
  {
    icon: Flame,
    title: 'Protein Intake',
    description: 'Consume 1.6-2.2g of protein per kg bodyweight to support muscle repair.',
    color: 'red',
  },
];

function formatMuscleGroupName(group: string): string {
  return group.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLastTrained(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const hoursAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  const daysAgo = Math.round(hoursAgo / 24);
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
}

function getSuggestedWorkoutLabel(type: string): string {
  switch (type) {
    case 'push':
      return 'Push Day (Chest, Shoulders, Triceps)';
    case 'pull':
      return 'Pull Day (Back, Biceps)';
    case 'legs':
      return 'Leg Day (Quads, Hamstrings, Glutes)';
    case 'full_body':
      return 'Full Body Workout';
    case 'rest':
      return 'Rest Day';
    default:
      return type;
  }
}

export default function Recovery() {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const { data: fatigueData = [], isLoading: fatigueLoading } = useQuery<MuscleFatigue[]>({
    queryKey: ['/api/recovery/fatigue'],
  });

  const { data: recommendations } = useQuery<Recommendation>({
    queryKey: ['/api/recovery/recommendations'],
  });

  // Calculate overall recovery score
  const overallRecovery =
    fatigueData.length > 0
      ? Math.round(
          fatigueData.reduce((acc, m) => acc + (100 - m.fatigueLevel), 0) / fatigueData.length
        )
      : 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recovered':
        return 'text-emerald-400';
      case 'recovering':
        return 'text-amber-400';
      case 'fatigued':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'recovered':
        return 'bg-emerald-500/10 border-emerald-500/30';
      case 'recovering':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'fatigued':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-muted/50 border-border/50';
    }
  };

  const getProgressColor = (fatigue: number) => {
    if (fatigue <= 30) return 'bg-emerald-500';
    if (fatigue <= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (fatigueLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400 mx-auto" />
          <p className="text-muted-foreground font-light">Loading recovery data...</p>
        </div>
      </div>
    );
  }

  // Show all muscle groups from the API
  const displayMuscles = fatigueData;

  const recoveredCount = fatigueData.filter((m) => m.recoveryStatus === 'recovered').length;
  const recoveringCount = fatigueData.filter((m) => m.recoveryStatus === 'recovering').length;
  const fatiguedCount = fatigueData.filter((m) => m.recoveryStatus === 'fatigued').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight font-['Playfair_Display'] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
              <Heart className="h-8 w-8 text-rose-400" />
            </div>
            Recovery{' '}
            <span className="font-light bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
              Status
            </span>
          </h1>
          <p className="text-muted-foreground font-light">
            Track your muscle recovery and optimize rest days
          </p>
        </div>
      </motion.div>

      {/* Overall Recovery Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Score Circle */}
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/20"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="url(#recoveryGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 440' }}
                    animate={{ strokeDasharray: `${overallRecovery * 4.4} 440` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="recoveryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl font-light"
                  >
                    {overallRecovery}%
                  </motion.span>
                  <span className="text-sm text-muted-foreground">Recovery</span>
                </div>
              </div>

              {/* Recovery Stats */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-muted-foreground">Recovered</span>
                  </div>
                  <p className="text-2xl font-light text-emerald-400">{recoveredCount}</p>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-muted-foreground">Recovering</span>
                  </div>
                  <p className="text-2xl font-light text-amber-400">{recoveringCount}</p>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-muted-foreground">Fatigued</span>
                  </div>
                  <p className="text-2xl font-light text-red-400">{fatiguedCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Muscle Recovery Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-400" />
                Muscle Group Recovery
              </CardTitle>
              <CardDescription>Click on a muscle group for details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {displayMuscles.map((muscle, index) => (
                  <motion.button
                    key={muscle.muscleGroup}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() =>
                      setSelectedMuscle(
                        selectedMuscle === muscle.muscleGroup ? null : muscle.muscleGroup
                      )
                    }
                    className={`p-4 rounded-xl border transition-all duration-300 text-left ${
                      selectedMuscle === muscle.muscleGroup
                        ? 'border-rose-500/50 bg-rose-500/10'
                        : getStatusBg(muscle.recoveryStatus)
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">
                        {formatMuscleGroupName(muscle.muscleGroup)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(muscle.recoveryStatus)} border-current/30 bg-current/10`}
                      >
                        {muscle.recoveryStatus}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fatigue</span>
                        <span>{muscle.fatigueLevel}%</span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${getProgressColor(muscle.fatigueLevel)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${muscle.fatigueLevel}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + index * 0.05 }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatLastTrained(muscle.lastTrainedAt)}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Selected Muscle Details */}
              {selectedMuscle &&
                (() => {
                  const muscle = fatigueData.find((m) => m.muscleGroup === selectedMuscle);
                  if (!muscle) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/50"
                    >
                      <h4 className="font-medium mb-2">
                        {formatMuscleGroupName(selectedMuscle)} Recovery Details
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Fatigue level: {muscle.fatigueLevel}%</p>
                        <p>Last trained: {formatLastTrained(muscle.lastTrainedAt)}</p>
                        {muscle.setsLastSession > 0 && (
                          <p>
                            Last session: {muscle.setsLastSession} sets,{' '}
                            {muscle.volumeLastSession.toFixed(0)} kg volume
                          </p>
                        )}
                        {muscle.estimatedFullRecoveryAt && (
                          <p>
                            Full recovery by:{' '}
                            {new Date(muscle.estimatedFullRecoveryAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recovery Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                Recovery Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recoveryTips.map((tip, index) => (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-3 rounded-xl bg-muted/20 border border-border/50 hover:border-rose-500/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-${tip.color}-500/10`}>
                      <tip.icon className={`h-4 w-4 text-${tip.color}-400`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Info className="h-6 w-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Today's Recommendation</h3>
                {recommendations ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Based on your recovery status, we recommend:{' '}
                      <strong>{getSuggestedWorkoutLabel(recommendations.suggestedWorkout)}</strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.readyToTrain.slice(0, 6).map((muscle) => (
                        <Badge
                          key={muscle}
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        >
                          {formatMuscleGroupName(muscle)} - Ready
                        </Badge>
                      ))}
                      {recommendations.needsRest.slice(0, 4).map((m) => (
                        <Badge
                          key={m.muscleGroup}
                          className="bg-red-500/20 text-red-400 border-red-500/30"
                        >
                          {formatMuscleGroupName(m.muscleGroup)} - Rest
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Log your workouts to get personalized recovery recommendations.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
