import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Copy, Edit, MoreHorizontal } from "lucide-react"
import { motion } from "framer-motion"
import { memo } from "react"

interface Exercise {
  name: string
  sets: number
  reps: string
  weight?: string
}

interface WorkoutCardProps {
  title: string
  description: string
  duration: number
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  exercises: Exercise[]
  assignedTo: number
  createdDate: string
  category: string
}

const WorkoutCard = memo(function WorkoutCard({
  title,
  description, 
  duration,
  difficulty,
  exercises,
  assignedTo,
  createdDate,
  category
}: WorkoutCardProps) {
  const difficultyColors = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  }

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    hover: {
      y: -4,
      transition: { type: "spring", damping: 25, stiffness: 400 }
    }
  }

  const contentVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", damping: 20, stiffness: 300 }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <Card className="hover-elevate" data-testid={`card-workout-${title.toLowerCase().replace(' ', '-')}`}>
        <CardHeader>
          <motion.div 
            className="flex items-start justify-between"
            variants={contentVariants}
          >
            <div className="space-y-1">
              <CardTitle className="text-lg" data-testid="text-workout-title">
                {title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{category}</Badge>
                <Badge className={difficultyColors[difficulty]}>
                  {difficulty}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" data-testid="button-workout-menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div 
            className="flex items-center gap-4 text-sm text-muted-foreground"
            variants={contentVariants}
          >
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span data-testid="text-workout-duration">{duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span data-testid="text-assigned-count">{assignedTo} clients</span>
            </div>
          </motion.div>

          <motion.div className="space-y-2" variants={contentVariants}>
            <p className="text-sm font-medium">Exercises ({exercises.length})</p>
            <div className="space-y-1">
              {exercises.slice(0, 3).map((exercise, index) => (
                <motion.div 
                  key={index} 
                  className="text-sm bg-muted/50 p-2 rounded"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (index * 0.1), type: "spring", damping: 20, stiffness: 300 }}
                >
                  <div className="font-medium" data-testid={`text-exercise-${index}`}>
                    {exercise.name}
                  </div>
                  <div className="text-muted-foreground">
                    {exercise.sets} sets × {exercise.reps}
                    {exercise.weight && ` @ ${exercise.weight}`}
                  </div>
                </motion.div>
              ))}
              {exercises.length > 3 && (
                <div className="text-sm text-muted-foreground text-center py-1">
                  +{exercises.length - 3} more exercises
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            className="text-xs text-muted-foreground border-t pt-3"
            variants={contentVariants}
          >
            Created {createdDate}
          </motion.div>

          <motion.div className="flex gap-2" variants={contentVariants}>
            <Button variant="outline" size="sm" className="flex-1" data-testid="button-edit-workout">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="flex-1" data-testid="button-copy-workout">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </motion.div>
        </CardContent>
    </Card>
    </motion.div>
  )
})

export default WorkoutCard