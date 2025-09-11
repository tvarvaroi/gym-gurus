import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Copy, Edit, MoreHorizontal } from "lucide-react"

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

export default function WorkoutCard({
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

  return (
    <Card className="hover-elevate" data-testid={`card-workout-${title.toLowerCase().replace(' ', '-')}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span data-testid="text-workout-duration">{duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span data-testid="text-assigned-count">{assignedTo} clients</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Exercises ({exercises.length})</p>
          <div className="space-y-1">
            {exercises.slice(0, 3).map((exercise, index) => (
              <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                <div className="font-medium" data-testid={`text-exercise-${index}`}>
                  {exercise.name}
                </div>
                <div className="text-muted-foreground">
                  {exercise.sets} sets × {exercise.reps}
                  {exercise.weight && ` @ ${exercise.weight}`}
                </div>
              </div>
            ))}
            {exercises.length > 3 && (
              <div className="text-sm text-muted-foreground text-center py-1">
                +{exercises.length - 3} more exercises
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          Created {createdDate}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-edit-workout">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-copy-workout">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}