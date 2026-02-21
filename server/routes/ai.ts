import { Router, Request, Response } from 'express';
import {
  aiChat,
  aiChatStream,
  aiGenerateWorkout,
  aiGenerateMealPlan,
  aiProgressInsights,
} from '../services/aiService';
import { getDb } from '../db';
import { aiChatConversations, aiChatMessages } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import {
  checkAndReserveSlot,
  releaseConcurrentSlot,
  recordUsage,
  getUsageSummary,
  MAX_CONVERSATION_MESSAGES,
} from '../services/aiUsage';

const router = Router();

// ---------- Helpers ----------

function requireApiKey(res: Response): boolean {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[AI] ANTHROPIC_API_KEY not set — AI features unavailable');
    res.status(503).json({ error: 'AI service not configured. Contact support.' });
    return false;
  }
  return true;
}

function sendLimitError(res: Response, reason: string, remaining: number, limit: number): void {
  const messages: Record<string, string> = {
    no_subscription: 'An active subscription is required to use AI features.',
    trial_expired: 'Your free trial has ended. Upgrade to continue using AI features.',
    daily_limit_reached: `You've used all ${limit} AI requests for today. Your limit resets at midnight UTC.`,
    too_many_concurrent:
      'Too many active AI requests. Please wait for a previous request to complete.',
  };
  res.status(402).json({
    error: 'ai_limit_reached',
    reason,
    message: messages[reason] ?? 'AI request limit reached.',
    remaining,
    limit,
    upgradePath: '/pricing',
  });
}

// ---------- GET /usage ----------

/**
 * GET /api/ai/usage
 * Returns today's request count, token count, limit, remaining, and reset time.
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const summary = await getUsageSummary(user);
    res.json(summary);
  } catch (error) {
    console.error('AI usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// ---------- POST /chat ----------

/**
 * AI Chat Coach Endpoint
 * POST /api/ai/chat
 * Uses Vercel AI SDK with Anthropic Claude, falls back to template responses
 */
router.post('/chat', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!requireApiKey(res)) return;

  const slot = await checkAndReserveSlot(user);
  if (!slot.allowed) {
    return sendLimitError(res, slot.reason!, slot.remaining, slot.limit);
  }

  let tokensUsed = 0;
  try {
    const { message, conversationId, context } = req.body;

    if (!message) {
      releaseConcurrentSlot(user.id);
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build message history from conversation if exists
    let messages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (conversationId) {
      try {
        const db = await getDb();
        const history = await db
          .select()
          .from(aiChatMessages)
          .where(eq(aiChatMessages.conversationId, conversationId))
          .orderBy(aiChatMessages.createdAt)
          .limit(MAX_CONVERSATION_MESSAGES);

        messages = history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      } catch {
        // Continue without history
      }
    }

    messages.push({ role: 'user', content: message });

    const response = await aiChat(messages, context, user.id);
    // Estimate tokens: ~4 chars per token for input + output combined
    tokensUsed = Math.ceil(
      (messages.reduce((n, m) => n + m.content.length, 0) + response.length) / 4
    );

    // Save to database
    let activeConversationId = conversationId;
    try {
      const db = await getDb();
      if (!activeConversationId && user.id) {
        const [conv] = await db
          .insert(aiChatConversations)
          .values({
            userId: user.id,
            title: message.slice(0, 50),
          })
          .returning();
        activeConversationId = conv.id;
      }

      if (activeConversationId) {
        await db.insert(aiChatMessages).values([
          { conversationId: activeConversationId, role: 'user', content: message },
          { conversationId: activeConversationId, role: 'assistant', content: response },
        ]);
      }
    } catch {
      // Non-critical: continue even if DB save fails
    }

    await recordUsage(user.id, tokensUsed);
    const remaining = Math.max(0, slot.remaining - 1);

    res.json({
      message: response,
      conversationId: activeConversationId || 'temp-' + Date.now(),
      timestamp: new Date().toISOString(),
      usage: { remaining, limit: slot.limit },
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  } finally {
    releaseConcurrentSlot(user.id);
  }
});

// ---------- POST /chat/stream ----------

/**
 * AI Chat Stream Endpoint (Server-Sent Events)
 * POST /api/ai/chat/stream
 * Streams AI response token-by-token via SSE
 */
router.post('/chat/stream', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!requireApiKey(res)) return;

  const slot = await checkAndReserveSlot(user);
  if (!slot.allowed) {
    return sendLimitError(res, slot.reason!, slot.remaining, slot.limit);
  }

  let tokensUsed = 0;
  try {
    const { message, conversationId, context } = req.body;

    if (!message) {
      releaseConcurrentSlot(user.id);
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build message history
    let messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (conversationId) {
      try {
        const db = await getDb();
        const history = await db
          .select()
          .from(aiChatMessages)
          .where(eq(aiChatMessages.conversationId, conversationId))
          .orderBy(aiChatMessages.createdAt)
          .limit(MAX_CONVERSATION_MESSAGES);
        messages = history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      } catch {
        // Continue without history
      }
    }
    messages.push({ role: 'user', content: message });

    const stream = await aiChatStream(messages, context, user.id);
    if (!stream) {
      // No API key — return non-streamed fallback
      const fallback = await aiChat(messages, context, user.id);
      tokensUsed = Math.ceil(
        (messages.reduce((n, m) => n + m.content.length, 0) + fallback.length) / 4
      );
      await recordUsage(user.id, tokensUsed);
      return res.json({
        message: fallback,
        conversationId: conversationId || 'temp-' + Date.now(),
        usage: { remaining: Math.max(0, slot.remaining - 1), limit: slot.limit },
      });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let fullResponse = '';

    for await (const chunk of stream.textStream) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    tokensUsed = Math.ceil(
      (messages.reduce((n, m) => n + m.content.length, 0) + fullResponse.length) / 4
    );

    // Save conversation after streaming completes
    let activeConversationId = conversationId;
    try {
      const db = await getDb();
      if (!activeConversationId && user.id) {
        const [conv] = await db
          .insert(aiChatConversations)
          .values({
            userId: user.id,
            title: message.slice(0, 50),
          })
          .returning();
        activeConversationId = conv.id;
      }
      if (activeConversationId) {
        await db.insert(aiChatMessages).values([
          { conversationId: activeConversationId, role: 'user', content: message },
          { conversationId: activeConversationId, role: 'assistant', content: fullResponse },
        ]);
      }
    } catch {
      // Non-critical
    }

    await recordUsage(user.id, tokensUsed);
    const remaining = Math.max(0, slot.remaining - 1);

    res.write(
      `data: ${JSON.stringify({ type: 'done', conversationId: activeConversationId || 'temp-' + Date.now(), usage: { remaining, limit: slot.limit } })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error('AI Chat Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI streaming service temporarily unavailable' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  } finally {
    releaseConcurrentSlot(user.id);
  }
});

// ---------- POST /generate-workout ----------

/**
 * AI Workout Generator
 * POST /api/ai/generate-workout
 */
router.post('/generate-workout', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!requireApiKey(res)) return;

  const slot = await checkAndReserveSlot(user);
  if (!slot.allowed) {
    return sendLimitError(res, slot.reason!, slot.remaining, slot.limit);
  }

  try {
    const {
      goal,
      experienceLevel,
      availableEquipment,
      duration,
      focusMuscles,
      excludeExercises,
      inspiredBy,
    } = req.body;

    if (!goal) {
      releaseConcurrentSlot(user.id);
      return res.status(400).json({ error: 'Fitness goal is required' });
    }

    const workout = await aiGenerateWorkout({
      goal,
      experienceLevel: experienceLevel || 'intermediate',
      availableEquipment: availableEquipment || ['barbell', 'dumbbells', 'machines'],
      duration: duration || 45,
      focusMuscles,
      excludeExercises,
      inspiredBy,
    });

    // Estimate tokens from response size
    const tokensUsed = Math.ceil(JSON.stringify(workout).length / 4);
    await recordUsage(user.id, tokensUsed);
    const remaining = Math.max(0, slot.remaining - 1);

    res.json({
      workout: {
        id: 'ai-generated-' + Date.now(),
        ...workout,
        generatedAt: new Date().toISOString(),
      },
      usage: { remaining, limit: slot.limit },
    });
  } catch (error) {
    console.error('AI Workout Generation error:', error);
    res.status(500).json({ error: 'Workout generation service temporarily unavailable' });
  } finally {
    releaseConcurrentSlot(user.id);
  }
});

// ---------- POST /generate-meal-plan ----------

/**
 * AI Meal Plan Generator
 * POST /api/ai/generate-meal-plan
 */
router.post('/generate-meal-plan', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!requireApiKey(res)) return;

  const slot = await checkAndReserveSlot(user);
  if (!slot.allowed) {
    return sendLimitError(res, slot.reason!, slot.remaining, slot.limit);
  }

  try {
    const { targetCalories, macros, dietaryRestrictions, mealsPerDay } = req.body;

    if (!targetCalories) {
      releaseConcurrentSlot(user.id);
      return res.status(400).json({ error: 'Target calories required' });
    }

    const mealPlan = await aiGenerateMealPlan({
      targetCalories,
      macros,
      dietaryRestrictions,
      mealsPerDay: mealsPerDay || 4,
    });

    const tokensUsed = Math.ceil(JSON.stringify(mealPlan).length / 4);
    await recordUsage(user.id, tokensUsed);
    const remaining = Math.max(0, slot.remaining - 1);

    res.json({
      mealPlan: {
        id: 'ai-meal-plan-' + Date.now(),
        ...mealPlan,
        generatedAt: new Date().toISOString(),
      },
      usage: { remaining, limit: slot.limit },
    });
  } catch (error) {
    console.error('AI Meal Plan Generation error:', error);
    res.status(500).json({ error: 'Meal plan generation service temporarily unavailable' });
  } finally {
    releaseConcurrentSlot(user.id);
  }
});

// ---------- POST /analyze-form (template-based, no AI cost) ----------

/**
 * AI Exercise Form Analysis
 * POST /api/ai/analyze-form
 * Template-based — no AI cost, no usage gate.
 */
router.post('/analyze-form', async (req: Request, res: Response) => {
  try {
    const { exerciseName } = req.body;

    const formTips: Record<string, string[]> = {
      squat: [
        'Keep chest up and core braced',
        'Push knees out over toes',
        'Break at hips and knees simultaneously',
        'Aim for at least parallel depth',
      ],
      'bench press': [
        'Retract shoulder blades',
        'Maintain slight arch in lower back',
        'Lower bar to mid-chest',
        'Drive feet into floor',
      ],
      deadlift: [
        'Keep bar close to body',
        'Hips and shoulders rise together',
        'Brace core throughout',
        'Lock out hips at top',
      ],
      'overhead press': [
        'Brace core tight',
        'Press bar in a slight arc',
        'Full lockout overhead',
        'Move head through at top',
      ],
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

// ---------- POST /progress-insights ----------

/**
 * AI Progress Insights
 * POST /api/ai/progress-insights
 */
router.post('/progress-insights', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!requireApiKey(res)) return;

  const slot = await checkAndReserveSlot(user);
  if (!slot.allowed) {
    return sendLimitError(res, slot.reason!, slot.remaining, slot.limit);
  }

  try {
    const { workoutsThisWeek, currentStreak, totalVolume, recentPRs, bodyWeight } = req.body;

    const insights = await aiProgressInsights({
      workoutsThisWeek: workoutsThisWeek || 0,
      currentStreak: currentStreak || 0,
      totalVolume: totalVolume || 0,
      recentPRs: recentPRs || [],
      bodyWeight,
    });

    const tokensUsed = Math.ceil(JSON.stringify(insights).length / 4);
    await recordUsage(user.id, tokensUsed);
    const remaining = Math.max(0, slot.remaining - 1);

    res.json({
      userId: user.id,
      ...insights,
      generatedAt: new Date().toISOString(),
      usage: { remaining, limit: slot.limit },
    });
  } catch (error) {
    console.error('AI Progress Insights error:', error);
    res.status(500).json({ error: 'Progress insights service temporarily unavailable' });
  } finally {
    releaseConcurrentSlot(user.id);
  }
});

// ---------- GET /conversations/:id ----------

/**
 * Get AI Chat History
 * GET /api/ai/conversations/:conversationId
 */
router.get('/conversations/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const db = await getDb();

    const messages = await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.conversationId, conversationId))
      .orderBy(aiChatMessages.createdAt);

    res.json({
      conversationId,
      messages: messages.map((m) => ({
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

// ---------- GET /conversations ----------

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

    const db = await getDb();
    const conversations = await db
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
