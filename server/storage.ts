import {
  users, clients, exercises, workouts, workoutExercises, workoutAssignments, 
  progressEntries, messages, trainingSessions, clientCommunicationPrefs, messageTemplates,
  type User, type InsertUser, type UpsertUser,
  type Client, type InsertClient,
  type Exercise, type InsertExercise,
  type Workout, type InsertWorkout,
  type WorkoutExercise, type InsertWorkoutExercise,
  type WorkoutAssignment, type InsertWorkoutAssignment,
  type ProgressEntry, type InsertProgressEntry,
  type Message, type InsertMessage,
  type ClientCommunicationPref, type InsertClientCommunicationPref,
  type MessageTemplate, type InsertMessageTemplate,
  type TrainingSession, type InsertTrainingSession
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users - Replit Auth operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

  // Messages & Multi-Platform Communication
  getAllMessagesForTrainer(trainerId: string, platform?: string): Promise<Message[]>;
  getClientMessages(clientId: string, platform?: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  getMessageTemplates(trainerId: string, category?: string): Promise<MessageTemplate[]>;
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  deleteMessageTemplate(id: string): Promise<boolean>;
  getClientCommunicationPrefs(clientId: string): Promise<ClientCommunicationPref[]>;
  updateClientCommunicationPref(clientId: string, pref: InsertClientCommunicationPref): Promise<ClientCommunicationPref>;
  sendMultiPlatformMessage(clientId: string, content: string, platforms: string[]): Promise<Message[]>;

  // Training Sessions
  getTrainerSessions(trainerId: string): Promise<TrainingSession[]>;
  getClientSessions(clientId: string): Promise<TrainingSession[]>;
  createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession>;
  updateTrainingSession(id: string, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users - Replit Auth operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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

  // Messages & Multi-Platform Communication
  async getAllMessagesForTrainer(trainerId: string, platform?: string): Promise<Message[]> {
    const baseCondition = eq(clients.trainerId, trainerId);
    
    const whereCondition = platform 
      ? and(baseCondition, eq(messages.platform, platform))
      : baseCondition;
    
    const result = await db.select({
      id: messages.id,
      trainerId: messages.trainerId,
      clientId: messages.clientId,
      content: messages.content,
      isFromTrainer: messages.isFromTrainer,
      platform: messages.platform,
      externalMessageId: messages.externalMessageId,
      messageType: messages.messageType,
      attachmentUrl: messages.attachmentUrl,
      sentAt: messages.sentAt,
      readAt: messages.readAt,
      deliveredAt: messages.deliveredAt,
      deliveryStatus: messages.deliveryStatus,
      errorMessage: messages.errorMessage
    })
    .from(messages)
    .innerJoin(clients, eq(messages.clientId, clients.id))
    .where(whereCondition)
    .orderBy(desc(messages.sentAt));
    
    return result;
  }

  async getClientMessages(clientId: string, platform?: string): Promise<Message[]> {
    const baseCondition = eq(messages.clientId, clientId);
    
    const whereCondition = platform 
      ? and(baseCondition, eq(messages.platform, platform))
      : baseCondition;
    
    return await db.select().from(messages)
      .where(whereCondition)
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

  async getMessageTemplates(trainerId: string, category?: string): Promise<MessageTemplate[]> {
    const baseCondition = eq(messageTemplates.trainerId, trainerId);
    
    const whereCondition = category 
      ? and(baseCondition, eq(messageTemplates.category, category))
      : baseCondition;
    
    return await db.select().from(messageTemplates)
      .where(whereCondition)
      .orderBy(messageTemplates.category, messageTemplates.title);
  }

  async createMessageTemplate(insertTemplate: InsertMessageTemplate): Promise<MessageTemplate> {
    const [template] = await db.insert(messageTemplates).values(insertTemplate).returning();
    return template;
  }

  async deleteMessageTemplate(id: string): Promise<boolean> {
    const result = await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getClientCommunicationPrefs(clientId: string): Promise<ClientCommunicationPref[]> {
    return await db.select().from(clientCommunicationPrefs)
      .where(eq(clientCommunicationPrefs.clientId, clientId))
      .orderBy(desc(clientCommunicationPrefs.isPreferred), clientCommunicationPrefs.platform);
  }

  async updateClientCommunicationPref(clientId: string, insertPref: InsertClientCommunicationPref): Promise<ClientCommunicationPref> {
    // Check if preference already exists for this client/platform
    const existing = await db.select().from(clientCommunicationPrefs)
      .where(
        and(
          eq(clientCommunicationPrefs.clientId, clientId),
          eq(clientCommunicationPrefs.platform, insertPref.platform)
        )
      );
    
    if (existing.length > 0) {
      // Update existing preference
      const [updated] = await db.update(clientCommunicationPrefs)
        .set(insertPref)
        .where(eq(clientCommunicationPrefs.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new preference
      const [created] = await db.insert(clientCommunicationPrefs)
        .values({ ...insertPref, clientId })
        .returning();
      return created;
    }
  }

  async sendMultiPlatformMessage(clientId: string, content: string, platforms: string[]): Promise<Message[]> {
    // Get trainer ID for this client
    const client = await this.getClient(clientId);
    if (!client) throw new Error("Client not found");
    
    const messages: Message[] = [];
    
    // Send message to each platform
    for (const platform of platforms) {
      const messageData: InsertMessage = {
        trainerId: client.trainerId,
        clientId,
        content,
        isFromTrainer: true,
        platform,
        messageType: "text"
      };
      
      const message = await this.sendMessage(messageData);
      messages.push(message);
    }
    
    return messages;
  }

  // Training Sessions
  async getTrainerSessions(trainerId: string): Promise<TrainingSession[]> {
    return await db.select().from(trainingSessions)
      .where(eq(trainingSessions.trainerId, trainerId))
      .orderBy(desc(trainingSessions.scheduledAt));
  }

  async getClientSessions(clientId: string): Promise<TrainingSession[]> {
    return await db.select().from(trainingSessions)
      .where(eq(trainingSessions.clientId, clientId))
      .orderBy(desc(trainingSessions.scheduledAt));
  }

  async createTrainingSession(insertSession: InsertTrainingSession): Promise<TrainingSession> {
    const [session] = await db.insert(trainingSessions).values(insertSession).returning();
    return session;
  }

  async updateTrainingSession(id: string, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const [session] = await db.update(trainingSessions).set(updates).where(eq(trainingSessions.id, id)).returning();
    return session || undefined;
  }
}

export const storage = new DatabaseStorage();
