import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for express-session with PostgreSQL
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users (Personal Trainers) - Updated for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("active"), // active, paused, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSession: timestamp("last_session"),
  nextSession: timestamp("next_session"),
});

// Exercise Library
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // strength, cardio, flexibility, etc.
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  muscleGroups: text("muscle_groups").array().notNull(),
  equipment: text("equipment").array().notNull(),
  instructions: text("instructions").array().notNull(),
  youtubeUrl: text("youtube_url"), // YouTube video URL for demonstrations
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workout Templates
export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // minutes
  difficulty: text("difficulty").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workout-Exercise Junction Table
export const workoutExercises = pgTable("workout_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  sets: integer("sets").notNull(),
  reps: text("reps").notNull(), // can be "10-12" or "45 sec"
  weight: text("weight"), // optional, like "135 lbs"
  restTime: integer("rest_time"), // seconds
  sortOrder: integer("sort_order").notNull(), // order in workout
});

// Workout Assignments to Clients
export const workoutAssignments = pgTable("workout_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

// Progress Tracking
export const progressEntries = pgTable("progress_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // weight, body_fat, measurement, workout_completion
  value: decimal("value", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // lbs, kg, inches, cm, etc.
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Messages (Multi-Platform Trainer-Client Communication)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isFromTrainer: boolean("is_from_trainer").notNull(),
  platform: text("platform").notNull().default("app"), // app, whatsapp, telegram, facebook, instagram, sms
  externalMessageId: text("external_message_id"), // ID from external platform
  messageType: text("message_type").notNull().default("text"), // text, image, video, audio, file
  attachmentUrl: text("attachment_url"), // For media messages
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryStatus: text("delivery_status").default("pending"), // pending, sent, delivered, failed
  errorMessage: text("error_message"), // Error details if delivery failed
});

// Client Communication Preferences
export const clientCommunicationPrefs = pgTable("client_communication_prefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // whatsapp, telegram, facebook, instagram, sms
  platformUserId: text("platform_user_id").notNull(), // phone number, username, etc.
  isPreferred: boolean("is_preferred").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Message Templates for Quick Responses
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // workout_reminder, motivation, check_in, general
  platform: text("platform").default("all"), // specific platform or all
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Training Sessions (renamed to avoid conflict with auth sessions)
export const trainingSessions = pgTable("training_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(), // minutes
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  workouts: many(workouts),
  trainingSessions: many(trainingSessions),
  sentMessages: many(messages),
  messageTemplates: many(messageTemplates),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  trainer: one(users, { fields: [clients.trainerId], references: [users.id] }),
  workoutAssignments: many(workoutAssignments),
  progressEntries: many(progressEntries),
  messages: many(messages),
  trainingSessions: many(trainingSessions),
  communicationPrefs: many(clientCommunicationPrefs),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  trainer: one(users, { fields: [workouts.trainerId], references: [users.id] }),
  workoutExercises: many(workoutExercises),
  assignments: many(workoutAssignments),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one }) => ({
  workout: one(workouts, { fields: [workoutExercises.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutExercises.exerciseId], references: [exercises.id] }),
}));

export const workoutAssignmentsRelations = relations(workoutAssignments, ({ one }) => ({
  workout: one(workouts, { fields: [workoutAssignments.workoutId], references: [workouts.id] }),
  client: one(clients, { fields: [workoutAssignments.clientId], references: [clients.id] }),
}));

export const progressEntriesRelations = relations(progressEntries, ({ one }) => ({
  client: one(clients, { fields: [progressEntries.clientId], references: [clients.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  trainer: one(users, { fields: [messages.trainerId], references: [users.id] }),
  client: one(clients, { fields: [messages.clientId], references: [clients.id] }),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one }) => ({
  trainer: one(users, { fields: [trainingSessions.trainerId], references: [users.id] }),
  client: one(clients, { fields: [trainingSessions.clientId], references: [clients.id] }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutExerciseSchema = createInsertSchema(workoutExercises).omit({
  id: true,
});

export const insertWorkoutAssignmentSchema = createInsertSchema(workoutAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({
  id: true,
  recordedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertClientCommunicationPrefSchema = createInsertSchema(clientCommunicationPrefs).omit({
  id: true,
  createdAt: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;

export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;

export type InsertWorkoutAssignment = z.infer<typeof insertWorkoutAssignmentSchema>;
export type WorkoutAssignment = typeof workoutAssignments.$inferSelect;

export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;
export type ProgressEntry = typeof progressEntries.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertClientCommunicationPref = z.infer<typeof insertClientCommunicationPrefSchema>;
export type ClientCommunicationPref = typeof clientCommunicationPrefs.$inferSelect;

export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

// Replit Auth required types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
