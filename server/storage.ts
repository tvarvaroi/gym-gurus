import {
  users, clients, exercises, workouts, workoutExercises, workoutAssignments,
  progressEntries, trainingSessions,
  userOnboardingProgress, appointments,
  type User, type InsertUser, type UpsertUser,
  type Client, type InsertClient,
  type Exercise, type InsertExercise,
  type Workout, type InsertWorkout,
  type WorkoutExercise, type InsertWorkoutExercise,
  type WorkoutAssignment, type InsertWorkoutAssignment,
  type ProgressEntry, type InsertProgressEntry,
  type TrainingSession, type InsertTrainingSession,
  type UserOnboardingProgress, type InsertUserOnboardingProgress,
  type Appointment, type InsertAppointment
} from "@shared/schema";
import { getDb } from "./db";
import { eq, desc, and, gte, lte, sql, isNotNull } from "drizzle-orm";
import { MemoryStorage } from "./memoryStorage";

/**
 * Storage interface for database operations
 * Provides abstraction over database implementation with fallback to memory storage
 */
export interface IStorage {
  // Users - Replit Auth operations (IMPORTANT: mandatory for Replit Auth)

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object or undefined if not found
   */
  getUser(id: string): Promise<User | undefined>;

  /**
   * Create or update user (used by Replit Auth)
   * @param user - User data to upsert
   * @returns Created or updated user
   */
  upsertUser(user: UpsertUser): Promise<User>;

  // Clients

  /**
   * Get client by ID
   * @param id - Client ID
   * @returns Client object or undefined if not found
   */
  getClient(id: string): Promise<Client | undefined>;

  /**
   * Get all clients for a specific trainer
   * @param trainerId - Trainer (user) ID
   * @returns Array of clients
   */
  getClientsByTrainer(trainerId: string): Promise<Client[]>;

  /**
   * Create a new client
   * @param client - Client data
   * @returns Created client
   */
  createClient(client: InsertClient): Promise<Client>;

  /**
   * Update existing client
   * @param id - Client ID
   * @param updates - Partial client data to update
   * @returns Updated client or undefined if not found
   */
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined>;

  /**
   * Delete a client
   * @param id - Client ID
   * @returns True if deleted, false if not found
   */
  deleteClient(id: string): Promise<boolean>;

  // Exercises
  getExercise(id: string): Promise<Exercise | undefined>;
  getAllExercises(): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;

  // Workouts
  getWorkout(id: string): Promise<Workout | undefined>;
  getWorkoutsByTrainer(trainerId: string): Promise<Workout[]>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: string, updates: Partial<InsertWorkout>): Promise<Workout | undefined>;
  deleteWorkout(id: string): Promise<boolean>;

  // Workout Exercises
  getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]>;
  addExerciseToWorkout(workoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise>;
  removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<boolean>;

  // Workout Assignments
  getClientWorkouts(clientId: string): Promise<WorkoutAssignment[]>;
  getClientWorkoutsByWeek(clientId: string, weekStart: string, weekEnd: string): Promise<any[]>;
  getTrainerWorkoutAssignments(trainerId: string): Promise<any[]>; // Get all workout assignments for trainer's clients
  assignWorkoutToClient(assignment: InsertWorkoutAssignment): Promise<WorkoutAssignment>;
  completeWorkoutAssignment(id: string, notes?: string): Promise<WorkoutAssignment | undefined>;

  // Progress Entries
  getClientProgress(clientId: string): Promise<ProgressEntry[]>;
  addProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;

  // Training Sessions
  getTrainerSessions(trainerId: string): Promise<TrainingSession[]>;
  getClientSessions(clientId: string): Promise<TrainingSession[]>;
  createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession>;
  updateTrainingSession(id: string, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined>;

  // Appointments
  getAppointmentsByTrainer(trainerId: string): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Enhanced Features
  duplicateWorkout(workoutId: string, trainerId: string): Promise<Workout>;
  getWorkoutTemplates(): Promise<any[]>;
  getDashboardStats(trainerId: string): Promise<any>;
  getClientNotes(clientId: string): Promise<any[]>;
  addClientNote(clientId: string, trainerId: string, content: string, category: string): Promise<any>;

  // User Onboarding Progress
  getUserOnboardingProgress(userId: string): Promise<UserOnboardingProgress | undefined>;
  updateUserOnboardingProgress(userId: string, updates: Partial<InsertUserOnboardingProgress>): Promise<UserOnboardingProgress>;
}

export class DatabaseStorage implements IStorage {
  // Users - Replit Auth operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const db = await getDb();
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const db = await getDb();
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientsByTrainer(trainerId: string): Promise<Client[]> {
    const db = await getDb();
    return await db.select().from(clients).where(eq(clients.trainerId, trainerId));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const db = await getDb();
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const db = await getDb();
    const [client] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return client || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Exercises
  async getExercise(id: string): Promise<Exercise | undefined> {
    const db = await getDb();
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise || undefined;
  }

  async getAllExercises(): Promise<Exercise[]> {
    const db = await getDb();
    return await db.select().from(exercises);
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const db = await getDb();
    const [exercise] = await db.insert(exercises).values(insertExercise).returning();
    return exercise;
  }

  // Workouts
  async getWorkout(id: string): Promise<Workout | undefined> {
    const db = await getDb();
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout || undefined;
  }

  async getWorkoutsByTrainer(trainerId: string): Promise<Workout[]> {
    const db = await getDb();
    return await db.select().from(workouts).where(eq(workouts.trainerId, trainerId));
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const db = await getDb();
    const [workout] = await db.insert(workouts).values(insertWorkout).returning();
    return workout;
  }

  async updateWorkout(id: string, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const db = await getDb();
    const [workout] = await db.update(workouts).set(updates).where(eq(workouts.id, id)).returning();
    return workout || undefined;
  }

  async deleteWorkout(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(workouts).where(eq(workouts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Workout Exercises
  async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    const db = await getDb();
    return await db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, workoutId));
  }

  async addExerciseToWorkout(insertWorkoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise> {
    const db = await getDb();
    const [workoutExercise] = await db.insert(workoutExercises).values(insertWorkoutExercise).returning();
    return workoutExercise;
  }

  async removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(workoutExercises)
      .where(and(eq(workoutExercises.workoutId, workoutId), eq(workoutExercises.exerciseId, exerciseId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Workout Assignments
  async getClientWorkouts(clientId: string): Promise<WorkoutAssignment[]> {
    const db = await getDb();
    const results = await db.select({
      id: workoutAssignments.id,
      workoutId: workoutAssignments.workoutId,
      clientId: workoutAssignments.clientId,
      assignedAt: workoutAssignments.assignedAt,
      completedAt: workoutAssignments.completedAt,
      notes: workoutAssignments.notes,
      // Scheduling fields
      scheduledDate: workoutAssignments.scheduledDate,
      scheduledTime: workoutAssignments.scheduledTime,
      timezone: workoutAssignments.timezone,
      dayOfWeek: workoutAssignments.dayOfWeek,
      weekNumber: workoutAssignments.weekNumber,
      weekYear: workoutAssignments.weekYear,
      durationMinutes: workoutAssignments.durationMinutes,
      // Customization fields
      isCustomized: workoutAssignments.isCustomized,
      customTitle: workoutAssignments.customTitle,
      customNotes: workoutAssignments.customNotes,
      // Status tracking
      status: workoutAssignments.status,
      cancelledAt: workoutAssignments.cancelledAt,
      cancellationReason: workoutAssignments.cancellationReason,
      notificationsSent: workoutAssignments.notificationsSent,
      workout: {
        id: workouts.id,
        title: workouts.title,
        description: workouts.description,
        duration: workouts.duration,
        difficulty: workouts.difficulty,
        category: workouts.category,
      }
    })
      .from(workoutAssignments)
      .leftJoin(workouts, eq(workoutAssignments.workoutId, workouts.id))
      .where(eq(workoutAssignments.clientId, clientId))
      .orderBy(desc(workoutAssignments.assignedAt));

    // Flatten workout data to top level for easier frontend consumption
    return results.map(result => ({
      id: result.id,
      workoutId: result.workoutId,
      clientId: result.clientId,
      assignedAt: result.assignedAt,
      completedAt: result.completedAt,
      notes: result.notes,
      // Scheduling fields
      scheduledDate: result.scheduledDate,
      scheduledTime: result.scheduledTime,
      timezone: result.timezone,
      dayOfWeek: result.dayOfWeek,
      weekNumber: result.weekNumber,
      weekYear: result.weekYear,
      durationMinutes: result.durationMinutes,
      // Customization fields
      isCustomized: result.isCustomized,
      customTitle: result.customTitle,
      customNotes: result.customNotes,
      // Status tracking
      status: result.status,
      cancelledAt: result.cancelledAt,
      cancellationReason: result.cancellationReason,
      notificationsSent: result.notificationsSent,
      // Flatten workout properties to top level
      title: result.customTitle || result.workout?.title || '',
      description: result.workout?.description || '',
      duration: result.durationMinutes || result.workout?.duration || 0,
      difficulty: result.workout?.difficulty || 'beginner',
      category: result.workout?.category || '',
    })) as any;
  }

  async getClientWorkoutsByWeek(
    clientId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<any[]> {
    const db = await getDb();

    console.log(`[Storage] getClientWorkoutsByWeek query params:`, { clientId, weekStart, weekEnd });

    // Fetch workout assignments for the specified week with workout details
    const assignmentResults = await db.select({
      id: workoutAssignments.id,
      workoutId: workoutAssignments.workoutId,
      clientId: workoutAssignments.clientId,
      assignedAt: workoutAssignments.assignedAt,
      completedAt: workoutAssignments.completedAt,
      notes: workoutAssignments.notes,
      scheduledDate: workoutAssignments.scheduledDate,
      scheduledTime: workoutAssignments.scheduledTime,
      timezone: workoutAssignments.timezone,
      dayOfWeek: workoutAssignments.dayOfWeek,
      weekNumber: workoutAssignments.weekNumber,
      weekYear: workoutAssignments.weekYear,
      durationMinutes: workoutAssignments.durationMinutes,
      isCustomized: workoutAssignments.isCustomized,
      customTitle: workoutAssignments.customTitle,
      customNotes: workoutAssignments.customNotes,
      status: workoutAssignments.status,
      cancelledAt: workoutAssignments.cancelledAt,
      cancellationReason: workoutAssignments.cancellationReason,
      workout: {
        id: workouts.id,
        title: workouts.title,
        description: workouts.description,
        duration: workouts.duration,
        difficulty: workouts.difficulty,
        category: workouts.category,
      }
    })
      .from(workoutAssignments)
      .leftJoin(workouts, eq(workoutAssignments.workoutId, workouts.id))
      .where(
        and(
          eq(workoutAssignments.clientId, clientId),
          isNotNull(workoutAssignments.scheduledDate),
          gte(workoutAssignments.scheduledDate, weekStart),
          lte(workoutAssignments.scheduledDate, weekEnd)
        )
      )
      .orderBy(workoutAssignments.scheduledDate);

    console.log(`[Storage] Assignment results count: ${assignmentResults.length}`);

    // Fetch all appointments for this client in the week range
    const appointmentsInWeek = await db.select()
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          gte(appointments.date, weekStart),
          lte(appointments.date, weekEnd)
        )
      );

    // Create a map of date -> appointment data
    const appointmentsByDate = new Map<string, typeof appointmentsInWeek[0]>();
    appointmentsInWeek.forEach((apt: any) => {
      if (apt.date) {
        appointmentsByDate.set(apt.date, apt);
      }
    });

    // Track which dates have workout assignments
    const datesWithWorkouts = new Set<string>();
    assignmentResults.forEach((assignment: any) => {
      if (assignment.scheduledDate) {
        datesWithWorkouts.add(assignment.scheduledDate);
      }
    });

    // For each workout assignment, fetch its exercises
    const workoutsWithExercises = await Promise.all(
      assignmentResults.map(async (assignment: any) => {
        if (!assignment.workoutId) {
          // Get appointment for this date if available
          const appointment = assignment.scheduledDate
            ? appointmentsByDate.get(assignment.scheduledDate)
            : undefined;

          return {
            ...assignment,
            scheduledStartTime: appointment?.startTime || null,
            scheduledEndTime: appointment?.endTime || null,
            title: assignment.workout?.title || '',
            description: assignment.workout?.description || '',
            duration: assignment.workout?.duration || 0,
            difficulty: assignment.workout?.difficulty || 'beginner',
            category: assignment.workout?.category || '',
            exercises: []
          };
        }

        // Fetch exercises for this workout
        const exerciseResults = await db.select()
          .from(workoutExercises)
          .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
          .where(eq(workoutExercises.workoutId, assignment.workoutId))
          .orderBy(workoutExercises.sortOrder);

        // Get appointment for this date if available
        const appointment = assignment.scheduledDate
          ? appointmentsByDate.get(assignment.scheduledDate)
          : undefined;

        return {
          id: assignment.id,
          workoutId: assignment.workoutId,
          clientId: assignment.clientId,
          assignedAt: assignment.assignedAt,
          completedAt: assignment.completedAt,
          notes: assignment.notes,
          scheduledDate: assignment.scheduledDate,
          dayOfWeek: assignment.dayOfWeek,
          weekNumber: assignment.weekNumber,
          weekYear: assignment.weekYear,
          scheduledStartTime: appointment?.startTime || null,
          scheduledEndTime: appointment?.endTime || null,
          title: assignment.workout?.title || '',
          description: assignment.workout?.description || '',
          duration: assignment.workout?.duration || 0,
          difficulty: assignment.workout?.difficulty || 'beginner',
          category: assignment.workout?.category || '',
          exercises: exerciseResults.map((ex: any) => ({
            id: ex.workout_exercises?.id,
            exerciseId: ex.workout_exercises?.exerciseId,
            name: ex.exercises?.name || 'Exercise',
            description: ex.exercises?.description || '',
            muscleGroups: ex.exercises?.muscleGroups || [],
            equipment: ex.exercises?.equipment || [],
            instructions: ex.exercises?.instructions || [],
            youtubeUrl: ex.exercises?.youtubeUrl || null,
            sets: ex.workout_exercises?.sets || 0,
            reps: ex.workout_exercises?.reps || '',
            weight: ex.workout_exercises?.weight || null,
            restTime: ex.workout_exercises?.restTime || 60,
            sortOrder: ex.workout_exercises?.sortOrder || 0,
          }))
        };
      })
    );

    // Add standalone appointments (appointments without workout assignments) as calendar items
    const standaloneAppointments = appointmentsInWeek
      .filter((apt: any) => apt.date && !datesWithWorkouts.has(apt.date))
      .map((apt: any) => {
        // Calculate day of week from the appointment date
        const appointmentDate = new Date(apt.date!);
        const dayOfWeek = appointmentDate.getDay();

        // Calculate duration from time slots if available
        let duration = 60; // Default
        if (apt.startTime && apt.endTime) {
          try {
            const [startHour, startMin] = apt.startTime.split(':').map(Number);
            const [endHour, endMin] = apt.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            duration = Math.max(0, endMinutes - startMinutes);
          } catch {
            duration = 60;
          }
        }

        return {
          id: apt.id!,
          workoutId: null,
          clientId: apt.clientId!,
          assignedAt: apt.createdAt || new Date(),
          completedAt: apt.status === 'completed' ? apt.createdAt : null,
          notes: apt.notes || null,
          scheduledDate: apt.date!,
          dayOfWeek: dayOfWeek,
          weekNumber: null,
          weekYear: null,
          scheduledStartTime: apt.startTime || null,
          scheduledEndTime: apt.endTime || null,
          title: apt.title || 'Training Session',
          description: apt.notes || 'Scheduled training session',
          duration: duration,
          difficulty: 'intermediate',
          category: apt.type || 'training',
          exercises: []
        };
      });

    console.log(`[Storage] Adding ${standaloneAppointments.length} standalone appointments`);

    // Combine workout assignments and standalone appointments, then sort by date
    const allItems = [...workoutsWithExercises, ...standaloneAppointments]
      .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));

    return allItems;
  }

  async getTrainerWorkoutAssignments(trainerId: string): Promise<any[]> {
    const db = await getDb();

    console.log(`[Storage] getTrainerWorkoutAssignments for trainer:`, trainerId);

    // Get all workout assignments for this trainer's clients with scheduledDate
    const assignmentResults = await db.select({
      id: workoutAssignments.id,
      workoutId: workoutAssignments.workoutId,
      clientId: workoutAssignments.clientId,
      assignedAt: workoutAssignments.assignedAt,
      completedAt: workoutAssignments.completedAt,
      notes: workoutAssignments.notes,
      scheduledDate: workoutAssignments.scheduledDate,
      scheduledTime: workoutAssignments.scheduledTime,
      timezone: workoutAssignments.timezone,
      dayOfWeek: workoutAssignments.dayOfWeek,
      durationMinutes: workoutAssignments.durationMinutes,
      customTitle: workoutAssignments.customTitle,
      customNotes: workoutAssignments.customNotes,
      status: workoutAssignments.status,
      workout: {
        id: workouts.id,
        title: workouts.title,
        description: workouts.description,
        duration: workouts.duration,
        difficulty: workouts.difficulty,
        category: workouts.category,
      },
      client: {
        id: clients.id,
        name: clients.name,
        email: clients.email,
      }
    })
      .from(workoutAssignments)
      .leftJoin(workouts, eq(workoutAssignments.workoutId, workouts.id))
      .leftJoin(clients, eq(workoutAssignments.clientId, clients.id))
      .where(
        and(
          eq(clients.trainerId, trainerId),
          isNotNull(workoutAssignments.scheduledDate)
        )
      )
      .orderBy(workoutAssignments.scheduledDate);

    console.log(`[Storage] Found ${assignmentResults.length} scheduled workout assignments for trainer ${trainerId}`);

    // Map to simpler format for calendar display
    return assignmentResults.map(result => ({
      id: result.id,
      workoutId: result.workoutId,
      clientId: result.clientId,
      clientName: result.client?.name || 'Unknown Client',
      scheduledDate: result.scheduledDate,
      scheduledTime: result.scheduledTime,
      duration: result.durationMinutes || result.workout?.duration || 60,
      title: result.customTitle || result.workout?.title || 'Workout',
      difficulty: result.workout?.difficulty || 'beginner',
      category: result.workout?.category || '',
      status: result.status,
      completedAt: result.completedAt,
    }));
  }

  async assignWorkoutToClient(insertAssignment: InsertWorkoutAssignment): Promise<WorkoutAssignment> {
    const db = await getDb();
    const [assignment] = await db.insert(workoutAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async completeWorkoutAssignment(id: string, notes?: string): Promise<WorkoutAssignment | undefined> {
    const db = await getDb();
    const [assignment] = await db.update(workoutAssignments)
      .set({ completedAt: new Date(), notes })
      .where(eq(workoutAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  // Progress Entries
  async getClientProgress(clientId: string): Promise<ProgressEntry[]> {
    const db = await getDb();
    return await db.select().from(progressEntries)
      .where(eq(progressEntries.clientId, clientId))
      .orderBy(desc(progressEntries.recordedAt));
  }

  async addProgressEntry(insertEntry: InsertProgressEntry): Promise<ProgressEntry> {
    const db = await getDb();
    const [entry] = await db.insert(progressEntries).values(insertEntry).returning();
    return entry;
  }

  // Training Sessions
  async getTrainerSessions(trainerId: string): Promise<TrainingSession[]> {
    const db = await getDb();
    return await db.select().from(trainingSessions)
      .where(eq(trainingSessions.trainerId, trainerId))
      .orderBy(desc(trainingSessions.scheduledAt));
  }

  async getClientSessions(clientId: string): Promise<TrainingSession[]> {
    const db = await getDb();
    return await db.select().from(trainingSessions)
      .where(eq(trainingSessions.clientId, clientId))
      .orderBy(desc(trainingSessions.scheduledAt));
  }

  async createTrainingSession(insertSession: InsertTrainingSession): Promise<TrainingSession> {
    const db = await getDb();
    const [session] = await db.insert(trainingSessions).values(insertSession).returning();
    return session;
  }

  async updateTrainingSession(id: string, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const db = await getDb();
    const [session] = await db.update(trainingSessions).set(updates).where(eq(trainingSessions.id, id)).returning();
    return session || undefined;
  }

  // Appointments
  async getAppointmentsByTrainer(trainerId: string): Promise<Appointment[]> {
    const db = await getDb();
    const results = await db.select({
      id: appointments.id,
      trainerId: appointments.trainerId,
      clientId: appointments.clientId,
      title: appointments.title,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      type: appointments.type,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      client: clients
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .where(eq(appointments.trainerId, trainerId))
    .orderBy(desc(appointments.date));

    // Transform results to include client name
    return results.map(result => ({
      ...result,
      client: result.client ? { name: result.client.name } : undefined
    })) as any;
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    const db = await getDb();
    const results = await db.select({
      id: appointments.id,
      trainerId: appointments.trainerId,
      clientId: appointments.clientId,
      title: appointments.title,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      type: appointments.type,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      client: clients
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .where(eq(appointments.clientId, clientId))
    .orderBy(desc(appointments.date));

    return results.map(result => ({
      ...result,
      client: result.client ? { name: result.client.name } : undefined
    })) as any;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const db = await getDb();
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const db = await getDb();
    const [appointment] = await db.update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return result.length > 0;
  }

  // Enhanced Features
  async duplicateWorkout(workoutId: string, trainerId: string): Promise<Workout> {
    // Get the original workout
    const original = await this.getWorkout(workoutId);
    if (!original) {
      throw new Error('Workout not found');
    }

    // Create a copy with new title
    const duplicatedWorkout = await this.createWorkout({
      trainerId,
      title: `${original.title} (Copy)`,
      description: original.description,
      duration: original.duration,
      difficulty: original.difficulty,
      category: original.category,
    });

    // Copy all workout exercises
    const exercises = await this.getWorkoutExercises(workoutId);
    for (const exercise of exercises) {
      await this.addExerciseToWorkout({
        workoutId: duplicatedWorkout.id,
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        restTime: exercise.restTime,
        sortOrder: exercise.sortOrder,
      });
    }

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
    try {
      // Get comprehensive dashboard statistics with error handling for each query
      let allClients: Client[] = [];
      try {
        allClients = await this.getClientsByTrainer(trainerId);
      } catch (error) {
        console.warn('Failed to get clients for dashboard stats:', error);
      }
      
      const activeClients = allClients.filter(c => c.status === 'active');
      const pausedClients = allClients.filter(c => c.status === 'paused');
      
      let allWorkouts: Workout[] = [];
      try {
        allWorkouts = await this.getWorkoutsByTrainer(trainerId);
      } catch (error) {
        console.warn('Failed to get workouts for dashboard stats:', error);
      }
      
      let sessions: TrainingSession[] = [];
      try {
        sessions = await this.getTrainerSessions(trainerId);
      } catch (error) {
        console.warn('Failed to get trainer sessions for dashboard stats:', error);
      }
      
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
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      // Return default stats structure even if there's an error
      return {
        totalClients: 0,
        activeClients: 0,
        pausedClients: 0,
        inactiveClients: 0,
        totalWorkouts: 0,
        upcomingSessions: 0,
        completedSessionsThisWeek: 0,
        newClientsThisMonth: 0,
        recentActivity: [],
      };
    }
  }

  async getClientNotes(clientId: string): Promise<any[]> {
    // For now, return notes from client's goal field or empty array
    // In a real app, you'd have a separate notes table
    const client = await this.getClient(clientId);
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
    // For now, append to client's goal field
    // In a real app, you'd have a separate notes table
    const client = await this.getClient(clientId);
    if (!client) throw new Error('Client not found');

    const updatedClient = await this.updateClient(clientId, {
      goal: `${client.goal}\n\n[${category.toUpperCase()}]: ${content}`,
    });

    return {
      id: Date.now().toString(),
      clientId,
      content,
      category,
      createdAt: new Date(),
    };
  }

  // User Onboarding Progress
  async getUserOnboardingProgress(userId: string): Promise<UserOnboardingProgress | undefined> {
    const db = await getDb();
    const [progress] = await db
      .select()
      .from(userOnboardingProgress)
      .where(eq(userOnboardingProgress.userId, userId));
    return progress || undefined;
  }

  async updateUserOnboardingProgress(
    userId: string,
    updates: Partial<InsertUserOnboardingProgress>
  ): Promise<UserOnboardingProgress> {
    const db = await getDb();

    // Check if progress record exists
    const existing = await this.getUserOnboardingProgress(userId);

    if (existing) {
      // Update existing record
      const [progress] = await db
        .update(userOnboardingProgress)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userOnboardingProgress.userId, userId))
        .returning();
      return progress;
    } else {
      // Create new record
      const [progress] = await db
        .insert(userOnboardingProgress)
        .values({ userId, ...updates })
        .returning();
      return progress;
    }
  }
}

// Create singleton instances
const databaseStorage = new DatabaseStorage();
const memoryStorage = new MemoryStorage();

// Track if database is available
let isDatabaseAvailable = false;

// Function to check database availability
export async function checkDatabaseAvailability(): Promise<boolean> {
  try {
    const db = await getDb();
    // Try a simple query to test connection
    await db.select().from(users).limit(1);
    isDatabaseAvailable = true;
    return true;
  } catch (error) {
    console.warn('Database is unavailable, using in-memory storage:', error);
    isDatabaseAvailable = false;
    return false;
  }
}

// Function to get the appropriate storage
export function getStorage(): IStorage {
  if (isDatabaseAvailable) {
    return databaseStorage;
  }
  console.info('Using in-memory storage (database unavailable)');
  return memoryStorage;
}

// Export storage that dynamically switches between database and memory
export const storage: IStorage = new Proxy({} as IStorage, {
  get(target, prop: keyof IStorage) {
    const actualStorage = getStorage();
    return actualStorage[prop].bind(actualStorage);
  }
});

// Check database availability on startup
checkDatabaseAvailability().catch(console.error);
