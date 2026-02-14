// AI Service - Vercel AI SDK with Anthropic Claude for GymGurus
// Provides streaming chat, structured generation, and fitness domain tools

import { generateText, generateObject, streamText, tool } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// ---------- Provider Setup ----------

function getProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return createAnthropic({ apiKey });
}

function getModel(modelId = 'claude-sonnet-4-5-20250929') {
  const provider = getProvider();
  if (!provider) return null;
  return provider(modelId);
}

// ---------- System Prompts ----------

const CHAT_SYSTEM_PROMPT = `You are GymGurus AI Coach — an expert, evidence-based fitness coach built into the GymGurus personal training platform. You help users with workouts, nutrition, recovery, and general fitness questions.

Guidelines:
- Be concise and actionable. Prefer bullet points over long paragraphs.
- Use a supportive, motivating tone. Celebrate wins, encourage consistency.
- Cite general fitness science principles when relevant (e.g., progressive overload, SAID principle).
- Never provide medical diagnoses or prescribe medication. If asked about injuries or medical conditions, recommend consulting a healthcare professional.
- When unsure, say so rather than guessing.
- Use metric and imperial units based on user preference (default: both).
- For exercise recommendations, include sets, reps, rest periods, and form cues.
- For nutrition advice, provide specific macro targets when possible.`;

function buildUserContext(context?: UserContext): string {
  if (!context) return '';
  const parts: string[] = ['\n\nUser profile:'];
  if (context.goals) parts.push(`- Goals: ${context.goals}`);
  if (context.experience) parts.push(`- Experience level: ${context.experience}`);
  if (context.equipment?.length) parts.push(`- Equipment: ${context.equipment.join(', ')}`);
  if (context.bodyWeight) parts.push(`- Body weight: ${context.bodyWeight} kg`);
  if (context.recentWorkouts) parts.push(`- Recent workouts: ${context.recentWorkouts}`);
  if (context.recentPRs?.length) parts.push(`- Recent PRs: ${context.recentPRs.join(', ')}`);
  if (context.injuries) parts.push(`- Known injuries/limitations: ${context.injuries}`);
  return parts.join('\n');
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
      activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).describe('Activity level'),
    }),
    execute: async ({ weightKg, heightCm, age, gender, activityLevel }) => {
      let bmr: number;
      if (gender === 'male') {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
      } else {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
      }
      const multipliers: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
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
          fat: Math.round(tdee * 0.25 / 9),
          carbs: Math.round((tdee - (weightKg * 2 * 4) - (tdee * 0.25)) / 4),
        },
      };
    },
  }),

  suggestExercises: tool({
    description: 'Suggest exercises for a specific muscle group with available equipment',
    parameters: z.object({
      muscleGroup: z.enum(['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes']).describe('Target muscle group'),
      equipment: z.array(z.string()).describe('Available equipment'),
      experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('User experience level'),
    }),
    execute: async ({ muscleGroup, equipment, experienceLevel }) => {
      const exerciseDB: Record<string, Array<{ name: string; equipment: string; level: string; sets: string; reps: string }>> = {
        chest: [
          { name: 'Barbell Bench Press', equipment: 'barbell', level: 'beginner', sets: '4', reps: '6-8' },
          { name: 'Dumbbell Incline Press', equipment: 'dumbbells', level: 'beginner', sets: '3', reps: '8-12' },
          { name: 'Cable Flyes', equipment: 'cables', level: 'intermediate', sets: '3', reps: '12-15' },
          { name: 'Push-ups', equipment: 'bodyweight', level: 'beginner', sets: '3', reps: '15-20' },
          { name: 'Dips', equipment: 'bodyweight', level: 'intermediate', sets: '3', reps: '8-12' },
        ],
        back: [
          { name: 'Barbell Row', equipment: 'barbell', level: 'beginner', sets: '4', reps: '6-8' },
          { name: 'Pull-ups', equipment: 'bodyweight', level: 'intermediate', sets: '3', reps: '6-10' },
          { name: 'Lat Pulldown', equipment: 'cables', level: 'beginner', sets: '3', reps: '10-12' },
          { name: 'Dumbbell Row', equipment: 'dumbbells', level: 'beginner', sets: '3', reps: '8-12' },
          { name: 'Seated Cable Row', equipment: 'cables', level: 'beginner', sets: '3', reps: '10-12' },
        ],
        shoulders: [
          { name: 'Overhead Press', equipment: 'barbell', level: 'beginner', sets: '4', reps: '6-8' },
          { name: 'Lateral Raises', equipment: 'dumbbells', level: 'beginner', sets: '3', reps: '12-15' },
          { name: 'Face Pulls', equipment: 'cables', level: 'beginner', sets: '3', reps: '15-20' },
          { name: 'Arnold Press', equipment: 'dumbbells', level: 'intermediate', sets: '3', reps: '8-12' },
        ],
        legs: [
          { name: 'Barbell Squat', equipment: 'barbell', level: 'beginner', sets: '4', reps: '6-8' },
          { name: 'Romanian Deadlift', equipment: 'barbell', level: 'intermediate', sets: '3', reps: '8-10' },
          { name: 'Leg Press', equipment: 'machines', level: 'beginner', sets: '3', reps: '10-12' },
          { name: 'Bulgarian Split Squat', equipment: 'dumbbells', level: 'intermediate', sets: '3', reps: '10-12 each' },
          { name: 'Bodyweight Squats', equipment: 'bodyweight', level: 'beginner', sets: '3', reps: '20-25' },
        ],
        arms: [
          { name: 'Barbell Curl', equipment: 'barbell', level: 'beginner', sets: '3', reps: '8-12' },
          { name: 'Tricep Pushdowns', equipment: 'cables', level: 'beginner', sets: '3', reps: '10-12' },
          { name: 'Dumbbell Hammer Curl', equipment: 'dumbbells', level: 'beginner', sets: '3', reps: '10-12' },
          { name: 'Skull Crushers', equipment: 'barbell', level: 'intermediate', sets: '3', reps: '8-10' },
        ],
        core: [
          { name: 'Plank', equipment: 'bodyweight', level: 'beginner', sets: '3', reps: '30-60s' },
          { name: 'Cable Woodchop', equipment: 'cables', level: 'intermediate', sets: '3', reps: '12 each' },
          { name: 'Hanging Leg Raise', equipment: 'bodyweight', level: 'intermediate', sets: '3', reps: '10-15' },
          { name: 'Ab Wheel Rollout', equipment: 'bodyweight', level: 'advanced', sets: '3', reps: '8-12' },
        ],
        glutes: [
          { name: 'Hip Thrust', equipment: 'barbell', level: 'beginner', sets: '4', reps: '8-12' },
          { name: 'Glute Bridge', equipment: 'bodyweight', level: 'beginner', sets: '3', reps: '15-20' },
          { name: 'Cable Kickback', equipment: 'cables', level: 'intermediate', sets: '3', reps: '12-15 each' },
          { name: 'Sumo Deadlift', equipment: 'barbell', level: 'intermediate', sets: '4', reps: '6-8' },
        ],
      };

      const eqLower = equipment.map(e => e.toLowerCase());
      const levelOrder = ['beginner', 'intermediate', 'advanced'];
      const maxLevel = levelOrder.indexOf(experienceLevel);

      const exercises = (exerciseDB[muscleGroup] || [])
        .filter(ex => {
          const equipMatch = eqLower.some(e => e.includes(ex.equipment)) || ex.equipment === 'bodyweight';
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
): Promise<string> {
  const model = getModel();
  if (!model) {
    return generateFallbackChatResponse(messages[messages.length - 1]?.content || '');
  }

  try {
    const result = await generateText({
      model,
      system: CHAT_SYSTEM_PROMPT + buildUserContext(userContext),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      tools: fitnessTools,
      maxSteps: 3,
      maxTokens: 1024,
    });
    return result.text || 'I couldn\'t generate a response. Please try again.';
  } catch (error) {
    console.warn('AI SDK chat failed, using fallback:', error);
    return generateFallbackChatResponse(messages[messages.length - 1]?.content || '');
  }
}

// Streaming version for SSE endpoints
export function aiChatStream(
  messages: ChatMessage[],
  userContext?: UserContext,
) {
  const model = getModel();
  if (!model) return null;

  return streamText({
    model,
    system: CHAT_SYSTEM_PROMPT + buildUserContext(userContext),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    tools: fitnessTools,
    maxSteps: 3,
    maxTokens: 1024,
  });
}

// ---------- Structured Workout Generation ----------

const workoutSchema = z.object({
  name: z.string(),
  description: z.string(),
  warmup: z.array(z.object({
    exercise: z.string(),
    duration: z.string(),
    notes: z.string().optional(),
  })),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number(),
    reps: z.string(),
    rest: z.string(),
    muscleGroup: z.string(),
    notes: z.string().optional(),
    alternatives: z.array(z.string()).optional(),
  })),
  cooldown: z.array(z.object({
    exercise: z.string(),
    duration: z.string(),
  })),
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
}): Promise<z.infer<typeof workoutSchema>> {
  const model = getModel();
  if (!model) return generateFallbackWorkout(params);

  try {
    const { object } = await generateObject({
      model,
      schema: workoutSchema,
      system: 'You are an expert strength and conditioning coach. Design safe, effective workout programs.',
      prompt: `Generate a ${params.duration}-minute workout for a ${params.experienceLevel} lifter.
Goal: ${params.goal}
Equipment: ${params.availableEquipment.join(', ')}
${params.focusMuscles ? `Focus muscles: ${params.focusMuscles.join(', ')}` : ''}
${params.excludeExercises ? `Exclude: ${params.excludeExercises.join(', ')}` : ''}

Include a proper warmup, ${Math.max(4, Math.floor(params.duration / 8))} exercises, and a cooldown.`,
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
  meals: z.array(z.object({
    name: z.string(),
    time: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    foods: z.array(z.object({
      name: z.string(),
      amount: z.string(),
      calories: z.number(),
    })),
  })),
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
    const { object } = await generateObject({
      model,
      schema: mealPlanSchema,
      system: 'You are a certified sports nutritionist. Design practical, balanced meal plans.',
      prompt: `Generate a daily meal plan with ${params.mealsPerDay} meals targeting ${params.targetCalories} calories.
${params.macros ? `Target macros — Protein: ${params.macros.protein}g, Carbs: ${params.macros.carbs}g, Fat: ${params.macros.fat}g` : ''}
${params.dietaryRestrictions?.length ? `Dietary restrictions: ${params.dietaryRestrictions.join(', ')}` : ''}

Use whole, commonly available foods. Include prep-friendly options.`,
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
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['positive', 'warning', 'tip']),
  })),
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

function generateFallbackChatResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('workout') || msg.includes('exercise') || msg.includes('training')) {
    return "For optimal results, aim for 3-5 training sessions per week with progressive overload. Focus on compound movements like squats, deadlifts, bench press, and rows as your foundation. Make sure to increase weight or reps each week to continue making progress. Would you like me to help you create a specific workout plan?";
  }
  if (msg.includes('nutrition') || msg.includes('diet') || msg.includes('eat') || msg.includes('food') || msg.includes('meal')) {
    return "Nutrition is key to your fitness goals. As a general guideline: aim for 1.6-2.2g of protein per kg of bodyweight daily, fill the rest with complex carbs and healthy fats. Stay hydrated with at least 2-3 liters of water daily. Time your largest meal around your workout for optimal performance.";
  }
  if (msg.includes('recovery') || msg.includes('rest') || msg.includes('sleep') || msg.includes('sore')) {
    return "Recovery is when your muscles actually grow! Prioritize 7-9 hours of quality sleep each night. Allow 48-72 hours between training the same muscle group. Active recovery like walking, stretching, or light yoga can help reduce soreness. Don't forget about proper nutrition post-workout — aim for protein and carbs within 2 hours.";
  }
  if (msg.includes('weight loss') || msg.includes('fat loss') || msg.includes('lose weight') || msg.includes('cut')) {
    return "For sustainable fat loss, aim for a moderate caloric deficit of 300-500 calories below your TDEE. Prioritize protein intake (2g/kg bodyweight) to preserve muscle mass. Combine resistance training 3-4x/week with 2-3 cardio sessions. Track your progress weekly — aim for 0.5-1% bodyweight loss per week. Patience and consistency are key!";
  }
  if (msg.includes('muscle') || msg.includes('bulk') || msg.includes('gain') || msg.includes('grow')) {
    return "To build muscle effectively, train each muscle group 2x per week with progressive overload. Eat in a slight caloric surplus (200-400 calories above maintenance). Get 1.6-2.2g protein per kg daily, spread across 4-5 meals. Focus on the mind-muscle connection during exercises and get adequate sleep for recovery.";
  }
  if (msg.includes('stretch') || msg.includes('flexibility') || msg.includes('mobility')) {
    return "Incorporate dynamic stretching before workouts and static stretching after. Hold each stretch for 30-60 seconds. Focus on hip flexors, hamstrings, thoracic spine, and shoulders — these are commonly tight areas. Consider adding a dedicated mobility session 1-2x per week for long-term joint health.";
  }

  return "That's a great question! Here are some general fitness tips: Stay consistent with your training, prioritize compound movements, eat adequate protein, get enough sleep, and track your progress. Would you like specific advice about workouts, nutrition, or recovery?";
}

function generateFallbackWorkout(params: {
  goal: string;
  experienceLevel: string;
  availableEquipment: string[];
  duration: number;
  focusMuscles?: string[];
}): z.infer<typeof workoutSchema> {
  const hasBarbell = params.availableEquipment.some(e => e.toLowerCase().includes('barbell'));
  const hasDumbbells = params.availableEquipment.some(e => e.toLowerCase().includes('dumbbell'));

  const exercises: Array<{ name: string; sets: number; reps: string; rest: string; muscleGroup: string; notes?: string }> = [];

  if (params.goal.toLowerCase().includes('strength') || params.goal.toLowerCase().includes('muscle')) {
    if (hasBarbell) {
      exercises.push(
        { name: 'Barbell Squat', sets: 4, reps: '6-8', rest: '120s', muscleGroup: 'legs', notes: 'Focus on depth and form' },
        { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest: '120s', muscleGroup: 'chest', notes: 'Control the descent' },
        { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s', muscleGroup: 'back', notes: 'Keep back flat' },
        { name: 'Overhead Press', sets: 3, reps: '8-10', rest: '90s', muscleGroup: 'shoulders' },
      );
    }
    if (hasDumbbells) {
      exercises.push(
        { name: 'Dumbbell Lunges', sets: 3, reps: '10-12 each', rest: '60s', muscleGroup: 'legs' },
        { name: 'Dumbbell Curl', sets: 3, reps: '10-12', rest: '60s', muscleGroup: 'arms' },
        { name: 'Dumbbell Lateral Raise', sets: 3, reps: '12-15', rest: '45s', muscleGroup: 'shoulders' },
      );
    }
    if (!hasBarbell && !hasDumbbells) {
      exercises.push(
        { name: 'Push-ups', sets: 4, reps: '15-20', rest: '60s', muscleGroup: 'chest' },
        { name: 'Bodyweight Squats', sets: 4, reps: '20-25', rest: '60s', muscleGroup: 'legs' },
        { name: 'Pull-ups / Inverted Rows', sets: 3, reps: '8-12', rest: '90s', muscleGroup: 'back' },
        { name: 'Plank', sets: 3, reps: '30-60s hold', rest: '45s', muscleGroup: 'core' },
        { name: 'Burpees', sets: 3, reps: '10-15', rest: '60s', muscleGroup: 'full body' },
      );
    }
  } else {
    exercises.push(
      { name: 'Jump Rope', sets: 3, reps: '2 min', rest: '30s', muscleGroup: 'cardio' },
      { name: 'Goblet Squat', sets: 3, reps: '15', rest: '45s', muscleGroup: 'legs' },
      { name: 'Push-ups', sets: 3, reps: '12-15', rest: '30s', muscleGroup: 'chest' },
      { name: 'Mountain Climbers', sets: 3, reps: '20 each', rest: '30s', muscleGroup: 'core' },
      { name: 'Dumbbell Rows', sets: 3, reps: '12', rest: '45s', muscleGroup: 'back' },
      { name: 'Burpees', sets: 3, reps: '10', rest: '45s', muscleGroup: 'full body' },
    );
  }

  return {
    name: `${params.goal} Workout - ${params.experienceLevel}`,
    description: `A ${params.duration}-minute ${params.goal.toLowerCase()} focused workout designed for ${params.experienceLevel} level.`,
    warmup: [
      { exercise: 'Light cardio (jog/bike)', duration: '5 min', notes: 'Gradually increase heart rate' },
      { exercise: 'Dynamic stretching', duration: '3 min', notes: 'Arm circles, leg swings, hip rotations' },
    ],
    exercises: exercises.slice(0, Math.max(4, Math.floor(params.duration / 8))),
    cooldown: [
      { exercise: 'Static stretching', duration: '5 min' },
      { exercise: 'Deep breathing', duration: '2 min' },
    ],
    estimatedCalories: Math.round(params.duration * 7),
    difficulty: params.experienceLevel,
    tips: [
      'Focus on proper form over heavy weight',
      'Stay hydrated throughout the workout',
      'If any exercise causes pain (not discomfort), stop immediately',
    ],
  };
}

function generateFallbackMealPlan(params: {
  targetCalories: number;
  macros?: { protein: number; carbs: number; fat: number };
  mealsPerDay: number;
}): z.infer<typeof mealPlanSchema> {
  const caloriesPerMeal = Math.round(params.targetCalories / params.mealsPerDay);
  const meals: z.infer<typeof mealPlanSchema>['meals'] = [];

  const mealTemplates = [
    { name: 'Breakfast', time: '8:00 AM', foods: [{ name: 'Oatmeal with berries and protein', amount: '1 bowl', calories: Math.round(caloriesPerMeal * 0.4) }, { name: 'Scrambled eggs', amount: '3 eggs', calories: Math.round(caloriesPerMeal * 0.35) }, { name: 'Whole grain toast', amount: '1 slice', calories: Math.round(caloriesPerMeal * 0.25) }] },
    { name: 'Lunch', time: '12:30 PM', foods: [{ name: 'Grilled chicken breast', amount: '200g', calories: Math.round(caloriesPerMeal * 0.4) }, { name: 'Brown rice', amount: '1 cup cooked', calories: Math.round(caloriesPerMeal * 0.3) }, { name: 'Mixed salad with olive oil', amount: '1 large bowl', calories: Math.round(caloriesPerMeal * 0.3) }] },
    { name: 'Snack', time: '3:30 PM', foods: [{ name: 'Greek yogurt with nuts', amount: '1 cup + 30g', calories: Math.round(caloriesPerMeal * 0.5) }, { name: 'Apple', amount: '1 medium', calories: Math.round(caloriesPerMeal * 0.5) }] },
    { name: 'Dinner', time: '7:00 PM', foods: [{ name: 'Salmon fillet', amount: '180g', calories: Math.round(caloriesPerMeal * 0.4) }, { name: 'Sweet potato', amount: '1 medium', calories: Math.round(caloriesPerMeal * 0.3) }, { name: 'Steamed broccoli', amount: '1 cup', calories: Math.round(caloriesPerMeal * 0.3) }] },
    { name: 'Evening Snack', time: '9:00 PM', foods: [{ name: 'Casein protein shake', amount: '1 scoop', calories: Math.round(caloriesPerMeal * 0.6) }, { name: 'Peanut butter on rice cake', amount: '1 tbsp + 1 cake', calories: Math.round(caloriesPerMeal * 0.4) }] },
  ];

  for (let i = 0; i < params.mealsPerDay && i < mealTemplates.length; i++) {
    const template = mealTemplates[i];
    meals.push({
      ...template,
      calories: caloriesPerMeal,
      protein: Math.round(caloriesPerMeal * 0.3 / 4),
      carbs: Math.round(caloriesPerMeal * 0.4 / 4),
      fat: Math.round(caloriesPerMeal * 0.3 / 9),
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
    insights.push({ title: 'Great Training Volume', description: `${stats.workoutsThisWeek} workouts this week — excellent consistency!`, type: 'positive' });
  } else if (stats.workoutsThisWeek >= 2) {
    insights.push({ title: 'Good Consistency', description: `${stats.workoutsThisWeek} workouts this week. Try to add one more session for optimal results.`, type: 'tip' });
  } else {
    insights.push({ title: 'Room for Improvement', description: 'Aim for at least 3 workouts this week to maintain progress.', type: 'warning' });
  }

  if (stats.currentStreak >= 7) {
    insights.push({ title: 'Amazing Streak!', description: `${stats.currentStreak}-day streak! Your consistency is building real results.`, type: 'positive' });
  }

  if (stats.recentPRs.length > 0) {
    insights.push({ title: 'Personal Records', description: `You hit ${stats.recentPRs.length} PR${stats.recentPRs.length > 1 ? 's' : ''} recently. Progressive overload is working!`, type: 'positive' });
  }

  insights.push({ title: 'Recovery Tip', description: 'Make sure you\'re getting 7-9 hours of sleep for optimal muscle recovery and growth.', type: 'tip' });

  const weeklyScore = Math.min(100, Math.round(
    (stats.workoutsThisWeek / 5) * 40 +
    Math.min(stats.currentStreak, 7) / 7 * 30 +
    (stats.recentPRs.length > 0 ? 15 : 0) +
    15
  ));

  return {
    insights: insights.slice(0, 3),
    weeklyScore,
    recommendation: stats.workoutsThisWeek >= 3
      ? 'Keep up the great work! Focus on progressive overload this week.'
      : 'Try to increase your training frequency to see faster results.',
  };
}
