import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ArrowLeft, Clock, Target, Users, Play, Trash2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// Temporary trainer ID for development
const TEMP_TRAINER_ID = "demo-trainer-123";

export default function WorkoutBuilder() {
  const params = useParams();
  const workoutId = params.id as string;
  const [, setLocation] = useLocation();
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [exerciseData, setExerciseData] = useState({
    sets: 3,
    reps: "10-12",
    weight: "",
    restTime: 60,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();

  // Fetch workout details with exercises
  const { data: workout, isLoading: workoutLoading } = useQuery({
    queryKey: ['/api/workouts/detail', workoutId],
    queryFn: () => fetch(`/api/workouts/detail/${workoutId}`).then(res => res.json())
  });

  // Fetch all exercises for adding to workout
  const { data: exercises } = useQuery({
    queryKey: ['/api/exercises'],
    queryFn: () => fetch('/api/exercises').then(res => res.json())
  });

  // Fetch clients for assignment
  const { data: clients } = useQuery({
    queryKey: ['/api/clients', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/clients/${TEMP_TRAINER_ID}`).then(res => res.json())
  });

  // Add exercise to workout mutation
  const addExerciseMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/workouts/${workoutId}/exercises`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/detail', workoutId] });
      setSelectedExercise("");
      setExerciseData({ sets: 3, reps: "10-12", weight: "", restTime: 60 });
      toast({
        title: "Success",
        description: "Exercise added to workout",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add exercise",
        variant: "destructive",
      });
    },
  });

  // Remove exercise from workout mutation
  const removeExerciseMutation = useMutation({
    mutationFn: (exerciseId: string) => apiRequest('DELETE', `/api/workouts/${workoutId}/exercises/${exerciseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/detail', workoutId] });
      toast({
        title: "Success",
        description: "Exercise removed from workout",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove exercise",
        variant: "destructive",
      });
    },
  });

  // Assign workout to client mutation
  const assignWorkoutMutation = useMutation({
    mutationFn: (clientId: string) => apiRequest('POST', '/api/workout-assignments', {
      workoutId,
      clientId
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workout assigned to client",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign workout",
        variant: "destructive",
      });
    },
  });

  const handleAddExercise = () => {
    if (!selectedExercise) return;
    
    const exercise = exercises?.find((e: any) => e.id === selectedExercise);
    if (!exercise) return;

    addExerciseMutation.mutate({
      exerciseId: selectedExercise,
      ...exerciseData,
      sortOrder: (workout?.exercises?.length || 0) + 1
    });
  };

  if (workoutLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-card/50 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-card/50 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-card/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <h2 className="text-2xl font-semibold">Workout not found</h2>
        <Button onClick={() => setLocation('/workouts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workouts
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/workouts')}
            data-testid="button-back-to-workouts"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workouts
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-light tracking-tight">{workout.title}</h1>
            <p className="text-muted-foreground">{workout.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{workout.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span className="capitalize">{workout.difficulty}</span>
              </div>
              <Badge variant="outline" className="capitalize">
                {workout.category}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exercise List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Exercises</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-exercise">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Exercise
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Exercise to Workout</DialogTitle>
                  <DialogDescription>
                    Select an exercise and configure the sets, reps, and rest time.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Exercise</label>
                    <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                      <SelectTrigger data-testid="select-exercise">
                        <SelectValue placeholder="Select an exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        {exercises && Array.isArray(exercises) ? exercises.map((exercise: any) => (
                          <SelectItem key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </SelectItem>
                        )) : (
                          <SelectItem value="no-exercises" disabled>No exercises available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Sets</label>
                      <Input
                        type="number"
                        value={exerciseData.sets}
                        onChange={(e) => setExerciseData(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                        data-testid="input-sets"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reps</label>
                      <Input
                        value={exerciseData.reps}
                        onChange={(e) => setExerciseData(prev => ({ ...prev, reps: e.target.value }))}
                        placeholder="e.g., 10-12 or 45 sec"
                        data-testid="input-reps"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Weight (optional)</label>
                      <Input
                        value={exerciseData.weight}
                        onChange={(e) => setExerciseData(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="e.g., 135 lbs"
                        data-testid="input-weight"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rest Time (sec)</label>
                      <Input
                        type="number"
                        value={exerciseData.restTime}
                        onChange={(e) => setExerciseData(prev => ({ ...prev, restTime: parseInt(e.target.value) || 0 }))}
                        data-testid="input-rest-time"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddExercise} 
                    disabled={!selectedExercise || addExerciseMutation.isPending}
                    className="w-full"
                    data-testid="button-confirm-add-exercise"
                  >
                    Add to Workout
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Exercise Cards */}
          <div className="space-y-4">
            {workout.exercises?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-medium">No exercises added yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Add exercises to build your workout plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              workout.exercises?.map((workoutExercise: any, index: number) => {
                const exercise = exercises?.find((e: any) => e.id === workoutExercise.exerciseId);
                return (
                  <Card key={workoutExercise.id} className="group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-medium">{exercise?.name}</h3>
                              <p className="text-sm text-muted-foreground">{exercise?.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm">
                            <span><strong>Sets:</strong> {workoutExercise.sets}</span>
                            <span><strong>Reps:</strong> {workoutExercise.reps}</span>
                            {workoutExercise.weight && (
                              <span><strong>Weight:</strong> {workoutExercise.weight}</span>
                            )}
                            <span><strong>Rest:</strong> {workoutExercise.restTime}s</span>
                          </div>

                          {exercise?.youtubeUrl && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <Play className="h-4 w-4" />
                              <a 
                                href={exercise.youtubeUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                Watch demonstration video
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeExerciseMutation.mutate(workoutExercise.exerciseId)}
                            data-testid={`button-remove-exercise-${workoutExercise.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Workout Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assign to Client
              </CardTitle>
              <CardDescription>
                Assign this workout to a specific client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={(clientId) => assignWorkoutMutation.mutate(clientId)}>
                <SelectTrigger data-testid="select-assign-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workout Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Exercises:</span>
                  <span className="font-medium">{workout.exercises?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{workout.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty:</span>
                  <span className="font-medium capitalize">{workout.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium capitalize">{workout.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}