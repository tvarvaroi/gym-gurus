import { useState, useMemo } from "react";
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
import { Plus, ArrowLeft, Clock, Target, Users, Play, Trash2, Search, Dumbbell, ChevronUp, ChevronDown, Link2, Unlink } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TruncatedText } from "@/components/TruncatedText";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { QueryErrorState } from '@/components/query-states/QueryErrorState';

export default function WorkoutBuilder() {
  const params = useParams();
  const workoutId = params.id as string;
  const [, setLocation] = useLocation();
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState("all");
  const [exerciseData, setExerciseData] = useState({
    sets: 3,
    reps: "10-12",
    weight: "",
    restTime: 60,
  });
  const [groupType, setGroupType] = useState<"none" | "superset" | "circuit">("none");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();

  // Fetch authenticated user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Fetch workout details with exercises
  const { data: workout, isLoading: workoutLoading, error: workoutError } = useQuery({
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
    queryKey: ['/api/clients', user?.id],
    queryFn: () => fetch(`/api/clients/${user?.id}`).then(res => res.json()),
    enabled: !!user?.id // Only fetch when user is available
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

  // Reorder exercise mutation
  const reorderMutation = useMutation({
    mutationFn: ({ exerciseId, direction }: { exerciseId: string; direction: 'up' | 'down' }) =>
      apiRequest('PATCH', `/api/workouts/${workoutId}/reorder`, { exerciseId, direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/detail', workoutId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder exercise",
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

  // Filtered exercises for the picker
  const filteredExercises = useMemo(() => {
    if (!exercises || !Array.isArray(exercises)) return [];
    return exercises.filter((e: any) => {
      const matchesSearch = !exerciseSearch ||
        e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
        e.muscleGroups?.some((mg: string) => mg.toLowerCase().includes(exerciseSearch.toLowerCase()));
      const matchesCategory = exerciseCategoryFilter === "all" || e.category === exerciseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, exerciseSearch, exerciseCategoryFilter]);

  // Unique categories from exercises
  const exerciseCategories = useMemo(() => {
    if (!exercises || !Array.isArray(exercises)) return [];
    return Array.from(new Set(exercises.map((e: any) => e.category)));
  }, [exercises]);

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    const exercise = exercises?.find((e: any) => e.id === selectedExercise);
    if (!exercise) return;

    // Check if exercise already exists in workout
    const isDuplicate = workout?.exercises?.some(
      (ex: any) => ex.exerciseId === selectedExercise
    );

    if (isDuplicate) {
      toast({
        title: "Exercise Already Added",
        description: `${exercise.name} is already in this workout. Remove it first to add it again.`,
        variant: "destructive",
      });
      return;
    }

    // Handle group ID for supersets/circuits
    let groupId = null;
    let groupTypeValue = null;
    if (groupType !== "none") {
      groupId = activeGroupId || crypto.randomUUID();
      groupTypeValue = groupType;
      // Keep the group active so the next exercise can be added to the same group
      setActiveGroupId(groupId);
    }

    addExerciseMutation.mutate({
      exerciseId: selectedExercise,
      ...exerciseData,
      sortOrder: (workout?.exercises?.length || 0) + 1,
      ...(groupId ? { groupId, groupType: groupTypeValue } : {}),
    });
  };

  if (workoutLoading) {
    return (
      <div className="space-y-8">
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
            Loading <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">Workout</span>
          </h1>
          <p className="text-base font-light text-muted-foreground/80 flex items-center gap-2">
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
            >
              Preparing workout builder...
            </motion.span>
          </p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="h-32 glass-strong rounded-2xl overflow-hidden relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear", delay: i * 0.15 }}
                />
              </motion.div>
            ))}
          </div>
          <motion.div
            className="h-64 glass-strong rounded-2xl overflow-hidden relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  if (workoutError) {
    return <QueryErrorState error={workoutError} onRetry={() => window.location.reload()} />;
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative inline-block">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <Target className="h-20 w-20 text-muted-foreground/50" />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-muted-foreground/10 to-transparent blur-xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-light">Workout not found</h2>
          <p className="text-base font-light text-muted-foreground/80">The workout you're looking for doesn't exist</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button onClick={() => setLocation('/workouts')} className="shadow-premium hover:shadow-premium-lg transition-all duration-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workouts
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-8"
    >
      {/* Header - Premium */}
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: 'Workout Plans', href: '/workouts' },
            { label: workout.title },
          ]}
        />

        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
            <span className="font-light bg-gradient-to-r from-[hsl(var(--color-guru))] to-[hsl(var(--color-disciple))] bg-clip-text text-transparent">
              {workout.title}
            </span>
          </h1>
          <p className="text-base font-light text-muted-foreground/80">{workout.description}</p>
          <div className="flex items-center gap-4 text-sm font-light text-muted-foreground/70">
            <motion.div
              className="flex items-center gap-1.5"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Clock className="h-4 w-4 text-primary" />
              <span>{workout.duration} min</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-1.5"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Target className="h-4 w-4 text-primary" />
              <span className="capitalize">{workout.difficulty}</span>
            </motion.div>
            <Badge variant="outline" className="capitalize border-primary/30 text-primary/90 font-light">
              {workout.category}
            </Badge>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exercise List */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-2xl font-extralight tracking-tight">
              <span className="font-light">Exercises</span>
            </h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  data-testid="button-add-exercise"
                  className="relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Plus className="mr-2 h-4 w-4 relative z-10" />
                  <span className="relative z-10">Add Exercise</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[85vh] glass-strong border-border/50">
                <DialogHeader>
                  <DialogTitle className="font-light text-2xl">Add Exercise to Workout</DialogTitle>
                  <DialogDescription className="font-light text-muted-foreground/70">
                    Search and select an exercise, then configure sets, reps, and rest time.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Exercise Search & Filter */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        value={exerciseSearch}
                        onChange={(e) => setExerciseSearch(e.target.value)}
                        placeholder="Search exercises by name or muscle group..."
                        className="pl-10 glass border-border/50"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={exerciseCategoryFilter === "all" ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setExerciseCategoryFilter("all")}
                      >
                        All
                      </Badge>
                      {exerciseCategories.map((cat: string) => (
                        <Badge
                          key={cat}
                          variant={exerciseCategoryFilter === cat ? "default" : "outline"}
                          className="cursor-pointer text-xs capitalize"
                          onClick={() => setExerciseCategoryFilter(cat)}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Exercise List */}
                  <div className="max-h-[200px] overflow-y-auto space-y-1 rounded-lg border border-border/30 p-2">
                    {filteredExercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground/70 text-center py-4">No exercises found</p>
                    ) : (
                      filteredExercises.map((exercise: any) => (
                        <div
                          key={exercise.id}
                          onClick={() => {
                            setSelectedExercise(exercise.id);
                            setExerciseData(prev => ({
                              ...prev,
                              sets: exercise.defaultSets || 3,
                              reps: exercise.defaultReps || "10-12",
                              restTime: exercise.defaultRestTime || 60,
                            }));
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                            selectedExercise === exercise.id
                              ? 'bg-primary/15 border border-primary/30'
                              : 'hover:bg-primary/5 border border-transparent'
                          }`}
                          data-testid={`exercise-option-${exercise.id}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <TruncatedText as="p" text={exercise.name} className="text-sm font-medium" />
                            <TruncatedText as="p" text={exercise.muscleGroups?.join(', ') || ''} className="text-xs text-muted-foreground/60" />
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px] capitalize">{exercise.difficulty}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Configuration */}
                  {selectedExercise && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 pt-2 border-t border-border/30"
                    >
                      <p className="text-sm font-medium text-primary">
                        Configure: {exercises?.find((e: any) => e.id === selectedExercise)?.name}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-light text-muted-foreground">Sets</label>
                          <Input
                            type="number"
                            value={exerciseData.sets}
                            onChange={(e) => setExerciseData(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                            data-testid="input-sets"
                            className="glass border-border/50 h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-light text-muted-foreground">Reps</label>
                          <Input
                            value={exerciseData.reps}
                            onChange={(e) => setExerciseData(prev => ({ ...prev, reps: e.target.value }))}
                            placeholder="e.g., 10-12"
                            data-testid="input-reps"
                            className="glass border-border/50 h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-light text-muted-foreground">Weight (optional)</label>
                          <Input
                            value={exerciseData.weight}
                            onChange={(e) => setExerciseData(prev => ({ ...prev, weight: e.target.value }))}
                            placeholder="e.g., 135 lbs"
                            data-testid="input-weight"
                            className="glass border-border/50 h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-light text-muted-foreground">Rest (sec)</label>
                          <Input
                            type="number"
                            value={exerciseData.restTime}
                            onChange={(e) => setExerciseData(prev => ({ ...prev, restTime: parseInt(e.target.value) || 0 }))}
                            data-testid="input-rest-time"
                            className="glass border-border/50 h-9"
                          />
                        </div>
                      </div>

                      {/* Group Type Selector */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-light text-muted-foreground">Group Type</label>
                        <div className="flex gap-2">
                          {(["none", "superset", "circuit"] as const).map((type) => (
                            <Badge
                              key={type}
                              variant={groupType === type ? "default" : "outline"}
                              className="cursor-pointer text-xs capitalize"
                              onClick={() => {
                                setGroupType(type);
                                if (type === "none") setActiveGroupId(null);
                              }}
                            >
                              {type === "none" ? "Standalone" : type === "superset" ? "Superset" : "Circuit"}
                            </Badge>
                          ))}
                        </div>
                        {groupType !== "none" && activeGroupId && (
                          <p className="text-[10px] text-primary/70 mt-1">
                            Adding to active {groupType} group
                            <button
                              className="ml-2 text-muted-foreground hover:text-destructive underline"
                              onClick={() => { setActiveGroupId(null); }}
                            >
                              start new group
                            </button>
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <Button
                    onClick={handleAddExercise}
                    disabled={!selectedExercise || addExerciseMutation.isPending}
                    className="w-full relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden group"
                    data-testid="button-confirm-add-exercise"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative z-10">
                      {addExerciseMutation.isPending ? "Adding..." : "Add to Workout"}
                    </span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Exercise Cards */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {workout.exercises?.length === 0 ? (
              <Card className="border-dashed border-border/50 glass-strong">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="w-8 h-8 text-primary" />
                      </div>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-light">No exercises added yet</h3>
                    <p className="text-sm font-light text-muted-foreground/80">
                      Add exercises to build your workout plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              workout.exercises?.map((workoutExercise: any, index: number) => {
                const exercise = exercises?.find((e: any) => e.id === workoutExercise.exerciseId);
                const isGrouped = !!workoutExercise.groupId;
                const isSuperset = workoutExercise.groupType === 'superset';
                const isCircuit = workoutExercise.groupType === 'circuit';
                const nextEx = workout.exercises?.[index + 1];
                const prevEx = workout.exercises?.[index - 1];
                const isGroupStart = isGrouped && (!prevEx || prevEx.groupId !== workoutExercise.groupId);
                const isGroupEnd = isGrouped && (!nextEx || nextEx.groupId !== workoutExercise.groupId);
                return (
                  <motion.div
                    key={workoutExercise.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ y: -4 }}
                    className={isGrouped ? `${!isGroupStart ? '-mt-2' : ''}` : ''}
                  >
                    {/* Group header */}
                    {isGroupStart && (
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className={`h-3.5 w-3.5 ${isSuperset ? 'text-amber-500' : 'text-violet-500'}`} />
                        <span className={`text-xs font-medium uppercase tracking-wider ${isSuperset ? 'text-amber-500' : 'text-violet-500'}`}>
                          {isSuperset ? 'Superset' : 'Circuit'}
                        </span>
                        <div className={`flex-1 h-px ${isSuperset ? 'bg-amber-500/30' : 'bg-violet-500/30'}`} />
                      </div>
                    )}
                    <Card className={`glass-strong hover:shadow-premium-lg transition-all duration-300 group overflow-hidden ${
                      isGrouped
                        ? `${isSuperset ? 'border-l-2 border-l-amber-500/60' : 'border-l-2 border-l-violet-500/60'} border-border/50 ${!isGroupEnd ? 'rounded-b-none border-b-0' : ''} ${!isGroupStart ? 'rounded-t-none' : ''}`
                        : 'border-border/50'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <motion.div
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-light relative overflow-hidden"
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <span className="relative z-10 text-primary font-medium">{index + 1}</span>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                              </motion.div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-light text-lg">{exercise?.name}</h3>
                                  {isGrouped && (
                                    <Badge variant="outline" className={`text-[10px] ${isSuperset ? 'border-amber-500/40 text-amber-500' : 'border-violet-500/40 text-violet-500'}`}>
                                      {isSuperset ? 'SS' : 'CIR'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-light text-muted-foreground/70">{exercise?.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm font-light text-muted-foreground/80">
                              <span className="flex items-center gap-1">
                                <span className="text-primary font-medium">Sets:</span> {workoutExercise.sets}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-primary font-medium">Reps:</span> {workoutExercise.reps}
                              </span>
                              {workoutExercise.weight && (
                                <span className="flex items-center gap-1">
                                  <span className="text-primary font-medium">Weight:</span> {workoutExercise.weight}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <span className="text-primary font-medium">Rest:</span> {workoutExercise.restTime}s
                              </span>
                            </div>

                            {exercise?.youtubeUrl && (
                              <motion.div
                                className="flex items-center gap-2 text-sm"
                                whileHover={{ x: 4 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Play className="h-4 w-4 text-primary" />
                                <a
                                  href={exercise.youtubeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 transition-colors font-light"
                                >
                                  Watch demonstration video
                                </a>
                              </motion.div>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderMutation.mutate({ exerciseId: workoutExercise.exerciseId, direction: 'up' })}
                              disabled={index === 0 || reorderMutation.isPending}
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
                              aria-label="Move exercise up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderMutation.mutate({ exerciseId: workoutExercise.exerciseId, direction: 'down' })}
                              disabled={index === (workout.exercises?.length || 1) - 1 || reorderMutation.isPending}
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-30"
                              aria-label="Move exercise down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExerciseMutation.mutate(workoutExercise.exerciseId)}
                              data-testid={`button-remove-exercise-${workoutExercise.id}`}
                              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                              aria-label="Remove exercise"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>

        {/* Workout Actions Sidebar - Premium */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="glass-strong border-border/50 shadow-premium hover:shadow-premium-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-light text-xl">
                  <Users className="h-5 w-5 text-primary" />
                  Assign to Client
                </CardTitle>
                <CardDescription className="font-light text-muted-foreground/70">
                  Assign this workout to a specific client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select onValueChange={(clientId) => assignWorkoutMutation.mutate(clientId)}>
                  <SelectTrigger data-testid="select-assign-client" className="glass border-border/50">
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card className="glass-strong border-border/50 shadow-premium">
              <CardHeader>
                <CardTitle className="font-light text-xl">Workout Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm font-light">
                  <motion.div
                    className="flex justify-between items-center p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <span className="text-muted-foreground/70">Total Exercises:</span>
                    <span className="font-medium text-primary text-lg">{workout.exercises?.length || 0}</span>
                  </motion.div>
                  <motion.div
                    className="flex justify-between items-center p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <span className="text-muted-foreground/70">Duration:</span>
                    <span className="font-medium text-primary">{workout.duration} minutes</span>
                  </motion.div>
                  <motion.div
                    className="flex justify-between items-center p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <span className="text-muted-foreground/70">Difficulty:</span>
                    <span className="font-medium text-primary capitalize">{workout.difficulty}</span>
                  </motion.div>
                  <motion.div
                    className="flex justify-between items-center p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <span className="text-muted-foreground/70">Category:</span>
                    <span className="font-medium text-primary capitalize">{workout.category}</span>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}