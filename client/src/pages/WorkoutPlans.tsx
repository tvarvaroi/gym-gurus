import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Target, Users } from "lucide-react";
import WorkoutFormModal from "../components/WorkoutFormModal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// Temporary trainer ID for development
const TEMP_TRAINER_ID = "demo-trainer-123";

export default function WorkoutPlans() {
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { data: workouts, isLoading, error } = useQuery({
    queryKey: ['/api/workouts', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/workouts/${TEMP_TRAINER_ID}`).then(res => res.json())
  });

  const PageTransition = ({ children }: { children: React.ReactNode }) => (
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
    >
      {children}
    </motion.div>
  );

  const StaggerItem = ({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
    if (prefersReducedMotion) {
      return <div>{children}</div>;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300,
          delay: index * 0.1
        }}
      >
        {children}
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">Workout Plans</h1>
              <p className="text-lg font-light text-muted-foreground">Loading workout plans...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-card/50 rounded-xl animate-pulse" />
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

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight">Workout Plans</h1>
            <p className="text-lg font-light text-muted-foreground">
              Create and manage personalized workout routines
            </p>
          </div>
          <WorkoutFormModal
            mode="create"
            trainerId={TEMP_TRAINER_ID}
            trigger={
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium" data-testid="button-new-workout">
                <Plus className="mr-2 h-4 w-4" />
                New Workout Plan
              </Button>
            }
          />
        </div>

        {/* Workout Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {workouts?.map((workout: any, index: number) => (
            <StaggerItem key={workout.id} index={index}>
              <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border border-border/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm hover:bg-card/80">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-medium leading-snug group-hover:text-primary transition-colors">
                        {workout.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {workout.description}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={workout.difficulty === 'beginner' ? 'secondary' : 
                               workout.difficulty === 'intermediate' ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {workout.difficulty}
                    </Badge>
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
                    <WorkoutFormModal
                      mode="edit"
                      workout={workout}
                      trainerId={TEMP_TRAINER_ID}
                      trigger={
                        <Button variant="ghost" size="sm" data-testid={`button-edit-workout-${workout.id}`}>
                          Edit
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
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
              trainerId={TEMP_TRAINER_ID}
              trigger={
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workout Plan
                </Button>
              }
            />
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}