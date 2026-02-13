// Payment Routes - Stripe Integration
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { paymentPlans, payments, clients } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Initialize Stripe (only if key is configured)
let stripe: any = null;
async function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// ============ Payment Plans ============

// GET /api/payments/plans - Get trainer's payment plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const database = await db;
    const plans = await database
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.trainerId, userId))
      .orderBy(desc(paymentPlans.createdAt));

    res.json(plans);
  } catch (error) {
    console.error('Error getting payment plans:', error);
    res.status(500).json({ error: 'Failed to get payment plans' });
  }
});

// POST /api/payments/plans - Create a payment plan
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, priceInCents, currency, billingInterval, sessionCount } = req.body;

    if (!name || !priceInCents) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const database = await db;

    // Create Stripe Price if Stripe is configured
    let stripePriceId = null;
    const stripeClient = await getStripe();
    if (stripeClient) {
      try {
        const priceParams: any = {
          unit_amount: priceInCents,
          currency: currency || 'usd',
          product_data: { name },
        };

        if (billingInterval !== 'one_time') {
          priceParams.recurring = { interval: billingInterval === 'weekly' ? 'week' : 'month' };
        }

        const price = await stripeClient.prices.create(priceParams);
        stripePriceId = price.id;
      } catch (stripeError) {
        console.warn('Failed to create Stripe price (continuing without):', stripeError);
      }
    }

    const result = await database.insert(paymentPlans).values({
      trainerId: userId,
      name,
      description: description || null,
      priceInCents,
      currency: currency || 'usd',
      billingInterval: billingInterval || 'monthly',
      sessionCount: sessionCount || null,
      stripePriceId,
    }).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating payment plan:', error);
    res.status(500).json({ error: 'Failed to create payment plan' });
  }
});

// PUT /api/payments/plans/:id - Update a payment plan
router.put('/plans/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { name, description, priceInCents, isActive } = req.body;
    const database = await db;

    const result = await database
      .update(paymentPlans)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(priceInCents && { priceInCents }),
        ...(isActive !== undefined && { isActive }),
      })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.trainerId, userId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating payment plan:', error);
    res.status(500).json({ error: 'Failed to update payment plan' });
  }
});

// DELETE /api/payments/plans/:id - Deactivate a payment plan
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const database = await db;

    await database
      .update(paymentPlans)
      .set({ isActive: false })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.trainerId, userId)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment plan:', error);
    res.status(500).json({ error: 'Failed to delete payment plan' });
  }
});

// ============ Payments ============

// GET /api/payments - Get trainer's payment history
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 50;
    const database = await db;

    const result = await database
      .select({
        payment: payments,
        clientName: clients.name,
        planName: paymentPlans.name,
      })
      .from(payments)
      .leftJoin(clients, eq(payments.clientId, clients.id))
      .leftJoin(paymentPlans, eq(payments.planId, paymentPlans.id))
      .where(eq(payments.trainerId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(limit);

    res.json(result.map(r => ({
      ...r.payment,
      clientName: r.clientName,
      planName: r.planName,
    })));
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// POST /api/payments/record - Record a manual payment
router.post('/record', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { clientId, amountInCents, currency, description, planId } = req.body;

    if (!clientId || !amountInCents) {
      return res.status(400).json({ error: 'Client and amount are required' });
    }

    const database = await db;

    const result = await database.insert(payments).values({
      trainerId: userId,
      clientId,
      planId: planId || null,
      amountInCents,
      currency: currency || 'usd',
      status: 'completed',
      description: description || null,
      paidAt: new Date(),
    }).returning();

    // Send notification to trainer
    try {
      const { notifyPaymentReceived } = await import('../services/notificationService');
      const client = await database.select().from(clients).where(eq(clients.id, clientId)).limit(1);
      if (client.length > 0) {
        const amountFormatted = `$${(amountInCents / 100).toFixed(2)}`;
        await notifyPaymentReceived(userId, client[0].name, amountFormatted, result[0].id);
      }
    } catch (notifError) {
      // Non-critical
    }

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/payments/summary - Get payment summary/stats
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const database = await db;

    // Get all completed payments for this trainer
    const allPayments = await database
      .select()
      .from(payments)
      .where(and(eq(payments.trainerId, userId), eq(payments.status, 'completed')));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthPayments = allPayments.filter(p => p.paidAt && new Date(p.paidAt) >= startOfMonth);
    const lastMonthPayments = allPayments.filter(p => p.paidAt && new Date(p.paidAt) >= startOfLastMonth && new Date(p.paidAt) < startOfMonth);

    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amountInCents, 0);
    const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + p.amountInCents, 0);
    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amountInCents, 0);

    const changePercent = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    // Monthly breakdown for last 6 months
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPayments = allPayments.filter(p => p.paidAt && new Date(p.paidAt) >= monthStart && new Date(p.paidAt) < monthEnd);
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en', { month: 'short' }),
        revenue: monthPayments.reduce((sum, p) => sum + p.amountInCents, 0) / 100,
      });
    }

    // Pending payments
    const pendingPayments = await database
      .select()
      .from(payments)
      .where(and(eq(payments.trainerId, userId), eq(payments.status, 'pending')));
    const outstandingAmount = pendingPayments.reduce((sum, p) => sum + p.amountInCents, 0);

    res.json({
      thisMonthRevenue: thisMonthRevenue / 100,
      lastMonthRevenue: lastMonthRevenue / 100,
      totalRevenue: totalRevenue / 100,
      changePercent,
      totalPayments: allPayments.length,
      monthlyRevenue,
      outstandingAmount: outstandingAmount / 100,
    });
  } catch (error) {
    console.error('Error getting payment summary:', error);
    res.status(500).json({ error: 'Failed to get payment summary' });
  }
});

// POST /api/payments/create-checkout - Create Stripe Checkout session
router.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stripeClient = await getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        error: 'Stripe not configured',
        message: 'Set STRIPE_SECRET_KEY environment variable to enable payments',
      });
    }

    const { planId, clientId } = req.body;
    const database = await db;

    const plan = await database.select().from(paymentPlans).where(eq(paymentPlans.id, planId)).limit(1);
    if (plan.length === 0 || !plan[0].stripePriceId) {
      return res.status(400).json({ error: 'Invalid plan or plan not configured in Stripe' });
    }

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: plan[0].stripePriceId, quantity: 1 }],
      mode: plan[0].billingInterval === 'one_time' ? 'payment' : 'subscription',
      success_url: `${req.headers.origin}/payments?success=true`,
      cancel_url: `${req.headers.origin}/payments?canceled=true`,
      metadata: { trainerId: userId, clientId, planId },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default router;
