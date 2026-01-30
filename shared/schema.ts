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

// Users (Trainers and Clients) - Updated for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Role-based access control
  role: text("role", { enum: ['trainer', 'client'] }).notNull().default('trainer'),
  trainerId: varchar("trainer_id").references((): any => users.id, { onDelete: "cascade" }), // For clients - links to their trainer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_role").on(table.role),
  index("idx_users_trainer_id").on(table.trainerId),
]);

// Clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("active"), // active, paused, inactive
  // Biometric data for calculations
  age: integer("age"),
  gender: text("gender"), // 'male' or 'female'
  height: decimal("height"), // cm
  weight: decimal("weight"), // kg
  activityLevel: text("activity_level"), // 'sedentary', 'lightly_active', 'moderately_active', 'active', 'very_active'
  // Body circumferences for US Navy body fat calculation
  neckCircumference: decimal("neck_circumference"), // cm
  waistCircumference: decimal("waist_circumference"), // cm
  hipCircumference: decimal("hip_circumference"), // cm (for women)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSession: timestamp("last_session"),
  nextSession: timestamp("next_session"),
}, (table) => [
  index("idx_clients_trainer_id").on(table.trainerId),
  index("idx_clients_status").on(table.status),
  index("idx_clients_email").on(table.email),
]);

// Exercise Type Enum
export const EXERCISE_TYPES = [
  'weighted_reps',      // Traditional weightlifting (bench press, squats)
  'bodyweight_reps',    // Push-ups, pull-ups, sit-ups
  'timed_hold',         // Planks, wall sits
  'cardio_distance',    // Running, cycling (track distance)
  'cardio_time',        // Running, cycling (track time only)
  'plyometric',         // Box jumps, burpees (reps only)
  'mobility'            // Stretching, yoga poses (time-based)
] as const;

export type ExerciseType = typeof EXERCISE_TYPES[number];

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
  // Exercise type system (controls which fields appear in UI)
  exerciseType: text("exercise_type").default('weighted_reps'), // Type determines required fields
  defaultSets: integer("default_sets"),
  defaultReps: text("default_reps"),
  defaultDuration: integer("default_duration"), // seconds
  defaultRestTime: integer("default_rest_time"), // seconds
  thumbnailUrl: text("thumbnail_url"),
  videoUrls: text("video_urls").array(),
  alternativeExercises: text("alternative_exercises").array(), // IDs of alternative exercises
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
}, (table) => [
  index("idx_workouts_trainer_id").on(table.trainerId),
  index("idx_workouts_category").on(table.category),
  index("idx_workouts_difficulty").on(table.difficulty),
]);

// Set Configuration Interface (for per-set weight tracking)
export interface SetConfiguration {
  setNumber: number;
  reps?: number | string; // Can be number or "AMRAP", "to failure", etc.
  weight?: number; // lbs or kg depending on user preference
  duration?: number; // seconds (for timed exercises)
  distance?: number; // meters (for cardio)
  completed: boolean;
  notes?: string;
}

// Workout-Exercise Junction Table
export const workoutExercises = pgTable("workout_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  // DEPRECATED: Legacy fields (kept for backward compatibility)
  sets: integer("sets").notNull(),
  reps: text("reps").notNull(), // can be "10-12" or "45 sec"
  weight: text("weight"), // optional, like "135 lbs"
  restTime: integer("rest_time"), // seconds
  // NEW: Per-set configuration (allows different weight per set)
  setsConfiguration: jsonb("sets_configuration").$type<SetConfiguration[]>(),
  sortOrder: integer("sort_order").notNull(), // order in workout
}, (table) => [
  index("idx_workout_exercises_workout_id").on(table.workoutId),
  index("idx_workout_exercises_exercise_id").on(table.exerciseId),
]);

// Workout Assignment Status Enum
export const WORKOUT_STATUSES = [
  'scheduled',   // Scheduled for future
  'in_progress', // Client started the workout
  'completed',   // Client completed the workout
  'cancelled',   // Trainer cancelled
  'missed'       // Client didn't complete by scheduled time
] as const;

export type WorkoutStatus = typeof WORKOUT_STATUSES[number];

// Notification Record Interface
export interface NotificationRecord {
  type: 'reminder_24h' | 'reminder_1h' | 'assignment' | 'cancellation';
  sentAt: string; // ISO timestamp
  success: boolean;
  platform?: string; // 'app', 'email', 'sms', 'whatsapp'
}

// Workout Assignments to Clients
export const workoutAssignments = pgTable("workout_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  // Weekly scheduling fields (legacy - still used)
  scheduledDate: text("scheduled_date"), // YYYY-MM-DD format (nullable for backward compatibility)
  dayOfWeek: integer("day_of_week"), // 0=Sunday, 1=Monday, ..., 6=Saturday (nullable)
  weekNumber: integer("week_number"), // ISO week number for grouping (nullable)
  weekYear: integer("week_year"), // Year for week number (nullable)
  // NEW: Enhanced scheduling fields
  scheduledTime: text("scheduled_time"), // HH:MM format (e.g., "14:30")
  timezone: text("timezone").default('UTC'), // IANA timezone identifier (e.g., "America/New_York")
  durationMinutes: integer("duration_minutes"), // Expected workout duration
  // NEW: Customization fields
  isCustomized: boolean("is_customized").default(false), // True if trainer modified from template
  customTitle: text("custom_title"), // Override workout title
  customNotes: text("custom_notes"), // Trainer notes for this specific assignment
  // NEW: Status tracking
  status: text("status").default('scheduled'), // scheduled, in_progress, completed, cancelled, missed
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  // NEW: Notification tracking
  notificationsSent: jsonb("notifications_sent").$type<NotificationRecord[]>(),
}, (table) => [
  index("idx_workout_assignments_workout_id").on(table.workoutId),
  index("idx_workout_assignments_client_id").on(table.clientId),
  index("idx_workout_assignments_assigned_at").on(table.assignedAt),
  index("idx_workout_assignments_scheduled_date").on(table.scheduledDate),
  index("idx_workout_assignments_client_date").on(table.clientId, table.scheduledDate),
  index("idx_workout_assignments_week").on(table.weekYear, table.weekNumber, table.clientId),
  index("idx_workout_assignments_status").on(table.status),
]);

// Progress Tracking
export const progressEntries = pgTable("progress_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // weight, body_fat, measurement, workout_completion
  value: decimal("value", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // lbs, kg, inches, cm, etc.
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => [
  index("idx_progress_entries_client_id").on(table.clientId),
  index("idx_progress_entries_recorded_at").on(table.recordedAt),
]);

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
}, (table) => [
  index("idx_training_sessions_trainer_id").on(table.trainerId),
  index("idx_training_sessions_client_id").on(table.clientId),
  index("idx_training_sessions_scheduled_at").on(table.scheduledAt),
  index("idx_training_sessions_status").on(table.status),
]);

// Appointments (Flexible scheduling for trainers)
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time"),
  type: text("type").notNull().default("training"), // training, consultation, check-in
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_appointments_trainer_id").on(table.trainerId),
  index("idx_appointments_client_id").on(table.clientId),
  index("idx_appointments_date").on(table.date),
  index("idx_appointments_status").on(table.status),
]);

// User Onboarding Progress Tracking
export const userOnboardingProgress = pgTable("user_onboarding_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  welcomeModalCompleted: boolean("welcome_modal_completed").notNull().default(false),
  selectedGoal: text("selected_goal"), // manage_clients, grow_clients, save_time, track_progress
  addedFirstClient: boolean("added_first_client").notNull().default(false),
  createdFirstWorkout: boolean("created_first_workout").notNull().default(false),
  assignedFirstWorkout: boolean("assigned_first_workout").notNull().default(false),
  scheduledFirstSession: boolean("scheduled_first_session").notNull().default(false),
  loggedFirstProgress: boolean("logged_first_progress").notNull().default(false),
  completedProductTour: boolean("completed_product_tour").notNull().default(false),
  dismissedFeaturePrompts: text("dismissed_feature_prompts").array().default([]),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_onboarding_user_id").on(table.userId),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  clients: many(clients),
  workouts: many(workouts),
  trainingSessions: many(trainingSessions),
  appointments: many(appointments),
  onboardingProgress: one(userOnboardingProgress, { fields: [users.id], references: [userOnboardingProgress.userId] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  trainer: one(users, { fields: [clients.trainerId], references: [users.id] }),
  workoutAssignments: many(workoutAssignments),
  progressEntries: many(progressEntries),
  trainingSessions: many(trainingSessions),
  appointments: many(appointments),
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

export const trainingSessionsRelations = relations(trainingSessions, ({ one }) => ({
  trainer: one(users, { fields: [trainingSessions.trainerId], references: [users.id] }),
  client: one(clients, { fields: [trainingSessions.clientId], references: [clients.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  trainer: one(users, { fields: [appointments.trainerId], references: [users.id] }),
  client: one(clients, { fields: [appointments.clientId], references: [clients.id] }),
}));

export const userOnboardingProgressRelations = relations(userOnboardingProgress, ({ one }) => ({
  user: one(users, { fields: [userOnboardingProgress.userId], references: [users.id] }),
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

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserOnboardingProgressSchema = createInsertSchema(userOnboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertUserOnboardingProgress = z.infer<typeof insertUserOnboardingProgressSchema>;
export type UserOnboardingProgress = typeof userOnboardingProgress.$inferSelect;

// Replit Auth required types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Helper functions for exercise type system
export const EXERCISE_FIELD_REQUIREMENTS = {
  weighted_reps: { weight: true, reps: true, sets: true, duration: false, distance: false },
  bodyweight_reps: { weight: false, reps: true, sets: true, duration: false, distance: false },
  timed_hold: { weight: false, reps: false, sets: true, duration: true, distance: false },
  cardio_distance: { weight: false, reps: false, sets: false, duration: true, distance: true },
  cardio_time: { weight: false, reps: false, sets: false, duration: true, distance: false },
  plyometric: { weight: false, reps: true, sets: true, duration: false, distance: false },
  mobility: { weight: false, reps: false, sets: true, duration: true, distance: false },
} as const;

export function getRequiredFieldsForExerciseType(exerciseType: ExerciseType) {
  return EXERCISE_FIELD_REQUIREMENTS[exerciseType];
}

export function isWeightRequired(exerciseType: ExerciseType): boolean {
  return EXERCISE_FIELD_REQUIREMENTS[exerciseType].weight;
}

export function isRepsRequired(exerciseType: ExerciseType): boolean {
  return EXERCISE_FIELD_REQUIREMENTS[exerciseType].reps;
}

export function isDurationRequired(exerciseType: ExerciseType): boolean {
  return EXERCISE_FIELD_REQUIREMENTS[exerciseType].duration;
}

export function isDistanceRequired(exerciseType: ExerciseType): boolean {
  return EXERCISE_FIELD_REQUIREMENTS[exerciseType].distance;
}
