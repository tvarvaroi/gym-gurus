import {
  type User, type UpsertUser,
  type Client, type InsertClient,
  type Exercise, type InsertExercise,
  type Workout, type InsertWorkout,
  type WorkoutExercise, type InsertWorkoutExercise,
  type WorkoutAssignment, type InsertWorkoutAssignment,
  type ProgressEntry, type InsertProgressEntry,
  type TrainingSession, type InsertTrainingSession,
  type Appointment, type InsertAppointment
} from "@shared/schema";
import type { IStorage } from "./storage";
import {
  getMockClients,
  getMockProgress
} from "./mockData";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export class MemoryStorage implements IStorage {
  // In-memory data stores
  private users: Map<string, User> = new Map();
  private clients: Map<string, Client> = new Map();
  private exercises: Map<string, Exercise> = new Map();
  private workouts: Map<string, Workout> = new Map();
  private workoutExercises: Map<string, WorkoutExercise[]> = new Map();
  private workoutAssignments: Map<string, WorkoutAssignment> = new Map();
  private progressEntries: Map<string, ProgressEntry[]> = new Map();
  private trainingSessions: Map<string, TrainingSession> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Comprehensive exercise library - 50+ exercises across all categories
    const defaultExercises: Exercise[] = [
      // === COMPOUND LIFTS ===
      { id: "exercise-1", name: "Barbell Back Squat", description: "The king of lower body exercises. Builds quad, glute, and core strength.", category: "strength", difficulty: "intermediate", muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"], equipment: ["barbell", "rack"], instructions: ["Stand with feet shoulder-width apart under the bar", "Unrack and step back, brace your core", "Lower by bending knees and hips until thighs are parallel", "Drive through heels to return to standing"], youtubeUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8", exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "6-8", defaultDuration: null, defaultRestTime: 120, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-2", name: "Conventional Deadlift", description: "Full posterior chain compound lift. Builds total body strength.", category: "strength", difficulty: "intermediate", muscleGroups: ["back", "glutes", "hamstrings", "core", "forearms"], equipment: ["barbell"], instructions: ["Stand with feet hip-width apart, bar over mid-foot", "Hinge at hips, grip bar just outside legs", "Drive through the floor extending hips and knees together", "Lock out at the top, then reverse the movement"], youtubeUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q", exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "5-6", defaultDuration: null, defaultRestTime: 150, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-3", name: "Barbell Bench Press", description: "Primary chest pressing movement for upper body strength.", category: "strength", difficulty: "intermediate", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["barbell", "bench"], instructions: ["Lie on bench with eyes under the bar", "Grip bar slightly wider than shoulder width", "Unrack and lower bar to mid-chest", "Press bar up until arms are fully extended"], youtubeUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg", exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "6-8", defaultDuration: null, defaultRestTime: 120, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-4", name: "Overhead Press", description: "Standing shoulder press for overhead pressing strength.", category: "strength", difficulty: "intermediate", muscleGroups: ["shoulders", "triceps", "core"], equipment: ["barbell"], instructions: ["Stand with feet shoulder-width apart holding bar at shoulders", "Brace core and press bar overhead", "Lock out arms fully at the top", "Lower bar back to shoulder level with control"], youtubeUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g", exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "6-8", defaultDuration: null, defaultRestTime: 120, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-5", name: "Barbell Row", description: "Horizontal pulling movement for a thick, strong back.", category: "strength", difficulty: "intermediate", muscleGroups: ["back", "biceps", "rear delts"], equipment: ["barbell"], instructions: ["Hinge forward at hips with slight knee bend", "Grip bar slightly wider than shoulder width", "Pull bar to lower chest/upper abdomen", "Lower with control, maintaining back position"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "8-10", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === CHEST ===
      { id: "exercise-6", name: "Incline Dumbbell Press", description: "Targets upper chest for balanced chest development.", category: "strength", difficulty: "beginner", muscleGroups: ["chest", "shoulders", "triceps"], equipment: ["dumbbells", "incline bench"], instructions: ["Set bench to 30-45 degree incline", "Press dumbbells up from chest level", "Lower with control to chest level", "Keep shoulder blades retracted throughout"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-7", name: "Dumbbell Fly", description: "Chest isolation exercise focusing on the stretch and squeeze.", category: "strength", difficulty: "beginner", muscleGroups: ["chest"], equipment: ["dumbbells", "bench"], instructions: ["Lie on bench holding dumbbells above chest", "Lower dumbbells in a wide arc with slight elbow bend", "Feel a deep stretch across the chest", "Squeeze chest to bring dumbbells back together"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-8", name: "Push-up", description: "Classic bodyweight chest exercise. Great for endurance and warmups.", category: "strength", difficulty: "beginner", muscleGroups: ["chest", "triceps", "shoulders", "core"], equipment: ["bodyweight"], instructions: ["Start in plank position with hands shoulder-width apart", "Lower body until chest nearly touches floor", "Push back up to full arm extension", "Keep body in a straight line throughout"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "15-20", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-9", name: "Cable Crossover", description: "Constant-tension chest isolation using cables.", category: "strength", difficulty: "beginner", muscleGroups: ["chest"], equipment: ["cable machine"], instructions: ["Stand between cable stations with high pulleys", "Step forward, arms wide with slight elbow bend", "Bring hands together in front of chest", "Squeeze chest hard at the contracted position"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "12-15", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === BACK ===
      { id: "exercise-10", name: "Pull-up", description: "The ultimate bodyweight back exercise for lat width.", category: "strength", difficulty: "intermediate", muscleGroups: ["back", "biceps", "forearms"], equipment: ["pull-up bar"], instructions: ["Hang from bar with overhand grip slightly wider than shoulders", "Pull up until chin clears the bar", "Lower with control to full arm extension", "Avoid swinging or kipping"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 4, defaultReps: "6-10", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-11", name: "Lat Pulldown", description: "Machine-based lat exercise, great for all levels.", category: "strength", difficulty: "beginner", muscleGroups: ["back", "biceps"], equipment: ["cable machine"], instructions: ["Sit with thighs secured under pads", "Grip bar wider than shoulder width", "Pull bar down to upper chest", "Control the weight back up with a stretch"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-12", name: "Seated Cable Row", description: "Horizontal pulling for back thickness and posture.", category: "strength", difficulty: "beginner", muscleGroups: ["back", "biceps", "rear delts"], equipment: ["cable machine"], instructions: ["Sit on the row machine with feet on platform", "Grip the handle, arms extended", "Pull handle to your abdomen, squeezing shoulder blades", "Return with control, letting lats stretch"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-13", name: "Dumbbell Single-Arm Row", description: "Unilateral back exercise for balanced development.", category: "strength", difficulty: "beginner", muscleGroups: ["back", "biceps"], equipment: ["dumbbell", "bench"], instructions: ["Place one knee and hand on bench for support", "Hold dumbbell in the other hand, arm hanging", "Row dumbbell up to your hip", "Lower with control and repeat"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === SHOULDERS ===
      { id: "exercise-14", name: "Dumbbell Lateral Raise", description: "Isolates the side delts for wider shoulders.", category: "strength", difficulty: "beginner", muscleGroups: ["shoulders"], equipment: ["dumbbells"], instructions: ["Stand with dumbbells at sides", "Raise arms out to the sides until parallel with floor", "Keep a slight bend in elbows throughout", "Lower slowly with control"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "12-15", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-15", name: "Face Pull", description: "Essential for rear delts and shoulder health.", category: "strength", difficulty: "beginner", muscleGroups: ["rear delts", "upper back", "rotator cuff"], equipment: ["cable machine", "rope attachment"], instructions: ["Set cable to face height with rope attachment", "Pull rope towards your face, spreading the rope apart", "Squeeze shoulder blades at the end position", "Return with control"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "15-20", defaultDuration: null, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-16", name: "Arnold Press", description: "Rotational shoulder press hitting all three delt heads.", category: "strength", difficulty: "intermediate", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbells"], instructions: ["Start with dumbbells at shoulder height, palms facing you", "Press up while rotating palms to face forward", "Lock out overhead", "Reverse the motion back to start"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === ARMS ===
      { id: "exercise-17", name: "Barbell Curl", description: "Classic biceps builder for peak arm size.", category: "strength", difficulty: "beginner", muscleGroups: ["biceps"], equipment: ["barbell"], instructions: ["Stand holding barbell with underhand grip", "Curl bar up by flexing at the elbows", "Squeeze biceps at the top", "Lower with control, keeping elbows pinned"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-18", name: "Hammer Curl", description: "Targets the brachialis and forearms for thick arms.", category: "strength", difficulty: "beginner", muscleGroups: ["biceps", "forearms"], equipment: ["dumbbells"], instructions: ["Hold dumbbells at sides with neutral grip (palms facing in)", "Curl both dumbbells up simultaneously", "Keep elbows close to your sides", "Lower with control"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-19", name: "Tricep Pushdown", description: "Cable isolation exercise for tricep development.", category: "strength", difficulty: "beginner", muscleGroups: ["triceps"], equipment: ["cable machine"], instructions: ["Stand facing cable machine with rope or bar attachment", "Press weight down by extending elbows", "Squeeze triceps at full extension", "Return with control, keeping elbows stationary"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-15", defaultDuration: null, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-20", name: "Overhead Tricep Extension", description: "Stretches and builds the long head of the triceps.", category: "strength", difficulty: "beginner", muscleGroups: ["triceps"], equipment: ["dumbbell"], instructions: ["Hold one dumbbell overhead with both hands", "Lower behind your head by bending elbows", "Extend arms back to the top", "Keep upper arms close to your ears"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-21", name: "Dip", description: "Bodyweight exercise for chest, triceps, and shoulders.", category: "strength", difficulty: "intermediate", muscleGroups: ["triceps", "chest", "shoulders"], equipment: ["dip bars"], instructions: ["Support yourself on parallel bars with arms straight", "Lower body by bending elbows to 90 degrees", "Press back up to full extension", "Lean forward slightly for more chest engagement"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === LEGS ===
      { id: "exercise-22", name: "Front Squat", description: "Quad-dominant squat variation with an upright torso.", category: "strength", difficulty: "advanced", muscleGroups: ["quadriceps", "glutes", "core"], equipment: ["barbell", "rack"], instructions: ["Rest barbell on front delts with clean grip or cross-arm grip", "Keep elbows high and torso upright", "Squat down until thighs are below parallel", "Drive up through mid-foot"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "6-8", defaultDuration: null, defaultRestTime: 120, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-23", name: "Romanian Deadlift", description: "Hamstring and glute builder focusing on the hip hinge.", category: "strength", difficulty: "intermediate", muscleGroups: ["hamstrings", "glutes", "lower back"], equipment: ["barbell"], instructions: ["Stand holding barbell at hip level", "Push hips back while lowering bar along legs", "Feel a deep stretch in hamstrings", "Drive hips forward to return to standing"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-24", name: "Bulgarian Split Squat", description: "Single-leg squat for balance and unilateral strength.", category: "strength", difficulty: "intermediate", muscleGroups: ["quadriceps", "glutes", "hamstrings"], equipment: ["dumbbells", "bench"], instructions: ["Stand in a lunge position with rear foot on bench", "Hold dumbbells at sides", "Lower until front thigh is parallel to floor", "Push through front foot to return to standing"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-10", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-25", name: "Leg Press", description: "Machine-based quad and glute exercise with heavy load capacity.", category: "strength", difficulty: "beginner", muscleGroups: ["quadriceps", "glutes", "hamstrings"], equipment: ["leg press machine"], instructions: ["Sit in machine with feet shoulder-width on platform", "Release safety and lower platform toward chest", "Push platform back until legs are nearly straight", "Do not lock knees at the top"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-26", name: "Leg Curl", description: "Isolation exercise for hamstring development.", category: "strength", difficulty: "beginner", muscleGroups: ["hamstrings"], equipment: ["leg curl machine"], instructions: ["Lie face down on the leg curl machine", "Hook ankles under the pad", "Curl weight up by bending knees", "Lower slowly with control"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-27", name: "Leg Extension", description: "Quad isolation exercise for muscle definition.", category: "strength", difficulty: "beginner", muscleGroups: ["quadriceps"], equipment: ["leg extension machine"], instructions: ["Sit in machine with shins behind the pad", "Extend legs until fully straight", "Squeeze quads at the top", "Lower with control"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "12-15", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-28", name: "Calf Raise", description: "Standing calf exercise for lower leg development.", category: "strength", difficulty: "beginner", muscleGroups: ["calves"], equipment: ["calf raise machine"], instructions: ["Stand on platform with balls of feet on edge", "Rise up onto toes as high as possible", "Pause at the top and squeeze", "Lower heels below platform for full stretch"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "12-15", defaultDuration: null, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-29", name: "Walking Lunge", description: "Dynamic leg exercise for strength and coordination.", category: "strength", difficulty: "beginner", muscleGroups: ["quadriceps", "glutes", "hamstrings"], equipment: ["dumbbells"], instructions: ["Hold dumbbells at sides", "Step forward into a lunge position", "Lower back knee toward the floor", "Push off front foot and step forward with other leg"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "12-16", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-30", name: "Hip Thrust", description: "Top glute builder. Essential for posterior chain.", category: "strength", difficulty: "intermediate", muscleGroups: ["glutes", "hamstrings"], equipment: ["barbell", "bench"], instructions: ["Sit on floor with upper back against bench", "Roll barbell over hips", "Drive hips up until body forms a straight line", "Squeeze glutes at the top, then lower with control"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === CORE ===
      { id: "exercise-31", name: "Plank", description: "Isometric core exercise for stability and endurance.", category: "strength", difficulty: "beginner", muscleGroups: ["core", "shoulders"], equipment: ["bodyweight"], instructions: ["Start in push-up position on forearms", "Keep body in a straight line from head to heels", "Engage core and glutes throughout", "Hold for the prescribed duration"], youtubeUrl: null, exerciseType: "timed_hold", defaultSets: 3, defaultReps: "30-60", defaultDuration: 45, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-32", name: "Hanging Leg Raise", description: "Advanced core exercise targeting the lower abs.", category: "strength", difficulty: "intermediate", muscleGroups: ["core", "hip flexors"], equipment: ["pull-up bar"], instructions: ["Hang from a bar with arms extended", "Raise legs until parallel with floor or higher", "Control the descent slowly", "Avoid swinging"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "10-15", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-33", name: "Cable Woodchop", description: "Rotational core exercise for functional strength.", category: "strength", difficulty: "beginner", muscleGroups: ["core", "obliques"], equipment: ["cable machine"], instructions: ["Set cable to high position", "Stand sideways to the machine", "Pull cable diagonally across body from high to low", "Control the return to starting position"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "12-15", defaultDuration: null, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-34", name: "Ab Wheel Rollout", description: "Challenging core exercise for total ab development.", category: "strength", difficulty: "advanced", muscleGroups: ["core", "shoulders"], equipment: ["ab wheel"], instructions: ["Kneel on the floor holding the ab wheel", "Roll forward extending arms and body", "Go as far as you can maintain control", "Pull back to starting position using your core"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-35", name: "Russian Twist", description: "Oblique-focused rotational core exercise.", category: "strength", difficulty: "beginner", muscleGroups: ["core", "obliques"], equipment: ["bodyweight"], instructions: ["Sit with knees bent, lean back slightly", "Hold hands together or hold a weight", "Rotate torso side to side", "Keep feet off the ground for added difficulty"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "20-30", defaultDuration: null, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === CARDIO ===
      { id: "exercise-36", name: "Treadmill Run", description: "Steady-state or interval running for cardiovascular fitness.", category: "cardio", difficulty: "beginner", muscleGroups: ["quadriceps", "hamstrings", "calves", "core"], equipment: ["treadmill"], instructions: ["Set desired speed and incline", "Maintain upright posture while running", "Land mid-foot with each stride", "Keep consistent breathing rhythm"], youtubeUrl: null, exerciseType: "cardio_time", defaultSets: 1, defaultReps: "20-30 min", defaultDuration: 1800, defaultRestTime: 0, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-37", name: "Rowing Machine", description: "Full-body cardio that builds back and leg endurance.", category: "cardio", difficulty: "beginner", muscleGroups: ["back", "legs", "arms", "core"], equipment: ["rowing machine"], instructions: ["Sit with feet strapped in, grab handle", "Push with legs first, then lean back and pull", "Reverse the motion: arms, body, legs", "Maintain a steady rhythm"], youtubeUrl: null, exerciseType: "cardio_time", defaultSets: 1, defaultReps: "15-20 min", defaultDuration: 1200, defaultRestTime: 0, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-38", name: "Jump Rope", description: "High-intensity cardio for coordination and conditioning.", category: "cardio", difficulty: "beginner", muscleGroups: ["calves", "shoulders", "core"], equipment: ["jump rope"], instructions: ["Hold rope handles at hip height", "Jump with both feet, just clearing the rope", "Land softly on balls of feet", "Keep elbows close to body"], youtubeUrl: null, exerciseType: "cardio_time", defaultSets: 3, defaultReps: "2-3 min", defaultDuration: 180, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-39", name: "Battle Ropes", description: "Upper body and conditioning exercise with metabolic demand.", category: "cardio", difficulty: "intermediate", muscleGroups: ["shoulders", "arms", "core"], equipment: ["battle ropes"], instructions: ["Stand with feet shoulder-width apart, slight squat", "Hold one rope end in each hand", "Alternate arms making waves in the ropes", "Maintain high intensity for the prescribed time"], youtubeUrl: null, exerciseType: "cardio_time", defaultSets: 4, defaultReps: "30 sec", defaultDuration: 30, defaultRestTime: 30, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === HIIT / PLYOMETRICS ===
      { id: "exercise-40", name: "Burpee", description: "Full-body explosive exercise for conditioning.", category: "cardio", difficulty: "intermediate", muscleGroups: ["chest", "quadriceps", "shoulders", "core"], equipment: ["bodyweight"], instructions: ["Start standing, drop into a squat position", "Kick feet back into push-up position", "Perform a push-up, then jump feet forward", "Explode upward into a jump with arms overhead"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "10-15", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-41", name: "Box Jump", description: "Plyometric exercise for explosive leg power.", category: "strength", difficulty: "intermediate", muscleGroups: ["quadriceps", "glutes", "calves"], equipment: ["plyo box"], instructions: ["Stand facing a box at knee to hip height", "Swing arms and jump onto the box", "Land softly with both feet, knees bent", "Step down and repeat"], youtubeUrl: null, exerciseType: "plyometric", defaultSets: 4, defaultReps: "8-10", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-42", name: "Mountain Climber", description: "Dynamic core and cardio exercise.", category: "cardio", difficulty: "beginner", muscleGroups: ["core", "shoulders", "hip flexors"], equipment: ["bodyweight"], instructions: ["Start in push-up position", "Drive one knee toward chest", "Quickly switch legs in a running motion", "Keep hips low and core engaged"], youtubeUrl: null, exerciseType: "bodyweight_reps", defaultSets: 3, defaultReps: "20-30", defaultDuration: null, defaultRestTime: 45, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-43", name: "Kettlebell Swing", description: "Explosive hip hinge for power and conditioning.", category: "strength", difficulty: "intermediate", muscleGroups: ["glutes", "hamstrings", "core", "shoulders"], equipment: ["kettlebell"], instructions: ["Stand with feet wider than shoulder width", "Hinge at hips and swing kettlebell between legs", "Drive hips forward explosively to swing bell to chest height", "Let gravity bring it back and repeat"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "15-20", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === FLEXIBILITY / MOBILITY ===
      { id: "exercise-44", name: "World's Greatest Stretch", description: "Dynamic full-body mobility drill.", category: "flexibility", difficulty: "beginner", muscleGroups: ["hip flexors", "hamstrings", "thoracic spine", "shoulders"], equipment: ["bodyweight"], instructions: ["Lunge forward with right foot", "Place left hand on floor, rotate right arm to ceiling", "Hold briefly, then switch sides", "Move fluidly between positions"], youtubeUrl: null, exerciseType: "mobility", defaultSets: 2, defaultReps: "5-6", defaultDuration: null, defaultRestTime: 30, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-45", name: "Cat-Cow Stretch", description: "Spinal mobility exercise for back health.", category: "flexibility", difficulty: "beginner", muscleGroups: ["spine", "core"], equipment: ["bodyweight"], instructions: ["Start on all fours with hands under shoulders", "Arch back up like a cat (exhale)", "Drop belly toward floor and look up like a cow (inhale)", "Flow between positions smoothly"], youtubeUrl: null, exerciseType: "mobility", defaultSets: 2, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 30, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-46", name: "Pigeon Stretch", description: "Deep hip opener targeting the glutes and hip flexors.", category: "flexibility", difficulty: "beginner", muscleGroups: ["glutes", "hip flexors"], equipment: ["bodyweight"], instructions: ["From all fours, bring right knee forward behind right wrist", "Extend left leg straight behind you", "Lower hips toward the floor", "Hold and breathe deeply, then switch sides"], youtubeUrl: null, exerciseType: "timed_hold", defaultSets: 2, defaultReps: "30-60 sec", defaultDuration: 45, defaultRestTime: 15, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-47", name: "Foam Roll - IT Band", description: "Self-myofascial release for the outer thigh.", category: "flexibility", difficulty: "beginner", muscleGroups: ["quadriceps", "IT band"], equipment: ["foam roller"], instructions: ["Lie on side with foam roller under outer thigh", "Roll slowly from hip to just above knee", "Pause on tender spots for 20-30 seconds", "Switch to other leg"], youtubeUrl: null, exerciseType: "mobility", defaultSets: 1, defaultReps: "2 min per side", defaultDuration: 120, defaultRestTime: 0, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      // === FUNCTIONAL / FULL BODY ===
      { id: "exercise-48", name: "Turkish Get-Up", description: "Complex full-body exercise for stability and coordination.", category: "strength", difficulty: "advanced", muscleGroups: ["core", "shoulders", "glutes", "quadriceps"], equipment: ["kettlebell"], instructions: ["Lie on back holding kettlebell with one arm extended", "Follow the step-by-step sequence to stand up", "Keep the bell locked out overhead throughout", "Reverse steps to return to lying position"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "3-5", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-49", name: "Farmer's Walk", description: "Grip, core, and total body conditioning exercise.", category: "strength", difficulty: "beginner", muscleGroups: ["forearms", "core", "traps", "legs"], equipment: ["dumbbells"], instructions: ["Pick up heavy dumbbells or farmer's walk handles", "Stand tall with shoulders back", "Walk forward with controlled steps", "Maintain upright posture throughout"], youtubeUrl: null, exerciseType: "cardio_distance", defaultSets: 3, defaultReps: "40-60m", defaultDuration: 60, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-50", name: "Goblet Squat", description: "Beginner-friendly squat variation with great form cues.", category: "strength", difficulty: "beginner", muscleGroups: ["quadriceps", "glutes", "core"], equipment: ["dumbbell"], instructions: ["Hold a dumbbell vertically at chest level", "Squat down keeping the weight close to chest", "Push knees out and keep torso upright", "Stand back up by driving through heels"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "10-12", defaultDuration: null, defaultRestTime: 60, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-51", name: "Clean and Press", description: "Olympic-style compound movement for power.", category: "strength", difficulty: "advanced", muscleGroups: ["shoulders", "legs", "back", "core"], equipment: ["barbell"], instructions: ["Start with barbell on the floor, deadlift grip", "Pull bar explosively to shoulder height (clean)", "Catch in front rack position", "Press overhead to full lockout"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 4, defaultReps: "5-6", defaultDuration: null, defaultRestTime: 120, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
      { id: "exercise-52", name: "Thruster", description: "Front squat into overhead press for full body conditioning.", category: "strength", difficulty: "intermediate", muscleGroups: ["quadriceps", "shoulders", "core", "glutes"], equipment: ["barbell"], instructions: ["Hold barbell in front rack position", "Perform a front squat", "As you stand up, use momentum to press bar overhead", "Lower bar back to shoulders and repeat"], youtubeUrl: null, exerciseType: "weighted_reps", defaultSets: 3, defaultReps: "8-12", defaultDuration: null, defaultRestTime: 90, thumbnailUrl: null, videoUrls: null, alternativeExercises: null, createdAt: new Date() },
    ];

    defaultExercises.forEach(exercise => {
      this.exercises.set(exercise.id, exercise);
    });

    // Initialize with mock clients for demo-trainer-123
    const mockClients = getMockClients("demo-trainer-123");
    mockClients.forEach(client => {
      this.clients.set(client.id, client);

      // Add mock progress entries for each client
      const progress = getMockProgress(client.id);
      this.progressEntries.set(client.id, progress);
    });
  }

  // Users - Replit Auth operations
  async getUser(id: string): Promise<User | undefined> {
    // Return existing user if found
    const existingUser = this.users.get(id);
    if (existingUser) return existingUser;
    
    // For development mode, return a demo user when requested
    if (id === "demo-trainer-123") {
      const demoUser: User = {
        id: "demo-trainer-123",
        email: "trainer@example.com",
        firstName: "Demo",
        lastName: "Trainer",
        profileImageUrl: null,
        role: "trainer",
        trainerId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      // Store it for consistency
      this.users.set(demoUser.id, demoUser);
      return demoUser;
    }
    
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id || generateId(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: (userData as any).role || "trainer",
      trainerId: (userData as any).trainerId || null,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientsByTrainer(trainerId: string): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(client => client.trainerId === trainerId);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const client: Client = {
      id: generateId(),
      trainerId: insertClient.trainerId,
      name: insertClient.name,
      email: insertClient.email,
      goal: insertClient.goal,
      status: insertClient.status || "active",
      age: insertClient.age || null,
      gender: insertClient.gender || null,
      height: insertClient.height || null,
      weight: insertClient.weight || null,
      activityLevel: insertClient.activityLevel || null,
      neckCircumference: insertClient.neckCircumference || null,
      waistCircumference: insertClient.waistCircumference || null,
      hipCircumference: insertClient.hipCircumference || null,
      createdAt: new Date(),
      lastSession: insertClient.lastSession || null,
      nextSession: insertClient.nextSession || null
    };
    this.clients.set(client.id, client);
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient: Client = {
      ...client,
      ...updates
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<boolean> {
    // Delete client and all associated data
    const existed = this.clients.has(id);
    if (existed) {
      this.clients.delete(id);
      // Clean up related data
      this.progressEntries.delete(id);

      // Delete workout assignments for this client
      for (const [assignmentId, assignment] of Array.from(this.workoutAssignments)) {
        if (assignment.clientId === id) {
          this.workoutAssignments.delete(assignmentId);
        }
      }

      // Delete training sessions for this client
      for (const [sessionId, session] of Array.from(this.trainingSessions)) {
        if (session.clientId === id) {
          this.trainingSessions.delete(sessionId);
        }
      }
    }
    return existed;
  }

  // Exercises
  async getExercise(id: string): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }

  async getAllExercises(): Promise<Exercise[]> {
    return Array.from(this.exercises.values());
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const exercise: Exercise = {
      id: generateId(),
      name: insertExercise.name,
      description: insertExercise.description,
      category: insertExercise.category,
      difficulty: insertExercise.difficulty,
      muscleGroups: insertExercise.muscleGroups,
      equipment: insertExercise.equipment,
      instructions: insertExercise.instructions,
      youtubeUrl: insertExercise.youtubeUrl || null,
      // New exercise type fields
      exerciseType: insertExercise.exerciseType || "weighted_reps",
      defaultSets: insertExercise.defaultSets || null,
      defaultReps: insertExercise.defaultReps || null,
      defaultDuration: insertExercise.defaultDuration || null,
      defaultRestTime: insertExercise.defaultRestTime || null,
      thumbnailUrl: insertExercise.thumbnailUrl || null,
      videoUrls: insertExercise.videoUrls || null,
      alternativeExercises: insertExercise.alternativeExercises || null,
      createdAt: new Date()
    };
    this.exercises.set(exercise.id, exercise);
    return exercise;
  }

  // Workouts
  async getWorkout(id: string): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async getWorkoutsByTrainer(trainerId: string): Promise<Workout[]> {
    return Array.from(this.workouts.values()).filter(workout => workout.trainerId === trainerId);
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const workout: Workout = {
      ...insertWorkout,
      id: generateId(),
      createdAt: new Date()
    };
    this.workouts.set(workout.id, workout);
    return workout;
  }

  async updateWorkout(id: string, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const workout = this.workouts.get(id);
    if (!workout) return undefined;
    
    const updatedWorkout: Workout = {
      ...workout,
      ...updates
    };
    this.workouts.set(id, updatedWorkout);
    return updatedWorkout;
  }

  async deleteWorkout(id: string): Promise<boolean> {
    const existed = this.workouts.has(id);
    if (existed) {
      this.workouts.delete(id);
      // Clean up related data
      this.workoutExercises.delete(id);
      
      // Delete workout assignments for this workout
      for (const [assignmentId, assignment] of Array.from(this.workoutAssignments)) {
        if (assignment.workoutId === id) {
          this.workoutAssignments.delete(assignmentId);
        }
      }
    }
    return existed;
  }

  // Workout Exercises
  async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    return this.workoutExercises.get(workoutId) || [];
  }

  async addExerciseToWorkout(insertWorkoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise> {
    const workoutExercise: WorkoutExercise = {
      id: generateId(),
      workoutId: insertWorkoutExercise.workoutId,
      exerciseId: insertWorkoutExercise.exerciseId,
      sets: insertWorkoutExercise.sets,
      reps: insertWorkoutExercise.reps,
      weight: insertWorkoutExercise.weight || null,
      restTime: insertWorkoutExercise.restTime || null,
      setsConfiguration: (insertWorkoutExercise.setsConfiguration as any) ?? null,
      sortOrder: insertWorkoutExercise.sortOrder
    };

    const exercises = this.workoutExercises.get(insertWorkoutExercise.workoutId) || [];
    exercises.push(workoutExercise);
    this.workoutExercises.set(insertWorkoutExercise.workoutId, exercises);

    return workoutExercise;
  }

  async removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<boolean> {
    const exercises = this.workoutExercises.get(workoutId);
    if (!exercises) return false;
    
    const initialLength = exercises.length;
    const filtered = exercises.filter(we => we.exerciseId !== exerciseId);
    
    if (filtered.length < initialLength) {
      this.workoutExercises.set(workoutId, filtered);
      return true;
    }
    return false;
  }

  // Workout Assignments
  async getClientWorkouts(clientId: string): Promise<WorkoutAssignment[]> {
    return Array.from(this.workoutAssignments.values())
      .filter(assignment => assignment.clientId === clientId)
      .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
  }

  async getClientWorkoutsByWeek(clientId: string, weekStart: string, weekEnd: string): Promise<any[]> {
    // Stub implementation for in-memory storage
    // Returns empty array since this is mainly used for testing
    return [];
  }

  async assignWorkoutToClient(insertAssignment: InsertWorkoutAssignment): Promise<WorkoutAssignment> {
    const assignment: WorkoutAssignment = {
      id: generateId(),
      workoutId: insertAssignment.workoutId,
      clientId: insertAssignment.clientId,
      assignedAt: new Date(),
      completedAt: null,
      notes: insertAssignment.notes ?? null,
      scheduledDate: insertAssignment.scheduledDate ?? null,
      dayOfWeek: insertAssignment.dayOfWeek ?? null,
      weekNumber: insertAssignment.weekNumber ?? null,
      weekYear: insertAssignment.weekYear ?? null,
      scheduledTime: insertAssignment.scheduledTime ?? null,
      timezone: insertAssignment.timezone ?? "UTC",
      durationMinutes: insertAssignment.durationMinutes ?? null,
      isCustomized: insertAssignment.isCustomized ?? false,
      customTitle: insertAssignment.customTitle ?? null,
      customNotes: insertAssignment.customNotes ?? null,
      status: insertAssignment.status ?? "scheduled",
      cancelledAt: null,
      cancellationReason: null,
      notificationsSent: null,
    };
    this.workoutAssignments.set(assignment.id, assignment);
    return assignment;
  }

  async completeWorkoutAssignment(id: string, notes?: string): Promise<WorkoutAssignment | undefined> {
    const assignment = this.workoutAssignments.get(id);
    if (!assignment) return undefined;
    
    assignment.completedAt = new Date();
    if (notes) assignment.notes = notes;
    
    this.workoutAssignments.set(id, assignment);
    return assignment;
  }

  // Progress Entries
  async getClientProgress(clientId: string): Promise<ProgressEntry[]> {
    const entries = this.progressEntries.get(clientId) || [];
    return entries.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async addProgressEntry(insertEntry: InsertProgressEntry): Promise<ProgressEntry> {
    const entry: ProgressEntry = {
      id: generateId(),
      clientId: insertEntry.clientId,
      type: insertEntry.type,
      value: insertEntry.value.toString(),
      unit: insertEntry.unit,
      notes: insertEntry.notes || null,
      recordedAt: new Date()
    };
    
    const entries = this.progressEntries.get(insertEntry.clientId) || [];
    entries.push(entry);
    this.progressEntries.set(insertEntry.clientId, entries);
    
    return entry;
  }

  // Training Sessions
  async getTrainerSessions(trainerId: string): Promise<TrainingSession[]> {
    return Array.from(this.trainingSessions.values())
      .filter(session => session.trainerId === trainerId)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  async getClientSessions(clientId: string): Promise<TrainingSession[]> {
    return Array.from(this.trainingSessions.values())
      .filter(session => session.clientId === clientId)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  async createTrainingSession(insertSession: InsertTrainingSession): Promise<TrainingSession> {
    const session: TrainingSession = {
      id: generateId(),
      trainerId: insertSession.trainerId,
      clientId: insertSession.clientId,
      scheduledAt: insertSession.scheduledAt,
      duration: insertSession.duration,
      status: insertSession.status || "scheduled",
      notes: insertSession.notes || null,
      createdAt: new Date()
    };
    this.trainingSessions.set(session.id, session);
    return session;
  }

  async updateTrainingSession(id: string, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const session = this.trainingSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: TrainingSession = {
      ...session,
      ...updates
    };
    this.trainingSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Enhanced Features
  async duplicateWorkout(workoutId: string, trainerId: string): Promise<Workout> {
    const original = this.workouts.get(workoutId);
    if (!original) {
      throw new Error('Workout not found');
    }

    const duplicatedWorkout: Workout = {
      ...original,
      id: generateId(),
      trainerId,
      title: `${original.title} (Copy)`,
      createdAt: new Date()
    };
    this.workouts.set(duplicatedWorkout.id, duplicatedWorkout);

    // Copy all workout exercises
    const exercises = this.workoutExercises.get(workoutId) || [];
    const duplicatedExercises = exercises.map(exercise => ({
      ...exercise,
      id: generateId(),
      workoutId: duplicatedWorkout.id
    }));
    this.workoutExercises.set(duplicatedWorkout.id, duplicatedExercises);

    return duplicatedWorkout;
  }

  async getWorkoutTemplates(): Promise<any[]> {
    // Return predefined workout templates
    return [
      {
        id: 'template-1',
        title: 'Full Body Strength',
        description: 'Complete full body workout targeting all major muscle groups',
        category: 'strength',
        difficulty: 'intermediate',
        duration: 45,
        isTemplate: true,
      },
      {
        id: 'template-2',
        title: 'HIIT Cardio Blast',
        description: 'High-intensity interval training for maximum calorie burn',
        category: 'cardio',
        difficulty: 'advanced',
        duration: 30,
        isTemplate: true,
      },
      {
        id: 'template-3',
        title: 'Beginner Basics',
        description: 'Foundation workout for fitness beginners',
        category: 'general',
        difficulty: 'beginner',
        duration: 30,
        isTemplate: true,
      },
      {
        id: 'template-4',
        title: 'Core & Abs Focus',
        description: 'Targeted workout for core strength and stability',
        category: 'core',
        difficulty: 'intermediate',
        duration: 20,
        isTemplate: true,
      },
      {
        id: 'template-5',
        title: 'Upper Body Power',
        description: 'Build strength in chest, back, shoulders, and arms',
        category: 'strength',
        difficulty: 'intermediate',
        duration: 40,
        isTemplate: true,
      },
      {
        id: 'template-6',
        title: 'Leg Day Essentials',
        description: 'Complete lower body workout for strength and endurance',
        category: 'strength',
        difficulty: 'intermediate',
        duration: 45,
        isTemplate: true,
      },
      {
        id: 'template-7',
        title: 'Yoga Flow',
        description: 'Flexibility and mindfulness practice',
        category: 'flexibility',
        difficulty: 'beginner',
        duration: 60,
        isTemplate: true,
      },
      {
        id: 'template-8',
        title: 'Athletic Performance',
        description: 'Sports-specific training for peak performance',
        category: 'sports',
        difficulty: 'advanced',
        duration: 60,
        isTemplate: true,
      },
    ];
  }

  async getDashboardStats(trainerId: string): Promise<any> {
    const allClients = await this.getClientsByTrainer(trainerId);
    const activeClients = allClients.filter(c => c.status === 'active');
    const pausedClients = allClients.filter(c => c.status === 'paused');
    
    const allWorkouts = await this.getWorkoutsByTrainer(trainerId);
    const sessions = await this.getTrainerSessions(trainerId);
    
    const upcomingSessions = sessions.filter(s => 
      new Date(s.scheduledAt) > new Date() && s.status === 'scheduled'
    );
    
    const completedThisWeek = sessions.filter(s => {
      const sessionDate = new Date(s.scheduledAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate > weekAgo && s.status === 'completed';
    });

    // Calculate client growth
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClientsThisMonth = allClients.filter(c =>
      new Date(c.createdAt) > thirtyDaysAgo
    ).length;

    // Build recent activity list
    const recentActivity: Array<{type: string, description: string, time: Date}> = [];

    // Add upcoming sessions to activity
    upcomingSessions.slice(0, 3).forEach(s => {
      recentActivity.push({
        type: 'session',
        description: `Upcoming session scheduled`,
        time: s.scheduledAt,
      });
    });

    // Sort and limit recent activity
    recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const finalRecentActivity = recentActivity.slice(0, 5);

    return {
      totalClients: allClients.length,
      activeClients: activeClients.length,
      pausedClients: pausedClients.length,
      inactiveClients: allClients.length - activeClients.length - pausedClients.length,
      totalWorkouts: allWorkouts.length,
      upcomingSessions: upcomingSessions.length,
      completedSessionsThisWeek: completedThisWeek.length,
      newClientsThisMonth,
      recentActivity: finalRecentActivity,
    };
  }

  async getClientNotes(clientId: string): Promise<any[]> {
    const client = this.clients.get(clientId);
    if (!client) return [];
    
    return [
      {
        id: '1',
        content: client.goal,
        category: 'goal',
        createdAt: client.createdAt,
      },
    ];
  }

  async addClientNote(clientId: string, trainerId: string, content: string, category: string): Promise<any> {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found');

    // Update client goal with the new note
    client.goal = `${client.goal}\n\n[${category.toUpperCase()}]: ${content}`;
    this.clients.set(clientId, client);

    return {
      id: Date.now().toString(),
      clientId,
      content,
      category,
      createdAt: new Date(),
    };
  }

  async getUserOnboardingProgress(userId: string): Promise<any> {
    // Memory storage doesn't persist onboarding progress
    return undefined;
  }

  async updateUserOnboardingProgress(userId: string, updates: any): Promise<any> {
    // Memory storage doesn't persist onboarding progress
    // Return a mock response
    return {
      userId,
      welcomeModalCompleted: false,
      selectedGoal: null,
      addedFirstClient: false,
      createdFirstWorkout: false,
      assignedFirstWorkout: false,
      scheduledFirstSession: false,
      loggedFirstProgress: false,
      completedProductTour: false,
      dismissedFeaturePrompts: [],
      onboardingCompletedAt: null,
      ...updates,
    };
  }

  // Appointments (stub implementations for memory storage)
  async getAppointmentsByTrainer(trainerId: string): Promise<Appointment[]> {
    // Memory storage doesn't persist appointments - return empty array
    return [];
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    // Memory storage doesn't persist appointments - return empty array
    return [];
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    // Memory storage doesn't persist appointments - return mock
    return {
      ...appointment,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Appointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    // Memory storage doesn't persist appointments
    return undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    // Memory storage doesn't persist appointments
    return false;
  }
}