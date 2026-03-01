import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { db } from '../db';
import { users, clients, workouts } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { getUserById } from '../auth';
import { uploadImage, isR2Configured } from '../services/fileUpload';

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
        .where(eq(clients.trainerId, user.id));
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

      let processedBuffer: Buffer = req.file.buffer;
      let mimeType = req.file.mimetype;

      try {
        // Server-side background removal (model cached after first call)
        const { removeBackground } = await import('@imgly/background-removal-node');
        const inputBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        const resultBlob = await removeBackground(inputBlob);
        const arrayBuffer = await resultBlob.arrayBuffer();
        processedBuffer = Buffer.from(arrayBuffer);
        mimeType = 'image/png';
        console.log('Background removal successful');
      } catch (bgError) {
        console.error('Background removal failed, using original:', bgError);
      }

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

// PATCH /api/settings/notifications — update notification preferences
router.patch('/notifications', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { notificationPreferences } = req.body;

    if (!notificationPreferences || typeof notificationPreferences !== 'object') {
      return res.status(400).json({ error: 'notificationPreferences must be an object' });
    }

    await db
      .update(users)
      .set({ notificationPreferences, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// DELETE /api/settings/account — anonymize PII and destroy session
router.delete('/account', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res
        .status(400)
        .json({ error: 'Please type "DELETE MY ACCOUNT" to confirm account deletion' });
    }

    // Anonymize all PII - user row stays so foreign key constraints hold
    await db
      .update(users)
      .set({
        email: `deleted-${user.id}@deleted.invalid`,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
        authProviderId: null,
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
        subscriptionTier: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Destroy session
    (req as any).session?.destroy?.();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
