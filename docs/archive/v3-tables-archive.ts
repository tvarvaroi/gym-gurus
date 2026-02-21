/**
 * GymGurus V3 Tables Archive
 *
 * This file contains table definitions that were planned for V3 features but never implemented.
 * These tables are archived before the auth rewrite to keep the schema clean and focused.
 *
 * ARCHIVED ON: 2026-02-19
 *
 * TABLES ARCHIVED:
 * 1. strengthStandardsReference - Strength standards reference data (population benchmarks)
 * 2. leaderboards - Leaderboard definitions (unused, current leaderboards query userGamification directly)
 * 3. leaderboardEntries - Leaderboard entries (unused, current leaderboards query userGamification directly)
 * 4. userFollows - Social connections/following system
 * 5. mealPlans - Meal planning feature
 * 6. meals - Individual meals within meal plans
 * 7. foodLog - Daily food tracking
 * 8. groceryStores - Grocery store location data
 * 9. shoppingLists - Shopping list feature
 * 10. shoppingListItems - Items within shopping lists
 *
 * WHY ARCHIVED:
 * - Zero usage in actual codebase (no queries, no UI components)
 * - V3 features never implemented
 * - Clean up before auth rewrite
 * - Preserve designs for potential future implementation
 *
 * NOTE: All used V3 tables remain in schema.ts:
 * - userFitnessProfile, userGamification, achievements, userAchievements, xpTransactions
 * - personalRecords, personalRecordHistory, userStrengthStandards
 * - userMuscleFatigue, userMuscleVolume, workoutRecoveryLog
 * - aiChatConversations, aiChatMessages
 * - workoutSessions, workoutSetLogs, aiGeneratedWorkouts
 * - notifications, paymentPlans, payments, clientIntake
 */

import {
  pgTable,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  text,
  jsonb,
  index,
  uniqueIndex,
  sql,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Note: These references would need to be imported from schema.ts if re-implementing:
// import { exercises, users, mealPlans, shoppingLists } from '@shared/schema';

// For the archive, we'll keep the structure but note that exercises and users are external references

// -------------------- STRENGTH STANDARDS --------------------

// Strength Standards Reference Data (population benchmarks)
export const strengthStandardsReference = pgTable(
  'strength_standards_reference',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    exerciseId: varchar('exercise_id').notNull(),
    // .references(() => exercises.id, { onDelete: 'cascade' }),
    gender: varchar('gender', { length: 10 }).notNull(), // male, female
    bodyweightKg: decimal('bodyweight_kg', { precision: 5, scale: 2 }).notNull(),
    beginnerThreshold: decimal('beginner_threshold', { precision: 6, scale: 2 }),
    noviceThreshold: decimal('novice_threshold', { precision: 6, scale: 2 }),
    intermediateThreshold: decimal('intermediate_threshold', { precision: 6, scale: 2 }),
    advancedThreshold: decimal('advanced_threshold', { precision: 6, scale: 2 }),
    eliteThreshold: decimal('elite_threshold', { precision: 6, scale: 2 }),
  },
  (table) => [index('idx_strength_ref_exercise_gender').on(table.exerciseId, table.gender)]
);

// -------------------- LEADERBOARDS & SOCIAL --------------------

// Leaderboard Definitions
export const leaderboards = pgTable('leaderboards', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // exercise_1rm, total_volume, streak, xp
  scope: varchar('scope', { length: 50 }).notNull(), // global, trainer_group, friends
  exerciseId: varchar('exercise_id'),
  // .references(() => exercises.id),
  timeframe: varchar('timeframe', { length: 20 }).notNull(), // all_time, monthly, weekly
  genderFilter: varchar('gender_filter', { length: 10 }), // male, female, null for all
  ageGroupFilter: varchar('age_group_filter', { length: 20 }), // 18-25, 26-35, 36-45, 46+
  isActive: boolean('is_active').default(true),
  lastCalculatedAt: timestamp('last_calculated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leaderboard Entries
export const leaderboardEntries = pgTable(
  'leaderboard_entries',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    leaderboardId: varchar('leaderboard_id').notNull(),
    // .references(() => leaderboards.id, { onDelete: 'cascade' }),
    userId: varchar('user_id').notNull(),
    // .references(() => users.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull(),
    value: decimal('value', { precision: 12, scale: 2 }).notNull(),
    previousRank: integer('previous_rank'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_leaderboard_entries_leaderboard').on(table.leaderboardId),
    index('idx_leaderboard_entries_user').on(table.userId),
    index('idx_leaderboard_entries_rank').on(table.leaderboardId, table.rank),
    uniqueIndex('idx_leaderboard_entries_unique').on(table.leaderboardId, table.userId),
  ]
);

// User Follows (social connections)
export const userFollows = pgTable(
  'user_follows',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    followerId: varchar('follower_id').notNull(),
    // .references(() => users.id, { onDelete: 'cascade' }),
    followingId: varchar('following_id').notNull(),
    // .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_follows_follower').on(table.followerId),
    index('idx_user_follows_following').on(table.followingId),
    uniqueIndex('idx_user_follows_unique').on(table.followerId, table.followingId),
  ]
);

// -------------------- MEAL PLANNING & NUTRITION --------------------

// Meal Plans
export const mealPlans = pgTable(
  'meal_plans',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id').notNull(),
    // .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    targetCalories: integer('target_calories'),
    targetProteinGrams: integer('target_protein_grams'),
    targetCarbsGrams: integer('target_carbs_grams'),
    targetFatGrams: integer('target_fat_grams'),
    planType: varchar('plan_type', { length: 30 }), // daily, weekly, custom
    goal: varchar('goal', { length: 50 }), // muscle_gain, fat_loss, maintenance, performance
    isAiGenerated: boolean('is_ai_generated').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_meal_plans_user_id').on(table.userId),
    index('idx_meal_plans_active').on(table.isActive),
  ]
);

// Individual Meals
export const meals = pgTable(
  'meals',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    mealPlanId: varchar('meal_plan_id').notNull(),
    // .references(() => mealPlans.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(), // Breakfast, Lunch, Dinner, Snack, Pre-workout, Post-workout
    dayOfWeek: integer('day_of_week'), // 0-6 for weekly plans
    mealOrder: integer('meal_order'), // Order in the day
    totalCalories: integer('total_calories'),
    totalProtein: integer('total_protein'),
    totalCarbs: integer('total_carbs'),
    totalFat: integer('total_fat'),
    foods: jsonb('foods').$type<
      {
        name: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        groceryItem?: string;
      }[]
    >(),
    recipeUrl: varchar('recipe_url', { length: 500 }),
    recipeName: varchar('recipe_name', { length: 255 }),
    recipeSource: varchar('recipe_source', { length: 100 }), // spoonacular, user, ai_generated
    preparationTimeMinutes: integer('preparation_time_minutes'),
    instructions: text('instructions'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_meals_meal_plan_id').on(table.mealPlanId)]
);

// Food Log (daily tracking)
export const foodLog = pgTable(
  'food_log',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id').notNull(),
    // .references(() => users.id, { onDelete: 'cascade' }),
    logDate: timestamp('log_date').notNull(),
    mealType: varchar('meal_type', { length: 30 }), // breakfast, lunch, dinner, snack
    foodName: varchar('food_name', { length: 255 }).notNull(),
    quantity: decimal('quantity', { precision: 6, scale: 2 }),
    unit: varchar('unit', { length: 30 }),
    calories: integer('calories'),
    protein: integer('protein'),
    carbs: integer('carbs'),
    fat: integer('fat'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_food_log_user_id').on(table.userId),
    index('idx_food_log_date').on(table.logDate),
    index('idx_food_log_user_date').on(table.userId, table.logDate),
  ]
);

// -------------------- SHOPPING HELPER --------------------

// Grocery Stores (cached from APIs)
export const groceryStores = pgTable(
  'grocery_stores',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    externalId: varchar('external_id', { length: 100 }), // ID from external API
    apiSource: varchar('api_source', { length: 50 }).notNull(), // google_places, kroger, walmart
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 500 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 50 }),
    zipCode: varchar('zip_code', { length: 20 }),
    country: varchar('country', { length: 50 }),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    storeType: varchar('store_type', { length: 50 }), // grocery, health_food, warehouse, organic
    chainName: varchar('chain_name', { length: 100 }),
    phoneNumber: varchar('phone_number', { length: 30 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => [
    index('idx_grocery_stores_location').on(table.latitude, table.longitude),
    index('idx_grocery_stores_chain').on(table.chainName),
  ]
);

// Shopping Lists
export const shoppingLists = pgTable(
  'shopping_lists',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id').notNull(),
    // .references(() => users.id, { onDelete: 'cascade' }),
    mealPlanId: varchar('meal_plan_id'),
    // .references(() => mealPlans.id),
    name: varchar('name', { length: 255 }).notNull(),
    listPeriod: varchar('list_period', { length: 20 }), // daily, weekly, bi-weekly
    storeId: varchar('store_id'),
    // .references(() => groceryStores.id),
    estimatedTotalCost: decimal('estimated_total_cost', { precision: 8, scale: 2 }),
    totalItems: integer('total_items'),
    isAiGenerated: boolean('is_ai_generated').default(false),
    aiPromptUsed: text('ai_prompt_used'),
    isCompleted: boolean('is_completed').default(false),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_shopping_lists_user_id').on(table.userId),
    index('idx_shopping_lists_meal_plan_id').on(table.mealPlanId),
  ]
);

// Shopping List Items
export const shoppingListItems = pgTable(
  'shopping_list_items',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shoppingListId: varchar('shopping_list_id').notNull(),
    // .references(() => shoppingLists.id, { onDelete: 'cascade' }),
    itemName: varchar('item_name', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }), // produce, meat, dairy, grains, supplements
    quantity: decimal('quantity', { precision: 6, scale: 2 }),
    unit: varchar('unit', { length: 30 }),
    storeProductId: varchar('store_product_id', { length: 100 }), // Product ID from store API
    storePrice: decimal('store_price', { precision: 8, scale: 2 }),
    storePriceUnit: varchar('store_price_unit', { length: 30 }),
    isAvailable: boolean('is_available').default(true),
    contributesToMacros: jsonb('contributes_to_macros').$type<{
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>(),
    alternatives: jsonb('alternatives').$type<
      {
        name: string;
        price: number;
        productId: string;
      }[]
    >(),
    isPurchased: boolean('is_purchased').default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_shopping_items_list_id').on(table.shoppingListId),
    index('idx_shopping_items_purchased').on(table.isPurchased),
  ]
);

// -------------------- RELATIONS --------------------

export const strengthStandardsReferenceRelations = relations(
  strengthStandardsReference,
  ({ one }) => ({
    // exercise: one(exercises, {
    //   fields: [strengthStandardsReference.exerciseId],
    //   references: [exercises.id],
    // }),
  })
);

export const leaderboardsRelations = relations(leaderboards, ({ one, many }) => ({
  // exercise: one(exercises, { fields: [leaderboards.exerciseId], references: [exercises.id] }),
  entries: many(leaderboardEntries),
}));

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  leaderboard: one(leaderboards, {
    fields: [leaderboardEntries.leaderboardId],
    references: [leaderboards.id],
  }),
  // user: one(users, { fields: [leaderboardEntries.userId], references: [users.id] }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  // follower: one(users, {
  //   fields: [userFollows.followerId],
  //   references: [users.id],
  //   relationName: 'follower',
  // }),
  // following: one(users, {
  //   fields: [userFollows.followingId],
  //   references: [users.id],
  //   relationName: 'following',
  // }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  // user: one(users, { fields: [mealPlans.userId], references: [users.id] }),
  meals: many(meals),
  shoppingLists: many(shoppingLists),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
  mealPlan: one(mealPlans, { fields: [meals.mealPlanId], references: [mealPlans.id] }),
}));

export const foodLogRelations = relations(foodLog, ({ one }) => ({
  // user: one(users, { fields: [foodLog.userId], references: [users.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  // user: one(users, { fields: [shoppingLists.userId], references: [users.id] }),
  mealPlan: one(mealPlans, { fields: [shoppingLists.mealPlanId], references: [mealPlans.id] }),
  store: one(groceryStores, { fields: [shoppingLists.storeId], references: [groceryStores.id] }),
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, {
    fields: [shoppingListItems.shoppingListId],
    references: [shoppingLists.id],
  }),
}));

export const groceryStoresRelations = relations(groceryStores, ({ many }) => ({
  shoppingLists: many(shoppingLists),
}));

// -------------------- INSERT SCHEMAS --------------------

export const insertStrengthStandardsReferenceSchema = createInsertSchema(
  strengthStandardsReference
).omit({
  id: true,
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

// -------------------- TYPES --------------------

export type StrengthStandardsReference = typeof strengthStandardsReference.$inferSelect;
export type InsertStrengthStandardsReference = z.infer<
  typeof insertStrengthStandardsReferenceSchema
>;

export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;

export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;

export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;

export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

export type FoodLog = typeof foodLog.$inferSelect;
export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;

export type GroceryStore = typeof groceryStores.$inferSelect;
export type InsertGroceryStore = z.infer<typeof insertGroceryStoreSchema>;

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;

export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
