import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Play, BookmarkPlus, Dumbbell, Target, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import LazyImage from "@/components/LazyImage";

// Exercise form schema
const exerciseFormSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  muscleGroups: z.string().min(1, "At least one muscle group is required"),
  equipment: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
});

type ExerciseFormData = z.infer<typeof exerciseFormSchema>;

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  muscleGroups: string[];
  equipment: string[];
  instructions: string[];
  youtubeUrl?: string;
}

const ExercisesPage = memo(() => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  // Fetch exercises
  const { data: exercises = [], isLoading, error } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
    queryFn: async () => {
      const response = await fetch('/api/exercises');
      if (!response.ok) throw new Error('Failed to fetch exercises');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Memoized filter function
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    
    const query = searchQuery.toLowerCase();
    return exercises.filter((exercise) => {
      const matchesSearch = !query || 
                           exercise.name.toLowerCase().includes(query) ||
                           exercise.description.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "all" || exercise.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === "all" || exercise.difficulty === selectedDifficulty;
      const matchesMuscleGroup = selectedMuscleGroup === "all" || 
                                 exercise.muscleGroups.some(mg => mg.toLowerCase() === selectedMuscleGroup.toLowerCase());
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesMuscleGroup;
    });
  }, [exercises, searchQuery, selectedCategory, selectedDifficulty, selectedMuscleGroup]);

  // Memoized categories and muscle groups
  const categories = useMemo(() => 
    Array.from(new Set(exercises.map(e => e.category))), [exercises]);
  const muscleGroups = useMemo(() => 
    Array.from(new Set(exercises.flatMap(e => e.muscleGroups))), [exercises]);

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      difficulty: "beginner",
      muscleGroups: "",
      equipment: "",
      instructions: "",
      youtubeUrl: "",
    },
  });

  // Add exercise mutation
  const addExerciseMutation = useMutation({
    mutationFn: async (data: ExerciseFormData) => {
      const formattedData = {
        ...data,
        muscleGroups: data.muscleGroups.split(',').map(mg => mg.trim()),
        equipment: data.equipment ? data.equipment.split(',').map(eq => eq.trim()) : [],
        instructions: data.instructions.split('\n').map(inst => inst.trim()).filter(inst => inst),
      };
      return apiRequest('POST', '/api/exercises', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Exercise added successfully",
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

  const handleSubmit = (data: ExerciseFormData) => {
    addExerciseMutation.mutate(data);
  };

  const StaggerItem = ({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
    if (prefersReducedMotion) {
      return <div>{children}</div>;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.05,
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        {children}
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight">Exercise Library</h1>
            <p className="text-lg font-light text-muted-foreground">Loading exercises...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-card/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Dumbbell className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Unable to load exercises</h2>
        <p className="text-muted-foreground">Please try again later</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/exercises'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Exercise Library
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Browse and manage your exercise collection
          </p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" data-testid="button-add-exercise">
              <Plus className="mr-2 h-4 w-4" />
              <span className="text-sm">Add Exercise</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Exercise</DialogTitle>
              <DialogDescription>
                Add a new exercise to your library
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exercise Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Barbell Squat" {...field} data-testid="input-exercise-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the exercise" 
                          {...field} 
                          data-testid="input-exercise-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Strength, Cardio" {...field} data-testid="input-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-difficulty">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="muscleGroups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muscle Groups</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Chest, Triceps, Shoulders (comma-separated)" 
                          {...field} 
                          data-testid="input-muscle-groups"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Barbell, Dumbbells (comma-separated)" 
                          {...field} 
                          data-testid="input-equipment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter step-by-step instructions (one per line)" 
                          {...field} 
                          rows={5}
                          data-testid="input-instructions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://www.youtube.com/watch?v=..." 
                          {...field} 
                          data-testid="input-youtube-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addExerciseMutation.isPending} data-testid="button-submit-exercise">
                    {addExerciseMutation.isPending ? "Adding..." : "Add Exercise"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-exercises"
              />
            </div>
            <div className="flex gap-2 flex-wrap lg:flex-nowrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full lg:w-40" data-testid="select-filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-full lg:w-40" data-testid="select-filter-difficulty">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                <SelectTrigger className="w-full lg:w-40" data-testid="select-filter-muscle-group">
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Muscles</SelectItem>
                  {muscleGroups.map(mg => (
                    <SelectItem key={mg} value={mg.toLowerCase()}>{mg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredExercises.length} of {exercises.length} exercises
        </p>
      </div>

      {/* Exercise Grid */}
      {filteredExercises.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Dumbbell className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">No exercises found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== "all" || selectedDifficulty !== "all" || selectedMuscleGroup !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Start by adding your first exercise to the library"}
              </p>
            </div>
            {exercises.length === 0 && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Exercise
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise, index) => (
            <StaggerItem key={exercise.id} index={index}>
              <Card className="hover-elevate h-full" data-testid={`card-exercise-${exercise.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <CardTitle className="text-lg" data-testid={`text-exercise-name-${exercise.id}`}>
                        {exercise.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {exercise.description}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-2" data-testid={`button-bookmark-${exercise.id}`}>
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {exercise.category}
                    </Badge>
                    <Badge 
                      variant={
                        exercise.difficulty === "beginner" ? "secondary" :
                        exercise.difficulty === "intermediate" ? "default" : 
                        "destructive"
                      }
                      className="text-xs"
                    >
                      {exercise.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">Muscle Groups:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {exercise.muscleGroups.map(mg => (
                        <Badge key={mg} variant="secondary" className="text-xs">
                          {mg}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {exercise.equipment && exercise.equipment.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Dumbbell className="h-4 w-4" />
                        <span className="font-medium">Equipment:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {exercise.equipment.map(eq => (
                          <Badge key={eq} variant="outline" className="text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {exercise.youtubeUrl && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(exercise.youtubeUrl, '_blank')}
                      data-testid={`button-watch-video-${exercise.id}`}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Watch Demo
                    </Button>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </div>
      )}
    </div>
  );
});

ExercisesPage.displayName = 'ExercisesPage';

export default ExercisesPage;