/**
 * Token Encryption — Sprint 4 BATCH 2 (envelope versioned in BATCH 5)
 *
 * AES-256-GCM with random per-message IV. Used to encrypt OAuth access /
 * refresh tokens at rest in `wearable_connections.access_token_encrypted` /
 * `refresh_token_encrypted`. Sprint 4 v1: tokens primarily live in the
 * Open Wearables service; we only persist passthrough copies that the
 * provider returns. They MUST be encrypted regardless — a future leaked DB
 * dump cannot grant access without the encryption key.
 *
 * Envelope format (BATCH 5 onward):
 *
 *   <version>:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *
 * Where <version> is a label (e.g. "v1") tying the envelope to the key it
 * was encrypted with. Rotation iterates rows whose version != current; the
 * version embedded in the envelope is the rotation script's "have I done this
 * row yet?" marker. See _brain/notes/decisions.md "Sprint 4 BATCH 4 D4 —
 * Token encryption" for the full rationale.
 *
 * Backward compatibility: legacy 3-part envelopes (`<iv>:<tag>:<ct>`) from
 * BATCH 2 are accepted on decrypt and treated as `v1`. There are no real
 * legacy envelopes in production at this writing (BATCH 2's tokens never
 * persisted in real flow before the BATCH 5 amend), but the defensive path
 * keeps the door open.
 *
 * Security guarantees:
 *   1. AES-256-GCM is authenticated encryption (AEAD). Tampering with EITHER
 *      ciphertext OR auth tag → `final()` throws an integrity error. The throw
 *      IS the security guarantee — callers MUST NOT swallow it.
 *   2. IV is 12 bytes (96-bit), the recommended length for GCM. NIST SP 800-38D.
 *   3. Per-message random IV — never reuse an IV with the same key (GCM
 *      catastrophically loses confidentiality on IV reuse).
 *   4. `setAuthTag()` MUST be called BEFORE `update()` / `final()` on the
 *      decipher, or the integrity check is skipped.
 *
 * Key management:
 *   - Current key from env var WEARABLE_TOKEN_ENCRYPTION_KEY (64-char hex = 32 bytes).
 *   - Generate with: openssl rand -hex 32
 *   - Rotation procedure: docs/runbooks/open-wearables-deployment.md.
 *   - Script: scripts/rotate-wearable-tokens.ts (idempotent + resumable +
 *     probe-decrypt-verify pre-rotation gate).
 *   - If the key is missing or wrong length, encrypt + decrypt both throw.
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM (NIST SP 800-38D)
const KEY_HEX_LENGTH = 64; // 32 bytes hex-encoded

/**
 * Current envelope version stamped on every encryption. Bump this when you
 * rotate to a new key (e.g. v1 → v2). The rotation script reads this constant
 * to know what marker to write on the re-encrypted rows.
 *
 * Sprint 4 launch: v1.
 */
export const CURRENT_ENVELOPE_VERSION = 'v1';

function getKey(): Buffer {
  const hex = process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  return parseKey(hex, 'WEARABLE_TOKEN_ENCRYPTION_KEY');
}

function parseKey(hex: string | undefined, varName: string): Buffer {
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      `${varName} must be a 64-char hex string (32 bytes). ` + 'Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext token using the current env key. Returns the envelope
 * `<version>:<iv-hex>:<authTag-hex>:<ciphertext-hex>` where version is
 * CURRENT_ENVELOPE_VERSION. Each call uses a fresh random IV, so the same
 * plaintext encrypts to a different ciphertext every time.
 */
export function encryptToken(plaintext: string): string {
  return encryptTokenWithKey(plaintext, getKey(), CURRENT_ENVELOPE_VERSION);
}

/**
 * Decrypt a token envelope using the current env key. Throws if the envelope
 * is malformed, the auth tag doesn't verify, or the ciphertext has been
 * tampered with. The throw is the security guarantee — DO NOT wrap in
 * try/catch and return null. Let the caller's error path (which should
 * refuse to use the token) handle it.
 *
 * Accepts both versioned (4-part) and legacy (3-part) envelopes — legacy is
 * treated as v1.
 */
export function decryptToken(envelope: string): string {
  return decryptTokenWithKey(envelope, getKey());
}

/**
 * Encrypt with an explicitly-supplied key (used by the rotation script which
 * holds both the old + new key briefly). The version is stamped explicitly so
 * the rotation script can write rows tagged with the new version.
 */
export function encryptTokenWithKey(plaintext: string, key: Buffer, version: string): string {
  if (!/^v\d+$/.test(version)) {
    throw new Error(`Invalid envelope version "${version}" (expected vN, e.g. v1)`);
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${version}:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * Decrypt with an explicitly-supplied key (used by the rotation script). The
 * envelope's version is parsed but only validated structurally — the script
 * is responsible for selecting the right key for the version (it knows the
 * mapping: v1 → old key, v2 → new key during rotation).
 */
export function decryptTokenWithKey(envelope: string, key: Buffer): string {
  const parsed = parseEnvelope(envelope);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parsed.ivHex, 'hex'));
  // setAuthTag MUST be called before update/final, or GCM skips the integrity check.
  decipher.setAuthTag(Buffer.from(parsed.tagHex, 'hex'));
  const pt = Buffer.concat([decipher.update(Buffer.from(parsed.ctHex, 'hex')), decipher.final()]);
  return pt.toString('utf8');
}

interface ParsedEnvelope {
  version: string;
  ivHex: string;
  tagHex: string;
  ctHex: string;
}

/**
 * Parse an envelope into its components. Accepts:
 *   - 4-part versioned: `<version>:<iv>:<tag>:<ct>` (current format)
 *   - 3-part legacy:    `<iv>:<tag>:<ct>` (BATCH 2 format, treated as v1)
 *
 * Used internally by decryptTokenWithKey + exposed for the rotation script
 * (which calls getEnvelopeVersion to filter rows by version).
 */
function parseEnvelope(envelope: string): ParsedEnvelope {
  const parts = envelope.split(':');
  if (parts.length === 4) {
    const [version, ivHex, tagHex, ctHex] = parts;
    if (!ivHex || !tagHex || !ctHex || !version) {
      throw new Error('Invalid token envelope: empty component');
    }
    if (!/^v\d+$/.test(version)) {
      throw new Error(`Invalid token envelope: bad version "${version}" (expected vN)`);
    }
    return { version, ivHex, tagHex, ctHex };
  }
  if (parts.length === 3) {
    // Legacy 3-part envelope from BATCH 2 — treat as v1
    const [ivHex, tagHex, ctHex] = parts;
    if (!ivHex || !tagHex || !ctHex) {
      throw new Error('Invalid token envelope: empty component');
    }
    return { version: 'v1', ivHex, tagHex, ctHex };
  }
  throw new Error(
    `Invalid token envelope: expected 4 parts (<version>:<iv>:<tag>:<ct>) or ` +
      `3 parts (legacy <iv>:<tag>:<ct>), got ${parts.length}`
  );
}

/**
 * Read the envelope version without decrypting. The rotation script uses this
 * to filter rows whose version differs from the current target — those are
 * the rows that still need re-encryption.
 *
 * Legacy 3-part envelopes return 'v1' (the same version they're treated as
 * during decryption).
 */
export function getEnvelopeVersion(envelope: string): string {
  return parseEnvelope(envelope).version;
}

/**
 * Public helper used by the rotation script to validate a hex-encoded
 * encryption key from an arbitrary env var name (so we can read both
 * WEARABLE_TOKEN_ENCRYPTION_KEY and WEARABLE_TOKEN_ENCRYPTION_KEY_NEW with
 * the same validation).
 */
export function parseKeyHex(hex: string | undefined, varName: string): Buffer {
  return parseKey(hex, varName);
}
