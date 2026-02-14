import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the AI service fallback functions (no API key needed)
// We test the exported functions which fall back to template responses when ANTHROPIC_API_KEY is not set

describe('AI Service - Fallback Mode (no API key)', () => {
  let aiService: typeof import('../aiService');

  beforeEach(async () => {
    // Ensure no API key is set so fallback mode is used
    delete process.env.ANTHROPIC_API_KEY;
    // Fresh import each time
    vi.resetModules();
    aiService = await import('../aiService');
  });

  describe('aiChat', () => {
    it('returns workout advice for workout-related messages', async () => {
      const result = await aiService.aiChat([
        { role: 'user', content: 'How should I structure my workout routine?' },
      ]);
      expect(result).toContain('training');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
    });

    it('returns nutrition advice for diet-related messages', async () => {
      const result = await aiService.aiChat([
        { role: 'user', content: 'What should I eat for muscle growth?' },
      ]);
      expect(result).toContain('protein');
    });

    it('returns recovery advice for recovery-related messages', async () => {
      const result = await aiService.aiChat([
        { role: 'user', content: 'How can I improve my sleep and recovery?' },
      ]);
      expect(result).toContain('Recovery');
    });

    it('returns weight loss advice for fat loss messages', async () => {
      const result = await aiService.aiChat([
        { role: 'user', content: 'How do I lose weight effectively?' },
      ]);
      expect(result).toContain('fat loss');
    });

    it('returns generic advice for unrecognized topics', async () => {
      const result = await aiService.aiChat([
        { role: 'user', content: 'Hello, what can you help with?' },
      ]);
      expect(result).toContain('fitness');
      expect(typeof result).toBe('string');
    });

    it('handles empty message history gracefully', async () => {
      const result = await aiService.aiChat([]);
      expect(typeof result).toBe('string');
    });
  });

  describe('aiGenerateWorkout', () => {
    it('generates a workout with barbell exercises for strength goal', async () => {
      const workout = await aiService.aiGenerateWorkout({
        goal: 'Strength',
        experienceLevel: 'intermediate',
        availableEquipment: ['barbell', 'dumbbells'],
        duration: 45,
      });

      expect(workout).toHaveProperty('name');
      expect(workout).toHaveProperty('exercises');
      expect(workout).toHaveProperty('warmup');
      expect(workout).toHaveProperty('cooldown');
      expect(workout).toHaveProperty('estimatedCalories');
      expect(workout).toHaveProperty('difficulty');
      expect(workout).toHaveProperty('tips');
      expect(workout.exercises.length).toBeGreaterThanOrEqual(4);
      expect(workout.warmup.length).toBeGreaterThan(0);
      expect(workout.cooldown.length).toBeGreaterThan(0);
      expect(workout.tips.length).toBeGreaterThan(0);
    });

    it('generates bodyweight exercises when no equipment available', async () => {
      const workout = await aiService.aiGenerateWorkout({
        goal: 'Muscle building',
        experienceLevel: 'beginner',
        availableEquipment: [],
        duration: 30,
      });

      expect(workout.exercises.length).toBeGreaterThan(0);
      const exerciseNames = workout.exercises.map(e => e.name.toLowerCase());
      const hasBodyweight = exerciseNames.some(n =>
        n.includes('push-up') || n.includes('squat') || n.includes('pull-up') || n.includes('plank') || n.includes('burpee')
      );
      expect(hasBodyweight).toBe(true);
    });

    it('generates cardio-focused workout for cardio goal', async () => {
      const workout = await aiService.aiGenerateWorkout({
        goal: 'Cardio endurance',
        experienceLevel: 'intermediate',
        availableEquipment: ['dumbbells'],
        duration: 30,
      });

      expect(workout.exercises.length).toBeGreaterThan(0);
    });

    it('includes proper structure in each exercise', async () => {
      const workout = await aiService.aiGenerateWorkout({
        goal: 'Strength',
        experienceLevel: 'intermediate',
        availableEquipment: ['barbell'],
        duration: 60,
      });

      for (const exercise of workout.exercises) {
        expect(exercise).toHaveProperty('name');
        expect(exercise).toHaveProperty('sets');
        expect(exercise).toHaveProperty('reps');
        expect(exercise).toHaveProperty('rest');
        expect(exercise).toHaveProperty('muscleGroup');
        expect(typeof exercise.sets).toBe('number');
      }
    });
  });

  describe('aiGenerateMealPlan', () => {
    it('generates a meal plan matching target calories', async () => {
      const plan = await aiService.aiGenerateMealPlan({
        targetCalories: 2000,
        mealsPerDay: 4,
      });

      expect(plan).toHaveProperty('totalCalories', 2000);
      expect(plan).toHaveProperty('meals');
      expect(plan.meals.length).toBe(4);
      expect(plan).toHaveProperty('tips');
      expect(plan.tips.length).toBeGreaterThan(0);
    });

    it('generates correct number of meals', async () => {
      const plan = await aiService.aiGenerateMealPlan({
        targetCalories: 2500,
        mealsPerDay: 3,
      });

      expect(plan.meals.length).toBe(3);
    });

    it('includes proper macro breakdown in each meal', async () => {
      const plan = await aiService.aiGenerateMealPlan({
        targetCalories: 2000,
        mealsPerDay: 4,
      });

      for (const meal of plan.meals) {
        expect(meal).toHaveProperty('name');
        expect(meal).toHaveProperty('time');
        expect(meal).toHaveProperty('calories');
        expect(meal).toHaveProperty('protein');
        expect(meal).toHaveProperty('carbs');
        expect(meal).toHaveProperty('fat');
        expect(meal).toHaveProperty('foods');
        expect(meal.foods.length).toBeGreaterThan(0);
      }
    });
  });

  describe('aiProgressInsights', () => {
    it('returns positive insight for high workout count', async () => {
      const result = await aiService.aiProgressInsights({
        workoutsThisWeek: 5,
        currentStreak: 10,
        totalVolume: 10000,
        recentPRs: ['Bench Press 100kg', 'Squat 140kg'],
      });

      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('weeklyScore');
      expect(result).toHaveProperty('recommendation');
      expect(result.insights.length).toBeLessThanOrEqual(3);
      expect(result.weeklyScore).toBeGreaterThan(50);

      const types = result.insights.map(i => i.type);
      expect(types.some(t => t === 'positive')).toBe(true);
    });

    it('returns warning for low workout count', async () => {
      const result = await aiService.aiProgressInsights({
        workoutsThisWeek: 1,
        currentStreak: 1,
        totalVolume: 1000,
        recentPRs: [],
      });

      const types = result.insights.map(i => i.type);
      expect(types.some(t => t === 'warning')).toBe(true);
      expect(result.weeklyScore).toBeLessThan(50);
    });

    it('returns score between 0 and 100', async () => {
      const result = await aiService.aiProgressInsights({
        workoutsThisWeek: 3,
        currentStreak: 5,
        totalVolume: 5000,
        recentPRs: [],
      });

      expect(result.weeklyScore).toBeGreaterThanOrEqual(0);
      expect(result.weeklyScore).toBeLessThanOrEqual(100);
    });
  });
});
