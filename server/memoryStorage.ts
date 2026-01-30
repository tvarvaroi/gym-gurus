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
    // Initialize with some default exercises
    const defaultExercises: Exercise[] = [
      {
        id: "exercise-1",
        name: "Squat",
        description: "A compound lower body exercise",
        category: "strength",
        difficulty: "beginner",
        muscleGroups: ["quadriceps", "glutes", "hamstrings"],
        equipment: ["barbell", "rack"],
        instructions: [
          "Stand with feet shoulder-width apart",
          "Lower your body by bending knees and hips",
          "Keep chest up and back straight",
          "Push through heels to return to start"
        ],
        youtubeUrl: "https://youtube.com/watch?v=squat",
        exerciseType: "weighted_reps",
        defaultSets: 3,
        defaultReps: "8-10",
        defaultDuration: null,
        defaultRestTime: 90,
        thumbnailUrl: null,
        videoUrls: null,
        alternativeExercises: null,
        createdAt: new Date()
      },
      {
        id: "exercise-2",
        name: "Push-up",
        description: "Upper body pushing exercise",
        category: "strength",
        difficulty: "beginner",
        muscleGroups: ["chest", "triceps", "shoulders"],
        equipment: ["bodyweight"],
        instructions: [
          "Start in plank position",
          "Lower body until chest nearly touches floor",
          "Push back up to starting position"
        ],
        youtubeUrl: null,
        exerciseType: "bodyweight_reps",
        defaultSets: 3,
        defaultReps: "12-15",
        defaultDuration: null,
        defaultRestTime: 60,
        thumbnailUrl: null,
        videoUrls: null,
        alternativeExercises: null,
        createdAt: new Date()
      },
      {
        id: "exercise-3",
        name: "Deadlift",
        description: "Full body compound movement",
        category: "strength",
        difficulty: "intermediate",
        muscleGroups: ["back", "glutes", "hamstrings", "core"],
        equipment: ["barbell"],
        instructions: [
          "Stand with feet hip-width apart",
          "Grip the bar with hands just outside legs",
          "Lift by extending hips and knees",
          "Keep back straight throughout movement"
        ],
        youtubeUrl: null,
        exerciseType: "weighted_reps",
        defaultSets: 3,
        defaultReps: "5-8",
        defaultDuration: null,
        defaultRestTime: 120,
        thumbnailUrl: null,
        videoUrls: null,
        alternativeExercises: null,
        createdAt: new Date()
      }
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