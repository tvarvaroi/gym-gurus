import { Router, Request, Response } from 'express';
import { aiChat, aiChatStream, aiGenerateWorkout, aiGenerateMealPlan, aiProgressInsights } from '../services/aiService';
import { db } from '../db';
import { aiChatConversations, aiChatMessages } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

/**
 * AI Chat Coach Endpoint
 * POST /api/ai/chat
 * Uses Vercel AI SDK with Anthropic Claude, falls back to template responses
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, conversationId, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build message history from conversation if exists
    let messages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (conversationId) {
      try {
        const database = await db;
        const history = await database
          .select()
          .from(aiChatMessages)
          .where(eq(aiChatMessages.conversationId, conversationId))
          .orderBy(aiChatMessages.createdAt)
          .limit(20);

        messages = history.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      } catch {
        // Continue without history
      }
    }

    messages.push({ role: 'user', content: message });

    const response = await aiChat(messages, context);

    // Save to database
    let activeConversationId = conversationId;
    try {
      const database = await db;
      if (!activeConversationId && userId) {
        const [conv] = await database.insert(aiChatConversations).values({
          userId,
          title: message.slice(0, 50),
        }).returning();
        activeConversationId = conv.id;
      }

      if (activeConversationId) {
        await database.insert(aiChatMessages).values([
          { conversationId: activeConversationId, role: 'user', content: message },
          { conversationId: activeConversationId, role: 'assistant', content: response },
        ]);
      }
    } catch {
      // Non-critical: continue even if DB save fails
    }

    res.json({
      message: response,
      conversationId: activeConversationId || 'temp-' + Date.now(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

/**
 * AI Chat Stream Endpoint (Server-Sent Events)
 * POST /api/ai/chat/stream
 * Streams AI response token-by-token via SSE
 */
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, conversationId, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build message history
    let messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (conversationId) {
      try {
        const database = await db;
        const history = await database
          .select()
          .from(aiChatMessages)
          .where(eq(aiChatMessages.conversationId, conversationId))
          .orderBy(aiChatMessages.createdAt)
          .limit(20);
        messages = history.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      } catch {
        // Continue without history
      }
    }
    messages.push({ role: 'user', content: message });

    const stream = aiChatStream(messages, context);
    if (!stream) {
      // No API key — return non-streamed fallback
      const fallback = await aiChat(messages, context);
      return res.json({ message: fallback, conversationId: conversationId || 'temp-' + Date.now() });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullResponse = '';
    const result = await stream;

    for await (const chunk of result.textStream) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    // Save conversation after streaming completes
    let activeConversationId = conversationId;
    try {
      const database = await db;
      if (!activeConversationId && userId) {
        const [conv] = await database.insert(aiChatConversations).values({
          userId,
          title: message.slice(0, 50),
        }).returning();
        activeConversationId = conv.id;
      }
      if (activeConversationId) {
        await database.insert(aiChatMessages).values([
          { conversationId: activeConversationId, role: 'user', content: message },
          { conversationId: activeConversationId, role: 'assistant', content: fullResponse },
        ]);
      }
    } catch {
      // Non-critical
    }

    res.write(`data: ${JSON.stringify({ type: 'done', conversationId: activeConversationId || 'temp-' + Date.now() })}\n\n`);
    res.end();
  } catch (error) {
    console.error('AI Chat Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI streaming service temporarily unavailable' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

/**
 * AI Workout Generator
 * POST /api/ai/generate-workout
 */
router.post('/generate-workout', async (req: Request, res: Response) => {
  try {
    const {
      goal,
      experienceLevel,
      availableEquipment,
      duration,
      focusMuscles,
      excludeExercises,
    } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Fitness goal is required' });
    }

    const workout = await aiGenerateWorkout({
      goal,
      experienceLevel: experienceLevel || 'intermediate',
      availableEquipment: availableEquipment || ['barbell', 'dumbbells', 'machines'],
      duration: duration || 45,
      focusMuscles,
      excludeExercises,
    });

    res.json({
      workout: {
        id: 'ai-generated-' + Date.now(),
        ...workout,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI Workout Generation error:', error);
    res.status(500).json({ error: 'Workout generation service temporarily unavailable' });
  }
});

/**
 * AI Meal Plan Generator
 * POST /api/ai/generate-meal-plan
 */
router.post('/generate-meal-plan', async (req: Request, res: Response) => {
  try {
    const {
      targetCalories,
      macros,
      dietaryRestrictions,
      mealsPerDay,
    } = req.body;

    if (!targetCalories) {
      return res.status(400).json({ error: 'Target calories required' });
    }

    const mealPlan = await aiGenerateMealPlan({
      targetCalories,
      macros,
      dietaryRestrictions,
      mealsPerDay: mealsPerDay || 4,
    });

    res.json({
      mealPlan: {
        id: 'ai-meal-plan-' + Date.now(),
        ...mealPlan,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI Meal Plan Generation error:', error);
    res.status(500).json({ error: 'Meal plan generation service temporarily unavailable' });
  }
});

/**
 * AI Exercise Form Analysis
 * POST /api/ai/analyze-form
 */
router.post('/analyze-form', async (req: Request, res: Response) => {
  try {
    const { exerciseName } = req.body;

    const formTips: Record<string, string[]> = {
      squat: ['Keep chest up and core braced', 'Push knees out over toes', 'Break at hips and knees simultaneously', 'Aim for at least parallel depth'],
      'bench press': ['Retract shoulder blades', 'Maintain slight arch in lower back', 'Lower bar to mid-chest', 'Drive feet into floor'],
      deadlift: ['Keep bar close to body', 'Hips and shoulders rise together', 'Brace core throughout', 'Lock out hips at top'],
      'overhead press': ['Brace core tight', 'Press bar in a slight arc', 'Full lockout overhead', 'Move head through at top'],
    };

    const exercise = exerciseName?.toLowerCase() || '';
    const tips = formTips[exercise] || [
      'Focus on controlled movement through full range of motion',
      'Maintain proper breathing — exhale on exertion',
      'Keep core engaged throughout the movement',
      'Start with lighter weight to perfect form',
    ];

    res.json({
      analysis: {
        exerciseName: exerciseName || 'General',
        feedback: `Here are key form cues for ${exerciseName || 'this exercise'}:`,
        tips,
        score: null,
        note: 'Video-based form analysis with AI vision coming in a future update.',
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI Form Analysis error:', error);
    res.status(500).json({ error: 'Form analysis service temporarily unavailable' });
  }
});

/**
 * AI Progress Insights
 * POST /api/ai/progress-insights
 */
router.post('/progress-insights', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { workoutsThisWeek, currentStreak, totalVolume, recentPRs, bodyWeight } = req.body;

    const insights = await aiProgressInsights({
      workoutsThisWeek: workoutsThisWeek || 0,
      currentStreak: currentStreak || 0,
      totalVolume: totalVolume || 0,
      recentPRs: recentPRs || [],
      bodyWeight,
    });

    res.json({
      userId,
      ...insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Progress Insights error:', error);
    res.status(500).json({ error: 'Progress insights service temporarily unavailable' });
  }
});

/**
 * Get AI Chat History
 * GET /api/ai/conversations/:conversationId
 */
router.get('/conversations/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const database = await db;

    const messages = await database
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.conversationId, conversationId))
      .orderBy(aiChatMessages.createdAt);

    res.json({
      conversationId,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get Conversation error:', error);
    res.json({ conversationId: req.params.conversationId, messages: [] });
  }
});

/**
 * List User Conversations
 * GET /api/ai/conversations
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;
    const conversations = await database
      .select()
      .from(aiChatConversations)
      .where(eq(aiChatConversations.userId, userId))
      .orderBy(desc(aiChatConversations.updatedAt))
      .limit(20);

    res.json({ conversations });
  } catch (error) {
    console.error('List Conversations error:', error);
    res.json({ conversations: [] });
  }
});

export default router;
