// Client-safe Zod validators - no drizzle-orm dependency
// These mirror the insert schemas from schema.ts but are defined with plain Zod
// so they can be imported by client code without pulling drizzle-orm into the bundle.
import { z } from "zod";

// Client insert schema (mirrors createInsertSchema(clients).omit({ id, createdAt }))
export const insertClientSchema = z.object({
  trainerId: z.string(),
  name: z.string(),
  email: z.string(),
  goal: z.string(),
  status: z.string().default("active"),
  age: z.number().nullable().optional(),
  gender: z.string().nullable().optional(),
  height: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  activityLevel: z.string().nullable().optional(),
  neckCircumference: z.string().nullable().optional(),
  waistCircumference: z.string().nullable().optional(),
  hipCircumference: z.string().nullable().optional(),
  lastSession: z.coerce.date().nullable().optional(),
  nextSession: z.coerce.date().nullable().optional(),
});

// Workout insert schema (mirrors createInsertSchema(workouts).omit({ id, createdAt }))
export const insertWorkoutSchema = z.object({
  trainerId: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  difficulty: z.string(),
  category: z.string(),
});

// Types inferred from validators
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
