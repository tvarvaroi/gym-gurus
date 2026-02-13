// AI Service - Anthropic Claude integration for GymGurus
// Falls back to smart template-based responses when no API key is configured

const SYSTEM_PROMPT = `You are an expert fitness coach AI assistant for GymGurus, a personal training platform. You provide evidence-based advice on workouts, nutrition, recovery, and general fitness. Keep responses concise and actionable. Use a supportive, motivating tone.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Check if Anthropic API key is available
function getAnthropicKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

// AI Chat - Conversational fitness coaching
export async function aiChat(
  messages: ChatMessage[],
  userContext?: { goals?: string; experience?: string; equipment?: string[] }
): Promise<string> {
  const apiKey = getAnthropicKey();

  if (apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: SYSTEM_PROMPT + (userContext
            ? `\n\nUser context: Goals: ${userContext.goals || 'general fitness'}. Experience: ${userContext.experience || 'intermediate'}. Equipment: ${userContext.equipment?.join(', ') || 'full gym'}.`
            : ''),
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.content[0]?.text || 'I couldn\'t generate a response. Please try again.';
      }
    } catch (error) {
      console.warn('Anthropic API call failed, using fallback:', error);
    }
  }

  // Fallback: Smart template-based responses
  return generateFallbackChatResponse(messages[messages.length - 1]?.content || '');
}

// AI Workout Generation
export async function aiGenerateWorkout(params: {
  goal: string;
  experienceLevel: string;
  availableEquipment: string[];
  duration: number;
  focusMuscles?: string[];
  excludeExercises?: string[];
}): Promise<any> {
  const apiKey = getAnthropicKey();

  if (apiKey) {
    try {
      const prompt = `Generate a ${params.duration}-minute workout plan for a ${params.experienceLevel} lifter.
Goal: ${params.goal}
Equipment available: ${params.availableEquipment.join(', ')}
${params.focusMuscles ? `Focus muscles: ${params.focusMuscles.join(', ')}` : ''}
${params.excludeExercises ? `Exclude: ${params.excludeExercises.join(', ')}` : ''}

Return a JSON object with this structure:
{
  "name": "Workout name",
  "description": "Brief description",
  "warmup": [{"exercise": "name", "duration": "time", "notes": "optional"}],
  "exercises": [{"name": "Exercise Name", "sets": 3, "reps": "8-12", "rest": "60s", "muscleGroup": "chest", "notes": "optional", "alternatives": ["alt1"]}],
  "cooldown": [{"exercise": "name", "duration": "time"}],
  "estimatedCalories": 300,
  "difficulty": "${params.experienceLevel}",
  "tips": ["tip1", "tip2"]
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          system: 'You are an expert fitness coach. Return only valid JSON, no markdown or explanation.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content[0]?.text || '';
        try {
          return JSON.parse(text);
        } catch {
          // Try to extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.warn('AI workout generation failed, using fallback:', error);
    }
  }

  // Fallback: Template-based workout generation
  return generateFallbackWorkout(params);
}

// AI Meal Plan Generation
export async function aiGenerateMealPlan(params: {
  targetCalories: number;
  macros?: { protein: number; carbs: number; fat: number };
  dietaryRestrictions?: string[];
  mealsPerDay: number;
}): Promise<any> {
  const apiKey = getAnthropicKey();

  if (apiKey) {
    try {
      const prompt = `Generate a daily meal plan with ${params.mealsPerDay} meals targeting ${params.targetCalories} calories.
${params.macros ? `Target macros - Protein: ${params.macros.protein}g, Carbs: ${params.macros.carbs}g, Fat: ${params.macros.fat}g` : ''}
${params.dietaryRestrictions?.length ? `Dietary restrictions: ${params.dietaryRestrictions.join(', ')}` : ''}

Return a JSON object:
{
  "totalCalories": ${params.targetCalories},
  "meals": [{"name": "Meal name", "time": "8:00 AM", "calories": 500, "protein": 30, "carbs": 50, "fat": 15, "foods": [{"name": "Food", "amount": "1 cup", "calories": 200}]}],
  "tips": ["tip1"]
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          system: 'You are a certified nutritionist. Return only valid JSON.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content[0]?.text || '';
        try {
          return JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.warn('AI meal plan generation failed, using fallback:', error);
    }
  }

  return generateFallbackMealPlan(params);
}

// AI Progress Insights
export async function aiProgressInsights(stats: {
  workoutsThisWeek: number;
  currentStreak: number;
  totalVolume: number;
  recentPRs: string[];
  bodyWeight?: number;
}): Promise<any> {
  const apiKey = getAnthropicKey();

  if (apiKey) {
    try {
      const prompt = `Analyze this user's fitness progress and provide 3 actionable insights:
- Workouts this week: ${stats.workoutsThisWeek}
- Current streak: ${stats.currentStreak} days
- Total volume this week: ${stats.totalVolume} kg
- Recent PRs: ${stats.recentPRs.length > 0 ? stats.recentPRs.join(', ') : 'None'}
${stats.bodyWeight ? `- Body weight: ${stats.bodyWeight} kg` : ''}

Return JSON: {"insights": [{"title": "Insight title", "description": "Detail", "type": "positive|warning|tip"}], "weeklyScore": 85, "recommendation": "Overall recommendation"}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: 'You are a fitness analytics AI. Return only valid JSON.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content[0]?.text || '';
        try {
          return JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.warn('AI insights generation failed, using fallback:', error);
    }
  }

  return generateFallbackInsights(stats);
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
}): any {
  const hasBarbell = params.availableEquipment.some(e => e.toLowerCase().includes('barbell'));
  const hasDumbbells = params.availableEquipment.some(e => e.toLowerCase().includes('dumbbell'));
  const hasMachines = params.availableEquipment.some(e => e.toLowerCase().includes('machine'));

  const exercises: any[] = [];

  // Build workout based on available equipment
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
    // Cardio/endurance/general fitness
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
}): any {
  const caloriesPerMeal = Math.round(params.targetCalories / params.mealsPerDay);
  const meals = [];

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
}): any {
  const insights = [];

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
