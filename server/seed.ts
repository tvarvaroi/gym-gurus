import { getDb } from './db';
import {
  users,
  clients,
  exercises,
  workouts,
  workoutExercises,
  workoutAssignments,
  progressEntries,
  trainingSessions,
  messages
} from '../shared/schema';
import { sql } from 'drizzle-orm';
import { startOfWeek, endOfWeek, addWeeks, addDays, format, getISOWeek, getISOWeekYear } from 'date-fns';

/**
 * Seed script to populate the database with realistic fake data
 * Run with: npx tsx server/seed.ts
 */

const TRAINER_ID = 'demo-trainer-123'; // This should match your dev user ID

// Helper to generate random date in past N days
function randomPastDate(daysAgo: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(randomTime);
}

// Helper to generate future date in next N days
function randomFutureDate(daysAhead: number): Date {
  const now = new Date();
  const randomTime = now.getTime() + Math.random() * daysAhead * 24 * 60 * 60 * 1000;
  return new Date(randomTime);
}

async function seed() {
  console.log('🌱 Starting database seed...');

  const db = await getDb();

  try {
    // 0. Create demo trainer user
    console.log('Creating demo trainer user...');
    await db.insert(users).values({
      id: TRAINER_ID,
      email: 'trainer@example.com',
      firstName: 'Demo',
      lastName: 'Trainer',
      role: 'trainer'
    }).onConflictDoNothing();
    console.log('✅ Demo trainer user created/verified');

    // 1. Create Clients with Biometric Data
    console.log('Creating clients...');
    const clientData = [
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0100',
        goal: 'Build muscle and increase strength',
        status: 'active',
        age: 28,
        gender: 'male' as const,
        height: '180',
        weight: '85',
        activityLevel: 'active',
        neckCircumference: '38',
        waistCircumference: '85',
        hipCircumference: null
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        phone: '+1-555-0101',
        goal: 'Weight loss and muscle toning',
        status: 'active',
        age: 32,
        gender: 'female' as const,
        height: '165',
        weight: '72',
        activityLevel: 'moderately_active',
        neckCircumference: '32',
        waistCircumference: '78',
        hipCircumference: '98'
      },
      {
        name: 'Mike Chen',
        email: 'mike.chen@email.com',
        phone: '+1-555-0102',
        goal: 'Build muscle mass',
        status: 'active',
        age: 28,
        gender: 'male' as const,
        height: '178',
        weight: '75',
        activityLevel: 'active',
        neckCircumference: '38',
        waistCircumference: '82',
        hipCircumference: '95'
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.r@email.com',
        phone: '+1-555-0103',
        goal: 'Marathon training',
        status: 'active',
        age: 29,
        gender: 'female' as const,
        height: '168',
        weight: '58',
        activityLevel: 'very_active',
        neckCircumference: '30',
        waistCircumference: '68',
        hipCircumference: '88'
      },
      {
        name: 'James Williams',
        email: 'james.w@email.com',
        phone: '+1-555-0104',
        goal: 'General fitness and flexibility',
        status: 'active',
        age: 45,
        gender: 'male' as const,
        height: '175',
        weight: '82',
        activityLevel: 'lightly_active',
        neckCircumference: '39',
        waistCircumference: '92',
        hipCircumference: '100'
      },
      {
        name: 'Lisa Thompson',
        email: 'lisa.t@email.com',
        phone: '+1-555-0105',
        goal: 'Postpartum fitness recovery',
        status: 'active',
        age: 34,
        gender: 'female' as const,
        height: '162',
        weight: '68',
        activityLevel: 'lightly_active',
        neckCircumference: '31',
        waistCircumference: '75',
        hipCircumference: '95'
      },
      {
        name: 'David Martinez',
        email: 'david.m@email.com',
        phone: '+1-555-0106',
        goal: 'Strength training',
        status: 'active',
        age: 36,
        gender: 'male' as const,
        height: '183',
        weight: '88',
        activityLevel: 'active',
        neckCircumference: '40',
        waistCircumference: '87',
        hipCircumference: '98'
      },
      {
        name: 'Jessica Lee',
        email: 'jessica.lee@email.com',
        phone: '+1-555-0107',
        goal: 'Weight loss - 30 lbs',
        status: 'active',
        age: 38,
        gender: 'female' as const,
        height: '160',
        weight: '85',
        activityLevel: 'moderately_active',
        neckCircumference: '33',
        waistCircumference: '92',
        hipCircumference: '108'
      },
      {
        name: 'Robert Taylor',
        email: 'robert.t@email.com',
        phone: '+1-555-0108',
        goal: 'Improve cardiovascular health',
        status: 'active',
        age: 52,
        gender: 'male' as const,
        height: '172',
        weight: '78',
        activityLevel: 'moderately_active',
        neckCircumference: '37',
        waistCircumference: '88',
        hipCircumference: '96'
      },
      {
        name: 'Amanda White',
        email: 'amanda.w@email.com',
        phone: '+1-555-0109',
        goal: 'Body recomposition',
        status: 'paused',
        age: 27,
        gender: 'female' as const,
        height: '170',
        weight: '65',
        activityLevel: 'active',
        neckCircumference: '31',
        waistCircumference: '70',
        hipCircumference: '92'
      },
      {
        name: 'Chris Anderson',
        email: 'chris.a@email.com',
        phone: '+1-555-0110',
        goal: 'Athletic performance',
        status: 'active',
        age: 24,
        gender: 'male' as const,
        height: '180',
        weight: '79',
        activityLevel: 'very_active',
        neckCircumference: '38',
        waistCircumference: '78',
        hipCircumference: '94'
      },
      {
        name: 'Jennifer Brown',
        email: 'jennifer.b@email.com',
        phone: '+1-555-0111',
        goal: 'Core strength and stability',
        status: 'active',
        age: 41,
        gender: 'female' as const,
        height: '166',
        weight: '62',
        activityLevel: 'moderately_active',
        neckCircumference: '30',
        waistCircumference: '72',
        hipCircumference: '90'
      },
      {
        name: 'Daniel Garcia',
        email: 'daniel.g@email.com',
        phone: '+1-555-0112',
        goal: 'Powerlifting competition prep',
        status: 'active',
        age: 31,
        gender: 'male' as const,
        height: '176',
        weight: '92',
        activityLevel: 'very_active',
        neckCircumference: '42',
        waistCircumference: '90',
        hipCircumference: '102'
      },
    ];

    const createdClients = await db.insert(clients).values(
      clientData.map((client) => ({
        ...client,
        // Use specific ID for John Smith to match the user record
        id: client.email === 'john.smith@example.com' ? 'mock-client-1' : undefined,
        trainerId: TRAINER_ID,
        lastSession: randomPastDate(7),
        nextSession: randomFutureDate(7),
      }))
    ).onConflictDoUpdate({
      target: clients.id,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        goal: sql`excluded.goal`,
        status: sql`excluded.status`,
        age: sql`excluded.age`,
        gender: sql`excluded.gender`,
        height: sql`excluded.height`,
        weight: sql`excluded.weight`,
        activityLevel: sql`excluded.activity_level`,
        neckCircumference: sql`excluded.neck_circumference`,
        waistCircumference: sql`excluded.waist_circumference`,
        hipCircumference: sql`excluded.hip_circumference`,
        lastSession: sql`excluded.last_session`,
        nextSession: sql`excluded.next_session`,
      }
    }).returning();

    console.log(`✅ Created ${createdClients.length} clients`);

    // 2. Create Exercise Library
    console.log('Creating exercise library...');
    const exerciseData = [
      {
        name: 'Barbell Squat',
        description: 'Fundamental lower body compound exercise',
        category: 'strength',
        difficulty: 'intermediate',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'core'],
        equipment: ['barbell', 'squat rack'],
        instructions: [
          'Position barbell across upper back',
          'Feet shoulder-width apart, toes slightly out',
          'Lower hips back and down, keeping chest up',
          'Descend until thighs are parallel to floor',
          'Drive through heels to return to standing'
        ],
        youtubeUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8'
      },
      {
        name: 'Bench Press',
        description: 'Classic upper body pushing exercise',
        category: 'strength',
        difficulty: 'intermediate',
        muscleGroups: ['chest', 'triceps', 'shoulders'],
        equipment: ['barbell', 'bench'],
        instructions: [
          'Lie flat on bench, feet on floor',
          'Grip bar slightly wider than shoulder width',
          'Lower bar to mid-chest with control',
          'Press bar up until arms are extended',
          'Maintain shoulder blade retraction throughout'
        ],
        youtubeUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
      },
      {
        name: 'Deadlift',
        description: 'Total body compound pulling movement',
        category: 'strength',
        difficulty: 'advanced',
        muscleGroups: ['hamstrings', 'glutes', 'lower back', 'traps', 'forearms'],
        equipment: ['barbell'],
        instructions: [
          'Stand with feet hip-width, bar over mid-foot',
          'Hinge at hips, grip bar outside knees',
          'Keep spine neutral, chest up',
          'Drive through floor, extending hips and knees',
          'Stand tall, squeeze glutes at top'
        ],
        youtubeUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q'
      },
      {
        name: 'Pull-ups',
        description: 'Bodyweight back and arm exercise',
        category: 'strength',
        difficulty: 'intermediate',
        muscleGroups: ['lats', 'biceps', 'upper back'],
        equipment: ['pull-up bar'],
        instructions: [
          'Hang from bar with hands shoulder-width',
          'Pull body up until chin clears bar',
          'Lower with control to full extension',
          'Avoid swinging or kipping',
          'Engage core throughout movement'
        ],
        youtubeUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
      },
      {
        name: 'Running (Treadmill)',
        description: 'Cardiovascular endurance exercise',
        category: 'cardio',
        difficulty: 'beginner',
        muscleGroups: ['quadriceps', 'hamstrings', 'calves', 'cardiovascular'],
        equipment: ['treadmill'],
        instructions: [
          'Start with 5-minute warm-up walk',
          'Gradually increase to running pace',
          'Maintain upright posture',
          'Land mid-foot, not on heels',
          'Cool down with 5-minute walk'
        ]
      },
      {
        name: 'Plank',
        description: 'Isometric core stability exercise',
        category: 'strength',
        difficulty: 'beginner',
        muscleGroups: ['core', 'shoulders', 'glutes'],
        equipment: ['bodyweight'],
        instructions: [
          'Start in forearm plank position',
          'Elbows directly under shoulders',
          'Body forms straight line from head to heels',
          'Engage core, squeeze glutes',
          'Hold position for prescribed time'
        ]
      },
      {
        name: 'Dumbbell Shoulder Press',
        description: 'Overhead pressing movement for shoulders',
        category: 'strength',
        difficulty: 'beginner',
        muscleGroups: ['shoulders', 'triceps', 'upper chest'],
        equipment: ['dumbbells'],
        instructions: [
          'Sit with back supported, dumbbells at shoulder height',
          'Press weights overhead until arms extended',
          'Lower with control to starting position',
          'Keep core engaged throughout',
          'Avoid arching lower back'
        ]
      },
      {
        name: 'Romanian Deadlift',
        description: 'Hip hinge movement targeting hamstrings',
        category: 'strength',
        difficulty: 'intermediate',
        muscleGroups: ['hamstrings', 'glutes', 'lower back'],
        equipment: ['barbell', 'dumbbells'],
        instructions: [
          'Stand holding weight with slight knee bend',
          'Hinge at hips, push hips back',
          'Lower weight along legs until stretch in hamstrings',
          'Return to standing by squeezing glutes',
          'Maintain neutral spine throughout'
        ]
      },
      {
        name: 'Burpees',
        description: 'Full body conditioning exercise',
        category: 'cardio',
        difficulty: 'intermediate',
        muscleGroups: ['full body', 'cardiovascular'],
        equipment: ['bodyweight'],
        instructions: [
          'Start standing, drop into squat position',
          'Kick feet back to plank position',
          'Perform push-up (optional)',
          'Jump feet back to squat',
          'Explosively jump up with arms overhead'
        ]
      },
      {
        name: 'Dumbbell Rows',
        description: 'Unilateral back exercise',
        category: 'strength',
        difficulty: 'beginner',
        muscleGroups: ['lats', 'rhomboids', 'biceps'],
        equipment: ['dumbbells', 'bench'],
        instructions: [
          'Place one knee and hand on bench',
          'Hold dumbbell in opposite hand',
          'Pull weight to hip, keeping elbow close',
          'Squeeze shoulder blade at top',
          'Lower with control, repeat'
        ]
      },
      {
        name: 'Lunges',
        description: 'Single-leg lower body exercise',
        category: 'strength',
        difficulty: 'beginner',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        equipment: ['bodyweight', 'dumbbells'],
        instructions: [
          'Step forward with one leg',
          'Lower hips until both knees at 90 degrees',
          'Front knee stays behind toes',
          'Push through front heel to return',
          'Alternate legs or complete all reps one side'
        ]
      },
      {
        name: 'Cycling (Stationary Bike)',
        description: 'Low-impact cardio exercise',
        category: 'cardio',
        difficulty: 'beginner',
        muscleGroups: ['quadriceps', 'hamstrings', 'calves', 'cardiovascular'],
        equipment: ['stationary bike'],
        instructions: [
          'Adjust seat height to slight knee bend at bottom',
          'Start with 5-minute warm-up at low resistance',
          'Increase resistance for working intervals',
          'Maintain 80-100 RPM cadence',
          'Cool down at low resistance'
        ]
      },
    ];

    const createdExercises = await db.insert(exercises).values(exerciseData).returning();
    console.log(`✅ Created ${createdExercises.length} exercises`);

    // 3. Create Workout Templates
    console.log('Creating workout templates...');
    const workoutData = [
      {
        trainerId: TRAINER_ID,
        title: 'Full Body Strength - Beginner',
        description: 'Perfect introduction to strength training with compound movements',
        duration: 45,
        difficulty: 'beginner',
        category: 'strength'
      },
      {
        trainerId: TRAINER_ID,
        title: 'Upper Body Power',
        description: 'Focus on chest, back, and shoulder development',
        duration: 60,
        difficulty: 'intermediate',
        category: 'strength'
      },
      {
        trainerId: TRAINER_ID,
        title: 'Lower Body Blast',
        description: 'Intense leg and glute workout',
        duration: 50,
        difficulty: 'intermediate',
        category: 'strength'
      },
      {
        trainerId: TRAINER_ID,
        title: 'HIIT Cardio Burn',
        description: 'High-intensity interval training for fat loss',
        duration: 30,
        difficulty: 'intermediate',
        category: 'cardio'
      },
      {
        trainerId: TRAINER_ID,
        title: 'Core & Stability',
        description: 'Build a strong, stable core',
        duration: 25,
        difficulty: 'beginner',
        category: 'strength'
      },
      {
        trainerId: TRAINER_ID,
        title: 'Advanced Powerlifting',
        description: 'Heavy compound lifts for strength athletes',
        duration: 75,
        difficulty: 'advanced',
        category: 'strength'
      },
      {
        trainerId: TRAINER_ID,
        title: 'Core & Abs',
        description: 'Targeted core strengthening and stability work',
        duration: 30,
        difficulty: 'intermediate',
        category: 'core'
      },
      {
        trainerId: TRAINER_ID,
        title: 'Active Recovery Yoga',
        description: 'Gentle stretching and mobility work for recovery',
        duration: 45,
        difficulty: 'beginner',
        category: 'flexibility'
      },
    ];

    const createdWorkouts = await db.insert(workouts).values(workoutData).returning();
    console.log(`✅ Created ${createdWorkouts.length} workouts`);

    // 4. Add exercises to workouts
    console.log('Assigning exercises to workouts...');
    const workoutExerciseData = [];

    // Full Body Strength workout
    const fullBodyWorkout = createdWorkouts[0];
    workoutExerciseData.push(
      { workoutId: fullBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Barbell Squat')!.id, sets: 3, reps: '10-12', weight: '95 lbs', restTime: 90, sortOrder: 1 },
      { workoutId: fullBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Bench Press')!.id, sets: 3, reps: '8-10', weight: '65 lbs', restTime: 90, sortOrder: 2 },
      { workoutId: fullBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Dumbbell Rows')!.id, sets: 3, reps: '10-12', weight: '25 lbs', restTime: 60, sortOrder: 3 },
      { workoutId: fullBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Plank')!.id, sets: 3, reps: '30-45 sec', restTime: 45, sortOrder: 4 },
    );

    // Upper Body workout
    const upperBodyWorkout = createdWorkouts[1];
    workoutExerciseData.push(
      { workoutId: upperBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Bench Press')!.id, sets: 4, reps: '6-8', weight: '135 lbs', restTime: 120, sortOrder: 1 },
      { workoutId: upperBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Pull-ups')!.id, sets: 4, reps: '8-10', restTime: 90, sortOrder: 2 },
      { workoutId: upperBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Dumbbell Shoulder Press')!.id, sets: 3, reps: '10-12', weight: '30 lbs', restTime: 75, sortOrder: 3 },
      { workoutId: upperBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Dumbbell Rows')!.id, sets: 3, reps: '12-15', weight: '35 lbs', restTime: 60, sortOrder: 4 },
    );

    // Lower Body workout
    const lowerBodyWorkout = createdWorkouts[2];
    workoutExerciseData.push(
      { workoutId: lowerBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Barbell Squat')!.id, sets: 4, reps: '8-10', weight: '135 lbs', restTime: 120, sortOrder: 1 },
      { workoutId: lowerBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Romanian Deadlift')!.id, sets: 3, reps: '10-12', weight: '95 lbs', restTime: 90, sortOrder: 2 },
      { workoutId: lowerBodyWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Lunges')!.id, sets: 3, reps: '12-15 each leg', weight: '25 lbs', restTime: 60, sortOrder: 3 },
    );

    // HIIT Cardio workout
    const hiitWorkout = createdWorkouts[3];
    workoutExerciseData.push(
      { workoutId: hiitWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Burpees')!.id, sets: 5, reps: '45 sec on, 15 sec rest', restTime: 15, sortOrder: 1 },
      { workoutId: hiitWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Running (Treadmill)')!.id, sets: 5, reps: '2 min sprint, 1 min walk', restTime: 60, sortOrder: 2 },
      { workoutId: hiitWorkout.id, exerciseId: createdExercises.find((e: any) => e.name === 'Cycling (Stationary Bike)')!.id, sets: 4, reps: '90 sec hard, 30 sec easy', restTime: 30, sortOrder: 3 },
    );

    await db.insert(workoutExercises).values(workoutExerciseData);
    console.log(`✅ Assigned exercises to workouts`);

    // 5. Assign workouts to clients
    console.log('Assigning workouts to clients...');
    const assignmentData: any[] = [];

    // Helper: Get date for specific day in specific week
    function getDateForDay(weekOffset: number, dayOfWeek: number): Date {
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const targetWeek = addWeeks(currentWeekStart, weekOffset);
      return addDays(targetWeek, dayOfWeek - 1); // Monday = 1
    }

    // Find John Smith and create comprehensive weekly schedule
    const johnSmith = createdClients.find((c: any) => c.email === 'john.smith@example.com');
    if (johnSmith) {
      console.log('Creating weekly workout schedule for John Smith...');

      // Define 6-week program (2 past, 1 current, 3 future)
      const weeklyProgram = [
        // Week -2 (2 weeks ago - completed)
        { week: -2, workouts: [
          { workoutTitle: 'Full Body Strength - Beginner', day: 1 },  // Monday
          { workoutTitle: 'Upper Body Power', day: 3 },               // Wednesday
          { workoutTitle: 'Lower Body Blast', day: 5 },               // Friday
        ]},

        // Week -1 (last week - completed)
        { week: -1, workouts: [
          { workoutTitle: 'Full Body Strength - Beginner', day: 1 },
          { workoutTitle: 'HIIT Cardio Burn', day: 3 },
          { workoutTitle: 'Upper Body Power', day: 5 },
        ]},

        // Week 0 (current week - in progress)
        { week: 0, workouts: [
          { workoutTitle: 'Full Body Strength - Beginner', day: 1 },
          { workoutTitle: 'Upper Body Power', day: 3 },
          { workoutTitle: 'Lower Body Blast', day: 5 },
          { workoutTitle: 'HIIT Cardio Burn', day: 6 },              // Saturday
        ]},

        // Week +1 (next week)
        { week: 1, workouts: [
          { workoutTitle: 'Full Body Strength - Beginner', day: 1 },
          { workoutTitle: 'Core & Abs', day: 2 },                     // Tuesday
          { workoutTitle: 'Upper Body Power', day: 4 },               // Thursday
          { workoutTitle: 'Lower Body Blast', day: 6 },
        ]},

        // Week +2
        { week: 2, workouts: [
          { workoutTitle: 'Full Body Strength - Beginner', day: 1 },
          { workoutTitle: 'Upper Body Power', day: 3 },
          { workoutTitle: 'HIIT Cardio Burn', day: 5 },
          { workoutTitle: 'Core & Abs', day: 6 },
        ]},

        // Week +3
        { week: 3, workouts: [
          { workoutTitle: 'Lower Body Blast', day: 1 },
          { workoutTitle: 'Upper Body Power', day: 2 },
          { workoutTitle: 'Full Body Strength - Beginner', day: 4 },
          { workoutTitle: 'HIIT Cardio Burn', day: 6 },
          { workoutTitle: 'Active Recovery Yoga', day: 7 },          // Sunday
        ]},
      ];

      // Create assignments for each week
      weeklyProgram.forEach(({ week, workouts }) => {
        workouts.forEach(({ workoutTitle, day }) => {
          const workout = createdWorkouts.find((w: any) => w.title === workoutTitle);
          if (workout) {
            const scheduledDate = getDateForDay(week, day);
            const scheduledDateStr = format(scheduledDate, 'yyyy-MM-dd');

            assignmentData.push({
              workoutId: workout.id,
              clientId: johnSmith.id,
              scheduledDate: scheduledDateStr,
              dayOfWeek: scheduledDate.getDay(),
              weekNumber: getISOWeek(scheduledDate),
              weekYear: getISOWeekYear(scheduledDate),
              assignedAt: new Date(),
              completedAt: week < 0 ? randomPastDate(Math.abs(week * 7) - 2) : null,
              notes: week < 0 ? 'Great work! 💪' : null
            });
          }
        });
      });

      console.log(`✅ Created ${assignmentData.length} weekly assignments for John Smith`);
    }

    // Create simple assignments for other clients (for testing)
    createdClients.slice(1, 5).forEach((client: any, index: number) => {
      const workout = createdWorkouts[index % createdWorkouts.length];
      assignmentData.push({
        workoutId: workout.id,
        clientId: client.id,
        assignedAt: randomPastDate(14),
        completedAt: Math.random() > 0.3 ? randomPastDate(7) : null,
        notes: Math.random() > 0.5 ? 'Great form! Keep it up!' : null
      });
    });

    await db.insert(workoutAssignments).values(assignmentData);
    console.log(`✅ Created ${assignmentData.length} total workout assignments`);

    // 6. Create progress entries for clients
    console.log('Creating progress entries...');
    const progressData = [];

    // Create 30 days of weight tracking for first 5 clients
    for (let i = 0; i < 5; i++) {
      const client = createdClients[i];
      const startWeight = 180 + Math.random() * 40; // 180-220 lbs

      for (let day = 30; day >= 0; day -= 3) {
        const weightLoss = (30 - day) * 0.3; // Losing ~0.3 lbs per 3 days
        progressData.push({
          clientId: client.id,
          type: 'weight',
          value: (startWeight - weightLoss + (Math.random() * 2 - 1)).toFixed(1), // Add some variance
          unit: 'lbs',
          recordedAt: randomPastDate(day),
          notes: day === 30 ? 'Starting weight' : null
        });
      }
    }

    // Add body fat percentage tracking
    for (let i = 0; i < 3; i++) {
      const client = createdClients[i];
      const startBF = 25 + Math.random() * 10;

      for (let week = 12; week >= 0; week -= 4) {
        progressData.push({
          clientId: client.id,
          type: 'body_fat',
          value: (startBF - week * 0.3).toFixed(1),
          unit: '%',
          recordedAt: randomPastDate(week * 7)
        });
      }
    }

    await db.insert(progressEntries).values(progressData);
    console.log(`✅ Created ${progressData.length} progress entries`);

    // 7. Create training sessions
    console.log('Creating training sessions...');
    const sessionData = [];

    // Past sessions (completed)
    for (let i = 0; i < createdClients.length; i++) {
      const client = createdClients[i];
      for (let j = 0; j < 8; j++) {
        sessionData.push({
          trainerId: TRAINER_ID,
          clientId: client.id,
          scheduledAt: randomPastDate(30 - j * 3),
          duration: 60,
          status: 'completed',
          notes: j === 0 ? 'Excellent progress this week!' : null
        });
      }
    }

    // Future sessions (scheduled)
    for (let i = 0; i < createdClients.length; i++) {
      const client = createdClients[i];
      if (client.status === 'active') {
        for (let j = 0; j < 3; j++) {
          sessionData.push({
            trainerId: TRAINER_ID,
            clientId: client.id,
            scheduledAt: randomFutureDate(14),
            duration: 60,
            status: 'scheduled'
          });
        }
      }
    }

    await db.insert(trainingSessions).values(sessionData);
    console.log(`✅ Created ${sessionData.length} training sessions`);

    // 8. Create messages
    console.log('Creating messages...');
    const messageData: any[] = [];

    const trainerMessages = [
      "Great job on today's workout! Your form is improving.",
      "Don't forget to track your meals this week 💪",
      "How are you feeling after yesterday's leg day?",
      "Ready for tomorrow's session? We're going to crush it!",
      "Remember to get at least 8 hours of sleep tonight.",
    ];

    const clientMessages = [
      "Thanks coach! Feeling stronger already 💪",
      "I'm a bit sore but feeling good!",
      "Can we reschedule tomorrow's session?",
      "Just finished the workout you sent me!",
      "Quick question about the meal plan...",
    ];

    createdClients.slice(0, 6).forEach((client: any) => {
      // Add 3-5 messages per client
      const messageCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < messageCount; i++) {
        const isFromTrainer = Math.random() > 0.5;
        messageData.push({
          trainerId: TRAINER_ID,
          clientId: client.id,
          content: isFromTrainer
            ? trainerMessages[Math.floor(Math.random() * trainerMessages.length)]
            : clientMessages[Math.floor(Math.random() * clientMessages.length)],
          isFromTrainer,
          platform: 'app',
          messageType: 'text',
          sentAt: randomPastDate(5),
          readAt: Math.random() > 0.3 ? randomPastDate(4) : null,
          deliveryStatus: 'delivered'
        });
      }
    });

    await db.insert(messages).values(messageData);
    console.log(`✅ Created ${messageData.length} messages`);

    console.log('\n✨ Database seeded successfully!\n');
    console.log('Summary:');
    console.log(`  - ${createdClients.length} clients`);
    console.log(`  - ${createdExercises.length} exercises`);
    console.log(`  - ${createdWorkouts.length} workouts`);
    console.log(`  - ${assignmentData.length} workout assignments`);
    console.log(`  - ${progressData.length} progress entries`);
    console.log(`  - ${sessionData.length} training sessions`);
    console.log(`  - ${messageData.length} messages`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seed().catch(console.error);
