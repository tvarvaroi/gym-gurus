/**
 * AppleHealthUploadFlow validation tests — Sprint 5 BATCH 5.
 *
 * Pure-function tests for client-side pre-upload validation. Lives under
 * server/test/ because the project's vitest config only scans server/** and
 * shared/**. `validateFile` doesn't touch DOM beyond the global File
 * constructor, which is available in Node 18+.
 *
 * Component-level rendering tests (multi-step wizard transitions, push prompt
 * timing, drag-drop event handling) require happy-dom + a TanStack Query
 * provider — that's out of scope for BATCH 5 unit tests; covered by manual
 * QA + ui-ux-pro-max checklist.
 */
import { describe, it, expect } from 'vitest';
import { validateFile } from '../../../../../client/src/components/imports/AppleHealthUploadFlow';

function makeFile(name: string, sizeBytes: number): File {
  const f = new File([new Uint8Array(0)], name, { type: 'application/zip' });
  Object.defineProperty(f, 'size', { value: sizeBytes, configurable: true });
  return f;
}

describe('validateFile', () => {
  const MB = 1024 * 1024;

  it('accepts a valid .zip under 200MB', () => {
    expect(validateFile(makeFile('export.zip', 50 * MB))).toEqual({ ok: true });
  });

  it('accepts at exactly 200MB (boundary)', () => {
    expect(validateFile(makeFile('export.zip', 200 * MB))).toEqual({ ok: true });
  });

  it('rejects when over 200MB', () => {
    const result = validateFile(makeFile('export.zip', 201 * MB));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Maximum size is 200 MB/);
    expect(result.error).toMatch(/201 MB/);
  });

  it('rejects file without .zip extension', () => {
    const result = validateFile(makeFile('export.xml', 1 * MB));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Apple Health/);
  });

  it('rejects file with .zip in middle of name (defensive)', () => {
    const result = validateFile(makeFile('export.zip.txt', 1 * MB));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Apple Health/);
  });

  it('accepts .ZIP (uppercase) — case-insensitive extension check', () => {
    expect(validateFile(makeFile('EXPORT.ZIP', 1 * MB))).toEqual({ ok: true });
  });

  it('rejects file with no extension', () => {
    const result = validateFile(makeFile('export', 1 * MB));
    expect(result.ok).toBe(false);
  });
});
