/**
 * Wearable Token Rotation — Sprint 4 BATCH 5
 *
 * Idempotent + resumable bulk re-encryption for `wearable_connections`
 * encrypted token columns (`access_token_encrypted`, `refresh_token_encrypted`).
 *
 * USAGE
 *   npx tsx scripts/rotate-wearable-tokens.ts <target-version>
 *
 *   target-version: the envelope version to rotate TO (e.g. "v2"). The script
 *   iterates rows whose embedded envelope version differs from the target,
 *   decrypts with the OLD key, encrypts with the NEW key + target version,
 *   writes back. Crashes mid-batch are recoverable: re-running picks up rows
 *   whose version still differs.
 *
 * ENVIRONMENT
 *   WEARABLE_TOKEN_ENCRYPTION_KEY      — current/old key (64-char hex). The
 *                                          one currently used by app code
 *                                          to decrypt existing rows.
 *   WEARABLE_TOKEN_ENCRYPTION_KEY_NEW  — new key (64-char hex). Introduced
 *                                          for this rotation only. Will
 *                                          replace the old key in the env
 *                                          AFTER the script completes (see
 *                                          docs/runbooks/open-wearables-deployment.md).
 *
 * SAFETY GATES
 *   1. Both keys must parse as valid 64-char hex (32 bytes). Refuses to run
 *      otherwise.
 *   2. Probe-decrypt-verify: BEFORE touching any real row, the script
 *      generates a synthetic test plaintext, encrypts with the NEW key +
 *      target version, decrypts back, asserts plaintext matches. Catches a
 *      malformed new key OR an encryption-module bug before destroying data.
 *   3. Production-host fail-safe: refuses to run if DATABASE_URL host
 *      doesn't look like Railway prod (mirrors scripts/run-prod-migration.ts).
 *      Manual override via --allow-non-railway flag for dev runs.
 *   4. 3-second confirmation pause after key validation + host check, before
 *      any UPDATEs fire.
 *
 * IDEMPOTENCY
 *   Each row is processed atomically. The WHERE clause filters by envelope
 *   version (extracted via getEnvelopeVersion). After successful UPDATE,
 *   the row's version matches the target — re-running the script skips it.
 *
 * AFTER THE SCRIPT COMPLETES
 *   See docs/runbooks/open-wearables-deployment.md "Token Encryption Key
 *   Rotation" section. Operator follow-up:
 *     1. Verify SELECT COUNT(*) FROM wearable_connections WHERE
 *        access_token_encrypted IS NOT NULL AND
 *        substring(access_token_encrypted, 1, 3) != '<target-version>:'
 *        returns 0
 *     2. Brief downtime window: stop app
 *     3. Swap env vars: WEARABLE_TOKEN_ENCRYPTION_KEY = new key value (the
 *        value currently in WEARABLE_TOKEN_ENCRYPTION_KEY_NEW)
 *     4. Update CURRENT_ENVELOPE_VERSION constant in
 *        server/services/tokenEncryption.ts to match target-version, deploy
 *     5. Remove WEARABLE_TOKEN_ENCRYPTION_KEY_NEW from env
 *     6. Restart app
 *   Total downtime window: ~30 seconds. Acceptable for v1 (low traffic,
 *   infrequent rotation). Zero-downtime rotation is a Sprint 5+ enhancement
 *   (multi-key by-version lookup).
 */
import {
  encryptTokenWithKey,
  decryptTokenWithKey,
  getEnvelopeVersion,
  parseKeyHex,
} from '../server/services/tokenEncryption';

const ALLOW_NON_RAILWAY = process.argv.includes('--allow-non-railway');
const targetVersion = process.argv.find((a) => /^v\d+$/.test(a)) ?? '';

interface RotationCounters {
  rowsScanned: number;
  rowsAlreadyTarget: number;
  rowsRotated: number;
  errors: number;
}

async function main() {
  // ─── (1) CLI arg validation ──────────────────────────────────────────────
  if (!targetVersion) {
    console.error('Usage: npx tsx scripts/rotate-wearable-tokens.ts <target-version>');
    console.error('  target-version: vN format (e.g. v2)');
    process.exit(2);
  }

  // ─── (2) Key validation ──────────────────────────────────────────────────
  let oldKey: Buffer;
  let newKey: Buffer;
  try {
    oldKey = parseKeyHex(
      process.env.WEARABLE_TOKEN_ENCRYPTION_KEY,
      'WEARABLE_TOKEN_ENCRYPTION_KEY'
    );
    newKey = parseKeyHex(
      process.env.WEARABLE_TOKEN_ENCRYPTION_KEY_NEW,
      'WEARABLE_TOKEN_ENCRYPTION_KEY_NEW'
    );
  } catch (err) {
    console.error('❌ Key validation failed:', (err as Error).message);
    process.exit(2);
  }
  console.log('✓ Both keys parsed (64-char hex)');
  if (oldKey.equals(newKey)) {
    console.error(
      '❌ WEARABLE_TOKEN_ENCRYPTION_KEY and ..._NEW are identical. Rotation is a no-op.'
    );
    process.exit(2);
  }
  console.log('✓ Old + new keys are distinct');

  // ─── (3) Production-host fail-safe ───────────────────────────────────────
  const url = process.env.DATABASE_URL ?? '';
  const match = url.match(/@([^/]+)\/([^?]+)/);
  const dbHost = match?.[1] ?? 'UNSET';
  const dbName = match?.[2] ?? 'UNSET';
  console.log(`DATABASE_URL host: ${dbHost}, database: ${dbName}`);
  if (!ALLOW_NON_RAILWAY && !dbHost.includes('rlwy.net') && !dbHost.includes('railway')) {
    console.error(
      `❌ DATABASE_URL host "${dbHost}" doesn't look like Railway prod. ` +
        `If this is intentional (dev rotation), pass --allow-non-railway.`
    );
    process.exit(2);
  }

  // ─── (4) Probe-decrypt-verify with NEW key ───────────────────────────────
  // Generate a synthetic plaintext, encrypt with NEW key + target version,
  // decrypt back, assert match. Catches a malformed new key OR an encryption-
  // module bug BEFORE touching real data.
  const probePlaintext = `rotation-probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const probeEnvelope = encryptTokenWithKey(probePlaintext, newKey, targetVersion);
  const probeRoundtrip = decryptTokenWithKey(probeEnvelope, newKey);
  if (probeRoundtrip !== probePlaintext) {
    console.error(
      `❌ Probe-decrypt-verify FAILED. Expected "${probePlaintext}", got "${probeRoundtrip}". ` +
        `This indicates a malformed new key OR a bug in tokenEncryption.ts. ` +
        `NOT proceeding to bulk rotation — your real data is untouched.`
    );
    process.exit(1);
  }
  console.log(`✓ Probe-decrypt-verify passed (NEW key + target version "${targetVersion}")`);

  // ─── (5) 3-second confirmation pause ─────────────────────────────────────
  console.log('✓ All pre-flight checks passed. Pausing 3s — Ctrl-C now to abort.');
  await new Promise((r) => setTimeout(r, 3000));

  // ─── (6) Bulk rotation ───────────────────────────────────────────────────
  // Dynamic import after env validation so we don't load db.ts (and its pool)
  // until we're sure we're going to use it.
  const { getDb } = await import('../server/db');
  const { sql } = await import('drizzle-orm');
  const db = await getDb();

  const counters: RotationCounters = {
    rowsScanned: 0,
    rowsAlreadyTarget: 0,
    rowsRotated: 0,
    errors: 0,
  };

  // Read all rows with at least one non-null encrypted token. Filter in JS
  // by envelope version because the version is embedded in the column value
  // (not a separate column we could index on).
  const rows: any = await db.execute(sql`
    SELECT id, access_token_encrypted, refresh_token_encrypted
    FROM wearable_connections
    WHERE access_token_encrypted IS NOT NULL
       OR refresh_token_encrypted IS NOT NULL
  `);
  const rowsList = (rows.rows ?? rows) as Array<{
    id: string;
    access_token_encrypted: string | null;
    refresh_token_encrypted: string | null;
  }>;
  console.log(`Scanning ${rowsList.length} rows with non-null encrypted tokens`);

  for (const row of rowsList) {
    counters.rowsScanned += 1;

    // Determine which fields need rotation. A row is "already target" iff
    // BOTH non-null fields have version === targetVersion.
    const needsAccessRotation =
      row.access_token_encrypted !== null &&
      getEnvelopeVersion(row.access_token_encrypted) !== targetVersion;
    const needsRefreshRotation =
      row.refresh_token_encrypted !== null &&
      getEnvelopeVersion(row.refresh_token_encrypted) !== targetVersion;

    if (!needsAccessRotation && !needsRefreshRotation) {
      counters.rowsAlreadyTarget += 1;
      continue;
    }

    try {
      const updates: { access?: string; refresh?: string } = {};
      if (needsAccessRotation && row.access_token_encrypted) {
        const plaintext = decryptTokenWithKey(row.access_token_encrypted, oldKey);
        updates.access = encryptTokenWithKey(plaintext, newKey, targetVersion);
      }
      if (needsRefreshRotation && row.refresh_token_encrypted) {
        const plaintext = decryptTokenWithKey(row.refresh_token_encrypted, oldKey);
        updates.refresh = encryptTokenWithKey(plaintext, newKey, targetVersion);
      }

      // Atomic per-row UPDATE. Either both fields rotate together (if both
      // needed rotation) or just the one that did. updated_at bumps via the
      // table's $onUpdate trigger but we set it explicitly for clarity.
      if (updates.access && updates.refresh) {
        await db.execute(sql`
          UPDATE wearable_connections
          SET access_token_encrypted = ${updates.access},
              refresh_token_encrypted = ${updates.refresh},
              updated_at = NOW()
          WHERE id = ${row.id}
        `);
      } else if (updates.access) {
        await db.execute(sql`
          UPDATE wearable_connections
          SET access_token_encrypted = ${updates.access},
              updated_at = NOW()
          WHERE id = ${row.id}
        `);
      } else if (updates.refresh) {
        await db.execute(sql`
          UPDATE wearable_connections
          SET refresh_token_encrypted = ${updates.refresh},
              updated_at = NOW()
          WHERE id = ${row.id}
        `);
      }
      counters.rowsRotated += 1;
    } catch (err) {
      console.error(`❌ Row ${row.id} rotation failed:`, (err as Error).message);
      counters.errors += 1;
    }
  }

  // ─── (7) Final report ────────────────────────────────────────────────────
  console.log('\n=== Rotation Complete ===');
  console.log(`  Rows scanned       : ${counters.rowsScanned}`);
  console.log(`  Already at target  : ${counters.rowsAlreadyTarget} (skipped)`);
  console.log(`  Rotated this run   : ${counters.rowsRotated}`);
  console.log(`  Errors             : ${counters.errors}`);
  console.log(`  Target version     : ${targetVersion}`);

  if (counters.errors > 0) {
    console.log(
      '\n⚠️  Re-run the script to retry failed rows. They are still on the OLD ' +
        'envelope version, so re-running picks them up.'
    );
    process.exit(1);
  }
  if (counters.rowsRotated === 0 && counters.rowsAlreadyTarget === counters.rowsScanned) {
    console.log(
      `\n✓ All ${counters.rowsScanned} rows already at target version. ` +
        `Idempotency confirmed — no work to do.`
    );
  } else {
    console.log(
      `\n✓ ${counters.rowsRotated} rows rotated to "${targetVersion}". ` +
        `Now follow the post-rotation cutover steps in ` +
        `docs/runbooks/open-wearables-deployment.md.`
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
