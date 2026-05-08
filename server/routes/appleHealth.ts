/**
 * Apple Health Import Routes — Sprint 5 BATCH 3.
 *
 * Five routes mounted at /api/apple-health behind secureAuth + writeRateLimit
 * (uploads) / apiRateLimit (reads). All :id routes use the
 * `and(eq(id), eq(userId))` IDOR pattern (mutation-tested in BATCH 7 — fourth
 * site, after biometrics / wellness / wearables / notifications).
 *
 *   POST   /api/apple-health/upload                   multipart .zip → import row
 *   GET    /api/apple-health/imports                  paginated user import history
 *   GET    /api/apple-health/imports/:id              single import detail (IDOR-safe)
 *   POST   /api/apple-health/imports/:id/cancel       only if status='parsing'
 *   DELETE /api/apple-health/imports/:id              removes tracking row + R2 file
 *
 * UPLOAD STORAGE STRATEGY
 *   Sprint 5 v1: in-process buffer → R2 (production) / base64 in-row file_r2_key
 *   (dev when R2 not configured). The upload-to-R2 path matches the biometrics
 *   photo flow but the dev fallback differs slightly because zip files are
 *   binary (no point in base64-encoding a 50MB zip into a Postgres column —
 *   instead, we keep the buffer in-memory and process it in the same request).
 *
 *   For dev: write to a tmpdir file, store the file path in file_r2_key (the
 *   cron reads from disk in dev). Production goes through R2 normally.
 *
 *   Single-file upload limit: 200MB. Apple Health exports for power users
 *   with 5+ years of data routinely hit 100MB.
 *
 * PARSING IS DEFERRED TO THE CRON
 *   The upload route NEVER parses synchronously. It writes the .zip to
 *   storage, creates a row with status='uploaded', returns the import_id.
 *   The cron picks up status='uploaded' rows on its next tick (default 30s).
 *
 *   Why: parsing a 100MB+ XML can take 1-3 minutes. Doing it in the request
 *   path would either time out, block the user, or both. Always async.
 */
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { mkdtempSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb } from '../db';
import { appleHealthImports } from '../../shared/schema';
import { isR2Configured } from '../services/fileUpload';
import { logger } from '../logger';

const router = Router();

// ─── Multer config ──────────────────────────────────────────────────────────
// Memory storage — never write to disk inside multer. We pass the buffer to
// the storage layer (R2 in prod, tmpdir in dev) ourselves with explicit
// allow-list checks.
const ALLOWED_ZIP_MIME = new Set([
  'application/zip',
  'application/x-zip-compressed',
  // Some browsers/OSes send octet-stream for zip — accept if the extension is
  // .zip (re-validated below). Apple's Health app exports as application/zip
  // on iOS, but Files-app re-uploads via Safari sometimes downgrade to this.
  'application/octet-stream',
]);
const UNSUPPORTED_MIME_ERROR =
  'Unsupported file format. Apple Health exports must be uploaded as the .zip file produced by the Health app.';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_ZIP_MIME.has(file.mimetype)) {
      cb(new Error(UNSUPPORTED_MIME_ERROR));
      return;
    }
    // Defence-in-depth: enforce .zip extension (case-insensitive). Prevents a
    // malicious upload of a renamed .xml file with a faked zip mime type from
    // bypassing the parser's expected zip envelope.
    const lower = (file.originalname ?? '').toLowerCase();
    if (!lower.endsWith('.zip')) {
      cb(new Error(UNSUPPORTED_MIME_ERROR));
      return;
    }
    cb(null, true);
  },
});

function handleUploadError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ error: `File too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.message === UNSUPPORTED_MIME_ERROR) {
    return res.status(400).json({ error: UNSUPPORTED_MIME_ERROR });
  }
  next(err);
}

// ─── Storage helper ─────────────────────────────────────────────────────────

/**
 * Persist the uploaded zip buffer to durable storage. Returns the storage
 * key/path that the cron will read from when parsing.
 *
 * Production: R2. The .zip is uploaded with a content-type of application/zip
 * and a key under `apple-health-imports/<userId>/<importId>.zip`.
 *
 * Dev: tmpdir file. The cron reads from local disk. The file path doubles as
 * the R2 key column value (it's just an opaque storage handle).
 */
async function persistUploadedZip(
  buffer: Buffer,
  userId: string,
  importId: string
): Promise<string> {
  if (isR2Configured()) {
    // Production: R2 PUT. We deliberately do NOT reuse uploadImage() — that
    // resizes + converts to webp (image-only). For zip we need a raw byte put.
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
    const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    const key = `apple-health-imports/${userId}/${importId}.zip`;
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/zip',
      })
    );
    return key;
  }

  // Dev fallback: tmpdir file. The path doubles as the storage handle. The
  // cron's storage-read helper distinguishes by checking for a leading `/`
  // or drive letter (file system path) vs. a relative R2 key.
  const dir = mkdtempSync(join(tmpdir(), 'apple-health-import-'));
  const path = join(dir, `${importId}.zip`);
  writeFileSync(path, buffer);
  return path;
}

/**
 * Best-effort cleanup of the persisted zip after import processing OR on
 * delete-by-user. Idempotent — silent on missing files.
 */
export async function cleanupUploadedZip(storageKey: string | null): Promise<void> {
  if (!storageKey) return;
  // File-system path (dev): unlink directly.
  if (storageKey.startsWith('/') || /^[A-Za-z]:[\\/]/.test(storageKey)) {
    try {
      if (existsSync(storageKey)) unlinkSync(storageKey);
    } catch {
      // Non-critical — best effort
    }
    return;
  }
  // R2 key: delete via S3 DeleteObject.
  if (!isR2Configured()) return;
  try {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
    const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
  } catch {
    // Non-critical — best effort
  }
}

// ─── Validation schemas ─────────────────────────────────────────────────────

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/apple-health/upload
 *
 * multipart/form-data with `file` field containing the .zip.
 * Returns 201 with `{ import: AppleHealthImport }` on success.
 *
 * The actual parsing is deferred — this route only persists the .zip and
 * creates the row. Cron will pick it up.
 */
router.post(
  '/upload',
  zipUpload.single('file'),
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      const userId = req.user!.id;
      const db = await getDb();

      // Insert the import row first (status='uploaded'), then persist the zip
      // using the row's id as part of the storage key. This ordering means a
      // crash between the two writes leaves an orphan row with no zip
      // (recoverable: status stays 'uploaded' but the cron will fail to read
      // and mark it 'failed' with a clear error_message).
      const [created] = await db
        .insert(appleHealthImports)
        .values({
          userId,
          fileSizeBytes: req.file.size,
          status: 'uploaded',
          fileR2Key: null,
        })
        .returning();

      try {
        const storageKey = await persistUploadedZip(req.file.buffer, userId, created.id);
        const [updated] = await db
          .update(appleHealthImports)
          .set({ fileR2Key: storageKey })
          .where(eq(appleHealthImports.id, created.id))
          .returning();
        return res.status(201).json({ import: updated });
      } catch (err) {
        // Storage failed — mark the row failed so it doesn't sit forever in
        // 'uploaded' state with no file behind it.
        await db
          .update(appleHealthImports)
          .set({
            status: 'failed',
            errorMessage:
              err instanceof Error
                ? `Upload storage failed: ${err.message}`
                : 'Upload storage failed',
          })
          .where(eq(appleHealthImports.id, created.id));
        throw err;
      }
    } catch (err) {
      logger.error('[appleHealth] upload error', err);
      return res.status(500).json({ error: 'Failed to upload Apple Health export' });
    }
  }
);

/**
 * GET /api/apple-health/imports
 *
 * Paginated history of the caller's imports. Most-recent first.
 */
router.get('/imports', async (req: Request, res: Response) => {
  try {
    const { limit } = listQuerySchema.parse(req.query);
    const db = await getDb();
    const rows = await db
      .select()
      .from(appleHealthImports)
      .where(eq(appleHealthImports.userId, req.user!.id))
      .orderBy(desc(appleHealthImports.createdAt))
      .limit(limit ?? 25);
    return res.json(rows);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('[appleHealth] list imports error', err);
    return res.status(500).json({ error: 'Failed to fetch imports' });
  }
});

/**
 * GET /api/apple-health/imports/:id
 *
 * IDOR-safe via `and(eq(id), eq(userId))`. 404 (not 403) on cross-user
 * lookup so we don't leak existence.
 */
router.get('/imports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const db = await getDb();
    const [row] = await db
      .select()
      .from(appleHealthImports)
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)));
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('[appleHealth] get import error', err);
    return res.status(500).json({ error: 'Failed to fetch import' });
  }
});

/**
 * POST /api/apple-health/imports/:id/cancel
 *
 * Only valid when status='parsing'. Sets status='cancelled' so the cron's
 * next progress-update sees the change and aborts. The cron does NOT roll
 * back rows already ingested — partial data stays. Documented in BATCH 4
 * UX brainstorm.
 */
router.post('/imports/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const db = await getDb();

    // SELECT ownership-checked existing row, then UPDATE only if status
    // permits the transition. Both gates use the same and(eq(id), eq(userId))
    // ownership clause — IDOR-safe.
    const [existing] = await db
      .select()
      .from(appleHealthImports)
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'parsing' && existing.status !== 'uploaded') {
      return res
        .status(400)
        .json({ error: `Cannot cancel an import in status='${existing.status}'` });
    }

    const [updated] = await db
      .update(appleHealthImports)
      .set({ status: 'cancelled' })
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)))
      .returning();
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('[appleHealth] cancel import error', err);
    return res.status(500).json({ error: 'Failed to cancel import' });
  }
});

/**
 * POST /api/apple-health/imports/:id/retry — Sprint 5 BATCH 5 (sub-question 8)
 *
 * Re-queues a failed import for the cron to pick up. Validates:
 *   - Caller owns the import row (IDOR-safe via and(eq(id), eq(userId)))
 *   - Current status is 'failed' (only failed imports are retryable;
 *     completed/cancelled/parsing/uploaded are NOT — would be a state-machine
 *     violation)
 *   - file_r2_key IS NOT NULL (the underlying .zip is still in storage —
 *     completed imports clear this column, so a retry on a row whose file
 *     was already cleaned up correctly fails here rather than producing a
 *     misleading "trying to re-parse a deleted file" error)
 *
 * On success: status flips to 'uploaded', error_message is cleared. The cron
 * picks up on its next tick (default 30s) and processes via the same path
 * as a fresh upload.
 *
 * Why this exists rather than "delete + re-upload": the storage error class
 * (D4 in BATCH 4 brainstorm) means the file is fine, just the parse path
 * choked transiently. Re-uploading would create a new R2 object unnecessarily.
 * Mirrors the cancel endpoint pattern — same ownership-checked SELECT then
 * scoped UPDATE.
 */
router.post('/imports/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const db = await getDb();

    const [existing] = await db
      .select()
      .from(appleHealthImports)
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'failed') {
      return res
        .status(400)
        .json({ error: `Cannot retry an import in status='${existing.status}'` });
    }
    if (!existing.fileR2Key) {
      return res.status(400).json({
        error:
          'The underlying file is no longer available. Please re-upload your Apple Health export.',
      });
    }

    const [updated] = await db
      .update(appleHealthImports)
      .set({ status: 'uploaded', errorMessage: null })
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)))
      .returning();
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('[appleHealth] retry import error', err);
    return res.status(500).json({ error: 'Failed to retry import' });
  }
});

/**
 * DELETE /api/apple-health/imports/:id
 *
 * Removes the tracking row + the underlying .zip from storage. Does NOT
 * delete the data already imported (sleep_sessions / activity_sessions /
 * body_metrics / daily_vitals rows stay) — those rows are first-class
 * historical data, not "owned" by the import row. Documented behavior;
 * the BATCH 5 UI surfaces this with a confirmation copy.
 */
router.delete('/imports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(appleHealthImports)
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await db
      .delete(appleHealthImports)
      .where(and(eq(appleHealthImports.id, id), eq(appleHealthImports.userId, req.user!.id)));

    // Best-effort storage cleanup — silent on missing files.
    if (existing.fileR2Key) {
      await cleanupUploadedZip(existing.fileR2Key);
    }

    return res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('[appleHealth] delete import error', err);
    return res.status(500).json({ error: 'Failed to delete import' });
  }
});

export default router;
