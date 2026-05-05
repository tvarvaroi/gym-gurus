import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db';
import { users, clients, workouts } from '../../shared/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';
import { getUserById } from '../auth';
import { uploadImage, isR2Configured } from '../services/fileUpload';
import { deleteUserAccount } from '../services/userDeletion';
import { logger } from '../logger';
import { getRequestId } from '../middleware/requestLogger';

const router = Router();

// GET /api/settings — return real user data merged with static defaults
router.get('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    general: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      role: user.role,
    },
    billing: {
      plan: user.subscriptionTier ?? 'free',
      status: user.subscriptionStatus ?? 'none',
      trialEndsAt: user.trialEndsAt ?? null,
    },
    notifications: user.notificationPreferences ?? { email: true, push: true, sms: false },
    appearance: { theme: 'dark', language: 'en' },
    privacy: { profileVisibility: 'private' },
  });
});

// GET /api/settings/stats — usage statistics for the authenticated user
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Client count (trainer only)
    let clientCount = 0;
    if (user.role === 'trainer') {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(and(eq(clients.trainerId, user.id), isNull(clients.deletedAt)));
      clientCount = result?.count ?? 0;
    }

    // Workout count (trainer/solo only)
    let workoutCount = 0;
    if (user.role === 'trainer' || user.role === 'solo') {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workouts)
        .where(eq(workouts.trainerId, user.id));
      workoutCount = result?.count ?? 0;
    }

    // Days since joining
    const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const daysSinceJoining = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    res.json({ clientCount, workoutCount, daysSinceJoining });
  } catch (error) {
    console.error('Error fetching settings stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PATCH /api/settings/profile — update profile fields (firstName, lastName)
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { firstName, lastName } = req.body;

    if (
      firstName !== undefined &&
      (typeof firstName !== 'string' || firstName.trim().length === 0)
    ) {
      return res.status(400).json({ error: 'First name must be a non-empty string' });
    }
    if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0)) {
      return res.status(400).json({ error: 'Last name must be a non-empty string' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();

    await db.update(users).set(updates).where(eq(users.id, user.id));

    const updatedUser = await getUserById(user.id);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PATCH /api/settings/profile-image — update profile picture URL
router.patch('/profile-image', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid imageUrl' });
    }

    await db
      .update(users)
      .set({ profileImageUrl: imageUrl, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const updatedUser = await getUserById(user.id);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

// POST /api/settings/profile-image-upload — upload profile image file
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

function handleUploadError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.message === 'Only images allowed') {
    return res.status(400).json({ error: 'Only images are allowed' });
  }
  next(err);
}

router.post(
  '/profile-image-upload',
  profileUpload.single('image'),
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (!req.file) return res.status(400).json({ error: 'No file provided' });

      // Background removal feature paused 2026-05-06 (AGPL dependency removed).
      // See _brain/notes/decisions.md "Profile photo background removal — feature paused"
      // for restoration plan and MIT alternatives to evaluate.
      // Photo uploads as-is; sharp resize + WebP conversion still happens inside uploadImage().
      const processedBuffer: Buffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      let imageUrl: string;

      if (isR2Configured()) {
        imageUrl = await uploadImage(processedBuffer, 'profiles', mimeType, 1024);
      } else {
        const base64 = processedBuffer.toString('base64');
        imageUrl = `data:${mimeType};base64,${base64}`;
      }

      // Save to user profile
      await db
        .update(users)
        .set({ profileImageUrl: imageUrl, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      const updatedUser = await getUserById(user.id);
      res.json({ imageUrl, user: updatedUser });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ error: 'Failed to upload profile image' });
    }
  }
);

// PATCH /api/settings/notifications — RETIRED (Sprint 2 BATCH 5).
// Superseded by PATCH /api/notifications/preferences which has Zod validation,
// audit logging, and matches the new {categories, quietHours, channels} shape.
// Returns 410 Gone so any unexpected legacy caller gets a clear signal rather
// than a silent shape-mismatch write.
router.patch('/notifications', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint has been retired. Use PATCH /api/notifications/preferences instead.',
  });
});

// GET /api/settings/biometrics-sharing — Disciple-only read of consent flag
router.get('/biometrics-sharing', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'client') {
      return res.status(403).json({ error: 'Disciple-only setting' });
    }

    const [client] = await db
      .select({ shareBodyMetricsWithTrainer: clients.shareBodyMetricsWithTrainer })
      .from(clients)
      .where(and(eq(clients.email, user.email), isNull(clients.deletedAt)));

    res.json({
      shareBodyMetricsWithTrainer: client?.shareBodyMetricsWithTrainer ?? true,
      hasTrainer: Boolean(client),
    });
  } catch (error) {
    console.error('Error fetching biometrics-sharing setting:', error);
    res.status(500).json({ error: 'Failed to fetch privacy setting' });
  }
});

// PATCH /api/settings/biometrics-sharing — Disciple-only toggle of consent flag
router.patch('/biometrics-sharing', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'client') {
      return res.status(403).json({ error: 'Disciple-only setting' });
    }

    const { shareBodyMetricsWithTrainer } = req.body;
    if (typeof shareBodyMetricsWithTrainer !== 'boolean') {
      return res.status(400).json({ error: 'shareBodyMetricsWithTrainer must be boolean' });
    }

    // Disciple → trainer linkage is by email match (clients.email = users.email).
    // A Disciple may have zero or one matching client row at any time. The
    // clients table has no updatedAt column today (Sprint 4 tracking arrives
    // with the full FK migration).
    //
    // SELECT-before-UPDATE captures the previous value for the audit log.
    // Race tradeoff (intentional, Sprint 1.5 BATCH 3): two near-simultaneous
    // PATCH requests can interleave the SELECT and UPDATE, producing an
    // audit log entry with a stale previousValue (i.e. "false flip"). The
    // worst case is a forensic record showing X→Y when the true sequence
    // was X→Y→X→Y. Acceptable because (a) the event is still captured,
    // (b) the destination value in the log matches the DB after both
    // requests settle, (c) wrapping in a transaction would serialise toggle
    // requests across the user's whole consent surface, which is overkill
    // for v1's single flag. Sprint 4's granular consent system should
    // revisit if multiple flags get toggled simultaneously by an automation.
    const [existing] = await db
      .select({ shareBodyMetricsWithTrainer: clients.shareBodyMetricsWithTrainer })
      .from(clients)
      .where(and(eq(clients.email, user.email), isNull(clients.deletedAt)));
    const previousValue = existing?.shareBodyMetricsWithTrainer ?? null;

    await db
      .update(clients)
      .set({ shareBodyMetricsWithTrainer })
      .where(and(eq(clients.email, user.email), isNull(clients.deletedAt)));

    // Audit log — privacy-sensitive flag changes must be reconstructable.
    // {flag, previousValue, value} is a complete audit event; {flag, value}
    // alone can't distinguish a flip from a reaffirm. previousValue is null
    // for Disciples without a linked client row (the toggle UI is invisible
    // for them, but the API still accepts the call) — logging null is
    // honest and lets log analysis distinguish "first toggle ever" from
    // "flip" from "reaffirm".
    logger.audit('consent.toggled', {
      userId: user.id,
      email: user.email,
      flag: 'shareBodyMetricsWithTrainer',
      previousValue,
      value: shareBodyMetricsWithTrainer,
      ts: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: getRequestId(req),
    });

    res.json({ success: true, shareBodyMetricsWithTrainer });
  } catch (error) {
    console.error('Error updating biometrics-sharing setting:', error);
    res.status(500).json({ error: 'Failed to update privacy setting' });
  }
});

// GET /api/settings/preferred-units — return cross-device unit preference
// Sprint 2 BATCH 6 (client) hooks `useUnits()` to this endpoint. Until BATCH 6
// ships, the BiometricsPage still reads localStorage; this route is harmless
// because it's read-only.
router.get('/preferred-units', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [row] = await db
      .select({ preferredUnits: users.preferredUnits })
      .from(users)
      .where(eq(users.id, user.id));
    res.json({ units: row?.preferredUnits ?? 'metric' });
  } catch (error) {
    console.error('Error fetching preferred units:', error);
    res.status(500).json({ error: 'Failed to fetch unit preference' });
  }
});

// PATCH /api/settings/preferred-units — set cross-device unit preference
// Audit-logged because (a) it's a user-visible state change and (b) anomaly
// detection on rapid toggling can flag bot activity later.
const preferredUnitsSchema = z.object({ units: z.enum(['metric', 'imperial']) });
router.patch('/preferred-units', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parsed = preferredUnitsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "units must be 'metric' or 'imperial'" });
    }

    // SELECT-before-UPDATE captures previousValue for the audit log.
    // Race tradeoff matches the consent-toggle pattern (Sprint 1.5 BATCH 3):
    // two near-simultaneous PATCH requests can interleave, producing an audit
    // line with stale previousValue. Acceptable for v1 — destination value is
    // always correct, only a midstream "false flip" log line might appear.
    const [existing] = await db
      .select({ preferredUnits: users.preferredUnits })
      .from(users)
      .where(eq(users.id, user.id));
    const previousValue = existing?.preferredUnits ?? null;

    await db
      .update(users)
      .set({ preferredUnits: parsed.data.units, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    logger.audit('preferences.units_changed', {
      userId: user.id,
      email: user.email,
      previousValue,
      value: parsed.data.units,
      ts: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: getRequestId(req),
    });

    res.json({ units: parsed.data.units });
  } catch (error) {
    console.error('Error updating preferred units:', error);
    res.status(500).json({ error: 'Failed to update unit preference' });
  }
});

// DELETE /api/settings/account — full account deletion via userDeletion service.
// Sprint 2 BATCH 2 — replaces the inline anonymize-only flow. Now also:
//   - audit-logs BEFORE any mutation (forensic chain of custody)
//   - cleans up R2 objects (progress photos)
//   - marks all push subscriptions inactive
//   - cancels active Stripe subscription (best-effort)
router.delete('/account', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res
        .status(400)
        .json({ error: 'Please type "DELETE MY ACCOUNT" to confirm account deletion' });
    }

    const result = await deleteUserAccount(user.id);

    // Destroy session AFTER deletion completes — destroying first would race
    // with the audit log (req.user.id would still be valid, but req.session is
    // gone, breaking any per-request observability that depends on it).
    (req as any).session?.destroy?.();

    res.json({
      success: true,
      cleanup: {
        photosDeleted: result.r2.deleted,
        photosFailed: result.r2.failed,
        pushSubscriptionsRevoked: result.pushSubsMarkedInactive,
        stripe: result.stripe,
      },
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
