import {
  users, clients, exercises, workouts, workoutExercises, workoutAssignments, 
  progressEntries, messages, sessions,
  type User, type InsertUser, type SafeUser,
  type Client, type InsertClient,
  type Exercise, type InsertExercise,
  type Workout, type InsertWorkout,
  type WorkoutExercise, type InsertWorkoutExercise,
  type WorkoutAssignment, type InsertWorkoutAssignment,
  type ProgressEntry, type InsertProgressEntry,
  type Message, type InsertMessage,
  type Session, type InsertSession
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: string): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>; // Keep full User for auth
  createUser(user: InsertUser): Promise<SafeUser>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientsByTrainer(trainerId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
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
  assignWorkoutToClient(assignment: InsertWorkoutAssignment): Promise<WorkoutAssignment>;
  completeWorkoutAssignment(id: string, notes?: string): Promise<WorkoutAssignment | undefined>;

  // Progress Entries
  getClientProgress(clientId: string): Promise<ProgressEntry[]>;
  addProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;

  // Messages
  getClientMessages(clientId: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;

  // Sessions
  getTrainerSessions(trainerId: string): Promise<Session[]>;
  getClientSessions(clientId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<SafeUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const userWithHashedPassword = { ...insertUser, password: hashedPassword };
    
    const [user] = await db.insert(users).values(userWithHashedPassword).returning();
    const { password, ...safeUser } = user;
    return safeUser;
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientsByTrainer(trainerId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.trainerId, trainerId));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return client || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Exercises
  async getExercise(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise || undefined;
  }

  async getAllExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises);
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const [exercise] = await db.insert(exercises).values(insertExercise).returning();
    return exercise;
  }

  // Workouts
  async getWorkout(id: string): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout || undefined;
  }

  async getWorkoutsByTrainer(trainerId: string): Promise<Workout[]> {
    return await db.select().from(workouts).where(eq(workouts.trainerId, trainerId));
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const [workout] = await db.insert(workouts).values(insertWorkout).returning();
    return workout;
  }

  async updateWorkout(id: string, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const [workout] = await db.update(workouts).set(updates).where(eq(workouts.id, id)).returning();
    return workout || undefined;
  }

  async deleteWorkout(id: string): Promise<boolean> {
    const result = await db.delete(workouts).where(eq(workouts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Workout Exercises
  async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    return await db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, workoutId));
  }

  async addExerciseToWorkout(insertWorkoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise> {
    const [workoutExercise] = await db.insert(workoutExercises).values(insertWorkoutExercise).returning();
    return workoutExercise;
  }

  async removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<boolean> {
    const result = await db.delete(workoutExercises)
      .where(and(eq(workoutExercises.workoutId, workoutId), eq(workoutExercises.exerciseId, exerciseId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Workout Assignments
  async getClientWorkouts(clientId: string): Promise<WorkoutAssignment[]> {
    return await db.select().from(workoutAssignments)
      .where(eq(workoutAssignments.clientId, clientId))
      .orderBy(desc(workoutAssignments.assignedAt));
  }

  async assignWorkoutToClient(insertAssignment: InsertWorkoutAssignment): Promise<WorkoutAssignment> {
    const [assignment] = await db.insert(workoutAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async completeWorkoutAssignment(id: string, notes?: string): Promise<WorkoutAssignment | undefined> {
    const [assignment] = await db.update(workoutAssignments)
      .set({ completedAt: new Date(), notes })
      .where(eq(workoutAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  // Progress Entries
  async getClientProgress(clientId: string): Promise<ProgressEntry[]> {
    return await db.select().from(progressEntries)
      .where(eq(progressEntries.clientId, clientId))
      .orderBy(desc(progressEntries.recordedAt));
  }

  async addProgressEntry(insertEntry: InsertProgressEntry): Promise<ProgressEntry> {
    const [entry] = await db.insert(progressEntries).values(insertEntry).returning();
    return entry;
  }

  // Messages
  async getClientMessages(clientId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.clientId, clientId))
      .orderBy(desc(messages.sentAt));
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const [message] = await db.update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return message || undefined;
  }

  // Sessions
  async getTrainerSessions(trainerId: string): Promise<Session[]> {
    return await db.select().from(sessions)
      .where(eq(sessions.trainerId, trainerId))
      .orderBy(desc(sessions.scheduledAt));
  }

  async getClientSessions(clientId: string): Promise<Session[]> {
    return await db.select().from(sessions)
      .where(eq(sessions.clientId, clientId))
      .orderBy(desc(sessions.scheduledAt));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const [session] = await db.update(sessions).set(updates).where(eq(sessions.id, id)).returning();
    return session || undefined;
  }
}

export const storage = new DatabaseStorage();
