/**
 * errorHandler middleware tests — drizzle-orm 0.45.2 DrizzleQueryError unwrap.
 *
 * Coverage:
 *   1. getPgErrorCode helper guard test (mutation-style, three shapes)
 *   2. errorHandler regression: DrizzleQueryError-wrapped 23505 → 409 + CONFLICT
 *   3. errorHandler regression: DrizzleQueryError-wrapped 23503 → 400 + FK_VIOLATION
 *   4. errorHandler regression: non-pg generic Error → 500 + INTERNAL_ERROR fallback
 *
 * Why these tests exist:
 *   drizzle-orm 0.43+ wraps every pg query error in DrizzleQueryError, with the
 *   original pg error placed on `.cause`. Pre-upgrade, `err.code === '23505'`
 *   read directly worked. Post-upgrade, the same check returns false because the
 *   wrapped error has `code === undefined` — pg's code now lives at `.cause.code`.
 *
 *   The runtime test suite never exercised an errorHandler-through-route
 *   unique/FK violation path before this commit, so the regression escaped both
 *   TS and test gates entirely on the 0.39.1 → 0.45.2 upgrade.
 *
 *   The guard test (#1) is load-bearing: any future revert of the unwrap helper
 *   fails it explicitly. The regression tests (#2-4) cover the actual mitigation
 *   surface (six call sites in errorHandler.ts).
 *
 *   See `_brain/notes/gotchas.md` "Dependency upgrades that wrap driver errors"
 *   for the generalized pattern that applies to any future ORM/driver upgrade.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { errorHandler, getPgErrorCode } from '../../middleware/errorHandler';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers';

vi.mock('../../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    audit: vi.fn(),
  },
}));

describe('getPgErrorCode helper — DrizzleQueryError unwrap behavior', () => {
  it('reads code from a DrizzleQueryError-wrapped pg error via .cause; falls through to bare .code; returns undefined when neither present', () => {
    const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const wrapped = new DrizzleQueryError('INSERT INTO ...', [], pgError);
    expect(getPgErrorCode(wrapped)).toBe('23505');

    const wrappedFK = new DrizzleQueryError(
      'INSERT INTO ...',
      [],
      Object.assign(new Error('fk violation'), { code: '23503' })
    );
    expect(getPgErrorCode(wrappedFK)).toBe('23503');

    const bareUniqueErr = { code: '23505' };
    expect(getPgErrorCode(bareUniqueErr)).toBe('23505');

    expect(getPgErrorCode({ message: 'something with no code anywhere' })).toBeUndefined();
    expect(getPgErrorCode(null)).toBeUndefined();
    expect(getPgErrorCode(undefined)).toBeUndefined();

    const directWins = { code: 'direct', cause: { code: 'cause' } };
    expect(getPgErrorCode(directWins)).toBe('direct');
  });
});

describe('errorHandler middleware — DrizzleQueryError regression coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 + CONFLICT for a DrizzleQueryError wrapping pg 23505 (unique violation)', () => {
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const wrapped = new DrizzleQueryError(
      'INSERT INTO users (email) VALUES ($1)',
      ['dup@example.com'],
      pgError
    );
    const req = createMockRequest({ method: 'POST', path: '/api/users' });
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(wrapped, req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Resource already exists',
        code: 'CONFLICT',
      })
    );
  });

  it('returns 400 + FK_VIOLATION for a DrizzleQueryError wrapping pg 23503 (foreign-key violation)', () => {
    const pgError = Object.assign(
      new Error('insert or update on table violates foreign key constraint'),
      { code: '23503' }
    );
    const wrapped = new DrizzleQueryError(
      'INSERT INTO clients (trainer_id) VALUES ($1)',
      ['nonexistent-trainer-id'],
      pgError
    );
    const req = createMockRequest({ method: 'POST', path: '/api/clients' });
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(wrapped, req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Referenced resource does not exist',
        code: 'FK_VIOLATION',
      })
    );
  });

  it('returns 500 + INTERNAL_ERROR for a non-pg generic Error (fallback path still works)', () => {
    const generic = new Error('something went wrong in business logic');
    const req = createMockRequest({ method: 'GET', path: '/api/something' });
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(generic, req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
      })
    );
  });
});
