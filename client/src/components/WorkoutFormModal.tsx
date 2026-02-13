import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertWorkoutSchema, type InsertWorkout } from "@shared/validators";
import type { Workout } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { z } from "zod";

// Form schema - extend insertWorkoutSchema with frontend validation
const workoutFormSchema = insertWorkoutSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select a difficulty level",
  }),
  category: z.string().min(1, "Category is required"),
});

type WorkoutFormData = z.infer<typeof workoutFormSchema>;

interface WorkoutFormModalProps {
  mode: "create" | "edit";
  workout?: Workout;
  trainerId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function WorkoutFormModal({ mode, workout, trainerId, trigger, open, onOpenChange }: WorkoutFormModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use external state if provided, otherwise use internal state
  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      trainerId: trainerId,
      title: workout?.title || "",
      description: workout?.description || "",
      duration: workout?.duration || 30,
      difficulty: (workout?.difficulty as "beginner" | "intermediate" | "advanced") || "beginner",
      category: workout?.category || "",
    },
  });

  // Create workout mutation
  const createWorkoutMutation = useMutation({
    mutationFn: (data: InsertWorkout) => apiRequest('POST', '/api/workouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts', trainerId] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Workout plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workout plan",
        variant: "destructive",
      });
    },
  });

  // Update workout mutation
  const updateWorkoutMutation = useMutation({
    mutationFn: (data: Partial<InsertWorkout>) => apiRequest('PUT', `/api/workouts/${workout?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts', trainerId] });
      setDialogOpen(false);
      toast({
        title: "Success",
        description: "Workout plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workout plan",
        variant: "destructive",
      });
    },
  });

  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/workouts/${workout?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts', trainerId] });
      setDialogOpen(false);
      toast({
        title: "Success",
        description: "Workout plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workout plan",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkoutFormData) => {
    if (mode === "create") {
      createWorkoutMutation.mutate(data);
    } else {
      // Only send changed fields for update
      const changedData: Partial<InsertWorkout> = {};
      if (data.title !== workout?.title) changedData.title = data.title;
      if (data.description !== workout?.description) changedData.description = data.description;
      if (data.duration !== workout?.duration) changedData.duration = data.duration;
      if (data.difficulty !== workout?.difficulty) changedData.difficulty = data.difficulty;
      if (data.category !== workout?.category) changedData.category = data.category;
      
      updateWorkoutMutation.mutate(changedData);
    }
  };

  const isPending = createWorkoutMutation.isPending || updateWorkoutMutation.isPending;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]" data-testid="workout-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {mode === "create" ? "Create New Workout Plan" : "Edit Workout Plan"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Design a comprehensive workout plan for your clients. Include exercises, duration, and difficulty level." 
              : "Update workout plan details and specifications."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Upper Body Strength" 
                        data-testid="input-workout-title"
                        {...field} 
                      />
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
                        placeholder="Describe the workout plan goals and focus areas"
                        data-testid="input-workout-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="30"
                          data-testid="input-workout-duration"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-workout-difficulty">
                        <FormControl>
                          <SelectTrigger>
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Strength, Cardio, Flexibility"
                        data-testid="input-workout-category"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex justify-between">
              {mode === "edit" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm" data-testid="button-delete-workout">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Workout Plan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this workout plan? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteWorkoutMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <div className="flex gap-2 ml-auto">
                <DialogClose asChild>
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  data-testid="button-submit"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : mode === "create" ? (
                    <Plus className="mr-2 h-4 w-4" />
                  ) : (
                    <Edit className="mr-2 h-4 w-4" />
                  )}
                  {mode === "create" ? "Create Workout" : "Update Workout"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}