import ExerciseCard from '../ExerciseCard'
import squatImage from '@assets/generated_images/Exercise_demonstration_squat_7251d7fb.png'
import pushupImage from '@assets/generated_images/Exercise_demonstration_pushup_b45f3658.png'
import deadliftImage from '@assets/generated_images/Exercise_demonstration_deadlift_3c7319dc.png'

export default function ExerciseCardExample() {
  // todo: remove mock functionality
  const exercises = [
    {
      name: "Barbell Squat",
      description: "A compound exercise targeting the lower body and core",
      category: "Strength",
      difficulty: "Intermediate" as const,
      muscleGroups: ["Quadriceps", "Glutes", "Hamstrings", "Core"],
      equipment: ["Barbell", "Squat Rack"],
      imageUrl: squatImage,
      videoUrl: "#",
      instructions: [
        "Stand with feet shoulder-width apart",
        "Place barbell on upper back",
        "Lower body by bending knees and hips",
        "Keep chest up and back straight",
        "Lower until thighs are parallel to ground",
        "Push through heels to return to starting position"
      ]
    },
    {
      name: "Push-ups",
      description: "Classic bodyweight exercise for upper body strength",
      category: "Bodyweight", 
      difficulty: "Beginner" as const,
      muscleGroups: ["Chest", "Shoulders", "Triceps", "Core"],
      equipment: ["None"],
      imageUrl: pushupImage,
      instructions: [
        "Start in plank position",
        "Lower body until chest nearly touches ground",
        "Push back up to starting position",
        "Keep body in straight line throughout"
      ]
    },
    {
      name: "Deadlift",
      description: "Fundamental compound movement for posterior chain",
      category: "Strength",
      difficulty: "Advanced" as const,
      muscleGroups: ["Hamstrings", "Glutes", "Lower Back", "Traps"],
      equipment: ["Barbell", "Weight Plates"],
      imageUrl: deadliftImage,
      instructions: [
        "Stand with feet hip-width apart",
        "Bend at hips and knees to grip bar",
        "Keep back straight and chest up",
        "Drive through heels to lift bar",
        "Stand tall with shoulders back",
        "Lower bar with control"
      ]
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {exercises.map((exercise, index) => (
        <ExerciseCard key={index} {...exercise} />
      ))}
    </div>
  )
}