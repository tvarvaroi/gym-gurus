import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Target, Copy, Download, Edit, MoreVertical, Trash2, BookOpen, Play, CheckCircle } from "lucide-react";
import WorkoutFormModal from "../components/WorkoutFormModal";
import SearchInput from "@/components/SearchInput";
import { StaggerItem } from "@/components/AnimationComponents";
import { exportWorkoutsToCSV } from "@/lib/exportUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/UserContext";
import WeeklyWorkoutView from "@/components/WeeklyWorkoutView";

// Memoized PageTransition component
const PageTransition = memo(({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.6
    }}
    style={{ willChange: 'opacity, transform' }}
  >
    {children}
  </motion.div>
));
PageTransition.displayName = 'PageTransition';

// Memoized WorkoutCard component - Trainer version
const TrainerWorkoutCard = memo(({
  workout,
  index,
  onDuplicate,
  onDelete,
  onEdit,
  isPendingDuplicate,
  isPendingDelete
}: {
  workout: any;
  index: number;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (workout: any) => void;
  isPendingDuplicate: boolean;
  isPendingDelete: boolean;
}) => (
  <StaggerItem index={index}>
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="group relative overflow-hidden border border-border/30 bg-background/40 backdrop-blur-xl transition-all duration-500 hover:border-primary/40 hover:shadow-premium-lg hover:shadow-primary/10">
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="relative space-y-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-xl font-extralight tracking-tight leading-snug bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text group-hover:from-primary group-hover:to-primary/70 transition-all duration-300">
                {workout.title}
              </CardTitle>
              <CardDescription className="text-sm font-light leading-relaxed">
                {workout.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={workout.difficulty === 'beginner' ? 'secondary' :
                         workout.difficulty === 'intermediate' ? 'default' : 'destructive'}
                className="capitalize shadow-sm"
              >
                {workout.difficulty}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10" data-testid={`button-menu-workout-${index}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/95 border-border/50">
                  <DropdownMenuItem
                    onClick={() => onEdit(workout)}
                    data-testid={`button-edit-${index}`}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDuplicate(workout.id)}
                    disabled={isPendingDuplicate}
                    data-testid={`button-duplicate-${index}`}
                    className="cursor-pointer"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={() => onDelete(workout.id)}
                    disabled={isPendingDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground/80 font-light">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary/70" />
              <span>{workout.duration} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary/70" />
              <span className="capitalize">{workout.category}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              onClick={() => window.location.href = `/workout-builder/${workout.id}`}
              data-testid={`button-view-workout-${workout.id}`}
            >
              Build Workout
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </StaggerItem>
));
TrainerWorkoutCard.displayName = 'TrainerWorkoutCard';

// Memoized WorkoutCard component - Client version
const ClientWorkoutCard = memo(({
  workout,
  index,
  onStartWorkout
}: {
  workout: any;
  index: number;
  onStartWorkout: (id: string) => void;
}) => {
  const isCompleted = workout.lastCompleted && new Date(workout.lastCompleted).toDateString() === new Date().toDateString();

  return (
    <StaggerItem index={index}>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="group relative overflow-hidden border border-border/30 bg-background/40 backdrop-blur-xl transition-all duration-500 hover:border-cyan-500/40 hover:shadow-premium-lg hover:shadow-cyan-500/10">
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <CardHeader className="relative space-y-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-extralight tracking-tight leading-snug bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text group-hover:from-cyan-500 group-hover:to-cyan-400 transition-all duration-300">
                    {workout.title}
                  </CardTitle>
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </motion.div>
                  )}
                </div>
                <CardDescription className="text-sm font-light leading-relaxed">
                  {workout.description}
                </CardDescription>
              </div>
              <Badge
                variant={workout.difficulty === 'beginner' ? 'secondary' :
                         workout.difficulty === 'intermediate' ? 'default' : 'destructive'}
                className="capitalize shadow-sm"
              >
                {workout.difficulty}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground/80 font-light">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-cyan-500/70" />
                <span>{workout.duration} min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-cyan-500/70" />
                <span className="capitalize">{workout.category}</span>
              </div>
            </div>

            <Button
              className="w-full client-gradient hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl"
              size="sm"
              onClick={() => onStartWorkout(workout.id)}
              data-testid={`button-start-workout-${workout.id}`}
            >
              <Play className="mr-2 h-4 w-4" />
              {isCompleted ? "Workout Again" : "Start Workout"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </StaggerItem>
  );
});
ClientWorkoutCard.displayName = 'ClientWorkoutCard';

const WorkoutPlans = memo(() => {
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const { isTrainer, isClient, user: currentUser } = useUser();

  // Fetch authenticated user (for backward compatibility)
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Fetch client profile for client users (to get actual client ID)
  const { data: clientProfile } = useQuery({
    queryKey: ['/api/client/profile'],
    queryFn: async () => {
      const response = await fetch('/api/client/profile', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch client profile');
      return response.json();
    },
    enabled: isClient && !!user?.id,
  });

  // Fetch workouts - different endpoints for trainers vs clients
  const { data: workouts, isLoading, error } = useQuery({
    queryKey: isClient
      ? [`/api/clients/${clientProfile?.id}/workouts`]
      : ['/api/workouts'],
    queryFn: async () => {
      const endpoint = isClient
        ? `/api/clients/${clientProfile?.id}/workouts`
        : '/api/workouts';
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: isClient ? !!clientProfile?.id : !!user?.id
  });

  // Fetch workout templates
  const { data: templates } = useQuery({
    queryKey: ['/api/workout-templates'],
    queryFn: () => fetch('/api/workout-templates').then(res => res.json()),
    enabled: showTemplates,
  });

  // Duplicate workout mutation
  const duplicateWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const response = await apiRequest('POST', `/api/workouts/${workoutId}/duplicate`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts', user?.id] });
      toast({
        title: "Workout Duplicated",
        description: `Created "${data.title}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate workout",
        variant: "destructive",
      });
    },
  });

  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: (workoutId: string) => 
      apiRequest('DELETE', `/api/workouts/${workoutId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts', user?.id] });
      toast({
        title: "Workout Deleted",
        description: "Workout plan removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete workout",
        variant: "destructive",
      });
    },
  });

  // Memoized handlers with useCallback
  const handleDuplicate = useCallback((workoutId: string) => {
    duplicateWorkoutMutation.mutate(workoutId);
  }, [duplicateWorkoutMutation]);

  const handleDelete = useCallback((workoutId: string) => {
    if (confirm("Are you sure you want to delete this workout?")) {
      deleteWorkoutMutation.mutate(workoutId);
    }
  }, [deleteWorkoutMutation]);

  const handleEdit = useCallback((workout: any) => {
    setEditingWorkout(workout);
    setIsEditModalOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    if (workouts?.length) {
      exportWorkoutsToCSV(workouts);
      toast({
        title: "Workouts Exported",
        description: `Exported ${workouts.length} workout plans to CSV`,
      });
    }
  }, [workouts, toast]);

  // Create workout from template mutation
  const createFromTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const trainerId = user?.id || "demo-trainer-123";
      const response = await apiRequest('POST', '/api/workouts', {
        trainerId,
        title: template.title,
        description: template.description,
        duration: template.duration,
        difficulty: template.difficulty,
        category: template.category,
      });
      return response.json();
    },
    onSuccess: (newWorkout: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts', user?.id] });
      toast({
        title: "Workout Created",
        description: `"${newWorkout.title}" created from template. Add exercises now!`,
      });
      window.location.href = `/workout-builder/${newWorkout.id}`;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create workout from template",
        variant: "destructive",
      });
    },
  });

  const handleUseTemplate = useCallback((template: any) => {
    createFromTemplateMutation.mutate(template);
  }, [createFromTemplateMutation]);

  const handleStartWorkout = useCallback((workoutId: string) => {
    // Navigate to workout logger for clients
    toast({
      title: "Starting Workout",
      description: "Loading your workout...",
    });
    // Navigate to workout builder with client view
    window.location.href = `/workout-builder/${workoutId}`;
  }, [toast]);

  // Filter workouts based on search query - MOVED BEFORE EARLY RETURNS
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return workouts || [];

    const query = searchQuery.toLowerCase();
    return (workouts || []).filter((workout: any) =>
      workout.title?.toLowerCase().includes(query) ||
      workout.description?.toLowerCase().includes(query) ||
      workout.category?.toLowerCase().includes(query) ||
      workout.difficulty?.toLowerCase().includes(query)
    );
  }, [workouts, searchQuery]);

  // Improved loading state with skeletons
  if (userLoading || isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="space-y-3">
              <Skeleton className="h-12 w-72 bg-muted/30" />
              <Skeleton className="h-6 w-96 bg-muted/20" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-36 bg-muted/30" />
              <Skeleton className="h-10 w-28 bg-muted/30" />
              <Skeleton className="h-10 w-44 bg-muted/30" />
            </div>
          </div>
          <Skeleton className="h-10 w-full lg:w-96 bg-muted/30" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border border-border/30 bg-background/40 backdrop-blur-xl overflow-hidden">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <Skeleton className="h-6 w-3/4 bg-muted/40" />
                        <Skeleton className="h-4 w-full bg-muted/30" />
                        <Skeleton className="h-4 w-5/6 bg-muted/30" />
                      </div>
                      <Skeleton className="h-6 w-20 bg-muted/40" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24 bg-muted/30" />
                      <Skeleton className="h-4 w-24 bg-muted/30" />
                    </div>
                    <Skeleton className="h-9 w-full bg-muted/40" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <motion.div
          className="flex flex-col items-center justify-center py-20 space-y-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 backdrop-blur-sm border border-destructive/20 flex items-center justify-center">
              <Target className="w-10 h-10 text-destructive" />
            </div>
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-extralight tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Unable to load workout plans
            </h2>
            <p className="text-muted-foreground/80 font-light">Please try again later</p>
          </div>
        </motion.div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-tight">
                <span className="text-foreground">{isClient ? "My " : "Workout "}</span>
                <span className={isClient ? "text-cyan-500" : "text-[#c9a855]"}>
                  {isClient ? "Workouts" : "Plans"}
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg font-light text-muted-foreground/80 leading-relaxed">
                {isClient
                  ? "Your personalized workout plans from your trainer"
                  : "Create and manage personalized workout routines"
                }
              </p>
            </div>
            {/* Trainer-only actions */}
            {isTrainer && (
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplates(!showTemplates)}
                    data-testid="button-templates"
                    className="w-full sm:w-auto border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 backdrop-blur-sm"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm font-light">{showTemplates ? "Hide Templates" : "Use Template"}</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!workouts?.length}
                    data-testid="button-export-workouts"
                    className="w-full sm:w-auto border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 backdrop-blur-sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm font-light">Export</span>
                  </Button>
                </motion.div>
                <WorkoutFormModal
                  mode="create"
                  trainerId={user?.id || "demo-trainer-123"}
                  trigger={
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 font-light w-full sm:w-auto transition-all duration-300" data-testid="button-create-workout">
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="text-xs sm:text-sm">New Workout Plan</span>
                      </Button>
                    </motion.div>
                  }
                />
              </div>
            )}
          </div>
          <div className="w-full lg:w-96">
            <SearchInput
              placeholder={isClient ? "Search your workouts..." : "Search workouts by title, category, difficulty..."}
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full backdrop-blur-sm"
              focusColor={isClient ? 'cyan' : 'default'}
            />
          </div>
        </div>

        {/* Templates Section */}
        {showTemplates && templates && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl sm:text-3xl font-extralight tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Quick Start Templates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {templates.map((template: any, index: number) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                >
                  <Card className="cursor-pointer overflow-hidden border border-border/30 bg-background/40 backdrop-blur-xl hover:border-primary/40 hover:shadow-premium transition-all duration-500 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardContent className="relative p-5">
                      <h3 className="font-light text-lg mb-2 group-hover:text-primary transition-colors">{template.title}</h3>
                      <p className="text-sm text-muted-foreground/80 font-light mb-4 leading-relaxed">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs font-light">{template.difficulty}</Badge>
                          <Badge variant="outline" className="text-xs font-light">{template.duration} min</Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                          className="hover:bg-primary/90 transition-all duration-300"
                        >
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Client: Weekly Workout View | Trainer: Workout Cards Grid */}
        {isClient ? (
          <WeeklyWorkoutView />
        ) : filteredWorkouts.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 space-y-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          >
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                <Target className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-light tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {searchQuery ? "No matching workouts" : "No workout plans yet"}
              </h3>
              <p className="text-muted-foreground/80 font-light max-w-md leading-relaxed">
                {searchQuery
                  ? "No workouts found matching your search. Try a different term."
                  : "Create your first workout plan to start building personalized routines for your clients"
                }
              </p>
            </div>
            {!searchQuery && (
              <WorkoutFormModal
                mode="create"
                trainerId={user?.id}
                trigger={
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 font-light transition-all duration-300">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Workout Plan
                    </Button>
                  </motion.div>
                }
              />
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredWorkouts.map((workout: any, index: number) => (
              <TrainerWorkoutCard
                key={workout.id}
                workout={workout}
                index={index}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isPendingDuplicate={duplicateWorkoutMutation.isPending}
                isPendingDelete={deleteWorkoutMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingWorkout && (
          <WorkoutFormModal
            mode="edit"
            workout={editingWorkout}
            trainerId={user?.id}
            open={isEditModalOpen}
            onOpenChange={(open) => {
              setIsEditModalOpen(open);
              if (!open) {
                setEditingWorkout(null);
              }
            }}
          />
        )}
      </div>
    </PageTransition>
  );
});

WorkoutPlans.displayName = 'WorkoutPlans';

export default WorkoutPlans;