import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, BookmarkPlus, Share } from "lucide-react"
import { motion } from "framer-motion"
import { memo } from "react"

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

const ExerciseCard = memo(function ExerciseCard({
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

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 40, scale: 0.9 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: { type: "spring", damping: 25, stiffness: 400 }
    }
  }

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", damping: 20, stiffness: 300 }
    }
  }

  const imageVariants = {
    initial: { opacity: 0, scale: 1.1 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", damping: 25, stiffness: 200, duration: 0.6 }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <Card className="hover-elevate overflow-hidden" data-testid={`card-exercise-${name.toLowerCase().replace(' ', '-')}`}>
        {/* Exercise Image */}
        {imageUrl && (
          <motion.div 
            className="relative h-48 bg-muted"
            variants={imageVariants}
          >
            <img 
              src={imageUrl} 
              alt={name}
              className="w-full h-full object-cover"
              data-testid="img-exercise"
            />
            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", damping: 20, stiffness: 300 }}
              >
                <Button
                  size="icon"
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  data-testid="button-play-video"
                >
                  <Play className="w-6 h-6" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        <CardHeader>
          <motion.div 
            className="flex items-start justify-between"
            variants={contentVariants}
          >
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
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.div variants={contentVariants}>
            <p className="text-sm font-medium mb-2">Target Muscles</p>
            <div className="flex flex-wrap gap-1">
              {muscleGroups.map((muscle, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (index * 0.1), type: "spring", damping: 20, stiffness: 400 }}
                >
                  <Badge variant="outline" className="text-xs">
                    {muscle}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={contentVariants}>
            <p className="text-sm font-medium mb-2">Equipment Needed</p>
            <div className="flex flex-wrap gap-1">
              {equipment.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + (index * 0.1), type: "spring", damping: 20, stiffness: 400 }}
                >
                  <Badge variant="outline" className="text-xs">
                    {item}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={contentVariants}>
            <p className="text-sm font-medium mb-2">Instructions</p>
            <div className="text-sm text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
              {instructions.slice(0, 3).map((instruction, index) => (
                <motion.div 
                  key={index} 
                  className="flex"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (index * 0.1), type: "spring", damping: 20, stiffness: 300 }}
                >
                  <span className="text-primary font-medium mr-2">{index + 1}.</span>
                  <span>{instruction}</span>
                </motion.div>
              ))}
              {instructions.length > 3 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{instructions.length - 3} more steps
                </p>
              )}
            </div>
          </motion.div>

          <motion.div variants={contentVariants}>
            <Button className="w-full" data-testid="button-add-to-workout">
              Add to Workout
            </Button>
          </motion.div>
        </CardContent>
    </Card>
    </motion.div>
  )
})

export default ExerciseCard