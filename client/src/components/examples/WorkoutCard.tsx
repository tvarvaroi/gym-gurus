import WorkoutCard from '../WorkoutCard'

export default function WorkoutCardExample() {
  // todo: remove mock functionality
  const sampleWorkouts = [
    {
      title: "Upper Body Strength",
      description: "Focus on building upper body muscle and strength",
      duration: 45,
      difficulty: "Intermediate" as const,
      exercises: [
        { name: "Bench Press", sets: 4, reps: "8-10", weight: "135 lbs" },
        { name: "Pull-ups", sets: 3, reps: "6-8" },
        { name: "Overhead Press", sets: 3, reps: "10-12", weight: "95 lbs" },
        { name: "Barbell Rows", sets: 3, reps: "8-10", weight: "115 lbs" },
        { name: "Dips", sets: 2, reps: "12-15" }
      ],
      assignedTo: 8,
      createdDate: "3 days ago",
      category: "Strength"
    },
    {
      title: "Cardio Blast",
      description: "High-intensity interval training for fat burning",
      duration: 30,
      difficulty: "Advanced" as const,
      exercises: [
        { name: "Burpees", sets: 4, reps: "45 sec" },
        { name: "Mountain Climbers", sets: 4, reps: "30 sec" },
        { name: "Jump Squats", sets: 4, reps: "20 reps" },
        { name: "High Knees", sets: 4, reps: "30 sec" }
      ],
      assignedTo: 12,
      createdDate: "1 week ago",
      category: "Cardio"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {sampleWorkouts.map((workout, index) => (
        <WorkoutCard key={index} {...workout} />
      ))}
    </div>
  )
}