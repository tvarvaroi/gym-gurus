/**
 * Token Encryption Tests — Sprint 4 BATCH 2
 *
 * Coverage:
 *   1. Round-trip — encrypt(plain) → cipher → decrypt(cipher) === plain
 *   2. Envelope shape — `cipher.split(':')` has 3 parts
 *   3. Tampered ciphertext → decrypt throws (auth tag mismatch)
 *   4. Tampered auth tag → decrypt throws (auth tag mismatch)
 *   5. Missing/invalid key → encrypt + decrypt both throw
 *
 * The throws on tampered input are the SECURITY GUARANTEE of GCM. If any
 * tampering test does not throw, AEAD integrity is broken — that is a
 * cryptographic failure, not a test failure to "fix".
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptToken, decryptToken } from '../../services/tokenEncryption';

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

  it('envelope has 3 hex-encoded parts: iv:authTag:ciphertext', () => {
    const cipher = encryptToken('payload');
    const parts = cipher.split(':');
    expect(parts).toHaveLength(3);
    const [iv, tag, ct] = parts;
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
    const [iv, tag, ct] = cipher.split(':');
    // Flip the last 2 hex chars of the ciphertext
    const tampered = `${iv}:${tag}:${ct.slice(0, -2)}aa`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on tampered auth tag (last bytes flipped)', () => {
    const cipher = encryptToken('the secret');
    const [iv, tag, ct] = cipher.split(':');
    // Flip the last 2 hex chars of the auth tag
    const tampered = `${iv}:${tag.slice(0, -2)}aa:${ct}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on tampered IV (last bytes flipped) — IV is associated data via auth tag', () => {
    const cipher = encryptToken('the secret');
    const [iv, tag, ct] = cipher.split(':');
    const tampered = `${iv.slice(0, -2)}aa:${tag}:${ct}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('throws on truncated ciphertext (1 byte removed)', () => {
    const cipher = encryptToken('the secret');
    const [iv, tag, ct] = cipher.split(':');
    expect(() => decryptToken(`${iv}:${tag}:${ct.slice(0, -2)}`)).toThrow();
  });

  it('throws on malformed envelope (only 2 components)', () => {
    expect(() => decryptToken('iv:tag')).toThrow(/envelope/i);
  });

  it('throws on empty envelope component', () => {
    expect(() => decryptToken('::')).toThrow(/envelope/i);
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
    expect(() => decryptToken('aa:bb:cc')).toThrow(/WEARABLE_TOKEN_ENCRYPTION_KEY/);
  });

  it('encrypt throws if key is the wrong length (32 chars, not 64)', () => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(32);
    expect(() => encryptToken('x')).toThrow(/64-char hex/);
  });

  it('decrypt throws if key is the wrong length (128 chars, not 64)', () => {
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(128);
    expect(() => decryptToken('aa:bb:cc')).toThrow(/64-char hex/);
  });

  it('a token encrypted with key A cannot be decrypted with key B', () => {
    const keyA = 'a'.repeat(64);
    const keyB = 'b'.repeat(64);
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = keyA;
    const cipher = encryptToken('the secret');
    process.env.WEARABLE_TOKEN_ENCRYPTION_KEY = keyB;
    expect(() => decryptToken(cipher)).toThrow();
  });
});
