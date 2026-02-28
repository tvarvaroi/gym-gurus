// AI Service - Vercel AI SDK with Anthropic Claude for GymGurus
// Provides streaming chat, structured generation, and fitness domain tools

import { generateText, generateObject, streamText, tool } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getDb } from '../db';
import {
  userFitnessProfile,
  workouts,
  workoutSessions,
  workoutSetLogs,
  exercises,
  users,
  userMuscleFatigue,
} from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

// ---------- Provider Setup ----------

function getProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[AI] ANTHROPIC_API_KEY is not set — all AI features will use fallbacks');
    return null;
  }
  return createAnthropic({ apiKey });
}

function getModel(modelId = 'claude-sonnet-4-6') {
  const provider = getProvider();
  if (!provider) return null;
  try {
    return provider(modelId);
  } catch (err) {
    console.error('[AI] Failed to create model:', err);
    return null;
  }
}

// Log AI readiness on first import
console.log(
  `[AI] Provider ready: ${!!process.env.ANTHROPIC_API_KEY} (key length: ${process.env.ANTHROPIC_API_KEY?.length ?? 0})`
);

// ---------- System Prompts ----------

const CHAT_SYSTEM_PROMPT = `You are GymGurus AI Coach — an expert personal trainer, strength coach, and sports nutritionist built into the GymGurus platform. You combine deep exercise science with the user's real training data to give personalized, actionable advice.

TRAINING SPLITS & METHODOLOGIES:
- Push/Pull/Legs (PPL): 3-day and 6-day variations
- Upper/Lower: 4-day frequency
- Bro Split: classic 5-day bodypart split
- Full Body: 3x/week for beginners and intermediates
- Arnold Split: chest+back, shoulders+arms, legs
- Powerlifting: Squat/Bench/Deadlift focus with accessories
- Hybrid/Powerbuilding: strength + hypertrophy combined

FAMOUS PROGRAMS & ATHLETE APPROACHES:
- Chris Bumstead: high-volume PPL, classic physique focus, moderate weight with strict form, emphasis on incline pressing and vacuum poses
- Sam Sulek: extremely high volume and intensity, trains to failure, unconventional exercise selection, massive caloric intake
- Jeff Nippard: science-based training, evidence-backed exercise selection, periodized programming, great for intermediates
- Mike Israetel / Renaissance Periodization: MEV/MAV/MRV volume landmarks, mesocycle periodization, systematic deload protocols
- Athlean-X (Jeff Cavaliere): corrective exercise focus, injury prevention, functional training mixed with hypertrophy
- Greg Doucette: moderate volume, progressive overload focus, "train harder than last time" philosophy
- nSuns 5/3/1 LP: linear progression based on Wendler's 5/3/1, high volume
- Starting Strength (Rippetoe): barbell-only, 3x5, linear progression
- StrongLifts 5x5: beginner, A/B alternating
- PHUL/PHAT: power-hypertrophy combinations
- Wendler's 5/3/1: percentage-based, 4-week cycles
- German Volume Training: 10x10 for hypertrophy
- Dorian Yates HIT: low volume, maximum intensity, one working set to failure

EXERCISE SCIENCE:
- Hypertrophy: 10-20 sets/muscle/week, RPE 7-9, 6-30 rep range
- Strength: 3-6 sets of 1-5 reps at 80-95% 1RM
- Progressive overload: weight, reps, sets, or reduced rest
- Compound first, isolation after
- Rest: 60-90s hypertrophy, 2-5min strength

NUTRITION:
- Surplus for gain: +250-500 kcal/day
- Deficit for loss: -300-500 kcal/day
- Protein: 1.6-2.2g/kg bodyweight
- Carbs: 3-7g/kg depending on activity
- Fats: minimum 0.5g/kg for hormonal health
- Supplements with evidence: creatine 3-5g/day, protein powder, caffeine, vitamin D, omega-3
- Supplements that are mostly marketing: BCAAs (if protein adequate), testosterone boosters, fat burners

REALISTIC TIMELINES:
- Beginner muscle gain: 1-2 lbs/month
- Intermediate: 0.5-1 lb/month
- Fat loss: 0.5-1% bodyweight per week is sustainable

PERSONALITY & TONE:
- Motivating but not fake — like a knowledgeable training partner
- Use gym vernacular: "working sets", "RPE", "progressive overload"
- Be direct: "Do X" not "You might consider perhaps doing X"
- When asked about influencer programs, explain accurately but note that enhanced athletes' programs may need adjusting for natural trainees
- For exercise recommendations, include sets, reps, rest, and form cues

FORMATTING:
- When creating tables, use markdown table format with each row on its own line
- ALWAYS include a blank line before and after any table
- Each table row MUST end with a newline character
- Example table format:

| Exercise | Sets | Reps | Rest |
|----------|------|------|------|
| Bench Press | 4 | 8-12 | 120s |
| OHP | 3 | 8-10 | 90s |

- For workout plans, prefer numbered lists over tables for better mobile readability

RULES:
- NEVER give medical advice. For injuries/pain, say "see a doctor or physio"
- NEVER recommend PEDs or controlled substances
- If asked about steroids, acknowledge they exist but decline usage advice
- When uncertain, say so honestly
- Cite reasoning: "This works because..." not just "Do this"
- Use metric and imperial units based on user preference (default: both)
- For unsafe requests (crash diets, losing more than 1kg/week, extreme calorie deficits below 1200 kcal, training through pain), explicitly warn that the goal is medically unsafe and recommend a safer alternative (0.5-1kg/week loss, minimum 1200-1500 kcal for women/men)
- For pain or injury questions, recommend consulting a doctor or physiotherapist before continuing training
- Never diagnose medical conditions
- Add a brief disclaimer when giving specific nutrition advice: "For personalized medical or dietary advice, consult a healthcare professional"
- You DO have conversation memory within this chat session — the previous messages in this conversation are provided to you. Reference earlier messages when relevant.

PERSONALIZATION:
- The USER PROFILE section below contains real data from the user's account — USE IT in every response
- Reference their specific weight, height, goals, and equipment when giving advice
- NEVER ask for information that's already in their profile
- If they ask "what do you know about me", summarize their profile data
- Calculate SPECIFIC numbers rather than giving ranges: use their exact weight for protein calculations (e.g., "at 82kg you need 131-180g protein/day" not "eat 1.6-2.2g/kg")
- IMPORTANT: Distinguish between COMPLETED WORKOUT SESSIONS (workouts actually performed) and SAVED WORKOUT TEMPLATES (plans created but not necessarily done). When asked about workout history, only reference completed sessions. If no sessions are completed, say so honestly — do NOT present saved templates as completed workouts.
- When asked about calories, calculate their approximate TDEE from their profile data (weight, height, age, gender, activity level) using the Mifflin-St Jeor equation, then adjust for their goal
- Suggest exercises that match their available equipment
- Respect their injuries and dietary restrictions in ALL recommendations
- Reference their recent workouts when suggesting training splits or recovery advice`;

async function buildUserContext(userId?: string, context?: UserContext): Promise<string> {
  const parts: string[] = ['\n\nUSER PROFILE:'];

  // Basic context passed from client (may be partial or missing)
  if (context?.goals) parts.push(`Goals: ${context.goals}`);
  if (context?.experience) parts.push(`Experience: ${context.experience}`);
  if (context?.equipment?.length) parts.push(`Equipment: ${context.equipment.join(', ')}`);
  if (context?.bodyWeight) parts.push(`Body weight: ${context.bodyWeight} kg`);
  if (context?.recentWorkouts) parts.push(`Recent workouts: ${context.recentWorkouts}`);
  if (context?.recentPRs?.length) parts.push(`Recent PRs: ${context.recentPRs.join(', ')}`);
  if (context?.injuries) parts.push(`Limitations: ${context.injuries}`);

  // Enrich with real data from the database
  if (userId) {
    try {
      const db = await getDb();

      // Fetch user's name
      const [user] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (user?.firstName)
        parts.push(`Name: ${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`);

      // Fitness profile: weight, body fat, goal, experience, equipment, injuries, macro targets
      const [profile] = await db
        .select()
        .from(userFitnessProfile)
        .where(eq(userFitnessProfile.userId, userId))
        .limit(1);

      if (profile) {
        if (profile.weightKg && !context?.bodyWeight)
          parts.push(`Current weight: ${profile.weightKg} kg`);
        if (profile.heightCm) parts.push(`Height: ${profile.heightCm} cm`);
        if (profile.bodyFatPercentage) parts.push(`Body fat: ${profile.bodyFatPercentage}%`);
        if (profile.gender && profile.gender !== 'prefer_not_to_say')
          parts.push(`Gender: ${profile.gender}`);
        let ageYears: number | null = null;
        if (profile.dateOfBirth) {
          ageYears = Math.floor(
            (Date.now() - new Date(profile.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
          );
          if (ageYears > 0 && ageYears < 120) parts.push(`Age: ${ageYears}`);
          else ageYears = null;
        }
        if (profile.primaryGoal && !context?.goals)
          parts.push(`Primary goal: ${String(profile.primaryGoal).replace(/_/g, ' ')}`);
        if (profile.experienceLevel && !context?.experience)
          parts.push(`Experience: ${profile.experienceLevel}`);
        if (profile.activityLevel)
          parts.push(`Activity level: ${String(profile.activityLevel).replace(/_/g, ' ')}`);
        if (profile.workoutFrequencyPerWeek)
          parts.push(`Training frequency: ${profile.workoutFrequencyPerWeek}x/week`);
        if (profile.workoutDurationMinutes)
          parts.push(`Preferred session duration: ${profile.workoutDurationMinutes} min`);
        const equip = profile.availableEquipment as string[] | null;
        if (Array.isArray(equip) && equip.length && !context?.equipment?.length)
          parts.push(`Equipment: ${equip.join(', ')}`);
        const injuries = profile.injuries as Array<{ bodyPart: string }> | null;
        if (Array.isArray(injuries) && injuries.length && !context?.injuries) {
          const injuryList = injuries.map((i) => i.bodyPart).join(', ');
          parts.push(
            `Injuries/limitations: ${injuryList} — NEVER suggest exercises that aggravate these areas`
          );
        }
        const dietary = profile.dietaryPreferences as string[] | null;
        if (Array.isArray(dietary) && dietary.length)
          parts.push(
            `Dietary restrictions: ${dietary.join(', ')} — ALL meal suggestions must respect these`
          );
        if (profile.dailyCalorieTarget)
          parts.push(`Daily calorie target: ${profile.dailyCalorieTarget} kcal`);
        if (profile.proteinTargetGrams)
          parts.push(`Protein target: ${profile.proteinTargetGrams}g`);
        if (profile.carbsTargetGrams) parts.push(`Carbs target: ${profile.carbsTargetGrams}g`);
        if (profile.fatTargetGrams) parts.push(`Fat target: ${profile.fatTargetGrams}g`);

        // Calculate and include BMR/TDEE so the AI has pre-computed stats
        const weight = Number(profile.weightKg);
        const height = Number(profile.heightCm);
        const gender = profile.gender;
        if (weight && height && ageYears && (gender === 'male' || gender === 'female')) {
          const bmr =
            gender === 'male'
              ? 10 * weight + 6.25 * height - 5 * ageYears + 5
              : 10 * weight + 6.25 * height - 5 * ageYears - 161;
          const actMultipliers: Record<string, number> = {
            sedentary: 1.2,
            lightly_active: 1.375,
            moderately_active: 1.55,
            very_active: 1.725,
            extra_active: 1.9,
          };
          const actKey = String(profile.activityLevel || 'moderately_active');
          const mult = actMultipliers[actKey] ?? 1.55;
          const tdee = Math.round(bmr * mult);
          parts.push(`\nCALCULATED STATS (Mifflin-St Jeor):`);
          parts.push(`BMR: ${Math.round(bmr)} kcal/day`);
          parts.push(`TDEE: ${tdee} kcal/day (maintenance)`);
          parts.push(`Recommended protein: ${Math.round(weight * 2.0)}g/day (2.0g/kg bodyweight)`);
        }
      }

      // Completed workout sessions (actually performed workouts)
      const completedSessions = await db
        .select({
          workoutName: workoutSessions.workoutName,
          startedAt: workoutSessions.startedAt,
          endedAt: workoutSessions.endedAt,
        })
        .from(workoutSessions)
        .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.isActive, false)))
        .orderBy(desc(workoutSessions.startedAt))
        .limit(10);

      if (completedSessions.length > 0) {
        parts.push(`\nCOMPLETED WORKOUT SESSIONS (workouts the user actually performed):`);

        // Also fetch session IDs for detailed exercise data
        const sessionsWithIds = await db
          .select({
            id: workoutSessions.id,
            workoutName: workoutSessions.workoutName,
            startedAt: workoutSessions.startedAt,
            endedAt: workoutSessions.endedAt,
            totalSets: workoutSessions.totalSets,
            totalVolumeKg: workoutSessions.totalVolumeKg,
          })
          .from(workoutSessions)
          .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.isActive, false)))
          .orderBy(desc(workoutSessions.startedAt))
          .limit(5);

        for (const s of sessionsWithIds) {
          const duration =
            s.endedAt && s.startedAt
              ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000)
              : null;
          let sessionLine = `- ${s.workoutName || 'Workout'} on ${new Date(s.startedAt).toLocaleDateString()}${duration ? ` (${duration} min)` : ''}`;
          if (s.totalVolumeKg)
            sessionLine += ` — ${Math.round(Number(s.totalVolumeKg))}kg total volume`;
          parts.push(sessionLine);

          // Fetch set logs for this session (exercise details)
          try {
            const setLogs = await db
              .select({
                exerciseName: exercises.name,
                category: exercises.category,
                weightKg: workoutSetLogs.weightKg,
                reps: workoutSetLogs.reps,
                setNumber: workoutSetLogs.setNumber,
              })
              .from(workoutSetLogs)
              .innerJoin(exercises, eq(workoutSetLogs.exerciseId, exercises.id))
              .where(eq(workoutSetLogs.sessionId, s.id))
              .orderBy(workoutSetLogs.completedAt);

            if (setLogs.length > 0) {
              // Group sets by exercise
              const byExercise = new Map<
                string,
                { category: string; sets: { weight: number; reps: number }[] }
              >();
              for (const log of setLogs) {
                const name = log.exerciseName || 'Unknown';
                if (!byExercise.has(name)) {
                  byExercise.set(name, {
                    category: log.category || '',
                    sets: [],
                  });
                }
                byExercise.get(name)!.sets.push({
                  weight: Number(log.weightKg) || 0,
                  reps: log.reps || 0,
                });
              }
              Array.from(byExercise.entries()).forEach(([exName, data]) => {
                const setsStr = data.sets
                  .map((s: { weight: number; reps: number }) => `${s.weight}kg\u00d7${s.reps}`)
                  .join(', ');
                parts.push(`  - ${exName}: ${setsStr}`);
              });
            }
          } catch {
            // set logs may not exist for older sessions
          }
        }
      } else {
        parts.push(
          `\nCOMPLETED WORKOUT SESSIONS: None yet — the user has not completed any workouts.`
        );
      }

      // Saved workout templates (plans the user created but may not have performed)
      const savedTemplates = await db
        .select({ title: workouts.title, createdAt: workouts.createdAt })
        .from(workouts)
        .where(eq(workouts.trainerId, userId))
        .orderBy(desc(workouts.createdAt))
        .limit(5);

      if (savedTemplates.length > 0) {
        parts.push(`\nSAVED WORKOUT TEMPLATES (plans created, NOT necessarily completed):`);
        for (const w of savedTemplates) {
          parts.push(`- ${w.title} (saved ${new Date(w.createdAt).toLocaleDateString()})`);
        }
      }

      // Recovery status
      const fatigueData = await db
        .select()
        .from(userMuscleFatigue)
        .where(eq(userMuscleFatigue.userId, userId));

      if (fatigueData.length > 0) {
        const now = new Date();
        const RECOVERY_HOURS: Record<string, number> = {
          chest: 48,
          back: 48,
          shoulders: 48,
          biceps: 36,
          triceps: 36,
          forearms: 24,
          quads: 72,
          hamstrings: 72,
          glutes: 72,
          calves: 48,
          abs: 24,
          obliques: 24,
          lower_back: 48,
          traps: 48,
          lats: 48,
        };
        const recovering: string[] = [];
        const recovered: string[] = [];
        for (const f of fatigueData) {
          const lastTrained = f.lastTrainedAt ? new Date(f.lastTrainedAt) : null;
          const recoveryHrs = Number(f.avgRecoveryHours) || RECOVERY_HOURS[f.muscleGroup] || 48;
          let currentFatigue = Number(f.fatigueLevel) || 0;
          if (lastTrained) {
            const hoursSince = (now.getTime() - lastTrained.getTime()) / (1000 * 60 * 60);
            const progress = Math.min(1, hoursSince / recoveryHrs);
            currentFatigue = Math.max(0, currentFatigue * (1 - progress));
          }
          if (currentFatigue >= 20) {
            recovering.push(`${f.muscleGroup} (${Math.round(currentFatigue)}% fatigued)`);
          } else {
            recovered.push(f.muscleGroup);
          }
        }
        parts.push(`\nCURRENT RECOVERY STATUS:`);
        if (recovering.length > 0) {
          parts.push(`Still recovering: ${recovering.join(', ')}`);
        }
        if (recovered.length > 0) {
          parts.push(`Fully recovered: ${recovered.join(', ')}`);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user context for AI:', err);
    }
  }

  return parts.length > 1 ? parts.join('\n') : '';
}

// ---------- Types ----------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UserContext {
  goals?: string;
  experience?: string;
  equipment?: string[];
  bodyWeight?: number;
  recentWorkouts?: string;
  recentPRs?: string[];
  injuries?: string;
}

// ---------- Fitness Domain Tools ----------

const fitnessTools = {
  calculateBMI: tool({
    description: 'Calculate Body Mass Index from weight and height',
    parameters: z.object({
      weightKg: z.number().describe('Weight in kilograms'),
      heightCm: z.number().describe('Height in centimeters'),
    }),
    execute: async ({ weightKg, heightCm }) => {
      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);
      let category: string;
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal weight';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obese';
      return { bmi: Math.round(bmi * 10) / 10, category };
    },
  }),

  calculate1RM: tool({
    description: 'Calculate estimated one-rep max using the Epley formula',
    parameters: z.object({
      weightKg: z.number().describe('Weight lifted in kilograms'),
      reps: z.number().int().min(1).max(30).describe('Number of reps performed'),
    }),
    execute: async ({ weightKg, reps }) => {
      if (reps === 1) return { estimated1RM: weightKg, formula: 'actual' };
      const e1rm = weightKg * (1 + reps / 30);
      return {
        estimated1RM: Math.round(e1rm * 10) / 10,
        formula: 'Epley',
        percentages: {
          '90%': Math.round(e1rm * 0.9 * 10) / 10,
          '80%': Math.round(e1rm * 0.8 * 10) / 10,
          '70%': Math.round(e1rm * 0.7 * 10) / 10,
          '60%': Math.round(e1rm * 0.6 * 10) / 10,
        },
      };
    },
  }),

  calculateTDEE: tool({
    description: 'Calculate Total Daily Energy Expenditure using the Mifflin-St Jeor equation',
    parameters: z.object({
      weightKg: z.number().describe('Weight in kilograms'),
      heightCm: z.number().describe('Height in centimeters'),
      age: z.number().int().describe('Age in years'),
      gender: z.enum(['male', 'female']).describe('Biological sex for BMR calculation'),
      activityLevel: z
        .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
        .describe('Activity level'),
    }),
    execute: async ({ weightKg, heightCm, age, gender, activityLevel }) => {
      let bmr: number;
      if (gender === 'male') {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
      } else {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
      }
      const multipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
      };
      const tdee = Math.round(bmr * multipliers[activityLevel]);
      return {
        bmr: Math.round(bmr),
        tdee,
        cutting: tdee - 500,
        maintenance: tdee,
        bulking: tdee + 300,
        macroSuggestion: {
          protein: Math.round(weightKg * 2),
          fat: Math.round((tdee * 0.25) / 9),
          carbs: Math.round((tdee - weightKg * 2 * 4 - tdee * 0.25) / 4),
        },
      };
    },
  }),

  suggestExercises: tool({
    description: 'Suggest exercises for a specific muscle group with available equipment',
    parameters: z.object({
      muscleGroup: z
        .enum(['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes'])
        .describe('Target muscle group'),
      equipment: z.array(z.string()).describe('Available equipment'),
      experienceLevel: z
        .enum(['beginner', 'intermediate', 'advanced'])
        .describe('User experience level'),
    }),
    execute: async ({ muscleGroup, equipment, experienceLevel }) => {
      const exerciseDB: Record<
        string,
        Array<{ name: string; equipment: string; level: string; sets: string; reps: string }>
      > = {
        chest: [
          {
            name: 'Barbell Bench Press',
            equipment: 'barbell',
            level: 'beginner',
            sets: '4',
            reps: '6-8',
          },
          {
            name: 'Dumbbell Incline Press',
            equipment: 'dumbbells',
            level: 'beginner',
            sets: '3',
            reps: '8-12',
          },
          {
            name: 'Cable Flyes',
            equipment: 'cables',
            level: 'intermediate',
            sets: '3',
            reps: '12-15',
          },
          {
            name: 'Push-ups',
            equipment: 'bodyweight',
            level: 'beginner',
            sets: '3',
            reps: '15-20',
          },
          { name: 'Dips', equipment: 'bodyweight', level: 'intermediate', sets: '3', reps: '8-12' },
        ],
        back: [
          { name: 'Barbell Row', equipment: 'barbell', level: 'beginner', sets: '4', reps: '6-8' },
          {
            name: 'Pull-ups',
            equipment: 'bodyweight',
            level: 'intermediate',
            sets: '3',
            reps: '6-10',
          },
          {
            name: 'Lat Pulldown',
            equipment: 'cables',
            level: 'beginner',
            sets: '3',
            reps: '10-12',
          },
          {
            name: 'Dumbbell Row',
            equipment: 'dumbbells',
            level: 'beginner',
            sets: '3',
            reps: '8-12',
          },
          {
            name: 'Seated Cable Row',
            equipment: 'cables',
            level: 'beginner',
            sets: '3',
            reps: '10-12',
          },
        ],
        shoulders: [
          {
            name: 'Overhead Press',
            equipment: 'barbell',
            level: 'beginner',
            sets: '4',
            reps: '6-8',
          },
          {
            name: 'Lateral Raises',
            equipment: 'dumbbells',
            level: 'beginner',
            sets: '3',
            reps: '12-15',
          },
          { name: 'Face Pulls', equipment: 'cables', level: 'beginner', sets: '3', reps: '15-20' },
          {
            name: 'Arnold Press',
            equipment: 'dumbbells',
            level: 'intermediate',
            sets: '3',
            reps: '8-12',
          },
        ],
        legs: [
          {
            name: 'Barbell Squat',
            equipment: 'barbell',
            level: 'beginner',
            sets: '4',
            reps: '6-8',
          },
          {
            name: 'Romanian Deadlift',
            equipment: 'barbell',
            level: 'intermediate',
            sets: '3',
            reps: '8-10',
          },
          { name: 'Leg Press', equipment: 'machines', level: 'beginner', sets: '3', reps: '10-12' },
          {
            name: 'Bulgarian Split Squat',
            equipment: 'dumbbells',
            level: 'intermediate',
            sets: '3',
            reps: '10-12 each',
          },
          {
            name: 'Bodyweight Squats',
            equipment: 'bodyweight',
            level: 'beginner',
            sets: '3',
            reps: '20-25',
          },
        ],
        arms: [
          {
            name: 'Barbell Curl',
            equipment: 'barbell',
            level: 'beginner',
            sets: '3',
            reps: '8-12',
          },
          {
            name: 'Tricep Pushdowns',
            equipment: 'cables',
            level: 'beginner',
            sets: '3',
            reps: '10-12',
          },
          {
            name: 'Dumbbell Hammer Curl',
            equipment: 'dumbbells',
            level: 'beginner',
            sets: '3',
            reps: '10-12',
          },
          {
            name: 'Skull Crushers',
            equipment: 'barbell',
            level: 'intermediate',
            sets: '3',
            reps: '8-10',
          },
        ],
        core: [
          { name: 'Plank', equipment: 'bodyweight', level: 'beginner', sets: '3', reps: '30-60s' },
          {
            name: 'Cable Woodchop',
            equipment: 'cables',
            level: 'intermediate',
            sets: '3',
            reps: '12 each',
          },
          {
            name: 'Hanging Leg Raise',
            equipment: 'bodyweight',
            level: 'intermediate',
            sets: '3',
            reps: '10-15',
          },
          {
            name: 'Ab Wheel Rollout',
            equipment: 'bodyweight',
            level: 'advanced',
            sets: '3',
            reps: '8-12',
          },
        ],
        glutes: [
          { name: 'Hip Thrust', equipment: 'barbell', level: 'beginner', sets: '4', reps: '8-12' },
          {
            name: 'Glute Bridge',
            equipment: 'bodyweight',
            level: 'beginner',
            sets: '3',
            reps: '15-20',
          },
          {
            name: 'Cable Kickback',
            equipment: 'cables',
            level: 'intermediate',
            sets: '3',
            reps: '12-15 each',
          },
          {
            name: 'Sumo Deadlift',
            equipment: 'barbell',
            level: 'intermediate',
            sets: '4',
            reps: '6-8',
          },
        ],
      };

      const eqLower = equipment.map((e) => e.toLowerCase());
      const levelOrder = ['beginner', 'intermediate', 'advanced'];
      const maxLevel = levelOrder.indexOf(experienceLevel);

      const exercises = (exerciseDB[muscleGroup] || [])
        .filter((ex) => {
          const equipMatch =
            eqLower.some((e) => e.includes(ex.equipment)) || ex.equipment === 'bodyweight';
          const levelMatch = levelOrder.indexOf(ex.level) <= maxLevel;
          return equipMatch && levelMatch;
        })
        .slice(0, 4);

      return { muscleGroup, exercises, count: exercises.length };
    },
  }),
};

// ---------- AI Chat (streaming) ----------

export async function aiChat(
  messages: ChatMessage[],
  userContext?: UserContext,
  userId?: string
): Promise<string> {
  const model = getModel();
  if (!model) {
    console.warn('[AI Chat] No model available — using profile-aware fallback');
    return generateFallbackChatResponse(messages[messages.length - 1]?.content || '', userId);
  }

  try {
    const userCtx = await buildUserContext(userId, userContext);
    console.log(
      `[AI Chat] Attempting Claude API call for user: ${userId}, context: ${userCtx.length} chars`
    );
    const result = await generateText({
      model,
      system: CHAT_SYSTEM_PROMPT + userCtx,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: 2048,
    });
    console.log(`[AI Chat] Claude API call succeeded, response: ${result.text.length} chars`);
    return result.text || "I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error('[AI Chat] generateText failed:', error?.message || error);
    return generateFallbackChatResponse(messages[messages.length - 1]?.content || '', userId);
  }
}

// Streaming version for SSE endpoints
export async function aiChatStream(
  messages: ChatMessage[],
  userContext?: UserContext,
  userId?: string
) {
  const model = getModel();
  if (!model) return null;

  return streamText({
    model,
    system: CHAT_SYSTEM_PROMPT + (await buildUserContext(userId, userContext)),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxTokens: 2048,
  });
}

// ---------- Structured Workout Generation ----------

const workoutSchema = z.object({
  name: z.string(),
  description: z.string(),
  warmup: z.array(
    z.object({
      exercise: z.string(),
      duration: z.string(),
      notes: z.string().optional(),
    })
  ),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.string(),
      rest: z.string(),
      muscleGroup: z.string(),
      notes: z.string().optional(),
      alternatives: z.array(z.string()).optional(),
    })
  ),
  cooldown: z.array(
    z.object({
      exercise: z.string(),
      duration: z.string(),
    })
  ),
  estimatedCalories: z.number(),
  difficulty: z.string(),
  tips: z.array(z.string()),
});

export async function aiGenerateWorkout(params: {
  goal: string;
  experienceLevel: string;
  availableEquipment: string[];
  duration: number;
  focusMuscles?: string[];
  excludeExercises?: string[];
  inspiredBy?: string;
  recoveryContext?: {
    suggestedWorkout: string;
    readyToTrain: string[];
    needsRest: string[];
  };
}): Promise<z.infer<typeof workoutSchema>> {
  const model = getModel();
  if (!model) return generateFallbackWorkout(params);

  // Map goal → explicit rep/rest/intensity guidance for the prompt
  const goalGuidance: Record<
    string,
    { repRange: string; restPeriod: string; restDetails: string; note: string }
  > = {
    strength: {
      repRange: '3-6 reps',
      restPeriod: '2-3 minutes for compounds, 60-90 seconds for isolation',
      restDetails: `REST PERIOD RULES (Strength goal — this is critical for performance):
- Heavy compound lifts (Bench Press, Squat, Deadlift, Overhead Press, Barbell Row): 150-180 seconds (2.5-3 min) — write as "150s" or "180s"
- Medium compound lifts (Incline Press, Romanian Deadlift, Pull-ups, Dips, Close-Grip Bench): 120 seconds — write as "120s"
- Isolation/accessory exercises (Lateral Raise, Curls, Tricep Extensions, Face Pulls): 60-90 seconds — write as "60s" or "90s"
IMPORTANT: Each exercise MUST have its own rest period based on the above categories. Do NOT use the same rest time for all exercises.`,
      note: 'Prioritise heavy compound lifts and maximal load',
    },
    hypertrophy: {
      repRange: '8-12 reps',
      restPeriod: '90-120 seconds for compounds, 60-90 seconds for isolation',
      restDetails: `REST PERIOD RULES (Hypertrophy goal):
- Compound lifts (Bench, Squat, Row, Press): 90-120 seconds — write as "90s" or "120s"
- Isolation exercises (Curls, Raises, Flyes, Extensions): 60-90 seconds — write as "60s" or "90s"
Each exercise should have its own rest period based on whether it's a compound or isolation movement.`,
      note: 'Moderate weight, focus on time under tension and mind-muscle connection',
    },
    endurance: {
      repRange: '15-25 reps',
      restPeriod: '30-45 seconds',
      restDetails: `REST PERIOD RULES (Endurance goal):
- All exercises: 30-45 seconds — write as "30s" or "45s"
- Keep rest minimal to maintain elevated heart rate.`,
      note: 'Lighter loads, higher volume, keep rest short',
    },
    fat_loss: {
      repRange: '12-15 reps',
      restPeriod: '30-45 seconds',
      restDetails: `REST PERIOD RULES (Fat Loss goal):
- All exercises: 30-45 seconds — write as "30s" or "45s"
- Circuit or superset format preferred, keep heart rate elevated.`,
      note: 'Circuit or superset format preferred, keep heart rate elevated throughout',
    },
  };
  const difficultyGuidance: Record<string, string> = {
    beginner:
      'Choose simple, low-technical-demand exercises. Avoid Olympic lifts or highly complex movement patterns.',
    intermediate:
      'Include a mix of compound and isolation exercises. Moderate technical demand is fine.',
    advanced:
      'Include higher-volume, complex compound movements. Can include advanced techniques like drop sets or supersets.',
  };
  const gp = goalGuidance[params.goal] ?? goalGuidance.hypertrophy;
  const dp = difficultyGuidance[params.experienceLevel] ?? difficultyGuidance.intermediate;

  try {
    const { object } = await generateObject({
      model,
      schema: workoutSchema,
      system:
        "You are an expert strength and conditioning coach with deep knowledge of training methodologies including PPL, Upper/Lower, 5/3/1, Starting Strength, PHUL, GVT, and programs associated with athletes like Chris Bumstead, Jeff Nippard, Mike Israetel, and Dorian Yates. Apply appropriate volume landmarks (MEV/MAV/MRV) by experience level: beginners 10 sets/muscle/week, intermediates 12-16, advanced 16-20. Design safe, periodized programs tailored to the user's exact specifications.",
      prompt: `Generate a ${params.duration}-minute workout for a ${params.experienceLevel} lifter.

Goal: ${params.goal}
Rep range: ${gp.repRange} per set
Intensity note: ${gp.note}
Difficulty guidance: ${dp}
Equipment available: ${params.availableEquipment.join(', ')}
${params.focusMuscles ? `Target muscles (ONLY include exercises for these muscle groups — do NOT include exercises for other muscle groups): ${params.focusMuscles.join(', ')}` : ''}
${params.excludeExercises ? `Exclude these exercises: ${params.excludeExercises.join(', ')}` : ''}
${params.inspiredBy ? `Training style: model this workout after "${params.inspiredBy}" training methodology (adapt volume, intensity, and exercise selection to match that style while respecting the user's experience level and equipment).` : ''}
${params.recoveryContext ? `Recovery context: The user's recovery system suggests a ${params.recoveryContext.suggestedWorkout} workout today. Muscles ready to train: ${params.recoveryContext.readyToTrain.join(', ') || 'all recovered'}. Muscles needing rest (avoid heavy loading): ${params.recoveryContext.needsRest.join(', ') || 'none'}.` : ''}

${gp.restDetails}

Include a proper warmup, ${Math.max(4, Math.floor(params.duration / 8))} main exercises, and a cooldown.
${params.focusMuscles ? 'Every main exercise must target the specified muscle groups only.' : ''}
Use the specified rep range for all main exercises. Use the REST PERIOD RULES above to assign the correct rest time PER EXERCISE — different exercises should have different rest periods based on their type.`,
      maxTokens: 2048,
    });
    return object;
  } catch (error) {
    console.warn('AI workout generation failed, using fallback:', error);
    return generateFallbackWorkout(params);
  }
}

// ---------- Structured Meal Plan Generation ----------

const mealPlanSchema = z.object({
  totalCalories: z.number(),
  meals: z.array(
    z.object({
      name: z.string(),
      time: z.string(),
      totalCalories: z.number(),
      totalProtein: z.number(),
      totalCarbs: z.number(),
      totalFat: z.number(),
      prepTime: z.number(),
      foods: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
        })
      ),
    })
  ),
  tips: z.array(z.string()),
});

export async function aiGenerateMealPlan(params: {
  targetCalories: number;
  macros?: { protein: number; carbs: number; fat: number };
  dietaryRestrictions?: string[];
  mealsPerDay: number;
}): Promise<z.infer<typeof mealPlanSchema>> {
  const model = getModel();
  if (!model) return generateFallbackMealPlan(params);

  try {
    const proteinTarget = params.macros?.protein ?? Math.round((params.targetCalories * 0.3) / 4);
    const minProteinPerMeal = Math.round((proteinTarget / params.mealsPerDay) * 0.85);

    const { object } = await generateObject({
      model,
      schema: mealPlanSchema,
      system: `You are a certified sports nutritionist specializing in performance nutrition for athletes and fitness enthusiasts. Design practical, balanced meal plans with accurate macronutrient data.

CRITICAL MACRO CONSTRAINTS:
- Total daily protein MUST be within 5% of the target. This is the #1 priority for fitness meal plans. If the target is ${proteinTarget}g, the total must be between ${Math.round(proteinTarget * 0.95)}g and ${Math.round(proteinTarget * 1.05)}g.
- Total daily calories should be within 10% of the target.
- Each meal must have at least ${minProteinPerMeal}g of protein. Distribute protein roughly evenly across meals.
- When building meals, start with the protein source first, then add carbs and fats around it.
- For each food item, provide accurate macros based on standard USDA/nutrition database values. Double-check that per-food protein values sum correctly to the meal total.

For each meal provide totalCalories, totalProtein, totalCarbs, totalFat (summed from individual foods) and prepTime in minutes.`,
      prompt: `Generate a daily meal plan with ${params.mealsPerDay} meals targeting ${params.targetCalories} calories.
${params.macros ? `Target macros — Protein: ${params.macros.protein}g (MUST hit within 5%), Carbs: ${params.macros.carbs}g, Fat: ${params.macros.fat}g` : `Target protein: ${proteinTarget}g (MUST hit within 5%)`}
${params.dietaryRestrictions?.length ? `Dietary restrictions: ${params.dietaryRestrictions.join(', ')} — ALL foods must comply, no exceptions` : ''}

Use whole, commonly available foods. Include prep-friendly options. Choose high-protein foods for each meal (e.g., eggs, Greek yogurt, chicken, fish, tofu, lentils, cottage cheese, whey protein). Verify that the sum of per-food protein across all meals equals the daily protein target (within 5%).`,
      maxTokens: 2048,
    });
    return object;
  } catch (error) {
    console.warn('AI meal plan generation failed, using fallback:', error);
    return generateFallbackMealPlan(params);
  }
}

// ---------- Structured Progress Insights ----------

const insightsSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(['positive', 'warning', 'tip']),
    })
  ),
  weeklyScore: z.number().min(0).max(100),
  recommendation: z.string(),
});

export async function aiProgressInsights(stats: {
  workoutsThisWeek: number;
  currentStreak: number;
  totalVolume: number;
  recentPRs: string[];
  bodyWeight?: number;
}): Promise<z.infer<typeof insightsSchema>> {
  const model = getModel();
  if (!model) return generateFallbackInsights(stats);

  try {
    const { object } = await generateObject({
      model,
      schema: insightsSchema,
      system: 'You are a fitness analytics AI. Provide actionable, motivating insights.',
      prompt: `Analyze this user's fitness progress and provide exactly 3 insights:
- Workouts this week: ${stats.workoutsThisWeek}
- Current streak: ${stats.currentStreak} days
- Total volume this week: ${stats.totalVolume} kg
- Recent PRs: ${stats.recentPRs.length > 0 ? stats.recentPRs.join(', ') : 'None'}
${stats.bodyWeight ? `- Body weight: ${stats.bodyWeight} kg` : ''}

Give a weekly score (0-100) and one overall recommendation.`,
      maxTokens: 1024,
    });
    return object;
  } catch (error) {
    console.warn('AI insights generation failed, using fallback:', error);
    return generateFallbackInsights(stats);
  }
}

// ============ Fallback Response Generators ============

async function generateFallbackChatResponse(userMessage: string, userId?: string): Promise<string> {
  const msg = userMessage.toLowerCase();

  // Fetch profile data for personalized fallback
  let profileSummary = '';
  if (userId) {
    try {
      const db = await getDb();
      const [profile] = await db
        .select()
        .from(userFitnessProfile)
        .where(eq(userFitnessProfile.userId, userId))
        .limit(1);
      const [user] = await db
        .select({ firstName: users.firstName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (profile) {
        const parts: string[] = [];
        if (user?.firstName) parts.push(`name: ${user.firstName}`);
        if (profile.weightKg) parts.push(`weight: ${profile.weightKg}kg`);
        if (profile.heightCm) parts.push(`height: ${profile.heightCm}cm`);
        if (profile.primaryGoal)
          parts.push(`goal: ${String(profile.primaryGoal).replace(/_/g, ' ')}`);
        if (profile.experienceLevel) parts.push(`level: ${profile.experienceLevel}`);
        if (profile.activityLevel)
          parts.push(`activity: ${String(profile.activityLevel).replace(/_/g, ' ')}`);
        if (profile.dailyCalorieTarget) parts.push(`cal target: ${profile.dailyCalorieTarget}`);
        if (profile.proteinTargetGrams) parts.push(`protein: ${profile.proteinTargetGrams}g`);
        if (parts.length) profileSummary = parts.join(', ');
      }
    } catch {
      // Continue without profile
    }
  }

  // If user asks what we know about them, return profile data
  if (
    msg.includes('know about me') ||
    msg.includes('my profile') ||
    msg.includes('my data') ||
    msg.includes('my stats') ||
    msg.includes('my info')
  ) {
    if (profileSummary) {
      return `Here's what I have from your profile: ${profileSummary}. You can update these in Settings > Body Stats. How can I help you with your fitness goals?`;
    }
    return "I don't have your profile data yet. Head to Settings > Body Stats to add your weight, height, and goals — then I can give you much more personalized advice!";
  }

  if (msg.includes('workout') || msg.includes('exercise') || msg.includes('training')) {
    return 'For optimal results, aim for 3-5 training sessions per week with progressive overload. Focus on compound movements like squats, deadlifts, bench press, and rows as your foundation. Make sure to increase weight or reps each week to continue making progress. Would you like me to help you create a specific workout plan?';
  }
  if (
    msg.includes('nutrition') ||
    msg.includes('diet') ||
    msg.includes('eat') ||
    msg.includes('food') ||
    msg.includes('meal')
  ) {
    return 'Nutrition is key to your fitness goals. As a general guideline: aim for 1.6-2.2g of protein per kg of bodyweight daily, fill the rest with complex carbs and healthy fats. Stay hydrated with at least 2-3 liters of water daily. Time your largest meal around your workout for optimal performance.';
  }
  if (
    msg.includes('recovery') ||
    msg.includes('rest') ||
    msg.includes('sleep') ||
    msg.includes('sore')
  ) {
    return "Recovery is when your muscles actually grow! Prioritize 7-9 hours of quality sleep each night. Allow 48-72 hours between training the same muscle group. Active recovery like walking, stretching, or light yoga can help reduce soreness. Don't forget about proper nutrition post-workout — aim for protein and carbs within 2 hours.";
  }
  if (
    msg.includes('weight loss') ||
    msg.includes('fat loss') ||
    msg.includes('lose weight') ||
    msg.includes('cut')
  ) {
    return 'For sustainable fat loss, aim for a moderate caloric deficit of 300-500 calories below your TDEE. Prioritize protein intake (2g/kg bodyweight) to preserve muscle mass. Combine resistance training 3-4x/week with 2-3 cardio sessions. Track your progress weekly — aim for 0.5-1% bodyweight loss per week. Patience and consistency are key!';
  }
  if (
    msg.includes('muscle') ||
    msg.includes('bulk') ||
    msg.includes('gain') ||
    msg.includes('grow')
  ) {
    return 'To build muscle effectively, train each muscle group 2x per week with progressive overload. Eat in a slight caloric surplus (200-400 calories above maintenance). Get 1.6-2.2g protein per kg daily, spread across 4-5 meals. Focus on the mind-muscle connection during exercises and get adequate sleep for recovery.';
  }
  if (msg.includes('stretch') || msg.includes('flexibility') || msg.includes('mobility')) {
    return 'Incorporate dynamic stretching before workouts and static stretching after. Hold each stretch for 30-60 seconds. Focus on hip flexors, hamstrings, thoracic spine, and shoulders — these are commonly tight areas. Consider adding a dedicated mobility session 1-2x per week for long-term joint health.';
  }

  if (profileSummary) {
    return `Based on your profile (${profileSummary}), I'm here to help with personalized fitness advice. Ask me about workouts, nutrition, recovery, or any fitness topic!`;
  }
  return "I'm your AI Coach, ready to help with workouts, nutrition, recovery, and more. Ask me anything about fitness!";
}

// Fallback exercise bank keyed by focus type, with barbell/dumbbell/bodyweight variants
const FALLBACK_EXERCISE_BANK: Record<
  string,
  {
    barbell: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      muscleGroup: string;
      notes?: string;
    }>;
    dumbbell: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      muscleGroup: string;
      notes?: string;
    }>;
    bodyweight: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      muscleGroup: string;
      notes?: string;
    }>;
  }
> = {
  upper_body: {
    barbell: [
      {
        name: 'Barbell Bench Press',
        sets: 4,
        reps: '6-8',
        rest: '120s',
        muscleGroup: 'chest',
        notes: 'Control the descent',
      },
      {
        name: 'Barbell Row',
        sets: 4,
        reps: '8-10',
        rest: '90s',
        muscleGroup: 'back',
        notes: 'Keep back flat',
      },
      { name: 'Overhead Press', sets: 3, reps: '8-10', rest: '90s', muscleGroup: 'shoulders' },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'biceps' },
      {
        name: 'Close-Grip Bench Press',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'triceps',
      },
    ],
    dumbbell: [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', rest: '90s', muscleGroup: 'chest' },
      { name: 'Dumbbell Row', sets: 4, reps: '10-12', rest: '60s', muscleGroup: 'back' },
      {
        name: 'Dumbbell Shoulder Press',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'shoulders',
      },
      {
        name: 'Dumbbell Lateral Raise',
        sets: 3,
        reps: '12-15',
        rest: '45s',
        muscleGroup: 'shoulders',
      },
      { name: 'Dumbbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'biceps' },
      {
        name: 'Dumbbell Tricep Kickback',
        sets: 3,
        reps: '12-15',
        rest: '45s',
        muscleGroup: 'triceps',
      },
    ],
    bodyweight: [
      { name: 'Push-ups', sets: 4, reps: '15-20', rest: '60s', muscleGroup: 'chest' },
      { name: 'Wide Push-ups', sets: 3, reps: '12-15', rest: '60s', muscleGroup: 'chest' },
      { name: 'Pull-ups', sets: 4, reps: '6-10', rest: '90s', muscleGroup: 'back' },
      { name: 'Inverted Rows', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'back' },
      { name: 'Pike Push-ups', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'shoulders' },
      { name: 'Diamond Push-ups', sets: 3, reps: '10-15', rest: '60s', muscleGroup: 'triceps' },
    ],
  },
  lower_body: {
    barbell: [
      {
        name: 'Barbell Squat',
        sets: 4,
        reps: '6-8',
        rest: '120s',
        muscleGroup: 'quads',
        notes: 'Focus on depth',
      },
      { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: '90s', muscleGroup: 'hamstrings' },
      { name: 'Barbell Hip Thrust', sets: 3, reps: '10-12', rest: '90s', muscleGroup: 'glutes' },
      { name: 'Barbell Calf Raise', sets: 4, reps: '15-20', rest: '45s', muscleGroup: 'calves' },
    ],
    dumbbell: [
      { name: 'Dumbbell Goblet Squat', sets: 4, reps: '10-12', rest: '90s', muscleGroup: 'quads' },
      {
        name: 'Dumbbell Romanian Deadlift',
        sets: 4,
        reps: '10-12',
        rest: '90s',
        muscleGroup: 'hamstrings',
      },
      {
        name: 'Dumbbell Lunges',
        sets: 3,
        reps: '10-12 each',
        rest: '60s',
        muscleGroup: 'quads/glutes',
      },
      {
        name: 'Dumbbell Step-ups',
        sets: 3,
        reps: '10-12 each',
        rest: '60s',
        muscleGroup: 'glutes',
      },
      { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '45s', muscleGroup: 'calves' },
    ],
    bodyweight: [
      { name: 'Bodyweight Squat', sets: 4, reps: '20-25', rest: '60s', muscleGroup: 'quads' },
      {
        name: 'Bulgarian Split Squat',
        sets: 3,
        reps: '10-12 each',
        rest: '60s',
        muscleGroup: 'quads/glutes',
      },
      { name: 'Glute Bridge', sets: 4, reps: '15-20', rest: '45s', muscleGroup: 'glutes' },
      {
        name: 'Reverse Lunge',
        sets: 3,
        reps: '12-15 each',
        rest: '45s',
        muscleGroup: 'quads/glutes',
      },
      { name: 'Calf Raise', sets: 4, reps: '20-25', rest: '30s', muscleGroup: 'calves' },
    ],
  },
  push: {
    barbell: [
      {
        name: 'Barbell Bench Press',
        sets: 4,
        reps: '6-8',
        rest: '120s',
        muscleGroup: 'chest',
        notes: 'Control descent',
      },
      {
        name: 'Incline Barbell Press',
        sets: 3,
        reps: '8-10',
        rest: '90s',
        muscleGroup: 'upper chest',
      },
      { name: 'Overhead Press', sets: 4, reps: '6-8', rest: '120s', muscleGroup: 'shoulders' },
      { name: 'Skull Crushers', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'triceps' },
    ],
    dumbbell: [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', rest: '90s', muscleGroup: 'chest' },
      {
        name: 'Incline Dumbbell Press',
        sets: 3,
        reps: '10-12',
        rest: '90s',
        muscleGroup: 'upper chest',
      },
      {
        name: 'Dumbbell Shoulder Press',
        sets: 4,
        reps: '8-12',
        rest: '90s',
        muscleGroup: 'shoulders',
      },
      {
        name: 'Dumbbell Lateral Raise',
        sets: 3,
        reps: '12-15',
        rest: '45s',
        muscleGroup: 'shoulders',
      },
      {
        name: 'Dumbbell Tricep Extension',
        sets: 3,
        reps: '12-15',
        rest: '60s',
        muscleGroup: 'triceps',
      },
    ],
    bodyweight: [
      { name: 'Push-ups', sets: 4, reps: '15-20', rest: '60s', muscleGroup: 'chest' },
      { name: 'Incline Push-ups', sets: 3, reps: '12-15', rest: '60s', muscleGroup: 'upper chest' },
      { name: 'Pike Push-ups', sets: 4, reps: '10-12', rest: '60s', muscleGroup: 'shoulders' },
      { name: 'Diamond Push-ups', sets: 3, reps: '10-15', rest: '60s', muscleGroup: 'triceps' },
      { name: 'Decline Push-ups', sets: 3, reps: '12-15', rest: '60s', muscleGroup: 'lower chest' },
    ],
  },
  pull: {
    barbell: [
      {
        name: 'Barbell Row',
        sets: 4,
        reps: '6-8',
        rest: '120s',
        muscleGroup: 'back',
        notes: 'Keep back flat',
      },
      {
        name: 'Deadlift',
        sets: 4,
        reps: '5-6',
        rest: '150s',
        muscleGroup: 'back',
        notes: 'Brace core throughout',
      },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'biceps' },
      {
        name: 'Reverse Barbell Curl',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'forearms',
      },
    ],
    dumbbell: [
      { name: 'Dumbbell Row', sets: 4, reps: '10-12', rest: '60s', muscleGroup: 'back' },
      {
        name: 'Dumbbell Rear Delt Fly',
        sets: 3,
        reps: '12-15',
        rest: '45s',
        muscleGroup: 'rear delts',
      },
      { name: 'Dumbbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'biceps' },
      {
        name: 'Hammer Curl',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'biceps/brachialis',
      },
      { name: 'Dumbbell Shrug', sets: 3, reps: '12-15', rest: '45s', muscleGroup: 'traps' },
    ],
    bodyweight: [
      { name: 'Pull-ups', sets: 4, reps: '6-10', rest: '90s', muscleGroup: 'back' },
      { name: 'Chin-ups', sets: 3, reps: '6-10', rest: '90s', muscleGroup: 'biceps/back' },
      { name: 'Inverted Rows', sets: 4, reps: '10-12', rest: '60s', muscleGroup: 'back' },
      { name: 'Face Pulls (band)', sets: 3, reps: '15-20', rest: '45s', muscleGroup: 'rear delts' },
    ],
  },
  legs: {
    barbell: [
      {
        name: 'Barbell Squat',
        sets: 5,
        reps: '5',
        rest: '180s',
        muscleGroup: 'quads',
        notes: 'Focus on depth and bracing',
      },
      { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: '90s', muscleGroup: 'hamstrings' },
      { name: 'Barbell Hip Thrust', sets: 4, reps: '8-12', rest: '90s', muscleGroup: 'glutes' },
      { name: 'Barbell Calf Raise', sets: 4, reps: '15-20', rest: '45s', muscleGroup: 'calves' },
      { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s', muscleGroup: 'quads' },
    ],
    dumbbell: [
      { name: 'Dumbbell Goblet Squat', sets: 4, reps: '10-12', rest: '90s', muscleGroup: 'quads' },
      {
        name: 'Dumbbell Romanian Deadlift',
        sets: 4,
        reps: '10-12',
        rest: '90s',
        muscleGroup: 'hamstrings',
      },
      {
        name: 'Dumbbell Reverse Lunge',
        sets: 3,
        reps: '10-12 each',
        rest: '60s',
        muscleGroup: 'quads/glutes',
      },
      { name: 'Dumbbell Hip Thrust', sets: 3, reps: '12-15', rest: '60s', muscleGroup: 'glutes' },
      { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '45s', muscleGroup: 'calves' },
    ],
    bodyweight: [
      { name: 'Jump Squat', sets: 4, reps: '15-20', rest: '60s', muscleGroup: 'quads' },
      {
        name: 'Bulgarian Split Squat',
        sets: 3,
        reps: '10-12 each',
        rest: '90s',
        muscleGroup: 'quads/glutes',
      },
      {
        name: 'Nordic Hamstring Curl',
        sets: 3,
        reps: '6-8',
        rest: '90s',
        muscleGroup: 'hamstrings',
      },
      {
        name: 'Single-Leg Glute Bridge',
        sets: 3,
        reps: '12-15 each',
        rest: '60s',
        muscleGroup: 'glutes',
      },
      { name: 'Donkey Calf Raise', sets: 4, reps: '20-25', rest: '30s', muscleGroup: 'calves' },
    ],
  },
  core: {
    barbell: [
      { name: 'Plank', sets: 3, reps: '45-60s hold', rest: '60s', muscleGroup: 'core' },
      { name: 'Barbell Rollout', sets: 3, reps: '8-10', rest: '60s', muscleGroup: 'abs' },
      { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', rest: '60s', muscleGroup: 'lower abs' },
      { name: 'Russian Twist', sets: 3, reps: '20 total', rest: '45s', muscleGroup: 'obliques' },
      { name: 'Dead Bug', sets: 3, reps: '10 each', rest: '45s', muscleGroup: 'core' },
    ],
    dumbbell: [
      { name: 'Plank', sets: 3, reps: '45-60s hold', rest: '60s', muscleGroup: 'core' },
      {
        name: 'Dumbbell Russian Twist',
        sets: 3,
        reps: '20 total',
        rest: '45s',
        muscleGroup: 'obliques',
      },
      { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', rest: '60s', muscleGroup: 'lower abs' },
      {
        name: 'Dumbbell Side Bend',
        sets: 3,
        reps: '15 each',
        rest: '45s',
        muscleGroup: 'obliques',
      },
      { name: 'Dead Bug', sets: 3, reps: '10 each', rest: '45s', muscleGroup: 'core' },
    ],
    bodyweight: [
      { name: 'Plank', sets: 4, reps: '45-60s hold', rest: '45s', muscleGroup: 'core' },
      { name: 'Bicycle Crunches', sets: 3, reps: '20 each', rest: '45s', muscleGroup: 'obliques' },
      { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', rest: '60s', muscleGroup: 'lower abs' },
      { name: 'Ab Wheel Rollout', sets: 3, reps: '8-12', rest: '60s', muscleGroup: 'abs' },
      { name: 'Russian Twist', sets: 3, reps: '20 total', rest: '45s', muscleGroup: 'obliques' },
      { name: 'Dead Bug', sets: 3, reps: '10 each', rest: '45s', muscleGroup: 'core' },
    ],
  },
  cardio: {
    barbell: [
      { name: 'Barbell Thruster', sets: 4, reps: '10-12', rest: '60s', muscleGroup: 'full body' },
      { name: 'Burpees', sets: 4, reps: '12-15', rest: '45s', muscleGroup: 'full body' },
      { name: 'Jump Rope', sets: 5, reps: '1 min', rest: '30s', muscleGroup: 'cardio' },
      {
        name: 'Mountain Climbers',
        sets: 4,
        reps: '30 each',
        rest: '30s',
        muscleGroup: 'core/cardio',
      },
    ],
    dumbbell: [
      { name: 'Dumbbell Thruster', sets: 4, reps: '10-12', rest: '60s', muscleGroup: 'full body' },
      { name: 'Burpees', sets: 4, reps: '12-15', rest: '45s', muscleGroup: 'full body' },
      { name: 'Dumbbell Swing', sets: 4, reps: '15-20', rest: '45s', muscleGroup: 'full body' },
      {
        name: 'Mountain Climbers',
        sets: 4,
        reps: '30 each',
        rest: '30s',
        muscleGroup: 'core/cardio',
      },
    ],
    bodyweight: [
      { name: 'Burpees', sets: 4, reps: '12-15', rest: '45s', muscleGroup: 'full body' },
      { name: 'Jump Rope', sets: 5, reps: '1 min', rest: '30s', muscleGroup: 'cardio' },
      {
        name: 'Mountain Climbers',
        sets: 4,
        reps: '30 each',
        rest: '30s',
        muscleGroup: 'core/cardio',
      },
      { name: 'High Knees', sets: 4, reps: '1 min', rest: '30s', muscleGroup: 'cardio' },
      {
        name: 'Box Jumps / Jump Squats',
        sets: 3,
        reps: '12-15',
        rest: '45s',
        muscleGroup: 'legs/cardio',
      },
    ],
  },
  full_body: {
    barbell: [
      {
        name: 'Barbell Squat',
        sets: 4,
        reps: '6-8',
        rest: '120s',
        muscleGroup: 'legs',
        notes: 'Focus on depth',
      },
      { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest: '120s', muscleGroup: 'chest' },
      { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s', muscleGroup: 'back' },
      { name: 'Overhead Press', sets: 3, reps: '8-10', rest: '90s', muscleGroup: 'shoulders' },
      { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: '90s', muscleGroup: 'hamstrings' },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'biceps' },
    ],
    dumbbell: [
      { name: 'Dumbbell Goblet Squat', sets: 3, reps: '10-12', rest: '90s', muscleGroup: 'legs' },
      { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: '90s', muscleGroup: 'chest' },
      { name: 'Dumbbell Row', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'back' },
      {
        name: 'Dumbbell Shoulder Press',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'shoulders',
      },
      {
        name: 'Dumbbell Romanian Deadlift',
        sets: 3,
        reps: '10-12',
        rest: '90s',
        muscleGroup: 'hamstrings',
      },
      { name: 'Dumbbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'biceps' },
    ],
    bodyweight: [
      { name: 'Push-ups', sets: 3, reps: '15-20', rest: '60s', muscleGroup: 'chest' },
      { name: 'Pull-ups / Inverted Rows', sets: 3, reps: '8-12', rest: '90s', muscleGroup: 'back' },
      { name: 'Bodyweight Squat', sets: 3, reps: '20-25', rest: '60s', muscleGroup: 'legs' },
      { name: 'Pike Push-ups', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'shoulders' },
      { name: 'Glute Bridge', sets: 3, reps: '15-20', rest: '45s', muscleGroup: 'glutes' },
      { name: 'Plank', sets: 3, reps: '30-60s', rest: '45s', muscleGroup: 'core' },
    ],
  },
};

/** Adjust exercise sets/reps/rest based on goal and difficulty level */
function applyGoalAndDifficulty(
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest: string;
    muscleGroup: string;
    notes?: string;
  }>,
  goal: string,
  difficulty: string
): typeof exercises {
  // Detect timed reps (e.g. "45-60s hold", "1 min", "30s") — don't override these with rep counts
  const isTimed = (reps: string) => /\d+\s*(min|sec|s\b|hold)/i.test(reps);

  const goalMap: Record<string, { reps: string; rest: string; setsDelta: number }> = {
    strength: { reps: '4-6', rest: '180s', setsDelta: 1 },
    hypertrophy: { reps: '8-12', rest: '90s', setsDelta: 0 },
    endurance: { reps: '15-20', rest: '45s', setsDelta: -1 },
    fat_loss: { reps: '12-15', rest: '45s', setsDelta: 0 },
  };
  const diffDelta: Record<string, number> = {
    beginner: -1,
    intermediate: 0,
    advanced: 1,
  };

  const g = goalMap[goal] ?? goalMap.hypertrophy;
  const dd = diffDelta[difficulty] ?? 0;

  return exercises.map((ex) => ({
    ...ex,
    sets: Math.max(2, ex.sets + g.setsDelta + dd),
    reps: isTimed(ex.reps) ? ex.reps : g.reps,
    rest: g.rest,
  }));
}

function generateFallbackWorkout(params: {
  goal: string;
  experienceLevel: string;
  availableEquipment: string[];
  duration: number;
  focusMuscles?: string[];
}): z.infer<typeof workoutSchema> {
  const hasBarbell = params.availableEquipment.some((e) => e.toLowerCase().includes('barbell'));
  const hasDumbbells = params.availableEquipment.some((e) => e.toLowerCase().includes('dumbbell'));

  // Determine which focus key to use based on focusMuscles hint
  const focusKey = detectFocusKey(params.focusMuscles);
  const bank = FALLBACK_EXERCISE_BANK[focusKey];

  // Pick the best equipment tier
  let exercises = hasBarbell ? bank.barbell : hasDumbbells ? bank.dumbbell : bank.bodyweight;

  const count = Math.max(4, Math.floor(params.duration / 8));
  exercises = exercises.slice(0, count);

  // Apply goal-specific rep/rest schemes and difficulty-based set count
  exercises = applyGoalAndDifficulty(exercises, params.goal, params.experienceLevel);

  // Warmup varies by focus
  const warmup =
    focusKey === 'lower_body' || focusKey === 'legs'
      ? [
          {
            exercise: 'Light cardio (jog/bike)',
            duration: '5 min',
            notes: 'Increase heart rate gradually',
          },
          {
            exercise: 'Leg swings & hip circles',
            duration: '3 min',
            notes: 'Open up hip mobility',
          },
        ]
      : focusKey === 'core'
        ? [
            { exercise: 'Cat-cow stretches', duration: '2 min' },
            { exercise: 'Bird dog hold', duration: '2 min', notes: '10 reps each side' },
          ]
        : focusKey === 'cardio'
          ? [
              { exercise: 'Light jog in place', duration: '3 min' },
              { exercise: 'Dynamic stretching', duration: '2 min' },
            ]
          : [
              { exercise: 'Arm circles & shoulder rotations', duration: '2 min' },
              {
                exercise: 'Band pull-aparts / chest opener',
                duration: '2 min',
                notes: 'Focus on shoulder mobility',
              },
              { exercise: 'Light cardio (jog/row)', duration: '3 min' },
            ];

  const cooldown = [
    { exercise: 'Static stretching (target muscles)', duration: '5 min' },
    { exercise: 'Deep breathing / box breathing', duration: '2 min' },
  ];

  const focusLabel = focusKey.replace(/_/g, ' ');
  const goalLabel = params.goal.replace(/_/g, ' ');

  const goalTips: Record<string, string[]> = {
    strength: [
      'Add weight each session to drive progressive overload',
      'Rest fully between sets — 2-3 min is fine',
      'Log your lifts to track strength gains week to week',
    ],
    hypertrophy: [
      'Focus on the mind-muscle connection during each rep',
      'Control the eccentric (lowering) phase for 2-3 seconds',
      'Keep rest consistent — 60-90 s gives the best hypertrophy stimulus',
    ],
    endurance: [
      'Keep rest short to maintain an elevated heart rate',
      'Prioritise breathing rhythm over load',
      'Aim to increase reps or reduce rest each week',
    ],
    fat_loss: [
      'Move quickly between exercises to keep intensity high',
      'Pair this with a modest calorie deficit for best results',
      'Cardio finishers (10 min) after this session will accelerate fat loss',
    ],
  };
  const tips = goalTips[params.goal] ?? [
    'Focus on proper form over heavy weight',
    'Stay hydrated throughout the workout',
    'If any exercise causes pain (not discomfort), stop immediately',
  ];

  return {
    name: `${focusLabel.charAt(0).toUpperCase() + focusLabel.slice(1)} — ${goalLabel.charAt(0).toUpperCase() + goalLabel.slice(1)} (${params.experienceLevel})`,
    description: `A ${params.duration}-minute ${focusLabel} workout targeting ${goalLabel} for ${params.experienceLevel} level.`,
    warmup,
    exercises,
    cooldown,
    estimatedCalories: Math.round(
      params.duration * (params.goal === 'fat_loss' || params.goal === 'endurance' ? 9 : 7)
    ),
    difficulty: params.experienceLevel,
    tips,
  };
}

/** Detect which FALLBACK_EXERCISE_BANK key matches the focusMuscles hint from the client */
function detectFocusKey(focusMuscles?: string[]): string {
  if (!focusMuscles || focusMuscles.length === 0) return 'full_body';
  const joined = focusMuscles.join(' ').toLowerCase();
  if (
    joined.includes('quad') ||
    joined.includes('hamstring') ||
    joined.includes('glute') ||
    joined.includes('calf') ||
    joined.includes('calves')
  ) {
    // Distinguish legs vs lower_body (they share muscles — default to legs for specificity)
    return 'legs';
  }
  if (joined.includes('chest') && joined.includes('shoulder') && joined.includes('tricep'))
    return 'push';
  if (joined.includes('back') && joined.includes('bicep')) return 'pull';
  if (joined.includes('chest') || joined.includes('back') || joined.includes('shoulder'))
    return 'upper_body';
  if (joined.includes('abs') || joined.includes('oblique') || joined.includes('core'))
    return 'core';
  if (joined.includes('cardiovascular') || joined.includes('conditioning')) return 'cardio';
  return 'full_body';
}

function generateFallbackMealPlan(params: {
  targetCalories: number;
  macros?: { protein: number; carbs: number; fat: number };
  mealsPerDay: number;
}): z.infer<typeof mealPlanSchema> {
  const caloriesPerMeal = Math.round(params.targetCalories / params.mealsPerDay);
  const meals: z.infer<typeof mealPlanSchema>['meals'] = [];

  const proteinPerMeal = Math.round((caloriesPerMeal * 0.3) / 4);
  const carbsPerMeal = Math.round((caloriesPerMeal * 0.4) / 4);
  const fatPerMeal = Math.round((caloriesPerMeal * 0.3) / 9);

  const mealTemplates = [
    {
      name: 'Breakfast',
      time: '8:00 AM',
      prepTime: 15,
      foods: [
        {
          name: 'Oatmeal with berries and protein',
          amount: '1 bowl',
          calories: Math.round(caloriesPerMeal * 0.4),
          protein: Math.round(proteinPerMeal * 0.3),
          carbs: Math.round(carbsPerMeal * 0.5),
          fat: Math.round(fatPerMeal * 0.2),
        },
        {
          name: 'Scrambled eggs',
          amount: '3 eggs',
          calories: Math.round(caloriesPerMeal * 0.35),
          protein: Math.round(proteinPerMeal * 0.5),
          carbs: Math.round(carbsPerMeal * 0.1),
          fat: Math.round(fatPerMeal * 0.5),
        },
        {
          name: 'Whole grain toast',
          amount: '1 slice',
          calories: Math.round(caloriesPerMeal * 0.25),
          protein: Math.round(proteinPerMeal * 0.2),
          carbs: Math.round(carbsPerMeal * 0.4),
          fat: Math.round(fatPerMeal * 0.3),
        },
      ],
    },
    {
      name: 'Lunch',
      time: '12:30 PM',
      prepTime: 20,
      foods: [
        {
          name: 'Grilled chicken breast',
          amount: '200g',
          calories: Math.round(caloriesPerMeal * 0.4),
          protein: Math.round(proteinPerMeal * 0.6),
          carbs: 0,
          fat: Math.round(fatPerMeal * 0.2),
        },
        {
          name: 'Brown rice',
          amount: '1 cup cooked',
          calories: Math.round(caloriesPerMeal * 0.3),
          protein: Math.round(proteinPerMeal * 0.1),
          carbs: Math.round(carbsPerMeal * 0.7),
          fat: Math.round(fatPerMeal * 0.1),
        },
        {
          name: 'Mixed salad with olive oil',
          amount: '1 large bowl',
          calories: Math.round(caloriesPerMeal * 0.3),
          protein: Math.round(proteinPerMeal * 0.3),
          carbs: Math.round(carbsPerMeal * 0.3),
          fat: Math.round(fatPerMeal * 0.7),
        },
      ],
    },
    {
      name: 'Snack',
      time: '3:30 PM',
      prepTime: 5,
      foods: [
        {
          name: 'Greek yogurt with nuts',
          amount: '1 cup + 30g',
          calories: Math.round(caloriesPerMeal * 0.5),
          protein: Math.round(proteinPerMeal * 0.6),
          carbs: Math.round(carbsPerMeal * 0.3),
          fat: Math.round(fatPerMeal * 0.6),
        },
        {
          name: 'Apple',
          amount: '1 medium',
          calories: Math.round(caloriesPerMeal * 0.5),
          protein: Math.round(proteinPerMeal * 0.4),
          carbs: Math.round(carbsPerMeal * 0.7),
          fat: Math.round(fatPerMeal * 0.4),
        },
      ],
    },
    {
      name: 'Dinner',
      time: '7:00 PM',
      prepTime: 25,
      foods: [
        {
          name: 'Salmon fillet',
          amount: '180g',
          calories: Math.round(caloriesPerMeal * 0.4),
          protein: Math.round(proteinPerMeal * 0.5),
          carbs: 0,
          fat: Math.round(fatPerMeal * 0.5),
        },
        {
          name: 'Sweet potato',
          amount: '1 medium',
          calories: Math.round(caloriesPerMeal * 0.3),
          protein: Math.round(proteinPerMeal * 0.1),
          carbs: Math.round(carbsPerMeal * 0.8),
          fat: Math.round(fatPerMeal * 0.1),
        },
        {
          name: 'Steamed broccoli',
          amount: '1 cup',
          calories: Math.round(caloriesPerMeal * 0.3),
          protein: Math.round(proteinPerMeal * 0.4),
          carbs: Math.round(carbsPerMeal * 0.2),
          fat: Math.round(fatPerMeal * 0.4),
        },
      ],
    },
    {
      name: 'Evening Snack',
      time: '9:00 PM',
      prepTime: 5,
      foods: [
        {
          name: 'Casein protein shake',
          amount: '1 scoop',
          calories: Math.round(caloriesPerMeal * 0.6),
          protein: Math.round(proteinPerMeal * 0.7),
          carbs: Math.round(carbsPerMeal * 0.3),
          fat: Math.round(fatPerMeal * 0.2),
        },
        {
          name: 'Peanut butter on rice cake',
          amount: '1 tbsp + 1 cake',
          calories: Math.round(caloriesPerMeal * 0.4),
          protein: Math.round(proteinPerMeal * 0.3),
          carbs: Math.round(carbsPerMeal * 0.7),
          fat: Math.round(fatPerMeal * 0.8),
        },
      ],
    },
  ];

  for (let i = 0; i < params.mealsPerDay && i < mealTemplates.length; i++) {
    const template = mealTemplates[i];
    meals.push({
      ...template,
      totalCalories: caloriesPerMeal,
      totalProtein: proteinPerMeal,
      totalCarbs: carbsPerMeal,
      totalFat: fatPerMeal,
    });
  }

  return {
    totalCalories: params.targetCalories,
    meals,
    tips: [
      'Drink water before each meal to aid digestion',
      'Prep meals in advance to stay consistent',
      'Adjust portions based on your hunger and energy levels',
    ],
  };
}

function generateFallbackInsights(stats: {
  workoutsThisWeek: number;
  currentStreak: number;
  totalVolume: number;
  recentPRs: string[];
}): z.infer<typeof insightsSchema> {
  const insights: z.infer<typeof insightsSchema>['insights'] = [];

  if (stats.workoutsThisWeek >= 4) {
    insights.push({
      title: 'Great Training Volume',
      description: `${stats.workoutsThisWeek} workouts this week — excellent consistency!`,
      type: 'positive',
    });
  } else if (stats.workoutsThisWeek >= 2) {
    insights.push({
      title: 'Good Consistency',
      description: `${stats.workoutsThisWeek} workouts this week. Try to add one more session for optimal results.`,
      type: 'tip',
    });
  } else {
    insights.push({
      title: 'Room for Improvement',
      description: 'Aim for at least 3 workouts this week to maintain progress.',
      type: 'warning',
    });
  }

  if (stats.currentStreak >= 7) {
    insights.push({
      title: 'Amazing Streak!',
      description: `${stats.currentStreak}-day streak! Your consistency is building real results.`,
      type: 'positive',
    });
  }

  if (stats.recentPRs.length > 0) {
    insights.push({
      title: 'Personal Records',
      description: `You hit ${stats.recentPRs.length} PR${stats.recentPRs.length > 1 ? 's' : ''} recently. Progressive overload is working!`,
      type: 'positive',
    });
  }

  insights.push({
    title: 'Recovery Tip',
    description:
      "Make sure you're getting 7-9 hours of sleep for optimal muscle recovery and growth.",
    type: 'tip',
  });

  const weeklyScore = Math.min(
    100,
    Math.round(
      (stats.workoutsThisWeek / 5) * 40 +
        (Math.min(stats.currentStreak, 7) / 7) * 30 +
        (stats.recentPRs.length > 0 ? 15 : 0) +
        15
    )
  );

  return {
    insights: insights.slice(0, 3),
    weeklyScore,
    recommendation:
      stats.workoutsThisWeek >= 3
        ? 'Keep up the great work! Focus on progressive overload this week.'
        : 'Try to increase your training frequency to see faster results.',
  };
}
