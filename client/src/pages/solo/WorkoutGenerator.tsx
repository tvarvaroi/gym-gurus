import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Dumbbell,
  Clock,
  Target,
  Zap,
  RefreshCw,
  Play,
  Save,
  ChevronRight,
  Flame,
  Brain,
  Settings2,
  CheckCircle2,
  Timer,
  TrendingUp
} from 'lucide-react';

// Workout focus options
const workoutFocusOptions = [
  { value: 'full_body', label: 'Full Body', description: 'Complete workout hitting all muscle groups' },
  { value: 'upper_body', label: 'Upper Body', description: 'Chest, back, shoulders, and arms' },
  { value: 'lower_body', label: 'Lower Body', description: 'Quads, hamstrings, glutes, and calves' },
  { value: 'push', label: 'Push Day', description: 'Chest, shoulders, and triceps' },
  { value: 'pull', label: 'Pull Day', description: 'Back and biceps' },
  { value: 'legs', label: 'Leg Day', description: 'Complete lower body workout' },
  { value: 'core', label: 'Core & Abs', description: 'Core strength and stability' },
  { value: 'cardio', label: 'Cardio HIIT', description: 'High intensity interval training' },
];

// Goal options
const goalOptions = [
  { value: 'strength', label: 'Build Strength', icon: Dumbbell },
  { value: 'muscle', label: 'Build Muscle', icon: TrendingUp },
  { value: 'endurance', label: 'Endurance', icon: Timer },
  { value: 'fat_loss', label: 'Fat Loss', icon: Flame },
];

// Equipment options
const equipmentOptions = [
  { value: 'full_gym', label: 'Full Gym' },
  { value: 'dumbbells', label: 'Dumbbells Only' },
  { value: 'barbell', label: 'Barbell & Plates' },
  { value: 'bodyweight', label: 'Bodyweight Only' },
  { value: 'home_gym', label: 'Home Gym' },
  { value: 'resistance_bands', label: 'Resistance Bands' },
];

interface GeneratedWorkout {
  name: string;
  duration: number;
  exercises: { name: string; sets: number; reps: string; rest: number; muscleGroup: string }[];
  warmup: string[];
  cooldown: string[];
  tips: string[];
}

export default function WorkoutGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Form state
  const [workoutFocus, setWorkoutFocus] = useState('push');
  const [goal, setGoal] = useState('strength');
  const [duration, setDuration] = useState([45]);
  const [equipment, setEquipment] = useState('full_gym');
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [includeCooldown, setIncludeCooldown] = useState(true);
  const [difficulty, setDifficulty] = useState('intermediate');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Map equipment UI value to API format
      const equipmentMap: Record<string, string[]> = {
        full_gym: ['barbell', 'dumbbells', 'machines', 'cables', 'pull-up bar'],
        dumbbells: ['dumbbells'],
        barbell: ['barbell'],
        bodyweight: ['bodyweight'],
        home_gym: ['dumbbells', 'pull-up bar', 'resistance bands'],
        resistance_bands: ['resistance bands'],
      };

      const response = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal === 'muscle' ? 'hypertrophy' : goal,
          experienceLevel: difficulty,
          availableEquipment: equipmentMap[equipment] || ['barbell', 'dumbbells'],
          duration: duration[0],
          focusMuscles: workoutFocus === 'full_body' ? undefined : [workoutFocus],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout');
      }

      const workout = data.workout;
      setGeneratedWorkout({
        name: workout.name || `${workoutFocusOptions.find(o => o.value === workoutFocus)?.label || 'Custom'} Workout`,
        duration: workout.estimatedDuration || duration[0],
        exercises: (workout.exercises || []).map((ex: any) => ({
          name: ex.name,
          sets: ex.sets || 3,
          reps: ex.reps || '8-12',
          rest: ex.restSeconds || 60,
          muscleGroup: ex.targetMuscle || ex.muscleGroup || '',
        })),
        warmup: includeWarmup ? (workout.warmup || ['5 min light cardio', 'Dynamic stretching']) : [],
        cooldown: includeCooldown ? (workout.cooldown || ['Static stretching', 'Deep breathing']) : [],
        tips: workout.tips || workout.notes || ['Focus on proper form', 'Stay hydrated'],
      });
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate workout');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedWorkout(null);
    handleGenerate();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
              <Brain className="h-8 w-8 text-purple-400" />
            </div>
            AI Workout <span className="font-light bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Generator</span>
          </h1>
          <p className="text-muted-foreground font-light">Create personalized workouts powered by AI</p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-purple-400" />
                Workout Preferences
              </CardTitle>
              <CardDescription>Customize your AI-generated workout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Workout Focus */}
              <div className="space-y-2">
                <Label>Workout Focus</Label>
                <Select value={workoutFocus} onValueChange={setWorkoutFocus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workoutFocusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Goal Selection */}
              <div className="space-y-2">
                <Label>Primary Goal</Label>
                <div className="grid grid-cols-2 gap-2">
                  {goalOptions.map(option => (
                    <Button
                      key={option.value}
                      variant={goal === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGoal(option.value)}
                      className={goal === option.value
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                        : 'border-border/50'
                      }
                    >
                      <option.icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Duration</Label>
                  <span className="text-sm text-muted-foreground">{duration[0]} minutes</span>
                </div>
                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  min={15}
                  max={90}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>15 min</span>
                  <span>90 min</span>
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-2">
                <Label>Available Equipment</Label>
                <Select value={equipment} onValueChange={setEquipment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <div className="flex gap-2">
                  {['beginner', 'intermediate', 'advanced'].map(level => (
                    <Button
                      key={level}
                      variant={difficulty === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 capitalize ${
                        difficulty === level
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                          : 'border-border/50'
                      }`}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="warmup" className="font-normal">Include Warm-up</Label>
                  <Switch
                    id="warmup"
                    checked={includeWarmup}
                    onCheckedChange={setIncludeWarmup}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cooldown" className="font-normal">Include Cool-down</Label>
                  <Switch
                    id="cooldown"
                    checked={includeCooldown}
                    onCheckedChange={setIncludeCooldown}
                  />
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Workout
                  </>
                )}
              </Button>

              {generateError && (
                <p className="text-sm text-red-400 text-center">{generateError}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Generated Workout Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full min-h-[500px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Brain className="h-16 w-16 text-purple-400 mx-auto" />
                    </motion.div>
                    <div className="space-y-2">
                      <p className="text-lg font-light">AI is crafting your workout...</p>
                      <p className="text-sm text-muted-foreground">Analyzing your preferences</p>
                    </div>
                    <div className="flex justify-center gap-1">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : generatedWorkout ? (
              <motion.div
                key="workout"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl font-light flex items-center gap-2">
                          <Zap className="h-5 w-5 text-purple-400" />
                          {generatedWorkout.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {generatedWorkout.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {generatedWorkout.exercises.length} exercises
                          </span>
                        </CardDescription>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        AI Generated
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Warm-up */}
                    {includeWarmup && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Warm-up</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {generatedWorkout.warmup.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exercises */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Exercises</h4>
                      {generatedWorkout.exercises.map((exercise, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-medium text-purple-400">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{exercise.name}</p>
                              <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{exercise.sets} × {exercise.reps}</p>
                            <p className="text-xs text-muted-foreground">{exercise.rest}s rest</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Cool-down */}
                    {includeCooldown && (
                      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <h4 className="text-sm font-medium text-cyan-400 mb-2">Cool-down</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {generatedWorkout.cooldown.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tips */}
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <h4 className="text-sm font-medium text-purple-400 mb-2">Pro Tips</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {generatedWorkout.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3 w-3 mt-1 text-purple-400" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-border/50"
                        onClick={handleRegenerate}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white">
                        <Play className="h-4 w-4 mr-2" />
                        Start Workout
                      </Button>
                    </div>
                    <Button variant="ghost" className="w-full text-muted-foreground">
                      <Save className="h-4 w-4 mr-2" />
                      Save to My Workouts
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full min-h-[500px] flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                      <Dumbbell className="h-10 w-10 text-purple-400/50" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-light">Ready to Generate</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Configure your preferences and click "Generate Workout" to create a personalized routine
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="outline" className="border-border/50">
                        <Target className="h-3 w-3 mr-1" />
                        Goal-focused
                      </Badge>
                      <Badge variant="outline" className="border-border/50">
                        <Clock className="h-3 w-3 mr-1" />
                        Time-optimized
                      </Badge>
                      <Badge variant="outline" className="border-border/50">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI-powered
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
