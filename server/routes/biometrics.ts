import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { eq, and, desc, gte, lte, isNull, inArray } from 'drizzle-orm';
import { getDb } from '../db';
import {
  bodyMetrics,
  progressPhotos,
  clients,
  users,
  insertBodyMetricsSchema,
} from '../../shared/schema';
import { uploadImage, deleteImage, isR2Configured } from '../services/fileUpload';

const router = Router();

// ─── Validation schemas ─────────────────────────────────────────────────────
// createInsertSchema picks up `userId` as required, but we always set it from
// req.user — so omit it from the public payload. All measurements are optional.
//
// Date floor 2010-01-01 covers modern fitness tracking history (MyFitnessPal
// 2005, Withings 2009, Apple Health 2014). Floor is for typo prevention, not
// history gating — a stray `19` instead of `20` in the year hits this.
// Ceiling is now+60s to absorb client clock skew without false-rejecting
// near-midnight logs (Sprint 1.5 audit A2).
//
// IMPORTANT: ceiling uses .refine() not .max(), because .max(new Date(...))
// freezes the cutoff at module-load time. After the server runs for >60s,
// every "now" request would fail the .max check. Caught during BATCH 2 smoke
// tests (Sprint 1.5, 2026-05-03). The floor uses .min() because 2010-01-01
// is a constant and freezing is correct.
const recordedAtSchema = z.coerce
  .date()
  .min(new Date('2010-01-01'), 'Date too far in the past')
  .refine((d) => d.getTime() <= Date.now() + 60_000, {
    message: 'Cannot log future entries',
  });

const createBodyMetricsBodySchema = insertBodyMetricsSchema.omit({ userId: true }).extend({
  recordedAt: recordedAtSchema.optional(),
});

const updateBodyMetricsBodySchema = createBodyMetricsBodySchema.partial();

const dateRangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const createPhotoBodySchema = z.object({
  pose: z.enum(['front', 'side_left', 'side_right', 'back', 'other']),
  weightAtPhotoKg: z.coerce.number().positive().max(999).optional(),
  bodyFatAtPhoto: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── Multer (memory storage — never write to disk) ──────────────────────────
// Tightened from a permissive `image/*` filter to an explicit allow-list
// (Sprint 1.5 audit C1). SVG was the prior risk: image/svg+xml passes
// `startsWith('image/')` but can carry XSS payloads. Sharp would have failed
// on most SVGs anyway, but defence-in-depth is cheap.
const ALLOWED_PHOTO_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const UNSUPPORTED_MIME_ERROR = 'Unsupported image format. Use JPEG, PNG, WebP, or HEIC.';

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PHOTO_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(UNSUPPORTED_MIME_ERROR));
  },
});

function handleUploadError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 15MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.message === UNSUPPORTED_MIME_ERROR) {
    return res.status(400).json({ error: UNSUPPORTED_MIME_ERROR });
  }
  next(err);
}

// ─── BODY METRICS ───────────────────────────────────────────────────────────

// GET /api/biometrics — list req.user's body metrics
router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, limit } = dateRangeQuerySchema.parse(req.query);
    const db = await getDb();

    const filters = [eq(bodyMetrics.userId, req.user!.id)];
    if (from) filters.push(gte(bodyMetrics.recordedAt, from));
    if (to) filters.push(lte(bodyMetrics.recordedAt, to));

    const rows = await db
      .select()
      .from(bodyMetrics)
      .where(and(...filters))
      .orderBy(desc(bodyMetrics.recordedAt))
      .limit(limit ?? 100);

    res.json(rows);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('List body metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch body metrics' });
  }
});

// POST /api/biometrics — create body metrics row
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = createBodyMetricsBodySchema.parse(req.body);
    const db = await getDb();

    const [row] = await db
      .insert(bodyMetrics)
      .values({
        ...body,
        userId: req.user!.id,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Create body metrics error:', err);
    res.status(500).json({ error: 'Failed to create body metrics' });
  }
});

// Helper: resolve a Disciple user.id from a clients row (linkage is by email
// today; Sprint 4 will add clients.user_id FK as part of the granular consent
// system). Returns null if no registered user matches.
async function resolveDiscipleUserId(
  db: Awaited<ReturnType<typeof getDb>>,
  clientEmail: string
): Promise<string | null> {
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, clientEmail), eq(users.role, 'client'), isNull(users.deletedAt)));
  return u?.id ?? null;
}

// Helper: full trainer-side guard — verify trainer owns client + consent flag
// is on. Returns the Disciple user.id, or sends a response and returns null.
async function getClientUserIdForTrainer(req: Request, res: Response): Promise<string | null> {
  const { clientId } = z.object({ clientId: z.string() }).parse(req.params);
  const db = await getDb();

  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(eq(clients.id, clientId), eq(clients.trainerId, req.user!.id), isNull(clients.deletedAt))
    );
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return null;
  }
  if (!client.shareBodyMetricsWithTrainer) {
    res.status(403).json({ error: 'Client has not shared body metrics with you' });
    return null;
  }
  return await resolveDiscipleUserId(db, client.email);
}

// GET /api/biometrics/client/:clientId — trainer view
// Mounted BEFORE /:id so the literal segment matches first.
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { from, to, limit } = dateRangeQuerySchema.parse(req.query);
    const userId = await getClientUserIdForTrainer(req, res);
    if (res.headersSent) return;
    if (!userId) {
      // Client row exists but no registered user matches the email yet — empty.
      return res.json([]);
    }

    const db = await getDb();
    const filters = [eq(bodyMetrics.userId, userId)];
    if (from) filters.push(gte(bodyMetrics.recordedAt, from));
    if (to) filters.push(lte(bodyMetrics.recordedAt, to));

    const rows = await db
      .select()
      .from(bodyMetrics)
      .where(and(...filters))
      .orderBy(desc(bodyMetrics.recordedAt))
      .limit(limit ?? 100);

    res.json(rows);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Trainer get client body metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch client body metrics' });
  }
});

// IMPORTANT: all /photos* routes must be declared BEFORE the /:id body-metrics
// routes below — otherwise Express matches "photos" as the :id parameter and
// the photos endpoints become unreachable. See the BATCH 4 routing fix.
//
// ─── PHOTOS ─────────────────────────────────────────────────────────────────

// GET /api/biometrics/photos — list user photos
router.get('/photos', async (req: Request, res: Response) => {
  try {
    const querySchema = z.object({
      pose: z.enum(['front', 'side_left', 'side_right', 'back', 'other']).optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
    });
    const { pose, limit } = querySchema.parse(req.query);
    const db = await getDb();

    const filters = [eq(progressPhotos.userId, req.user!.id)];
    if (pose) filters.push(eq(progressPhotos.pose, pose));

    const rows = await db
      .select()
      .from(progressPhotos)
      .where(and(...filters))
      .orderBy(desc(progressPhotos.takenAt))
      .limit(limit ?? 200);

    res.json(rows);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('List photos error:', err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// POST /api/biometrics/photos — multipart upload
// memoryStorage + req.file.buffer → uploadImage. NO background removal (Q1 decision).
router.post(
  '/photos',
  photoUpload.single('image'),
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const body = createPhotoBodySchema.parse(req.body);

      // Pre-resize to thumbnail (400px); always needed for both R2 and base64 paths.
      // .rotate() honours EXIF orientation BEFORE .withMetadata({}) strips it.
      // Strip EXIF/GPS explicitly even though webp encoder strips by default
      // (defence-in-depth, Sprint 1.5 audit C1).
      const thumbBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 400, withoutEnlargement: true })
        .withMetadata({})
        .webp({ quality: 80 })
        .toBuffer();

      let imageUrl: string;
      let thumbnailUrl: string;

      if (isR2Configured()) {
        // Full-size: 1024px max width, sharp+webp inside uploadImage() (also strips EXIF)
        imageUrl = await uploadImage(req.file.buffer, 'biometrics', req.file.mimetype, 1024);
        thumbnailUrl = await uploadImage(thumbBuffer, 'biometrics-thumbnails', 'image/webp', 400);
      } else {
        // Dev fallback (matches settings.ts profile-image-upload pattern):
        // store as base64 data URL. Pre-resize the full-size to 1024px first
        // so we don't blow up the row size with a 4MB original.
        const fullBuffer = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1024, withoutEnlargement: true })
          .withMetadata({})
          .webp({ quality: 82 })
          .toBuffer();
        imageUrl = `data:image/webp;base64,${fullBuffer.toString('base64')}`;
        thumbnailUrl = `data:image/webp;base64,${thumbBuffer.toString('base64')}`;
      }

      const db = await getDb();
      const [row] = await db
        .insert(progressPhotos)
        .values({
          userId: req.user!.id,
          imageUrl,
          thumbnailUrl,
          pose: body.pose,
          weightAtPhotoKg: body.weightAtPhotoKg !== undefined ? String(body.weightAtPhotoKg) : null,
          bodyFatAtPhoto: body.bodyFatAtPhoto !== undefined ? String(body.bodyFatAtPhoto) : null,
          notes: body.notes ?? null,
        })
        .returning();

      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
      }
      console.error('Photo upload error:', err);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }
);

// Trainer-side photos route intentionally NOT exposed in v1.
// The previous GET /photos/client/:clientId contradicted the locked decision
// "Photos NEVER visible to Guru in v1" by allowing any consenting Disciple's
// photos to be fetched via curl. Sprint 4 will reintroduce a trainer photos
// view backed by per-photo consent grants — a different consent model than
// the single share_body_metrics_with_trainer flag covers today.
// See: docs/audits/2026-05-03-sprint-1-retrospective-audit.md (finding C1).

// GET /api/biometrics/photos/:id — single, ownership-checked
router.get('/photos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    const [row] = await db
      .select()
      .from(progressPhotos)
      .where(and(eq(progressPhotos.id, id), eq(progressPhotos.userId, req.user!.id)));

    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('Get photo error:', err);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// DELETE /api/biometrics/photos/:id — hard delete + R2 cleanup
router.delete('/photos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    const [existing] = await db
      .select()
      .from(progressPhotos)
      .where(and(eq(progressPhotos.id, id), eq(progressPhotos.userId, req.user!.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await db.delete(progressPhotos).where(eq(progressPhotos.id, id));

    // Best-effort R2 cleanup — deleteImage is silent on failure.
    await deleteImage(existing.imageUrl);
    if (existing.thumbnailUrl) await deleteImage(existing.thumbnailUrl);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete photo error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// POST /api/biometrics/photos/:id/compare/:otherId — link two photos for comparison
router.post('/photos/:id/compare/:otherId', async (req: Request, res: Response) => {
  try {
    const { id, otherId } = z.object({ id: z.string(), otherId: z.string() }).parse(req.params);
    if (id === otherId) {
      return res.status(400).json({ error: 'Cannot compare a photo with itself' });
    }
    const db = await getDb();

    const both = await db
      .select({ id: progressPhotos.id })
      .from(progressPhotos)
      .where(
        and(eq(progressPhotos.userId, req.user!.id), inArray(progressPhotos.id, [id, otherId]))
      );
    if (both.length !== 2) {
      return res.status(404).json({ error: 'One or both photos not found' });
    }

    const [updated] = await db
      .update(progressPhotos)
      .set({ comparesPhotoId: otherId })
      .where(eq(progressPhotos.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error('Compare photos error:', err);
    res.status(500).json({ error: 'Failed to link photos' });
  }
});

// ─── BODY METRICS by-id (must come AFTER all /photos* routes) ───────────────

// GET /api/biometrics/:id — single, ownership-checked
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    const [row] = await db
      .select()
      .from(bodyMetrics)
      .where(and(eq(bodyMetrics.id, id), eq(bodyMetrics.userId, req.user!.id)));

    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('Get body metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch body metrics' });
  }
});

// PUT /api/biometrics/:id — partial update, ownership-checked
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = updateBodyMetricsBodySchema.parse(req.body);
    const db = await getDb();

    const [existing] = await db
      .select()
      .from(bodyMetrics)
      .where(and(eq(bodyMetrics.id, id), eq(bodyMetrics.userId, req.user!.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const [updated] = await db
      .update(bodyMetrics)
      .set(body)
      .where(eq(bodyMetrics.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Update body metrics error:', err);
    res.status(500).json({ error: 'Failed to update body metrics' });
  }
});

// DELETE /api/biometrics/:id — hard delete, ownership-checked
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    const [existing] = await db
      .select()
      .from(bodyMetrics)
      .where(and(eq(bodyMetrics.id, id), eq(bodyMetrics.userId, req.user!.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await db.delete(bodyMetrics).where(eq(bodyMetrics.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete body metrics error:', err);
    res.status(500).json({ error: 'Failed to delete body metrics' });
  }
});

export default router;
