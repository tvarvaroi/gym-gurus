/**
 * Token Encryption Tests — Sprint 4 BATCH 2 (envelope versioned in BATCH 5)
 *
 * Coverage:
 *   1. Round-trip — encrypt(plain) → cipher → decrypt(cipher) === plain
 *   2. Envelope shape — 4 parts: <version>:<iv>:<authTag>:<ct>
 *   3. Tampered ciphertext / auth tag / IV → decrypt throws (auth tag mismatch)
 *   4. Truncated ciphertext → decrypt throws
 *   5. Malformed envelope → decrypt throws
 *   6. Missing/invalid key → encrypt + decrypt both throw
 *   7. Versioning — getEnvelopeVersion returns the embedded version
 *   8. Backward compat — legacy 3-part envelopes still decrypt (treated as v1)
 *   9. encryptTokenWithKey / decryptTokenWithKey — explicit-key path used by
 *      the rotation script
 *
 * The throws on tampered input are the SECURITY GUARANTEE of GCM. If any
 * tampering test does not throw, AEAD integrity is broken — that is a
 * cryptographic failure, not a test failure to "fix".
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCipheriv, randomBytes } from 'node:crypto';
import {
  encryptToken,
  decryptToken,
  encryptTokenWithKey,
  decryptTokenWithKey,
  getEnvelopeVersion,
  parseKeyHex,
  CURRENT_ENVELOPE_VERSION,
} from '../../services/tokenEncryption';

const VALID_KEY = 'a'.repeat(64); // 32 bytes hex (deterministic for test, NOT production)

describe('tokenEncryption — round-trip + envelope', () => {
  beforeEach(() => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = VALID_KEY;
  });
  afterEach(() => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  });

  it('round-trips a token (decrypt(encrypt(x)) === x)', () => {
    const plain = 'oauth_access_token_xyz_abc_123';
    const cipher = encryptToken(plain);
    expect(cipher).not.toBe(plain);
    expect(decryptToken(cipher)).toBe(plain);
  });

  it('envelope has 4 parts: <version>:<iv-hex>:<authTag-hex>:<ciphertext-hex>', () => {
    const cipher = encryptToken('payload');
    const parts = cipher.split(':');
    expect(parts).toHaveLength(4);
    const [version, iv, tag, ct] = parts;
    expect(version).toBe(CURRENT_ENVELOPE_VERSION);
    // 12-byte IV → 24 hex chars
    expect(iv).toMatch(/^[0-9a-f]{24}$/);
    // 16-byte GCM auth tag → 32 hex chars
    expect(tag).toMatch(/^[0-9a-f]{32}$/);
    // ciphertext is non-empty hex
    expect(ct).toMatch(/^[0-9a-f]+$/);
  });

  it('produces a different ciphertext for the same plaintext on every call (random IV)', () => {
    const a = encryptToken('same plaintext');
    const b = encryptToken('same plaintext');
    expect(a).not.toBe(b);
    // But both decrypt back to the same value
    expect(decryptToken(a)).toBe('same plaintext');
    expect(decryptToken(b)).toBe('same plaintext');
  });

  it('round-trips multibyte UTF-8 (emoji, accents)', () => {
    const plain = 'token-with-emoji-🔐-and-é';
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it('CURRENT_ENVELOPE_VERSION is "v1" at Sprint 4 launch', () => {
    expect(CURRENT_ENVELOPE_VERSION).toBe('v1');
  });
});

describe('tokenEncryption — tampering detection (AEAD security guarantee)', () => {
  beforeEach(() => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = VALID_KEY;
  });
  afterEach(() => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  });

  it('throws on tampered ciphertext (last bytes flipped)', () => {
    const cipher = encryptToken('the secret');
    const [version, iv, tag, ct] = cipher.split(':');
    const tampered = `${version}:${iv}:${tag}:${ct.slice(0, -2)}aa`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on tampered auth tag (last bytes flipped)', () => {
    const cipher = encryptToken('the secret');
    const [version, iv, tag, ct] = cipher.split(':');
    const tampered = `${version}:${iv}:${tag.slice(0, -2)}aa:${ct}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on tampered IV (last bytes flipped) — IV is associated data via auth tag', () => {
    const cipher = encryptToken('the secret');
    const [version, iv, tag, ct] = cipher.split(':');
    const tampered = `${version}:${iv.slice(0, -2)}aa:${tag}:${ct}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on truncated ciphertext (1 byte removed)', () => {
    const cipher = encryptToken('the secret');
    const [version, iv, tag, ct] = cipher.split(':');
    expect(() => decryptToken(`${version}:${iv}:${tag}:${ct.slice(0, -2)}`)).toThrow();
  });

  it('throws on malformed envelope (only 2 components)', () => {
    expect(() => decryptToken('iv:tag')).toThrow(/envelope/i);
  });

  it('throws on empty envelope component', () => {
    expect(() => decryptToken('v1:::')).toThrow(/envelope/i);
  });

  it('throws on bad version label (not vN format)', () => {
    expect(() => decryptToken('foo:00:00:00')).toThrow(/version/i);
  });
});

describe('tokenEncryption — backward compat (legacy 3-part envelope)', () => {
  beforeEach(() => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = VALID_KEY;
  });
  afterEach(() => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  });

  // Manually construct a 3-part legacy envelope (the BATCH 2 format) and
  // confirm it still decrypts. There are no real legacy envelopes in prod
  // at this writing — BATCH 2's tokens never persisted in real flow before
  // BATCH 5 — but the defensive backward-compat path keeps the door open.
  it('decrypts a legacy 3-part envelope as if it were v1', () => {
    const key = Buffer.from(VALID_KEY, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update('legacy plaintext', 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacyEnvelope = `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
    expect(decryptToken(legacyEnvelope)).toBe('legacy plaintext');
  });

  it('getEnvelopeVersion returns "v1" for a legacy 3-part envelope', () => {
    const key = Buffer.from(VALID_KEY, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update('payload', 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacy = `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
    expect(getEnvelopeVersion(legacy)).toBe('v1');
  });
});

describe('tokenEncryption — version handling (rotation-script support)', () => {
  beforeEach(() => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = VALID_KEY;
  });
  afterEach(() => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  });

  it('getEnvelopeVersion returns the embedded version for a current envelope', () => {
    const cipher = encryptToken('payload');
    expect(getEnvelopeVersion(cipher)).toBe(CURRENT_ENVELOPE_VERSION);
  });

  it('encryptTokenWithKey + decryptTokenWithKey round-trip with explicit key + v2', () => {
    const altKey = parseKeyHex('b'.repeat(64), 'TEST_NEW_KEY');
    const cipher = encryptTokenWithKey('payload', altKey, 'v2');
    expect(getEnvelopeVersion(cipher)).toBe('v2');
    expect(decryptTokenWithKey(cipher, altKey)).toBe('payload');
  });

  it('encryptTokenWithKey rejects bad version label', () => {
    const altKey = parseKeyHex('b'.repeat(64), 'TEST_NEW_KEY');
    expect(() => encryptTokenWithKey('payload', altKey, 'lol')).toThrow(/version/i);
  });

  it('rotation simulation: v1 envelope decrypts with old key, re-encrypts as v2 with new key', () => {
    // Setup: row was encrypted with old key, stamped v1
    const oldKey = parseKeyHex(VALID_KEY, 'OLD');
    const v1 = encryptTokenWithKey('the secret', oldKey, 'v1');
    expect(getEnvelopeVersion(v1)).toBe('v1');

    // Rotation: decrypt with old key, re-encrypt with new key + v2
    const newKey = parseKeyHex('b'.repeat(64), 'NEW');
    const plaintext = decryptTokenWithKey(v1, oldKey);
    expect(plaintext).toBe('the secret');
    const v2 = encryptTokenWithKey(plaintext, newKey, 'v2');
    expect(getEnvelopeVersion(v2)).toBe('v2');

    // Post-rotation: v2 cannot be decrypted with old key (proves rotation took effect)
    expect(() => decryptTokenWithKey(v2, oldKey)).toThrow();
    // But v2 decrypts cleanly with new key
    expect(decryptTokenWithKey(v2, newKey)).toBe('the secret');
  });
});

describe('tokenEncryption — key validation', () => {
  afterEach(() => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
  });

  it('encrypt throws if WEARABLE_TOKEN_ENCRYPTION_KEY is unset', () => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken('x')).toThrow(/WEARABLE_TOKEN_ENCRYPTION_KEY/);
  });

  it('decrypt throws if WEARABLE_TOKEN_ENCRYPTION_KEY is unset', () => {
    delete process.env.WEARABLE_TOKEN_ENCRYPTION_KEY;
    expect(() => decryptToken('v1:aa:bb:cc')).toThrow(/WEARABLE_TOKEN_ENCRYPTION_KEY/);
  });

  it('encrypt throws if key is the wrong length (32 chars, not 64)', () => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(32);
    expect(() => encryptToken('x')).toThrow(/64-char hex/);
  });

  it('decrypt throws if key is the wrong length (128 chars, not 64)', () => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(128);
    expect(() => decryptToken('v1:aa:bb:cc')).toThrow(/64-char hex/);
  });

  it('a token encrypted with key A cannot be decrypted with key B', () => {
    const keyA = 'a'.repeat(64);
    const keyB = 'b'.repeat(64);
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = keyA;
    const cipher = encryptToken('the secret');
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = keyB;
    expect(() => decryptToken(cipher)).toThrow();
  });

  it('parseKeyHex throws on bad input', () => {
    expect(() => parseKeyHex(undefined, 'FOO')).toThrow(/FOO/);
    expect(() => parseKeyHex('short', 'FOO')).toThrow(/64-char hex/);
  });
});
