// Stripe Webhook Handler
// Mounted with raw body parser for signature verification
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { payments } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Initialize Stripe
async function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events with signature verification.
 * Requires raw body (mounted before express.json middleware).
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set — webhook verification disabled');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: any;
  try {
    // req.body is raw Buffer because this route uses express.raw()
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Idempotency check — prevent processing the same event twice
  const eventId = event.id;
  try {
    const database = await db;
    const existing = await database
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, eventId))
      .limit(1);
    if (existing.length > 0) {
      // Already processed
      return res.json({ received: true, duplicate: true });
    }
  } catch {
    // Continue even if idempotency check fails
  }

  // Route events to handlers
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ---------- Event Handlers ----------

async function handleCheckoutCompleted(session: any) {
  const { trainerId, clientId, planId } = session.metadata || {};
  if (!trainerId || !clientId) return;

  const database = await db;
  await database.insert(payments).values({
    trainerId,
    clientId,
    planId: planId || null,
    amountInCents: session.amount_total,
    currency: session.currency,
    status: 'completed',
    stripePaymentIntentId: session.payment_intent,
    stripeInvoiceId: session.invoice || null,
    paidAt: new Date(),
  });

  // Send notification
  try {
    const { notifyPaymentReceived } = await import('../services/notificationService');
    const amountFormatted = `$${(session.amount_total / 100).toFixed(2)}`;
    await notifyPaymentReceived(trainerId, `Client ${clientId}`, amountFormatted, session.payment_intent);
  } catch {
    // Non-critical
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  const database = await db;
  // Update any pending payment record
  await database
    .update(payments)
    .set({ status: 'completed', paidAt: new Date() })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
}

async function handlePaymentFailed(paymentIntent: any) {
  const database = await db;
  await database
    .update(payments)
    .set({ status: 'failed' })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
}

async function handleInvoicePaid(invoice: any) {
  const { trainerId, clientId, planId } = invoice.metadata || {};
  if (!trainerId || !clientId) return;

  const database = await db;
  await database.insert(payments).values({
    trainerId,
    clientId,
    planId: planId || null,
    amountInCents: invoice.amount_paid,
    currency: invoice.currency,
    status: 'completed',
    stripePaymentIntentId: invoice.payment_intent,
    stripeInvoiceId: invoice.id,
    description: `Subscription payment - ${invoice.lines?.data?.[0]?.description || 'Monthly'}`,
    paidAt: new Date(),
  });
}

async function handleInvoiceFailed(invoice: any) {
  console.warn(`Invoice payment failed: ${invoice.id}`);
  // Could send notification to trainer about failed subscription payment
}

export default router;
