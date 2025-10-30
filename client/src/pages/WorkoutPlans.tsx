import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Target, Copy, Download, Edit, MoreVertical, Trash2, BookOpen } from "lucide-react";
import WorkoutFormModal from "../components/WorkoutFormModal";
import SearchInput from "@/components/SearchInput";
import { StaggerItem } from "@/components/AnimationComponents";
import { exportWorkoutsToCSV } from "@/lib/exportUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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

// Memoized WorkoutCard component
const WorkoutCard = memo(({ 
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
    <Card className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border border-border/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm hover:bg-card/80">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-xl font-medium leading-snug group-hover:text-primary transition-colors">
              {workout.title}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {workout.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={workout.difficulty === 'beginner' ? 'secondary' : 
                       workout.difficulty === 'intermediate' ? 'default' : 'destructive'}
              className="capitalize"
            >
              {workout.difficulty}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-menu-workout-${index}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onEdit(workout)}
                  data-testid={`button-edit-${index}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDuplicate(workout.id)}
                  disabled={isPendingDuplicate}
                  data-testid={`button-duplicate-${index}`}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
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
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{workout.duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span className="capitalize">{workout.category}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.location.href = `/workout-builder/${workout.id}`}
            data-testid={`button-view-workout-${workout.id}`}
          >
            Build Workout
          </Button>
        </div>
      </CardContent>
    </Card>
  </StaggerItem>
));
WorkoutCard.displayName = 'WorkoutCard';

const WorkoutPlans = memo(() => {
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch authenticated user
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

  const { data: workouts, isLoading, error } = useQuery({
    queryKey: ['/api/workouts', user?.id],
    queryFn: () => fetch(`/api/workouts/${user?.id}`).then(res => res.json()),
    enabled: !!user?.id // Only fetch when user is available
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

  const handleUseTemplate = useCallback((template: any) => {
    // Create workout from template
    toast({
      title: "Template Selected",
      description: `Creating workout from "${template.title}" template`,
    });
    // In a real app, you would create a workout based on the template
  }, [toast]);

  // Improved loading state with skeletons
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <Skeleton className="h-10 w-full lg:w-80" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="space-y-4">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <h2 className="text-2xl font-semibold">Unable to load workout plans</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </PageTransition>
    );
  }

  // Filter workouts based on search query
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

  return (
    <PageTransition>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight">Workout Plans</h1>
              <p className="text-sm sm:text-base md:text-lg font-light text-muted-foreground">
                Create and manage personalized workout routines
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(!showTemplates)}
                data-testid="button-templates"
                className="w-full sm:w-auto"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm">{showTemplates ? "Hide Templates" : "Use Template"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!workouts?.length}
                data-testid="button-export-workouts"
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm">Export</span>
              </Button>
              <WorkoutFormModal
                mode="create"
                trainerId={user?.id}
                trigger={
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium w-full sm:w-auto" data-testid="button-new-workout">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm">New Workout Plan</span>
                  </Button>
                }
              />
            </div>
          </div>
          <div className="w-full lg:w-80">
            <SearchInput
              placeholder="Search workouts by title, category, difficulty..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            />
          </div>
        </div>

        {/* Templates Section */}
        {showTemplates && templates && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-light">Quick Start Templates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {templates.map((template: any) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-muted/50">
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1">{template.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{template.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">{template.duration} min</Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template)}
                      >
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Workout Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {filteredWorkouts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lg font-light text-muted-foreground">
                {searchQuery ? "No workouts found matching your search" : "No workout plans yet. Create your first workout!"}
              </p>
            </div>
          ) : (
            filteredWorkouts.map((workout: any, index: number) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                index={index}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isPendingDuplicate={duplicateWorkoutMutation.isPending}
                isPendingDelete={deleteWorkoutMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Empty State */}
        {workouts?.length === 0 && (
          <motion.div 
            className="flex flex-col items-center justify-center py-16 space-y-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-medium">No workout plans yet</h3>
              <p className="text-muted-foreground max-w-md">
                Create your first workout plan to start building personalized routines for your clients
              </p>
            </div>
            <WorkoutFormModal
              mode="create"
              trainerId={user?.id}
              trigger={
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workout Plan
                </Button>
              }
            />
          </motion.div>
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