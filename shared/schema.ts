import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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

// Users (Trainers, Clients, and Solo Users) - Updated for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Role-based access control - now includes 'solo' for independent users
  role: text("role", { enum: ['trainer', 'client', 'solo'] }).notNull().default('solo'),
  trainerId: varchar("trainer_id").references((): any => users.id, { onDelete: "cascade" }), // For clients - links to their trainer
  // Solo user fields
  isIndependent: boolean("is_independent").default(true), // true for solo users training without a trainer
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: integer("onboarding_step").default(0),
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
  index("idx_progress_entries_client_type_date").on(table.clientId, table.type, table.recordedAt),
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
  index("idx_appointments_trainer_date").on(table.trainerId, table.date, table.status),
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

// ============================================
// NEW TABLES FOR GYMGURUS V3 IMPLEMENTATION
// ============================================

// -------------------- USER FITNESS PROFILE (Extended) --------------------
export const userFitnessProfile = pgTable("user_fitness_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  // Physical attributes
  heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 4, scale: 2 }),
  gender: varchar("gender", { length: 20 }),
  dateOfBirth: timestamp("date_of_birth"),

  // Fitness level & goals
  experienceLevel: varchar("experience_level", { length: 20 }), // beginner, novice, intermediate, advanced, elite
  primaryGoal: varchar("primary_goal", { length: 50 }), // build_muscle, lose_fat, strength, endurance, general_fitness
  secondaryGoals: jsonb("secondary_goals").$type<string[]>(),

  // Activity & lifestyle
  activityLevel: varchar("activity_level", { length: 20 }), // sedentary, lightly_active, moderately_active, active, very_active
  workoutFrequencyPerWeek: integer("workout_frequency_per_week"),
  workoutDurationMinutes: integer("workout_duration_minutes"),
  preferredWorkoutTime: varchar("preferred_workout_time", { length: 20 }), // morning, afternoon, evening, night

  // Equipment & environment
  workoutEnvironment: varchar("workout_environment", { length: 20 }), // gym, home, outdoor, mixed
  availableEquipment: jsonb("available_equipment").$type<string[]>(),

  // Health considerations
  injuries: jsonb("injuries").$type<{bodyPart: string; severity: string; notes: string}[]>(),
  medicalConditions: jsonb("medical_conditions").$type<string[]>(),

  // Diet preferences
  dietaryPreferences: jsonb("dietary_preferences").$type<string[]>(),
  allergies: jsonb("allergies").$type<string[]>(),
  dailyCalorieTarget: integer("daily_calorie_target"),
  proteinTargetGrams: integer("protein_target_grams"),
  carbsTargetGrams: integer("carbs_target_grams"),
  fatTargetGrams: integer("fat_target_grams"),

  // Location for shopping helper
  locationEnabled: boolean("location_enabled").default(false),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  preferredStores: jsonb("preferred_stores").$type<string[]>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_fitness_profile_user_id").on(table.userId),
]);

// -------------------- GAMIFICATION SYSTEM --------------------

// User Gamification Stats
export const userGamification = pgTable("user_gamification", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  // XP & Leveling
  totalXp: integer("total_xp").default(0).notNull(),
  currentLevel: integer("current_level").default(1).notNull(),
  xpToNextLevel: integer("xp_to_next_level").default(100).notNull(),

  // Ranks
  rankGenZ: varchar("rank_gen_z", { length: 20 }).default('NPC'), // NPC, Mid, Valid, Slay, Fire, Bussin, No Cap, GOATED
  rankStrength: varchar("rank_strength", { length: 20 }).default('Untrained'), // Untrained, Beginner, Novice, Intermediate, Advanced, Elite
  rankPercentile: decimal("rank_percentile", { precision: 5, scale: 2 }),

  // Streaks
  currentStreakDays: integer("current_streak_days").default(0),
  longestStreakDays: integer("longest_streak_days").default(0),
  lastWorkoutDate: timestamp("last_workout_date"),

  // Lifetime Stats
  totalWorkoutsCompleted: integer("total_workouts_completed").default(0),
  totalVolumeLiftedKg: decimal("total_volume_lifted_kg", { precision: 12, scale: 2 }).default('0'),
  totalRepsCompleted: integer("total_reps_completed").default(0),
  totalSetsCompleted: integer("total_sets_completed").default(0),
  totalWorkoutMinutes: integer("total_workout_minutes").default(0),
  totalPersonalRecords: integer("total_personal_records").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_gamification_user_id").on(table.userId),
  index("idx_user_gamification_total_xp").on(table.totalXp),
  index("idx_user_gamification_current_level").on(table.currentLevel),
]);

// Achievement Definitions
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  badgeIcon: varchar("badge_icon", { length: 255 }), // Icon name or URL
  category: varchar("category", { length: 50 }).notNull(), // consistency, strength, volume, exploration, social
  requirementType: varchar("requirement_type", { length: 50 }).notNull(), // total_workouts, streak_days, total_volume, exercise_1rm, etc.
  requirementValue: decimal("requirement_value", { precision: 12, scale: 2 }).notNull(),
  requirementExerciseId: varchar("requirement_exercise_id").references(() => exercises.id),
  xpReward: integer("xp_reward").default(0),
  isHidden: boolean("is_hidden").default(false), // Hidden achievements not shown until earned
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Earned Achievements
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  progress: decimal("progress", { precision: 5, scale: 2 }).default('0'), // 0-100 percentage
}, (table) => [
  index("idx_user_achievements_user_id").on(table.userId),
  index("idx_user_achievements_achievement_id").on(table.achievementId),
  uniqueIndex("idx_user_achievements_unique").on(table.userId, table.achievementId),
]);

// XP Transaction Log
export const xpTransactions = pgTable("xp_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Can be negative for penalties
  reason: varchar("reason", { length: 100 }).notNull(), // workout_completed, personal_record, streak_bonus, achievement_earned, etc.
  sourceId: varchar("source_id"), // ID of related entity (workout, achievement, etc.)
  sourceType: varchar("source_type", { length: 50 }), // workout, achievement, streak, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_xp_transactions_user_id").on(table.userId),
  index("idx_xp_transactions_created_at").on(table.createdAt),
]);

// -------------------- PERSONAL RECORDS & STRENGTH --------------------

// Current Personal Records (one per exercise per user)
export const personalRecords = pgTable("personal_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  estimated1rm: decimal("estimated_1rm", { precision: 6, scale: 2 }).notNull(),
  bodyweightAtPr: decimal("bodyweight_at_pr", { precision: 5, scale: 2 }),
  relativeStrength: decimal("relative_strength", { precision: 4, scale: 3 }), // 1RM / bodyweight
  workoutLogId: varchar("workout_log_id"),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
}, (table) => [
  index("idx_personal_records_user_id").on(table.userId),
  index("idx_personal_records_exercise_id").on(table.exerciseId),
  index("idx_personal_records_user_exercise").on(table.userId, table.exerciseId),
]);

// Historical PR Log (all PRs ever set, for progress tracking)
export const personalRecordHistory = pgTable("personal_record_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  estimated1rm: decimal("estimated_1rm", { precision: 6, scale: 2 }).notNull(),
  bodyweightAtPr: decimal("bodyweight_at_pr", { precision: 5, scale: 2 }),
  workoutLogId: varchar("workout_log_id"),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pr_history_user_id").on(table.userId),
  index("idx_pr_history_exercise_id").on(table.exerciseId),
  index("idx_pr_history_achieved_at").on(table.achievedAt),
]);

// User Strength Standards (calculated classification)
export const userStrengthStandards = pgTable("user_strength_standards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  current1rm: decimal("current_1rm", { precision: 6, scale: 2 }),
  bodyweight: decimal("bodyweight", { precision: 5, scale: 2 }),
  relativeStrength: decimal("relative_strength", { precision: 4, scale: 3 }),
  classification: varchar("classification", { length: 20 }), // Untrained, Beginner, Novice, Intermediate, Advanced, Elite
  percentile: decimal("percentile", { precision: 5, scale: 2 }),
  nextLevelTarget: decimal("next_level_target", { precision: 6, scale: 2 }),
  nextLevelClassification: varchar("next_level_classification", { length: 20 }),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_strength_standards_user_id").on(table.userId),
  index("idx_strength_standards_user_exercise").on(table.userId, table.exerciseId),
]);

// Strength Standards Reference Data (population benchmarks)
export const strengthStandardsReference = pgTable("strength_standards_reference", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  gender: varchar("gender", { length: 10 }).notNull(), // male, female
  bodyweightKg: decimal("bodyweight_kg", { precision: 5, scale: 2 }).notNull(),
  beginnerThreshold: decimal("beginner_threshold", { precision: 6, scale: 2 }),
  noviceThreshold: decimal("novice_threshold", { precision: 6, scale: 2 }),
  intermediateThreshold: decimal("intermediate_threshold", { precision: 6, scale: 2 }),
  advancedThreshold: decimal("advanced_threshold", { precision: 6, scale: 2 }),
  eliteThreshold: decimal("elite_threshold", { precision: 6, scale: 2 }),
}, (table) => [
  index("idx_strength_ref_exercise_gender").on(table.exerciseId, table.gender),
]);

// -------------------- RECOVERY & FATIGUE TRACKING --------------------

// Current Muscle Fatigue State
export const userMuscleFatigue = pgTable("user_muscle_fatigue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  muscleGroup: varchar("muscle_group", { length: 30 }).notNull(), // chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, forearms
  fatigueLevel: decimal("fatigue_level", { precision: 5, scale: 2 }).default('0'), // 0-100
  lastTrainedAt: timestamp("last_trained_at"),
  estimatedFullRecoveryAt: timestamp("estimated_full_recovery_at"),
  volumeLastSession: decimal("volume_last_session", { precision: 10, scale: 2 }),
  setsLastSession: integer("sets_last_session"),
  avgRecoveryHours: decimal("avg_recovery_hours", { precision: 5, scale: 2 }).default('48'),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_muscle_fatigue_user_id").on(table.userId),
  index("idx_muscle_fatigue_user_muscle").on(table.userId, table.muscleGroup),
]);

// Weekly/Monthly Muscle Volume Tracking
export const userMuscleVolume = pgTable("user_muscle_volume", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  muscleGroup: varchar("muscle_group", { length: 30 }).notNull(),
  volumeThisWeekKg: decimal("volume_this_week_kg", { precision: 10, scale: 2 }).default('0'),
  setsThisWeek: integer("sets_this_week").default(0),
  volumeThisMonthKg: decimal("volume_this_month_kg", { precision: 12, scale: 2 }).default('0'),
  setsThisMonth: integer("sets_this_month").default(0),
  totalVolumeKg: decimal("total_volume_kg", { precision: 14, scale: 2 }).default('0'),
  totalSets: integer("total_sets").default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_muscle_volume_user_id").on(table.userId),
  index("idx_muscle_volume_user_muscle").on(table.userId, table.muscleGroup),
]);

// Post-Workout Recovery Log
export const workoutRecoveryLog = pgTable("workout_recovery_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutLogId: varchar("workout_log_id"),
  musclesWorked: jsonb("muscles_worked").$type<{
    muscleGroup: string;
    sets: number;
    volumeKg: number;
    fatigueContribution: number;
  }[]>(),
  perceivedExertion: integer("perceived_exertion"), // 1-10 RPE scale
  muscleSoreness: integer("muscle_soreness"), // 1-10 scale
  sleepQualityLastNight: integer("sleep_quality_last_night"), // 1-10 scale
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_recovery_log_user_id").on(table.userId),
  index("idx_recovery_log_created_at").on(table.createdAt),
]);

// -------------------- AI CHAT & COACHING --------------------

// AI Chat Conversations
export const aiChatConversations = pgTable("ai_chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  category: varchar("category", { length: 50 }), // workout, nutrition, form_check, motivation, general
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_conversations_user_id").on(table.userId),
  index("idx_ai_conversations_active").on(table.isActive),
]);

// AI Chat Messages
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => aiChatConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used"),
  model: varchar("model", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_messages_conversation_id").on(table.conversationId),
  index("idx_ai_messages_created_at").on(table.createdAt),
  index("idx_ai_messages_conversation_date").on(table.conversationId, table.createdAt),
]);

// -------------------- MEAL PLANNING & NUTRITION --------------------

// Meal Plans
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetCalories: integer("target_calories"),
  targetProteinGrams: integer("target_protein_grams"),
  targetCarbsGrams: integer("target_carbs_grams"),
  targetFatGrams: integer("target_fat_grams"),
  planType: varchar("plan_type", { length: 30 }), // daily, weekly, custom
  goal: varchar("goal", { length: 50 }), // muscle_gain, fat_loss, maintenance, performance
  isAiGenerated: boolean("is_ai_generated").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_meal_plans_user_id").on(table.userId),
  index("idx_meal_plans_active").on(table.isActive),
]);

// Individual Meals
export const meals = pgTable("meals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mealPlanId: varchar("meal_plan_id").notNull().references(() => mealPlans.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // Breakfast, Lunch, Dinner, Snack, Pre-workout, Post-workout
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly plans
  mealOrder: integer("meal_order"), // Order in the day
  totalCalories: integer("total_calories"),
  totalProtein: integer("total_protein"),
  totalCarbs: integer("total_carbs"),
  totalFat: integer("total_fat"),
  foods: jsonb("foods").$type<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    groceryItem?: string;
  }[]>(),
  recipeUrl: varchar("recipe_url", { length: 500 }),
  recipeName: varchar("recipe_name", { length: 255 }),
  recipeSource: varchar("recipe_source", { length: 100 }), // spoonacular, user, ai_generated
  preparationTimeMinutes: integer("preparation_time_minutes"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_meals_meal_plan_id").on(table.mealPlanId),
]);

// Food Log (daily tracking)
export const foodLog = pgTable("food_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  logDate: timestamp("log_date").notNull(),
  mealType: varchar("meal_type", { length: 30 }), // breakfast, lunch, dinner, snack
  foodName: varchar("food_name", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 6, scale: 2 }),
  unit: varchar("unit", { length: 30 }),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fat: integer("fat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_food_log_user_id").on(table.userId),
  index("idx_food_log_date").on(table.logDate),
  index("idx_food_log_user_date").on(table.userId, table.logDate),
]);

// -------------------- SHOPPING HELPER --------------------

// Grocery Stores (cached from APIs)
export const groceryStores = pgTable("grocery_stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id", { length: 100 }), // ID from external API
  apiSource: varchar("api_source", { length: 50 }).notNull(), // google_places, kroger, walmart
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  storeType: varchar("store_type", { length: 50 }), // grocery, health_food, warehouse, organic
  chainName: varchar("chain_name", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 30 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_grocery_stores_location").on(table.latitude, table.longitude),
  index("idx_grocery_stores_chain").on(table.chainName),
]);

// Shopping Lists
export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealPlanId: varchar("meal_plan_id").references(() => mealPlans.id),
  name: varchar("name", { length: 255 }).notNull(),
  listPeriod: varchar("list_period", { length: 20 }), // daily, weekly, bi-weekly
  storeId: varchar("store_id").references(() => groceryStores.id),
  estimatedTotalCost: decimal("estimated_total_cost", { precision: 8, scale: 2 }),
  totalItems: integer("total_items"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  aiPromptUsed: text("ai_prompt_used"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_shopping_lists_user_id").on(table.userId),
  index("idx_shopping_lists_meal_plan_id").on(table.mealPlanId),
]);

// Shopping List Items
export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shoppingListId: varchar("shopping_list_id").notNull().references(() => shoppingLists.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }), // produce, meat, dairy, grains, supplements
  quantity: decimal("quantity", { precision: 6, scale: 2 }),
  unit: varchar("unit", { length: 30 }),
  storeProductId: varchar("store_product_id", { length: 100 }), // Product ID from store API
  storePrice: decimal("store_price", { precision: 8, scale: 2 }),
  storePriceUnit: varchar("store_price_unit", { length: 30 }),
  isAvailable: boolean("is_available").default(true),
  contributesToMacros: jsonb("contributes_to_macros").$type<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(),
  alternatives: jsonb("alternatives").$type<{
    name: string;
    price: number;
    productId: string;
  }[]>(),
  isPurchased: boolean("is_purchased").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_shopping_items_list_id").on(table.shoppingListId),
  index("idx_shopping_items_purchased").on(table.isPurchased),
]);

// -------------------- LEADERBOARDS & SOCIAL --------------------

// Leaderboard Definitions
export const leaderboards = pgTable("leaderboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // exercise_1rm, total_volume, streak, xp
  scope: varchar("scope", { length: 50 }).notNull(), // global, trainer_group, friends
  exerciseId: varchar("exercise_id").references(() => exercises.id),
  timeframe: varchar("timeframe", { length: 20 }).notNull(), // all_time, monthly, weekly
  genderFilter: varchar("gender_filter", { length: 10 }), // male, female, null for all
  ageGroupFilter: varchar("age_group_filter", { length: 20 }), // 18-25, 26-35, 36-45, 46+
  isActive: boolean("is_active").default(true),
  lastCalculatedAt: timestamp("last_calculated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leaderboard Entries
export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaderboardId: varchar("leaderboard_id").notNull().references(() => leaderboards.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  previousRank: integer("previous_rank"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_leaderboard_entries_leaderboard").on(table.leaderboardId),
  index("idx_leaderboard_entries_user").on(table.userId),
  index("idx_leaderboard_entries_rank").on(table.leaderboardId, table.rank),
  uniqueIndex("idx_leaderboard_entries_unique").on(table.leaderboardId, table.userId),
]);

// User Follows (social connections)
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_follows_follower").on(table.followerId),
  index("idx_user_follows_following").on(table.followingId),
  uniqueIndex("idx_user_follows_unique").on(table.followerId, table.followingId),
]);

// -------------------- WORKOUT SESSION & REST TIMER --------------------

// Active Workout Sessions
export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutLogId: varchar("workout_log_id"),
  workoutAssignmentId: varchar("workout_assignment_id").references(() => workoutAssignments.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(true),
  currentExerciseIndex: integer("current_exercise_index").default(0),
  currentSetIndex: integer("current_set_index").default(0),
  restTimerSeconds: integer("rest_timer_seconds").default(90),
  restTimerEndAt: timestamp("rest_timer_end_at"),
  totalRestTime: integer("total_rest_time").default(0), // seconds
  totalActiveTime: integer("total_active_time").default(0), // seconds
}, (table) => [
  index("idx_workout_sessions_user_id").on(table.userId),
  index("idx_workout_sessions_active").on(table.isActive),
]);

// Workout Set Logs (detailed set-by-set tracking)
export const workoutSetLogs = pgTable("workout_set_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }),
  reps: integer("reps"),
  duration: integer("duration"), // seconds for timed exercises
  distance: decimal("distance", { precision: 8, scale: 2 }), // meters for cardio
  rpe: integer("rpe"), // Rate of Perceived Exertion 1-10
  isWarmup: boolean("is_warmup").default(false),
  isDropSet: boolean("is_drop_set").default(false),
  isFailure: boolean("is_failure").default(false),
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_workout_set_logs_session").on(table.sessionId),
  index("idx_workout_set_logs_exercise").on(table.exerciseId),
  index("idx_workout_set_logs_session_exercise").on(table.sessionId, table.exerciseId, table.setNumber),
]);

// -------------------- AI GENERATED WORKOUTS --------------------

// AI Generated Workout Templates
export const aiGeneratedWorkouts = pgTable("ai_generated_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutName: varchar("workout_name", { length: 255 }).notNull(),
  workoutType: varchar("workout_type", { length: 50 }), // strength, hypertrophy, endurance, power, deload
  targetMuscleGroups: jsonb("target_muscle_groups").$type<string[]>(),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  difficulty: varchar("difficulty", { length: 20 }), // beginner, intermediate, advanced
  warmup: jsonb("warmup").$type<{exerciseName: string; duration: string; notes?: string}[]>(),
  mainWorkout: jsonb("main_workout").$type<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    sets: number;
    reps: number | string;
    restSeconds: number;
    weight?: { value?: number; unit: string; percentage1rm?: number };
    notes?: string;
    alternatives?: { exerciseId: string; exerciseName: string; reason: string }[];
  }[]>(),
  cooldown: jsonb("cooldown").$type<{exerciseName: string; duration: string; notes?: string}[]>(),
  coachingNotes: text("coaching_notes"),
  progressionSuggestion: text("progression_suggestion"),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_workouts_user_id").on(table.userId),
  index("idx_ai_workouts_created_at").on(table.createdAt),
]);

// In-App Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'workout_assigned', 'workout_completed', 'session_reminder', 'achievement_unlocked', 'streak_milestone', 'level_up', 'payment_received', 'client_joined', 'message'
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, any>>(), // Additional context (clientId, workoutId, etc.)
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_read").on(table.read),
  index("idx_notifications_created_at").on(table.createdAt),
  index("idx_notifications_user_feed").on(table.userId, table.read, table.createdAt),
]);

// Payment Plans / Packages
export const paymentPlans = pgTable("payment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  priceInCents: integer("price_in_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  billingInterval: text("billing_interval").notNull().default("monthly"), // 'monthly', 'weekly', 'one_time'
  sessionCount: integer("session_count"), // null = unlimited
  isActive: boolean("is_active").default(true).notNull(),
  stripePriceId: text("stripe_price_id"), // Stripe Price ID once created
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payment_plans_trainer_id").on(table.trainerId),
]);

// Payment Transactions
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").references(() => paymentPlans.id),
  amountInCents: integer("amount_in_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payments_trainer_id").on(table.trainerId),
  index("idx_payments_client_id").on(table.clientId),
  index("idx_payments_status").on(table.status),
]);

// Client Intake / PAR-Q Health Screening
export const clientIntake = pgTable("client_intake", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // PAR-Q Questions (Physical Activity Readiness Questionnaire)
  parqHeartCondition: boolean("parq_heart_condition"),
  parqChestPainActivity: boolean("parq_chest_pain_activity"),
  parqChestPainRest: boolean("parq_chest_pain_rest"),
  parqDizziness: boolean("parq_dizziness"),
  parqBoneJoint: boolean("parq_bone_joint"),
  parqBloodPressureMeds: boolean("parq_blood_pressure_meds"),
  parqOtherReason: boolean("parq_other_reason"),
  parqOtherDetails: text("parq_other_details"),
  // Fitness Background
  fitnessExperience: text("fitness_experience"), // 'none', 'beginner', '1-2years', '3-5years', '5plus'
  currentActivityLevel: text("current_activity_level"),
  previousInjuries: text("previous_injuries"),
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  // Goals & Preferences
  primaryGoal: text("primary_goal"),
  secondaryGoals: jsonb("secondary_goals").$type<string[]>(),
  preferredTrainingDays: jsonb("preferred_training_days").$type<string[]>(),
  preferredSessionDuration: integer("preferred_session_duration"), // minutes
  dietaryRestrictions: text("dietary_restrictions"),
  // Emergency Contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  // Consent
  consentSigned: boolean("consent_signed").default(false),
  consentSignedAt: timestamp("consent_signed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_intake_client_id").on(table.clientId),
  index("idx_client_intake_trainer_id").on(table.trainerId),
]);

// -------------------- NEW RELATIONS --------------------

export const userFitnessProfileRelations = relations(userFitnessProfile, ({ one }) => ({
  user: one(users, { fields: [userFitnessProfile.userId], references: [users.id] }),
}));

export const userGamificationRelations = relations(userGamification, ({ one }) => ({
  user: one(users, { fields: [userGamification.userId], references: [users.id] }),
}));

export const achievementsRelations = relations(achievements, ({ many, one }) => ({
  userAchievements: many(userAchievements),
  exercise: one(exercises, { fields: [achievements.requirementExerciseId], references: [exercises.id] }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));

export const xpTransactionsRelations = relations(xpTransactions, ({ one }) => ({
  user: one(users, { fields: [xpTransactions.userId], references: [users.id] }),
}));

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  user: one(users, { fields: [personalRecords.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [personalRecords.exerciseId], references: [exercises.id] }),
}));

export const personalRecordHistoryRelations = relations(personalRecordHistory, ({ one }) => ({
  user: one(users, { fields: [personalRecordHistory.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [personalRecordHistory.exerciseId], references: [exercises.id] }),
}));

export const userStrengthStandardsRelations = relations(userStrengthStandards, ({ one }) => ({
  user: one(users, { fields: [userStrengthStandards.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [userStrengthStandards.exerciseId], references: [exercises.id] }),
}));

export const strengthStandardsReferenceRelations = relations(strengthStandardsReference, ({ one }) => ({
  exercise: one(exercises, { fields: [strengthStandardsReference.exerciseId], references: [exercises.id] }),
}));

export const userMuscleFatigueRelations = relations(userMuscleFatigue, ({ one }) => ({
  user: one(users, { fields: [userMuscleFatigue.userId], references: [users.id] }),
}));

export const userMuscleVolumeRelations = relations(userMuscleVolume, ({ one }) => ({
  user: one(users, { fields: [userMuscleVolume.userId], references: [users.id] }),
}));

export const workoutRecoveryLogRelations = relations(workoutRecoveryLog, ({ one }) => ({
  user: one(users, { fields: [workoutRecoveryLog.userId], references: [users.id] }),
}));

export const aiChatConversationsRelations = relations(aiChatConversations, ({ one, many }) => ({
  user: one(users, { fields: [aiChatConversations.userId], references: [users.id] }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  conversation: one(aiChatConversations, { fields: [aiChatMessages.conversationId], references: [aiChatConversations.id] }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(users, { fields: [mealPlans.userId], references: [users.id] }),
  meals: many(meals),
  shoppingLists: many(shoppingLists),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
  mealPlan: one(mealPlans, { fields: [meals.mealPlanId], references: [mealPlans.id] }),
}));

export const foodLogRelations = relations(foodLog, ({ one }) => ({
  user: one(users, { fields: [foodLog.userId], references: [users.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  user: one(users, { fields: [shoppingLists.userId], references: [users.id] }),
  mealPlan: one(mealPlans, { fields: [shoppingLists.mealPlanId], references: [mealPlans.id] }),
  store: one(groceryStores, { fields: [shoppingLists.storeId], references: [groceryStores.id] }),
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, { fields: [shoppingListItems.shoppingListId], references: [shoppingLists.id] }),
}));

export const groceryStoresRelations = relations(groceryStores, ({ many }) => ({
  shoppingLists: many(shoppingLists),
}));

export const leaderboardsRelations = relations(leaderboards, ({ one, many }) => ({
  exercise: one(exercises, { fields: [leaderboards.exerciseId], references: [exercises.id] }),
  entries: many(leaderboardEntries),
}));

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  leaderboard: one(leaderboards, { fields: [leaderboardEntries.leaderboardId], references: [leaderboards.id] }),
  user: one(users, { fields: [leaderboardEntries.userId], references: [users.id] }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, { fields: [userFollows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [userFollows.followingId], references: [users.id], relationName: "following" }),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(users, { fields: [workoutSessions.userId], references: [users.id] }),
  workoutAssignment: one(workoutAssignments, { fields: [workoutSessions.workoutAssignmentId], references: [workoutAssignments.id] }),
  setLogs: many(workoutSetLogs),
}));

export const workoutSetLogsRelations = relations(workoutSetLogs, ({ one }) => ({
  session: one(workoutSessions, { fields: [workoutSetLogs.sessionId], references: [workoutSessions.id] }),
  exercise: one(exercises, { fields: [workoutSetLogs.exerciseId], references: [exercises.id] }),
}));

export const aiGeneratedWorkoutsRelations = relations(aiGeneratedWorkouts, ({ one }) => ({
  user: one(users, { fields: [aiGeneratedWorkouts.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const paymentPlansRelations = relations(paymentPlans, ({ one, many }) => ({
  trainer: one(users, { fields: [paymentPlans.trainerId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  trainer: one(users, { fields: [payments.trainerId], references: [users.id] }),
  client: one(clients, { fields: [payments.clientId], references: [clients.id] }),
  plan: one(paymentPlans, { fields: [payments.planId], references: [paymentPlans.id] }),
}));

export const clientIntakeRelations = relations(clientIntake, ({ one }) => ({
  client: one(clients, { fields: [clientIntake.clientId], references: [clients.id] }),
  trainer: one(users, { fields: [clientIntake.trainerId], references: [users.id] }),
}));

// -------------------- INSERT SCHEMAS FOR NEW TABLES --------------------

export const insertUserFitnessProfileSchema = createInsertSchema(userFitnessProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserGamificationSchema = createInsertSchema(userGamification).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export const insertXpTransactionSchema = createInsertSchema(xpTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({
  id: true,
  achievedAt: true,
});

export const insertPersonalRecordHistorySchema = createInsertSchema(personalRecordHistory).omit({
  id: true,
  achievedAt: true,
});

export const insertUserStrengthStandardsSchema = createInsertSchema(userStrengthStandards).omit({
  id: true,
  lastUpdated: true,
});

export const insertUserMuscleFatigueSchema = createInsertSchema(userMuscleFatigue).omit({
  id: true,
  updatedAt: true,
});

export const insertUserMuscleVolumeSchema = createInsertSchema(userMuscleVolume).omit({
  id: true,
  lastUpdated: true,
});

export const insertWorkoutRecoveryLogSchema = createInsertSchema(workoutRecoveryLog).omit({
  id: true,
  createdAt: true,
});

export const insertAiChatConversationSchema = createInsertSchema(aiChatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  createdAt: true,
});

export const insertFoodLogSchema = createInsertSchema(foodLog).omit({
  id: true,
  createdAt: true,
});

export const insertGroceryStoreSchema = createInsertSchema(groceryStores).omit({
  id: true,
  lastUpdated: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  createdAt: true,
});

export const insertLeaderboardSchema = createInsertSchema(leaderboards).omit({
  id: true,
  createdAt: true,
});

export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).omit({
  id: true,
  updatedAt: true,
});

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  startedAt: true,
});

export const insertWorkoutSetLogSchema = createInsertSchema(workoutSetLogs).omit({
  id: true,
  completedAt: true,
});

export const insertAiGeneratedWorkoutSchema = createInsertSchema(aiGeneratedWorkouts).omit({
  id: true,
  createdAt: true,
});

// -------------------- TYPES FOR NEW TABLES --------------------

export type InsertUserFitnessProfile = z.infer<typeof insertUserFitnessProfileSchema>;
export type UserFitnessProfile = typeof userFitnessProfile.$inferSelect;

export type InsertUserGamification = z.infer<typeof insertUserGamificationSchema>;
export type UserGamification = typeof userGamification.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type InsertXpTransaction = z.infer<typeof insertXpTransactionSchema>;
export type XpTransaction = typeof xpTransactions.$inferSelect;

export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
export type PersonalRecord = typeof personalRecords.$inferSelect;

export type InsertPersonalRecordHistory = z.infer<typeof insertPersonalRecordHistorySchema>;
export type PersonalRecordHistory = typeof personalRecordHistory.$inferSelect;

export type InsertUserStrengthStandards = z.infer<typeof insertUserStrengthStandardsSchema>;
export type UserStrengthStandards = typeof userStrengthStandards.$inferSelect;

export type InsertUserMuscleFatigue = z.infer<typeof insertUserMuscleFatigueSchema>;
export type UserMuscleFatigue = typeof userMuscleFatigue.$inferSelect;

export type InsertUserMuscleVolume = z.infer<typeof insertUserMuscleVolumeSchema>;
export type UserMuscleVolume = typeof userMuscleVolume.$inferSelect;

export type InsertWorkoutRecoveryLog = z.infer<typeof insertWorkoutRecoveryLogSchema>;
export type WorkoutRecoveryLog = typeof workoutRecoveryLog.$inferSelect;

export type InsertAiChatConversation = z.infer<typeof insertAiChatConversationSchema>;
export type AiChatConversation = typeof aiChatConversations.$inferSelect;

export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;
export type FoodLog = typeof foodLog.$inferSelect;

export type InsertGroceryStore = z.infer<typeof insertGroceryStoreSchema>;
export type GroceryStore = typeof groceryStores.$inferSelect;

export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;

export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type Leaderboard = typeof leaderboards.$inferSelect;

export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;

export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type UserFollow = typeof userFollows.$inferSelect;

export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;

export type InsertWorkoutSetLog = z.infer<typeof insertWorkoutSetLogSchema>;
export type WorkoutSetLog = typeof workoutSetLogs.$inferSelect;

export type InsertAiGeneratedWorkout = z.infer<typeof insertAiGeneratedWorkoutSchema>;
export type AiGeneratedWorkout = typeof aiGeneratedWorkouts.$inferSelect;

// Notification schemas and types
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Payment Plan schemas and types
export const insertPaymentPlanSchema = createInsertSchema(paymentPlans).omit({
  id: true,
  createdAt: true,
});
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;
export type PaymentPlan = typeof paymentPlans.$inferSelect;

// Payment schemas and types
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Client Intake schemas and types
export const insertClientIntakeSchema = createInsertSchema(clientIntake).omit({
  id: true,
  createdAt: true,
});
export type InsertClientIntake = z.infer<typeof insertClientIntakeSchema>;
export type ClientIntake = typeof clientIntake.$inferSelect;
