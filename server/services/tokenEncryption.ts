/**
 * Token Encryption — Sprint 4 BATCH 2
 *
 * AES-256-GCM with random per-message IV. Used to encrypt OAuth access /
 * refresh tokens at rest in `wearable_connections.access_token_encrypted` /
 * `refresh_token_encrypted`. Sprint 4 v1: tokens primarily live in the
 * Open Wearables service; we only persist passthrough copies that the
 * provider returns. They MUST be encrypted regardless — a future leaked DB
 * dump cannot grant access without the encryption key.
 *
 * Envelope format: <iv-hex>:<authTag-hex>:<ciphertext-hex>
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
 *   - Key from env var WEARABLE_TOKEN_ENCRYPTION_KEY (64-char hex = 32 bytes).
 *   - Generate with: openssl rand -hex 32
 *   - Rotation = re-encrypt all stored tokens (Sprint 4 doesn't ship rotation
 *     tooling; documented in env-secrets-manager runbook).
 *   - If the key is missing or wrong length, encrypt + decrypt both throw.
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM (NIST SP 800-38D)
const KEY_HEX_LENGTH = 64; // 32 bytes hex-encoded

function getKey(): Buffer {
  const hex = process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      'WEARABLE_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext token. Returns the envelope string
 * `<iv-hex>:<authTag-hex>:<ciphertext-hex>`. Each call uses a fresh random IV,
 * so the same plaintext encrypts to a different ciphertext every time.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * Decrypt a token envelope. Throws if the envelope is malformed, the auth tag
 * doesn't verify, or the ciphertext has been tampered with. The throw is the
 * security guarantee — DO NOT wrap in try/catch and return null. Let the
 * caller's error path (which should refuse to use the token) handle it.
 */
export function decryptToken(envelope: string): string {
  const key = getKey();
  const parts = envelope.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid token envelope: expected <iv>:<authTag>:<ciphertext>');
  }
  const [ivHex, tagHex, ctHex] = parts;
  if (!ivHex || !tagHex || !ctHex) {
    throw new Error('Invalid token envelope: empty component');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  // setAuthTag MUST be called before update/final, or GCM skips the integrity check.
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
  return pt.toString('utf8');
}
