/**
 * Sprint 5 BATCH 3 — Apple Health Import Smoke Test
 *
 * Runs the FULL pipeline end-to-end against the dev DB:
 *   synthesize export.zip with multi-stage night + workout + body + vitals
 *   → write to tmp file
 *   → insert apple_health_imports row pointing at the file
 *   → invoke processOneImport(importId)
 *   → SELECT from sleep_sessions / activity_sessions / daily_vitals / body_metrics
 *   → assert expected row counts landed
 *   → re-run processOneImport with a re-uploaded copy of the same zip
 *   → assert zero new rows + duplicate counters increment
 *
 * SAFETY GATES (operator script, dev DB only):
 *   - Hard fail if DATABASE_URL host is rlwy.net or railway-managed (production
 *     fail-safe, mirrors scripts/run-prod-migration.ts).
 *   - Uses a clearly-synthetic user_id prefix so any leftover rows are
 *     greppable / deletable.
 *   - CLEANUP step at the end DELETEs the test user + cascade-cleans all
 *     child rows. If the script crashes mid-run, manual cleanup is one
 *     SQL statement (printed in the failure path).
 *
 * INVOCATION:
 *   npx tsx scripts/smoke-apple-health.ts
 *
 * The script does NOT modify production data. It only writes rows tagged with
 * the synthetic test user_id and deletes them at the end.
 */
import { sql } from 'drizzle-orm';
import { mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb } from '../server/db';

// ─── Production fail-safe ─────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL ?? '';
if (dbUrl.includes('rlwy.net') || dbUrl.includes('railway')) {
  console.error('[smoke] BLOCKED: DATABASE_URL points at production. Aborting.');
  process.exit(1);
}

const TEST_USER_ID = `apple-health-smoke-${Date.now()}`;
const TEST_USER_EMAIL = `${TEST_USER_ID}@smoke.test`;

// ─── Synthetic export.xml fixture ────────────────────────────────────────────

function buildExportXml(): string {
  // Multi-segment night: 2 InBed envelopes on 2026-01-15.
  // Body: 1 BodyMass record (lb → kg conversion exercised).
  // Workout: 1 outdoor run.
  // Vital: 1 RestingHeartRate record.
  return `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <ExportDate value="2026-01-16 10:00:00 -0500"/>

  <!-- Multi-segment night: 22:00→03:00, then 03:30→06:00 -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
          sourceName="Apple Watch"
          startDate="2026-01-15 22:00:00 -0500"
          endDate="2026-01-16 03:00:00 -0500"
          value="HKCategoryValueSleepAnalysisInBed"
          HKAttributeKeyExternalUUID="UUID-INBED-SEG1"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
          sourceName="Apple Watch"
          startDate="2026-01-15 22:30:00 -0500"
          endDate="2026-01-15 23:30:00 -0500"
          value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
          sourceName="Apple Watch"
          startDate="2026-01-15 23:30:00 -0500"
          endDate="2026-01-16 00:30:00 -0500"
          value="HKCategoryValueSleepAnalysisAsleepDeep"/>
  <!-- 30-min wake gap, then second InBed envelope -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
          sourceName="Apple Watch"
          startDate="2026-01-16 03:30:00 -0500"
          endDate="2026-01-16 06:00:00 -0500"
          value="HKCategoryValueSleepAnalysisInBed"
          HKAttributeKeyExternalUUID="UUID-INBED-SEG2"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
          sourceName="Apple Watch"
          startDate="2026-01-16 04:00:00 -0500"
          endDate="2026-01-16 05:00:00 -0500"
          value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
          sourceName="Apple Watch"
          startDate="2026-01-16 05:00:00 -0500"
          endDate="2026-01-16 05:30:00 -0500"
          value="HKCategoryValueSleepAnalysisAsleepREM"/>

  <!-- Body mass in lb (tests lb→kg conversion in parser) -->
  <Record type="HKQuantityTypeIdentifierBodyMass"
          sourceName="Withings"
          unit="lb"
          startDate="2026-01-15 08:00:00 -0500"
          endDate="2026-01-15 08:00:00 -0500"
          value="178.5"
          HKAttributeKeyExternalUUID="UUID-WEIGHT-1"/>

  <!-- Resting heart rate -->
  <Record type="HKQuantityTypeIdentifierRestingHeartRate"
          sourceName="Apple Watch"
          unit="count/min"
          startDate="2026-01-15 06:00:00 -0500"
          endDate="2026-01-15 06:00:00 -0500"
          value="58"
          HKAttributeKeyExternalUUID="UUID-RHR-1"/>

  <!-- Outdoor run workout -->
  <Workout workoutActivityType="HKWorkoutActivityTypeRunning"
           duration="32.5" durationUnit="min"
           totalDistance="5.2" totalDistanceUnit="km"
           totalEnergyBurned="320" totalEnergyBurnedUnit="kcal"
           sourceName="Apple Watch"
           startDate="2026-01-15 07:00:00 -0500"
           endDate="2026-01-15 07:32:30 -0500"
           HKAttributeKeyExternalUUID="UUID-WORKOUT-1"/>
</HealthData>`;
}

// ─── Minimal zip writer (stored, no compression) ─────────────────────────────

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipWithEntry(entryName: string, content: string): Buffer {
  const data = Buffer.from(content, 'utf8');
  const nameBuf = Buffer.from(entryName, 'utf8');
  const crc = crc32(data);

  const lfh = Buffer.alloc(30 + nameBuf.length);
  lfh.writeUInt32LE(0x04034b50, 0);
  lfh.writeUInt16LE(20, 4);
  lfh.writeUInt16LE(0, 6);
  lfh.writeUInt16LE(0, 8);
  lfh.writeUInt16LE(0, 10);
  lfh.writeUInt16LE(0, 12);
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(data.length, 18);
  lfh.writeUInt32LE(data.length, 22);
  lfh.writeUInt16LE(nameBuf.length, 26);
  lfh.writeUInt16LE(0, 28);
  nameBuf.copy(lfh, 30);

  const cdh = Buffer.alloc(46 + nameBuf.length);
  cdh.writeUInt32LE(0x02014b50, 0);
  cdh.writeUInt16LE(20, 4);
  cdh.writeUInt16LE(20, 6);
  cdh.writeUInt16LE(0, 8);
  cdh.writeUInt16LE(0, 10);
  cdh.writeUInt16LE(0, 12);
  cdh.writeUInt16LE(0, 14);
  cdh.writeUInt32LE(crc, 16);
  cdh.writeUInt32LE(data.length, 20);
  cdh.writeUInt32LE(data.length, 24);
  cdh.writeUInt16LE(nameBuf.length, 28);
  cdh.writeUInt16LE(0, 30);
  cdh.writeUInt16LE(0, 32);
  cdh.writeUInt16LE(0, 34);
  cdh.writeUInt16LE(0, 36);
  cdh.writeUInt32LE(0, 38);
  cdh.writeUInt32LE(0, 42);
  nameBuf.copy(cdh, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdh.length, 12);
  eocd.writeUInt32LE(lfh.length + data.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([lfh, data, cdh, eocd]);
}

// ─── Smoke runner ───────────────────────────────────────────────────────────

async function setupTestUser(): Promise<void> {
  const db = await getDb();
  // Insert a minimal users row. Fields mirror what the schema requires.
  await db.execute(sql`
    INSERT INTO users (id, email, password, first_name, last_name, role)
    VALUES (${TEST_USER_ID}, ${TEST_USER_EMAIL}, 'smoke-test-no-login', 'Smoke', 'Test', 'solo')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function cleanupTestUser(): Promise<void> {
  const db = await getDb();
  // CASCADE on user_id FK will clean: apple_health_imports, sleep_sessions,
  // activity_sessions, daily_vitals, body_metrics, notifications, etc.
  await db.execute(sql`DELETE FROM users WHERE id = ${TEST_USER_ID}`);
}

async function countRows(table: string): Promise<number> {
  const db = await getDb();
  const result = (await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM ${sql.raw(table)}
    WHERE user_id = ${TEST_USER_ID} AND source = 'apple_health'
  `)) as unknown as { rows?: Array<{ c: number }> } | Array<{ c: number }>;
  const rows = (result as { rows?: Array<{ c: number }> }).rows ?? (result as Array<{ c: number }>);
  return rows[0]?.c ?? 0;
}

async function runImport(zipPath: string): Promise<{
  importId: string;
  status: string;
  recordsParsed: number;
  recordsIngestedSleep: number;
  recordsIngestedBody: number;
  recordsIngestedVitals: number;
  recordsIngestedWorkout: number;
  recordsSkippedDuplicate: number;
  recordsSkippedUnparseable: number;
  errorMessage: string | null;
}> {
  const db = await getDb();

  // Insert apple_health_imports row.
  const insert = (await db.execute(sql`
    INSERT INTO apple_health_imports (user_id, file_size_bytes, file_r2_key, status)
    VALUES (${TEST_USER_ID}, ${1024}, ${zipPath}, 'uploaded')
    RETURNING id
  `)) as unknown as { rows?: Array<{ id: string }> };
  const importId = (insert.rows ?? (insert as unknown as Array<{ id: string }>))[0].id;

  // Move to 'parsing' (mirrors what the cron tick would do).
  await db.execute(sql`
    UPDATE apple_health_imports SET status = 'parsing' WHERE id = ${importId}
  `);

  // Run the processor.
  const { processOneImport } = await import('../server/jobs/processAppleHealthImports');
  await processOneImport(importId);

  // Read final state.
  const final = (await db.execute(sql`
    SELECT status, records_parsed, records_ingested_sleep, records_ingested_body,
           records_ingested_vitals, records_ingested_workout, records_skipped_duplicate,
           records_skipped_unparseable, error_message
    FROM apple_health_imports WHERE id = ${importId}
  `)) as unknown as { rows?: Array<Record<string, unknown>> };
  const row = (final.rows ?? (final as unknown as Array<Record<string, unknown>>))[0];
  return {
    importId,
    status: String(row.status),
    recordsParsed: Number(row.records_parsed ?? 0),
    recordsIngestedSleep: Number(row.records_ingested_sleep ?? 0),
    recordsIngestedBody: Number(row.records_ingested_body ?? 0),
    recordsIngestedVitals: Number(row.records_ingested_vitals ?? 0),
    recordsIngestedWorkout: Number(row.records_ingested_workout ?? 0),
    recordsSkippedDuplicate: Number(row.records_skipped_duplicate ?? 0),
    recordsSkippedUnparseable: Number(row.records_skipped_unparseable ?? 0),
    errorMessage: row.error_message as string | null,
  };
}

async function main() {
  console.warn(`[smoke] using test user_id: ${TEST_USER_ID}`);
  console.warn(`[smoke] DB: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);

  // Build zip + write to tmp.
  const xml = buildExportXml();
  const zip = buildZipWithEntry('apple_health_export/export.xml', xml);
  const dir = mkdtempSync(join(tmpdir(), 'apple-health-smoke-'));
  const path1 = join(dir, 'export-1.zip');
  const path2 = join(dir, 'export-2.zip'); // separate file, identical bytes
  writeFileSync(path1, zip);
  writeFileSync(path2, zip);

  let success = false;
  try {
    await setupTestUser();

    // ─── Pass 1: fresh import ──────────────────────────────────────────────
    console.warn('\n[smoke] === Pass 1: fresh import ===');
    const r1 = await runImport(path1);
    console.warn(JSON.stringify(r1, null, 2));

    // Counts in destination tables
    const c1 = {
      sleep: await countRows('sleep_sessions'),
      activity: await countRows('activity_sessions'),
      vital: await countRows('daily_vitals'),
      body: await countRows('body_metrics'),
    };
    console.warn(`[smoke] table counts after pass 1: ${JSON.stringify(c1)}`);

    // Assertions: pass 1 should land
    //   - 2 sleep sessions (multi-segment night)
    //   - 1 activity_session (workout)
    //   - 1 daily_vitals row (resting HR)
    //   - 1 body_metrics row (weight)
    if (r1.status !== 'completed') {
      throw new Error(
        `Pass 1 expected status='completed', got '${r1.status}'. error: ${r1.errorMessage}`
      );
    }
    if (c1.sleep !== 2) throw new Error(`expected 2 sleep_sessions, got ${c1.sleep}`);
    if (c1.activity !== 1) throw new Error(`expected 1 activity_session, got ${c1.activity}`);
    if (c1.vital !== 1) throw new Error(`expected 1 daily_vital, got ${c1.vital}`);
    if (c1.body !== 1) throw new Error(`expected 1 body_metric, got ${c1.body}`);

    // ─── Pass 2: re-import same zip ────────────────────────────────────────
    console.warn('\n[smoke] === Pass 2: re-import (idempotency) ===');
    const r2 = await runImport(path2);
    console.warn(JSON.stringify(r2, null, 2));

    const c2 = {
      sleep: await countRows('sleep_sessions'),
      activity: await countRows('activity_sessions'),
      vital: await countRows('daily_vitals'),
      body: await countRows('body_metrics'),
    };
    console.warn(`[smoke] table counts after pass 2: ${JSON.stringify(c2)}`);

    // Idempotency: counts must NOT have grown.
    if (c2.sleep !== c1.sleep) throw new Error(`sleep count grew from ${c1.sleep} to ${c2.sleep}`);
    if (c2.activity !== c1.activity)
      throw new Error(`activity count grew from ${c1.activity} to ${c2.activity}`);
    if (c2.vital !== c1.vital) throw new Error(`vital count grew from ${c1.vital} to ${c2.vital}`);
    if (c2.body !== c1.body) throw new Error(`body count grew from ${c1.body} to ${c2.body}`);

    // Pass 2 duplicate counters: workout/sleep/body should each have 1+ duplicates.
    // (Vital uses date+source UNIQUE, so re-import COALESCE-updates rather than
    // returning xmax!=0 — its skipped counter may stay 0. That's expected.)
    if (r2.recordsSkippedDuplicate < 1) {
      throw new Error(
        `expected pass 2 records_skipped_duplicate >= 1, got ${r2.recordsSkippedDuplicate}`
      );
    }

    success = true;
    console.warn('\n[smoke] ✓ ALL ASSERTIONS PASSED');
  } catch (err) {
    console.error('\n[smoke] ✗ FAILED:', err);
    console.error(
      `\n[smoke] manual cleanup if cleanupTestUser fails:\n  DELETE FROM users WHERE id = '${TEST_USER_ID}';`
    );
  } finally {
    try {
      await cleanupTestUser();
      console.warn('[smoke] cleanup: test user + cascade-deleted');
    } catch (cleanupErr) {
      console.error('[smoke] CLEANUP FAILED — manual sql:', cleanupErr);
      console.error(`  DELETE FROM users WHERE id = '${TEST_USER_ID}';`);
    }
    try {
      unlinkSync(path1);
    } catch {
      // ignore
    }
    try {
      unlinkSync(path2);
    } catch {
      // ignore
    }
    process.exit(success ? 0 : 1);
  }
}

main();
