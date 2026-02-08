import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  Moon,
  Droplets,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  ThermometerSun,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Calendar,
  Dumbbell
} from 'lucide-react';

// Muscle group recovery data (simulated)
const muscleRecoveryData = [
  { name: 'Chest', fatigue: 25, lastTrained: '2 days ago', status: 'recovered' },
  { name: 'Back', fatigue: 65, lastTrained: 'Yesterday', status: 'recovering' },
  { name: 'Shoulders', fatigue: 40, lastTrained: '2 days ago', status: 'recovered' },
  { name: 'Biceps', fatigue: 55, lastTrained: 'Yesterday', status: 'recovering' },
  { name: 'Triceps', fatigue: 30, lastTrained: '2 days ago', status: 'recovered' },
  { name: 'Legs', fatigue: 80, lastTrained: 'Today', status: 'fatigued' },
  { name: 'Core', fatigue: 35, lastTrained: '2 days ago', status: 'recovered' },
  { name: 'Glutes', fatigue: 75, lastTrained: 'Today', status: 'fatigued' },
];

// Recovery tips
const recoveryTips = [
  {
    icon: Moon,
    title: 'Sleep Quality',
    description: 'Aim for 7-9 hours of quality sleep. Your muscles recover and grow during deep sleep.',
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

// Weekly recovery data (simulated)
const weeklyData = [
  { day: 'Mon', recovery: 95, workout: true },
  { day: 'Tue', recovery: 70, workout: true },
  { day: 'Wed', recovery: 85, workout: false },
  { day: 'Thu', recovery: 65, workout: true },
  { day: 'Fri', recovery: 80, workout: true },
  { day: 'Sat', recovery: 60, workout: true },
  { day: 'Sun', recovery: 90, workout: false },
];

export default function Recovery() {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Calculate overall recovery score
  const overallRecovery = Math.round(
    muscleRecoveryData.reduce((acc, m) => acc + (100 - m.fatigue), 0) / muscleRecoveryData.length
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recovered': return 'text-emerald-400';
      case 'recovering': return 'text-amber-400';
      case 'fatigued': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'recovered': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'recovering': return 'bg-amber-500/10 border-amber-500/30';
      case 'fatigued': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-muted/50 border-border/50';
    }
  };

  const getProgressColor = (fatigue: number) => {
    if (fatigue <= 30) return 'bg-emerald-500';
    if (fatigue <= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
              <Heart className="h-8 w-8 text-rose-400" />
            </div>
            Recovery <span className="font-light bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">Status</span>
          </h1>
          <p className="text-muted-foreground font-light">Track your muscle recovery and optimize rest days</p>
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
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-muted-foreground">Recovered</span>
                  </div>
                  <p className="text-2xl font-light text-emerald-400">
                    {muscleRecoveryData.filter(m => m.status === 'recovered').length}
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-muted-foreground">Recovering</span>
                  </div>
                  <p className="text-2xl font-light text-amber-400">
                    {muscleRecoveryData.filter(m => m.status === 'recovering').length}
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-muted-foreground">Fatigued</span>
                  </div>
                  <p className="text-2xl font-light text-red-400">
                    {muscleRecoveryData.filter(m => m.status === 'fatigued').length}
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-muted-foreground">Rest Days</span>
                  </div>
                  <p className="text-2xl font-light text-purple-400">
                    {weeklyData.filter(d => !d.workout).length}
                  </p>
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
                {muscleRecoveryData.map((muscle, index) => (
                  <motion.button
                    key={muscle.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => setSelectedMuscle(selectedMuscle === muscle.name ? null : muscle.name)}
                    className={`p-4 rounded-xl border transition-all duration-300 text-left ${
                      selectedMuscle === muscle.name
                        ? 'border-rose-500/50 bg-rose-500/10'
                        : getStatusBg(muscle.status)
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{muscle.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(muscle.status)} border-current/30 bg-current/10`}
                      >
                        {muscle.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fatigue</span>
                        <span>{muscle.fatigue}%</span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${getProgressColor(muscle.fatigue)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${muscle.fatigue}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + index * 0.05 }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{muscle.lastTrained}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Selected Muscle Details */}
              {selectedMuscle && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/50"
                >
                  <h4 className="font-medium mb-2">{selectedMuscle} Recovery Details</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Estimated full recovery: 24-48 hours</p>
                    <p>• Recommended: Light stretching, foam rolling</p>
                    <p>• Avoid: Heavy compound movements targeting this area</p>
                  </div>
                </motion.div>
              )}
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

      {/* Weekly Recovery Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-light flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" />
              Weekly Recovery Trend
            </CardTitle>
            <CardDescription>Your recovery score throughout the week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {weeklyData.map((day, index) => (
                <motion.div
                  key={day.day}
                  initial={{ height: 0 }}
                  animate={{ height: `${day.recovery}%` }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="flex-1 relative group"
                >
                  <div
                    className={`w-full h-full rounded-t-lg ${
                      day.workout
                        ? 'bg-gradient-to-t from-rose-500/60 to-rose-500/20'
                        : 'bg-gradient-to-t from-emerald-500/60 to-emerald-500/20'
                    }`}
                  />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                    {day.day}
                  </div>
                  {day.workout && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <Dumbbell className="h-3 w-3 text-rose-400" />
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 border border-border/50 rounded px-2 py-1 text-xs whitespace-nowrap">
                    {day.recovery}% recovery
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-10 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-rose-500/60" />
                <span className="text-muted-foreground">Workout Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500/60" />
                <span className="text-muted-foreground">Rest Day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Info className="h-6 w-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Today's Recommendation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on your recovery status, we recommend focusing on <strong>upper body</strong> today.
                  Your legs and glutes are still recovering from your recent workout. Consider light cardio
                  or mobility work for your lower body.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Chest - Ready
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Shoulders - Ready
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Triceps - Ready
                  </Badge>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    Legs - Rest
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
