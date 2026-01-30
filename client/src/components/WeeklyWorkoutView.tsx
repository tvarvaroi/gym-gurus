import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, startOfWeek, addWeeks, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";

interface Exercise {
  id: string;
  exerciseId: string;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  instructions: string[];
  youtubeUrl?: string;
  sets: number;
  reps: string;
  weight?: string;
  restTime: number;
  sortOrder: number;
}

interface Workout {
  id: string;
  workoutId: string;
  clientId: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  category: string;
  scheduledDate: string;
  dayOfWeek: number;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  completedAt?: string | null;
  exercises: Exercise[];
}

interface WeeklyWorkoutsResponse {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  workouts: Workout[];
}

export default function WeeklyWorkoutView() {
  const { user } = useUser();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Fetch weekly workouts
  const { data, isLoading, error } = useQuery<WeeklyWorkoutsResponse>({
    queryKey: ['/api/client/workouts/weekly', weekOffset],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const response = await apiRequest(
        'GET',
        `/api/client/workouts/weekly?weekOffset=${weekOffset}`
      );
      return await response.json();
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
  });

  // Group workouts by day of week
  const workoutsByDay = useMemo(() => {
    if (!data?.workouts) return {};

    const grouped: Record<number, Workout[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    data.workouts.forEach(workout => {
      if (workout.dayOfWeek !== null && workout.dayOfWeek !== undefined) {
        grouped[workout.dayOfWeek].push(workout);
      }
    });

    return grouped;
  }, [data?.workouts]);

  // Calculate week dates for display
  const weekDates = useMemo(() => {
    const currentDate = new Date();
    const targetWeek = addWeeks(currentDate, weekOffset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });

    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekOffset]);

  const handlePreviousWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);
  const handleCurrentWeek = () => setWeekOffset(0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Dumbbell className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Unable to load workouts</h2>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hasWorkouts = data?.workouts && data.workouts.length > 0;

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <Card className="p-6 bg-gradient-to-r from-cyan-500/10 to-teal-500/5 border-cyan-500/20">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousWeek}
            className="hover:bg-cyan-500/10"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              Week of
            </p>
            <p className="text-lg font-medium">
              {data?.weekStart && data?.weekEnd && (
                <>
                  {format(new Date(data.weekStart), 'MMM d')} -{' '}
                  {format(new Date(data.weekEnd), 'MMM d, yyyy')}
                </>
              )}
            </p>
            {weekOffset !== 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCurrentWeek}
                className="mt-1 text-xs text-cyan-600 hover:text-cyan-700"
              >
                Jump to current week
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextWeek}
            className="hover:bg-cyan-500/10"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </Card>

      {/* No Workouts Empty State */}
      {!hasWorkouts && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Dumbbell className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">No workouts this week</h3>
              <p className="text-sm text-muted-foreground">
                Check other weeks or contact your trainer to schedule workouts
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Premium Calendar Grid View */}
      {hasWorkouts && (
        <div className="space-y-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, dayIndex) => {
              const dayOfWeek = date.getDay();
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <motion.div
                  key={dayIndex}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.05 }}
                  className={`text-center p-3 rounded-t-lg border-b-2 ${
                    isToday
                      ? 'bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border-cyan-500'
                      : 'bg-card/50 border-border'
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {dayNames[dayOfWeek].slice(0, 3)}
                  </div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-cyan-500' : ''}`}>
                    {format(date, 'd')}
                  </div>
                  {isToday && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs bg-cyan-500/10 border-cyan-500 px-2 py-0">
                        Today
                      </Badge>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Calendar Grid - Premium Cards with Rich Details */}
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, dayIndex) => {
              const dayOfWeek = date.getDay();
              const dayWorkouts = workoutsByDay[dayOfWeek] || [];
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const totalMinutes = dayWorkouts.reduce((sum, w) => sum + w.duration, 0);
              const completedCount = dayWorkouts.filter(w => w.completedAt).length;

              return (
                <motion.div
                  key={dayIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: dayIndex * 0.05, duration: 0.3 }}
                  className={`rounded-lg border overflow-hidden ${
                    isToday
                      ? 'bg-gradient-to-br from-cyan-500/5 to-teal-500/5 border-cyan-500/30'
                      : 'bg-card/30 border-border/50'
                  }`}
                >
                  {/* Day Stats Header */}
                  {dayWorkouts.length > 0 && (
                    <div className={`px-4 py-2.5 ${isToday ? 'bg-cyan-500/5' : 'bg-muted/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {dayWorkouts.length} workout{dayWorkouts.length > 1 ? 's' : ''} • {totalMinutes}m
                        </span>
                        {completedCount > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">
                            {completedCount}/{dayWorkouts.length}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Workout Cards */}
                  <div className="p-4 space-y-3">
                    {dayWorkouts.length > 0 ? (
                      dayWorkouts.map((workout) => (
                        <button
                          key={workout.id}
                          onClick={() => setSelectedWorkout(workout)}
                          className={`w-full rounded-lg transition-all duration-200 overflow-hidden ${
                            selectedWorkout?.id === workout.id
                              ? 'bg-cyan-500/15 shadow-lg ring-1 ring-cyan-500/40'
                              : 'bg-card/40 hover:bg-cyan-500/5'
                          }`}
                        >
                          {/* Header */}
                          <div className="px-3 py-2.5 bg-muted/20 border-b border-border/20">
                            {/* Icon with Day & Time */}
                            <div className="flex items-start gap-2.5 mb-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                workout.completedAt ? 'bg-emerald-500/20' : 'bg-cyan-500/20'
                              }`}>
                                <Dumbbell className={`w-4 h-4 ${workout.completedAt ? 'text-emerald-600' : 'text-cyan-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wide font-semibold">
                                  {dayNames[new Date(workout.scheduledDate).getDay()]}
                                </p>
                                {(workout.scheduledStartTime || workout.scheduledEndTime) && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {workout.scheduledStartTime || '??:??'}
                                    {workout.scheduledEndTime && `-${workout.scheduledEndTime}`}
                                  </p>
                                )}
                              </div>
                              {workout.completedAt && (
                                <div className="flex-shrink-0">
                                  <span className="text-emerald-600 text-sm">✓</span>
                                </div>
                              )}
                            </div>

                            {/* Workout Title - Full Width */}
                            <h3 className="font-semibold text-sm leading-tight mb-3 px-1">{workout.title}</h3>

                            {/* Stats */}
                            <div className="space-y-1.5 text-[10px]">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{workout.duration}m</span>
                                </div>
                                <div className="h-3 w-px bg-border/60 shadow-sm"></div>
                                <div className="capitalize text-muted-foreground">
                                  {workout.difficulty}
                                </div>
                              </div>
                              <div className="text-center text-muted-foreground">
                                {workout.exercises.length} exercises
                              </div>
                            </div>
                          </div>

                          {/* Exercise List */}
                          {workout.exercises.length > 0 && (
                            <div className="px-3 py-2.5 space-y-2">
                              {workout.exercises.slice(0, 3).map((ex, idx) => (
                                <div key={ex.id} className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 font-semibold flex-shrink-0 text-[10px] mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-foreground font-medium leading-tight">{ex.name}</p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ex.sets} sets × {ex.reps} reps</p>
                                  </div>
                                </div>
                              ))}
                              {workout.exercises.length > 3 && (
                                <div className="text-[10px] text-cyan-500/60 text-center pt-1 border-t border-border/20 mt-2">
                                  +{workout.exercises.length - 3} more exercises
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                          <Dumbbell className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground/60">Rest Day</p>
                        <p className="text-xs text-muted-foreground/40 mt-1">Recovery time</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Expanded Workout Detail View */}
          {selectedWorkout && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              <WorkoutDetailView workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// Workout Detail View Component (Full Width with 50/50 Split)
function WorkoutDetailView({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    workout.exercises[0]?.id || null
  );
  const isCompleted = !!workout.completedAt;
  const selectedExercise = workout.exercises.find(ex => ex.id === selectedExerciseId);

  return (
    <Card className={`border overflow-hidden ${
      isCompleted
        ? 'bg-emerald-500/5 border-emerald-500/30'
        : 'bg-gradient-to-br from-cyan-500/5 to-teal-500/5 border-cyan-500/30'
    }`}>
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isCompleted
              ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20'
              : 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20'
          }`}>
            <Dumbbell className={`w-7 h-7 ${isCompleted ? 'text-emerald-600' : 'text-cyan-500'}`} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold flex items-center gap-3">
              {workout.title}
              {isCompleted && (
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500">
                  Completed
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {workout.exercises.length} exercises • {workout.duration} minutes • {workout.difficulty}
            </p>
            {workout.description && (
              <p className="text-sm text-muted-foreground mt-2">{workout.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-cyan-500/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Two-Column Layout - 50/50 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Exercise List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exercises</h4>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-3 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50">
            {workout.exercises.map((exercise, exerciseIndex) => (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: exerciseIndex * 0.05 }}
                className="px-1"
              >
                <button
                  onClick={() => setSelectedExerciseId(exercise.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                    selectedExerciseId === exercise.id
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-lg ring-2 ring-cyan-500/50'
                      : 'bg-card/50 border-border hover:border-cyan-500/30 hover:bg-cyan-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-sm font-semibold w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedExerciseId === exercise.id
                        ? 'bg-cyan-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {exerciseIndex + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base mb-1 truncate">{exercise.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps} reps
                        {exercise.weight && ` @ ${exercise.weight}`}
                      </p>
                      {exercise.muscleGroups.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {exercise.muscleGroups.slice(0, 2).map((muscle, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column - Exercise Details */}
        <div className="lg:border-l lg:pl-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Exercise Details</h4>
          {selectedExercise ? (
            <motion.div
              key={selectedExercise.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="max-h-[600px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50"
            >
              <ExerciseDetails exercise={selectedExercise} />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-sm">Select an exercise to view details</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Exercise Details Component
function ExerciseDetails({ exercise }: { exercise: Exercise }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-4 space-y-4"
    >
      {/* Video Placeholder */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-cyan-950/30 to-teal-950/20 border border-cyan-500/20">
        {exercise.youtubeUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => window.open(exercise.youtubeUrl, '_blank')}
              className="group hover:bg-cyan-500/10"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                  <svg className="w-8 h-8 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span className="text-sm text-cyan-500">Watch Demo</span>
              </div>
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <svg className="w-12 h-12 text-muted-foreground mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-muted-foreground">Video coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Sets & Reps Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-xs text-muted-foreground mb-1">Sets</p>
          <p className="text-2xl font-semibold text-cyan-500">{exercise.sets}</p>
        </div>
        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <p className="text-xs text-muted-foreground mb-1">Reps</p>
          <p className="text-2xl font-semibold text-teal-500">{exercise.reps}</p>
        </div>
        {exercise.weight && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground mb-1">Weight</p>
            <p className="text-lg font-semibold text-emerald-500">{exercise.weight}</p>
          </div>
        )}
        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <p className="text-xs text-muted-foreground mb-1">Rest</p>
          <p className="text-lg font-semibold text-sky-500">{exercise.restTime}s</p>
        </div>
      </div>

      {/* Instructions */}
      {exercise.instructions && exercise.instructions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Instructions
          </p>
          <ol className="space-y-2 pl-5 list-decimal">
            {exercise.instructions.map((instruction, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {instruction}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Muscle Groups & Equipment */}
      <div className="flex flex-wrap gap-4">
        {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="flex flex-wrap gap-1">
              {exercise.muscleGroups.map(mg => (
                <Badge key={mg} variant="secondary" className="text-xs">{mg}</Badge>
              ))}
            </div>
          </div>
        )}
        {exercise.equipment && exercise.equipment.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {exercise.equipment.map(eq => (
                <Badge key={eq} variant="outline" className="text-xs">{eq}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
