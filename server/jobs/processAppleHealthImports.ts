/**
 * Apple Health Import Processor — Sprint 5 BATCH 3.
 *
 * Cron that picks up `apple_health_imports` rows in status='uploaded',
 * stream-parses the underlying .zip, ingests records into the existing
 * wearable schema, and updates the row's progress + status.
 *
 * MIRRORS Sprint 2's `cleanupExpiredQuietHours.ts` cron scaffolding:
 *   - SELECT FOR UPDATE SKIP LOCKED claim (one row per tick by default)
 *   - `isTickInFlight` re-entrancy guard
 *   - SIGTERM graceful stop
 *   - env-overridable interval clamped ≥ 10s
 *
 * SLEEP AGGREGATION TIMING (the load-bearing decision)
 *   Apple Health stores sleep as per-stage records. Multi-segment-night
 *   handling REQUIRES seeing all records sorted by startDate before we can
 *   correctly decide which records belong to which session. So sleep records
 *   are BUFFERED during parsing, then aggregated + flushed via
 *   `aggregateSleepRecords` AFTER the parser's onComplete fires.
 *
 *   Workout / body / vital ingest is per-record (no buffering, no aggregation
 *   — those types are already 1:1 with our schema shape).
 *
 *   See `appleHealthSleepAggregator.ts` header for the InBed-anchored algorithm
 *   and the safety threshold (50k sessions per import).
 *
 * CANCELLATION
 *   Periodic check during the parse: every PROGRESS_INTERVAL records, the
 *   cron re-reads the import row's status. If the user cancelled
 *   (status='cancelled'), the parser's abort flag flips and parsing
 *   short-circuits. Already-ingested rows are NOT rolled back — partial data
 *   stays, the import row is marked 'cancelled', no completion notification
 *   fires.
 *
 * UNKNOWN-OUTCOME POLICY
 *   Errors during parse → status='failed', error_message captures the cause,
 *   `apple_health_import_failed` notification dispatched. The cron does NOT
 *   retry — a failed import is final until the user re-uploads.
 */
import { sql, eq } from 'drizzle-orm';
import { createReadStream, existsSync } from 'node:fs';
import type { Readable } from 'node:stream';
import { getDb } from '../db';
import { appleHealthImports } from '../../shared/schema';
import { isR2Configured } from '../services/fileUpload';
import {
  parseHealthExport,
  type SleepRecord,
  type ParseStats,
} from '../services/appleHealthParser';
import { streamExportXml } from '../services/appleHealthZip';
import { aggregateSleepRecords } from '../services/appleHealthSleepAggregator';
import {
  ingestAppleHealthBody,
  ingestAppleHealthSleep,
  ingestAppleHealthVital,
  ingestAppleHealthWorkout,
  type VitalRecordType,
} from '../services/appleHealthIngest';
import { cleanupUploadedZip } from '../routes/appleHealth';
import { dispatch } from '../services/notificationDispatcher';
import { logger } from '../logger';

const DEFAULT_INTERVAL_MS = 30 * 1000; // 30s default; env-overridable
const MIN_INTERVAL_MS = 10 * 1000; // never tighter than 10s
const STATUS_CHECK_EVERY_RECORDS = 5000;

let cronTimer: NodeJS.Timeout | null = null;
let isTickInFlight = false;
let sigtermBound = false;

export function getCronStatus(): {
  running: boolean;
  tickInFlight: boolean;
  intervalMs: number;
} {
  return {
    running: cronTimer !== null,
    tickInFlight: isTickInFlight,
    intervalMs: getIntervalMs(),
  };
}

function getIntervalMs(): number {
  const env = process.env.APPLE_HEALTH_CRON_INTERVAL_MS;
  if (!env) return DEFAULT_INTERVAL_MS;
  const parsed = parseInt(env, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_INTERVAL_MS;
  return Math.max(MIN_INTERVAL_MS, parsed);
}

// ─── Storage read helper ────────────────────────────────────────────────────

async function openZipStream(storageKey: string): Promise<Readable> {
  // File-system path (dev): return a Readable from disk.
  if (storageKey.startsWith('/') || /^[A-Za-z]:[\\/]/.test(storageKey)) {
    if (!existsSync(storageKey)) {
      throw new Error(`Uploaded file not found at ${storageKey}`);
    }
    return createReadStream(storageKey);
  }
  // R2 key (prod): fetch via S3 GetObject. Body is a Readable on Node SDK v3.
  if (!isR2Configured()) {
    throw new Error('R2 not configured but storage key looks like an R2 key');
  }
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
  const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
  if (!response.Body) {
    throw new Error(`Empty body from R2 for key ${storageKey}`);
  }
  return response.Body as unknown as Readable;
}

// ─── Per-import processor ───────────────────────────────────────────────────

/**
 * Process a single claimed import row from start to finish. Updates the row
 * progress + status as it goes. Errors are caught, surfaced as
 * status='failed', and dispatched as a notification — no exception escapes.
 *
 * Exposed for tests + manual invocation.
 */
export async function processOneImport(importId: string): Promise<{
  outcome: 'completed' | 'failed' | 'cancelled' | 'skipped_no_file';
  stats?: ParseStats;
  error?: string;
}> {
  const db = await getDb();

  // Fetch the row (the cron's claim already set status='parsing'; we re-read
  // here to access fileR2Key + userId).
  const [importRow] = await db
    .select()
    .from(appleHealthImports)
    .where(eq(appleHealthImports.id, importId));
  if (!importRow) {
    logger.warn(`[appleHealthCron] import ${importId} disappeared before processing`);
    return { outcome: 'skipped_no_file' };
  }
  if (!importRow.fileR2Key) {
    await markFailed(
      importId,
      'No file storage key on import row — upload may have crashed mid-write.'
    );
    return { outcome: 'failed', error: 'no file' };
  }

  const userId = importRow.userId;
  // In-memory sleep buffer. Bounded by parser's per-record progression; sleep
  // records are typically <1% of total record count so this is small even for
  // 5y exports (~5k-10k records → a few hundred KB).
  const sleepBuffer: SleepRecord[] = [];
  const counters = {
    workout: 0,
    body: 0,
    vital: 0,
    duplicateWorkout: 0,
    duplicateBody: 0,
    duplicateVital: 0,
  };

  // Cancellation flag — flipped when periodic status check sees status='cancelled'.
  let cancelled = false;

  try {
    const zipStream = await openZipStream(importRow.fileR2Key);
    const xmlStream = await streamExportXml(zipStream);

    // Last status check timestamp (parsed-records based, not wall-clock).
    let lastStatusCheckAt = 0;

    // Per-record ingest dispatch table for vital/body types. Each callback
    // resolves a promise for the await chain so we serialize DB writes per
    // record (avoids drowning the connection pool on a 100k-record import).
    const ingestPromises: Promise<unknown>[] = [];

    // Vital ingest helper — arrow function (function declarations inside
    // blocks aren't valid under TS ES5 strict mode). Captures cancelled,
    // counters, ingestPromises by closure.
    const bumpVital = (
      record: import('../services/appleHealthParser').QuantityRecord,
      type: VitalRecordType
    ) => {
      if (cancelled) return;
      ingestPromises.push(
        ingestAppleHealthVital(userId, record, type).then((r) => {
          if (r.inserted) counters.vital += 1;
          else if (r.skippedDuplicate) counters.duplicateVital += 1;
        })
      );
    };

    const stats = await parseHealthExport(xmlStream, {
      onProgress: async (parsed) => {
        // Update DB progress + check for cancellation periodically.
        if (parsed - lastStatusCheckAt >= STATUS_CHECK_EVERY_RECORDS) {
          lastStatusCheckAt = parsed;
          await db
            .update(appleHealthImports)
            .set({ recordsParsed: parsed })
            .where(eq(appleHealthImports.id, importId));
          const [latest] = await db
            .select({ status: appleHealthImports.status })
            .from(appleHealthImports)
            .where(eq(appleHealthImports.id, importId));
          if (latest?.status === 'cancelled') {
            cancelled = true;
          }
        }
      },
      onWorkout: (record) => {
        if (cancelled) return;
        ingestPromises.push(
          ingestAppleHealthWorkout(userId, record).then((r) => {
            if (r.inserted) counters.workout += 1;
            else if (r.skippedDuplicate) counters.duplicateWorkout += 1;
          })
        );
      },
      onSleepAnalysis: (record) => {
        if (cancelled) return;
        sleepBuffer.push(record);
      },
      onBodyMass: (record) => {
        if (cancelled) return;
        ingestPromises.push(
          ingestAppleHealthBody(userId, record, 'HKQuantityTypeIdentifierBodyMass').then((r) => {
            if (r.inserted) counters.body += 1;
            else if (r.skippedDuplicate) counters.duplicateBody += 1;
          })
        );
      },
      onBodyFatPercentage: (record) => {
        if (cancelled) return;
        ingestPromises.push(
          ingestAppleHealthBody(userId, record, 'HKQuantityTypeIdentifierBodyFatPercentage').then(
            (r) => {
              if (r.inserted) counters.body += 1;
              else if (r.skippedDuplicate) counters.duplicateBody += 1;
            }
          )
        );
      },
      onLeanBodyMass: (record) => {
        if (cancelled) return;
        ingestPromises.push(
          ingestAppleHealthBody(userId, record, 'HKQuantityTypeIdentifierLeanBodyMass').then(
            (r) => {
              if (r.inserted) counters.body += 1;
              else if (r.skippedDuplicate) counters.duplicateBody += 1;
            }
          )
        );
      },
      onRestingHeartRate: (record) => bumpVital(record, 'HKQuantityTypeIdentifierRestingHeartRate'),
      onHRV: (record) => bumpVital(record, 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'),
      onVO2Max: (record) => bumpVital(record, 'HKQuantityTypeIdentifierVO2Max'),
      onBloodOxygen: (record) => bumpVital(record, 'HKQuantityTypeIdentifierOxygenSaturation'),
    });

    // Wait for all per-record ingest promises to settle before sleep
    // aggregation. We use allSettled (not all) so a single bad record
    // doesn't tank the whole import — a malformed XML record might fail
    // its INSERT but the rest of the import should still land. Failed
    // promises are logged + counted as unparseable; the import still
    // completes with partial-success semantics.
    const settled = await Promise.allSettled(ingestPromises);
    const ingestFailures = settled.filter((s) => s.status === 'rejected');
    if (ingestFailures.length > 0) {
      logger.warn(
        `[appleHealthCron] ${ingestFailures.length} per-record ingest failures during import ${importId}`,
        { firstError: (ingestFailures[0] as PromiseRejectedResult).reason?.message }
      );
    }

    // If the user cancelled while we were parsing, mark cancelled and exit
    // before doing the sleep aggregation pass. Already-ingested rows stay
    // (partial-data semantic, surfaced in BATCH 4 UX brainstorm).
    if (cancelled) {
      logger.info(`[appleHealthCron] import ${importId} cancelled mid-parse`);
      // Status was already set to 'cancelled' by the user-facing route; just
      // record the partial counters before we leave so the user sees what
      // landed before they cancelled.
      await db
        .update(appleHealthImports)
        .set({
          recordsParsed: stats.recordsParsed,
          recordsIngestedWorkout: counters.workout,
          recordsIngestedSleep: 0,
          recordsIngestedVitals: counters.vital,
          recordsIngestedBody: counters.body,
          recordsSkippedDuplicate:
            counters.duplicateWorkout + counters.duplicateBody + counters.duplicateVital,
          recordsSkippedUnparseable: stats.recordsSkippedUnparseable,
          dateRangeStart: stats.dateRangeStart,
          dateRangeEnd: stats.dateRangeEnd,
        })
        .where(eq(appleHealthImports.id, importId));
      return { outcome: 'cancelled', stats };
    }

    // Sleep aggregation pass: turn buffered per-stage records into per-session
    // shape, then UPSERT each session. Aggregator throws on >50k sessions.
    // Single forward loop counts inserts + duplicates inline.
    const aggregated = aggregateSleepRecords(sleepBuffer);
    let sleepInserts = 0;
    let sleepDups = 0;
    for (const session of aggregated) {
      const r = await ingestAppleHealthSleep(userId, session);
      if (r.inserted) sleepInserts += 1;
      else if (r.skippedDuplicate) sleepDups += 1;
    }

    // Mark completed.
    await db
      .update(appleHealthImports)
      .set({
        status: 'completed',
        recordsParsed: stats.recordsParsed,
        recordsIngestedWorkout: counters.workout,
        recordsIngestedSleep: sleepInserts,
        recordsIngestedVitals: counters.vital,
        recordsIngestedBody: counters.body,
        recordsSkippedDuplicate:
          counters.duplicateWorkout + sleepDups + counters.duplicateBody + counters.duplicateVital,
        recordsSkippedUnparseable: stats.recordsSkippedUnparseable,
        dateRangeStart: stats.dateRangeStart,
        dateRangeEnd: stats.dateRangeEnd,
        completedAt: new Date(),
      })
      .where(eq(appleHealthImports.id, importId));

    // Dispatch completion notification.
    await dispatch(userId, 'apple_health_import_complete', {
      importId,
      recordsTotal: counters.workout + sleepInserts + counters.vital + counters.body,
      dateRange:
        stats.dateRangeStart && stats.dateRangeEnd
          ? `${stats.dateRangeStart} → ${stats.dateRangeEnd}`
          : '',
    });

    // Best-effort cleanup of the storage zip — completed imports don't need
    // to retain the .zip beyond a successful parse.
    await cleanupUploadedZip(importRow.fileR2Key);
    await db
      .update(appleHealthImports)
      .set({ fileR2Key: null })
      .where(eq(appleHealthImports.id, importId));

    return { outcome: 'completed', stats };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[appleHealthCron] import ${importId} failed`, err);
    await markFailed(importId, msg);
    // Dispatch failure notification (best-effort — if userId resolved).
    try {
      await dispatch(userId, 'apple_health_import_failed', { importId, error: msg });
    } catch {
      // Don't compound failures
    }
    return { outcome: 'failed', error: msg };
  }
}

async function markFailed(importId: string, errorMessage: string): Promise<void> {
  const db = await getDb();
  await db
    .update(appleHealthImports)
    .set({
      status: 'failed',
      errorMessage: errorMessage.slice(0, 1000), // keep error_message bounded
      completedAt: new Date(),
    })
    .where(eq(appleHealthImports.id, importId));
}

// ─── Cron tick ──────────────────────────────────────────────────────────────

/**
 * One tick. Claims at most ONE import via SKIP LOCKED, sets status='parsing',
 * processes it. One per tick keeps memory pressure bounded — the parser holds
 * record buffers in memory; running multiple imports in parallel could OOM.
 *
 * Exposed for tests + manual invocation.
 */
export async function runAppleHealthTick(): Promise<{
  claimed: number;
  outcome?: 'completed' | 'failed' | 'cancelled' | 'skipped_no_file';
}> {
  if (isTickInFlight) {
    return { claimed: 0 };
  }
  isTickInFlight = true;
  try {
    const db = await getDb();
    // SELECT FOR UPDATE SKIP LOCKED — concurrent-safe claim. Order by
    // created_at ASC so oldest pending import wins (FIFO).
    const claim = await db.execute<{ id: string }>(
      sql`SELECT id FROM apple_health_imports
          WHERE status = 'uploaded'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED`
    );
    const rows = ((claim as unknown as { rows?: unknown[] }).rows ?? claim) as Array<{
      id: string;
    }>;
    if (rows.length === 0) {
      return { claimed: 0 };
    }
    const importId = rows[0].id;
    // Move to 'parsing' inside the same lock window. Subsequent ticks won't
    // re-claim it.
    await db.execute(sql`
      UPDATE apple_health_imports
      SET status = 'parsing'
      WHERE id = ${importId} AND status = 'uploaded'
    `);

    const result = await processOneImport(importId);
    return { claimed: 1, outcome: result.outcome };
  } finally {
    isTickInFlight = false;
  }
}

// ─── Cron lifecycle ─────────────────────────────────────────────────────────

export function startAppleHealthCron(): NodeJS.Timeout {
  if (cronTimer) {
    logger.warn('[appleHealthCron] startAppleHealthCron called while already running — ignoring');
    return cronTimer;
  }
  const interval = getIntervalMs();
  logger.info(`[appleHealthCron] starting, interval=${interval}ms`);

  cronTimer = setInterval(() => {
    runAppleHealthTick()
      .then((result) => {
        if (result.claimed > 0) {
          logger.info('[appleHealthCron] tick complete', result);
        }
      })
      .catch((err) => {
        logger.error('[appleHealthCron] tick threw', err);
      });
  }, interval);

  cronTimer.unref();

  if (!sigtermBound) {
    process.on('SIGTERM', stopAppleHealthCron);
    sigtermBound = true;
  }

  return cronTimer;
}

export function stopAppleHealthCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}
