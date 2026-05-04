/**
 * R2 Orphan Cleanup — Sprint 2 BATCH 2
 *
 * Sprint 1 audit (G1) flagged: when a user deletes their account, body_metrics
 * and progress_photos rows cascade-delete via FK, but the R2 objects they
 * reference don't. This module collects all R2 keys belonging to a user and
 * deletes them best-effort.
 *
 * Idempotent: safe to call twice on the same userId. The R2 deleteImage helper
 * already silently ignores missing keys, so re-runs are no-ops.
 */

import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { progressPhotos, bodyMetrics } from '../../shared/schema';
import { deleteImage } from './fileUpload';
import { logger } from '../logger';

export interface OrphanCleanupResult {
  deleted: number;
  failed: number;
  skipped: number; // null/empty URLs
}

export async function cleanupOrphanedR2Objects(userId: string): Promise<OrphanCleanupResult> {
  const db = await getDb();
  const result: OrphanCleanupResult = { deleted: 0, failed: 0, skipped: 0 };

  // 1. Progress photos — imageUrl + thumbnailUrl
  const photos = await db
    .select({
      imageUrl: progressPhotos.imageUrl,
      thumbnailUrl: progressPhotos.thumbnailUrl,
    })
    .from(progressPhotos)
    .where(eq(progressPhotos.userId, userId));

  const urls: string[] = [];
  for (const p of photos) {
    if (p.imageUrl) urls.push(p.imageUrl);
    if (p.thumbnailUrl) urls.push(p.thumbnailUrl);
  }

  // 2. body_metrics has no R2-stored fields in v1 — kept here so future
  // wearable-photo / scan-image columns get cleaned up automatically once added.
  // Currently no-op (intentional, future-proofing).
  await db.select({ id: bodyMetrics.id }).from(bodyMetrics).where(eq(bodyMetrics.userId, userId));

  // 3. Delete each URL. deleteImage is best-effort and silently ignores misses.
  for (const url of urls) {
    if (!url || !url.startsWith('http')) {
      result.skipped += 1;
      continue;
    }
    try {
      await deleteImage(url);
      result.deleted += 1;
    } catch (err) {
      result.failed += 1;
      logger.error('[orphanCleanup] failed to delete R2 object', { url, err });
    }
  }

  logger.info('[orphanCleanup] complete', { userId, ...result });
  return result;
}
