import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, BookmarkPlus, Share } from "lucide-react"

interface ExerciseCardProps {
  name: string
  description: string
  category: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  muscleGroups: string[]
  equipment: string[]
  imageUrl?: string
  videoUrl?: string
  instructions: string[]
}

export default function ExerciseCard({
  name,
  description,
  category,
  difficulty,
  muscleGroups,
  equipment,
  imageUrl,
  videoUrl,
  instructions
}: ExerciseCardProps) {
  const difficultyColors = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  }

  return (
    <Card className="hover-elevate overflow-hidden" data-testid={`card-exercise-${name.toLowerCase().replace(' ', '-')}`}>
      {/* Exercise Image */}
      {imageUrl && (
        <div className="relative h-48 bg-muted">
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover"
            data-testid="img-exercise"
          />
          {videoUrl && (
            <Button
              size="icon"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              data-testid="button-play-video"
            >
              <Play className="w-6 h-6" />
            </Button>
          )}
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg" data-testid="text-exercise-name">
              {name}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{category}</Badge>
              <Badge className={difficultyColors[difficulty]}>
                {difficulty}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" data-testid="button-bookmark-exercise">
              <BookmarkPlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-share-exercise">
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Target Muscles</p>
          <div className="flex flex-wrap gap-1">
            {muscleGroups.map((muscle, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {muscle}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Equipment Needed</p>
          <div className="flex flex-wrap gap-1">
            {equipment.map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Instructions</p>
          <div className="text-sm text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
            {instructions.slice(0, 3).map((instruction, index) => (
              <div key={index} className="flex">
                <span className="text-primary font-medium mr-2">{index + 1}.</span>
                <span>{instruction}</span>
              </div>
            ))}
            {instructions.length > 3 && (
              <p className="text-xs text-center text-muted-foreground">
                +{instructions.length - 3} more steps
              </p>
            )}
          </div>
        </div>

        <Button className="w-full" data-testid="button-add-to-workout">
          Add to Workout
        </Button>
      </CardContent>
    </Card>
  )
}