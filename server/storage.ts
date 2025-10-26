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
import { getDb } from "./db";
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

  // Enhanced Features
  duplicateWorkout(workoutId: string, trainerId: string): Promise<Workout>;
  getWorkoutTemplates(): Promise<any[]>;
  getDashboardStats(trainerId: string): Promise<any>;
  getClientNotes(clientId: string): Promise<any[]>;
  addClientNote(clientId: string, trainerId: string, content: string, category: string): Promise<any>;
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
    return await db.select().from(workoutAssignments)
      .where(eq(workoutAssignments.clientId, clientId))
      .orderBy(desc(workoutAssignments.assignedAt));
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

  // Messages & Multi-Platform Communication
  async getAllMessagesForTrainer(trainerId: string, platform?: string): Promise<Message[]> {
    const db = await getDb();
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
    const db = await getDb();
    const baseCondition = eq(messages.clientId, clientId);
    
    const whereCondition = platform 
      ? and(baseCondition, eq(messages.platform, platform))
      : baseCondition;
    
    return await db.select().from(messages)
      .where(whereCondition)
      .orderBy(desc(messages.sentAt));
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const db = await getDb();
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const db = await getDb();
    const [message] = await db.update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return message || undefined;
  }

  async getMessageTemplates(trainerId: string, category?: string): Promise<MessageTemplate[]> {
    const db = await getDb();
    const baseCondition = eq(messageTemplates.trainerId, trainerId);
    
    const whereCondition = category 
      ? and(baseCondition, eq(messageTemplates.category, category))
      : baseCondition;
    
    return await db.select().from(messageTemplates)
      .where(whereCondition)
      .orderBy(messageTemplates.category, messageTemplates.title);
  }

  async createMessageTemplate(insertTemplate: InsertMessageTemplate): Promise<MessageTemplate> {
    const db = await getDb();
    const [template] = await db.insert(messageTemplates).values(insertTemplate).returning();
    return template;
  }

  async deleteMessageTemplate(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getClientCommunicationPrefs(clientId: string): Promise<ClientCommunicationPref[]> {
    const db = await getDb();
    return await db.select().from(clientCommunicationPrefs)
      .where(eq(clientCommunicationPrefs.clientId, clientId))
      .orderBy(desc(clientCommunicationPrefs.isPreferred), clientCommunicationPrefs.platform);
  }

  async updateClientCommunicationPref(clientId: string, insertPref: InsertClientCommunicationPref): Promise<ClientCommunicationPref> {
    const db = await getDb();
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

      // Get recent messages for activity tracking with error handling
      let messages: Message[] = [];
      try {
        messages = await this.getAllMessagesForTrainer(trainerId);
      } catch (error) {
        console.warn('Failed to get messages for dashboard stats:', error);
      }
      
      const unreadMessages = messages.filter(m => !m.isFromTrainer && !m.readAt).length;

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
      
      // Add messages to activity
      messages.slice(0, 3).forEach(m => {
        recentActivity.push({
          type: 'message',
          description: m.isFromTrainer ? 'Message sent' : 'Message received',
          time: m.sentAt,
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
        unreadMessages,
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
        unreadMessages: 0,
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
}

export const storage = new DatabaseStorage();
