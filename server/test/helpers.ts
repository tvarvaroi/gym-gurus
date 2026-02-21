/**
 * Test utilities and factory functions for server-side tests.
 *
 * Provides mock Express Request/Response objects and data factories
 * for Users, Clients, and Workouts so tests stay concise and consistent.
 */
import { vi } from 'vitest';
import type { Request, Response } from 'express';
import type { User, Client, Workout } from '@shared/schema';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

/** A mock Express Request with typed user session data. */
export interface MockRequest extends Partial<Request> {
  user?: Partial<User>;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  session: Record<string, unknown> & { userId?: string };
}

/** A mock Express Response with Vitest spies on common methods. */
export interface MockResponse extends Partial<Response> {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  sendStatus: ReturnType<typeof vi.fn>;
  redirect: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
}

/** Options accepted by createMockRequest. */
export interface MockRequestOptions {
  user?: Partial<User>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  session?: Record<string, unknown>;
  method?: string;
  path?: string;
}

/** Options accepted by createTestUser. */
export interface TestUserOptions {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'trainer' | 'client' | 'solo';
  trainerId?: string | null;
  onboardingCompleted?: boolean;
}

/** Options accepted by createTestClient. */
export interface TestClientOptions {
  id?: string;
  trainerId?: string;
  name?: string;
  email?: string;
  goal?: string;
  status?: string;
  age?: number | null;
  gender?: string | null;
  height?: string | null;
  weight?: string | null;
}

/** Options accepted by createTestWorkout. */
export interface TestWorkoutOptions {
  id?: string;
  trainerId?: string;
  title?: string;
  description?: string;
  duration?: number;
  difficulty?: string;
  category?: string;
}

// ──────────────────────────────────────────────
// Mock Request / Response factories
// ──────────────────────────────────────────────

let _requestCounter = 0;

/**
 * Create a mock Express Request object pre-populated with sensible defaults.
 *
 * @example
 * ```ts
 * const req = createMockRequest({
 *   user: createTestUser({ role: 'trainer' }),
 *   params: { clientId: 'client-1' },
 * });
 * ```
 */
export function createMockRequest(options: MockRequestOptions = {}): MockRequest {
  _requestCounter += 1;

  // Use `'user' in options` so explicitly passing `user: undefined` is preserved
  // (otherwise `?? createTestUser()` would replace it with a real user).
  const userExplicit = Object.prototype.hasOwnProperty.call(options, 'user');
  const defaultUser = userExplicit ? options.user : createTestUser();

  return {
    user: defaultUser,
    params: options.params ?? {},
    query: options.query ?? {},
    body: options.body ?? {},
    headers: options.headers ?? { 'content-type': 'application/json' },
    session: {
      userId: defaultUser?.id,
      ...options.session,
    },
    method: options.method ?? 'GET',
    path: options.path ?? '/',
    get: vi.fn((header: string) => (options.headers ?? {})[header.toLowerCase()]),
    ip: '127.0.0.1',
  } as MockRequest;
}

/**
 * Create a mock Express Response object with spied methods.
 *
 * Every chainable method (status, json, send, etc.) returns `this`
 * so callers can write `res.status(200).json(data)` in production code.
 *
 * @example
 * ```ts
 * const res = createMockResponse();
 * await myHandler(req, res);
 * expect(res.status).toHaveBeenCalledWith(200);
 * expect(res.json).toHaveBeenCalledWith({ ok: true });
 * ```
 */
export function createMockResponse(): MockResponse {
  const res: Partial<MockResponse> = {};

  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  res.sendStatus = vi.fn().mockReturnThis();
  res.redirect = vi.fn().mockReturnThis();
  res.set = vi.fn().mockReturnThis();
  res.cookie = vi.fn().mockReturnThis();
  res.clearCookie = vi.fn().mockReturnThis();

  return res as MockResponse;
}

// ──────────────────────────────────────────────
// Data factories
// ──────────────────────────────────────────────

let _userCounter = 0;

/**
 * Create a test User object with sensible defaults.
 * Every call produces a unique ID and email unless overridden.
 */
export function createTestUser(options: TestUserOptions = {}): User {
  _userCounter += 1;
  const id = options.id ?? `test-user-${_userCounter}`;

  return {
    id,
    email: options.email ?? `user${_userCounter}@test.gymgurus.com`,
    firstName: options.firstName ?? 'Test',
    lastName: options.lastName ?? `User${_userCounter}`,
    profileImageUrl: null,
    role: options.role ?? 'trainer',
    trainerId: options.trainerId ?? null,
    isIndependent: options.role === 'solo' ? true : options.role === 'client' ? false : true,
    onboardingCompleted: options.onboardingCompleted ?? false,
    onboardingStep: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };
}

let _clientCounter = 0;

/**
 * Create a test Client object with sensible defaults.
 * Every call produces a unique ID, name, and email unless overridden.
 */
export function createTestClient(options: TestClientOptions = {}): Client {
  _clientCounter += 1;
  const id = options.id ?? `test-client-${_clientCounter}`;

  return {
    id,
    trainerId: options.trainerId ?? 'test-trainer-1',
    name: options.name ?? `Test Client ${_clientCounter}`,
    email: options.email ?? `client${_clientCounter}@test.gymgurus.com`,
    goal: options.goal ?? 'Build muscle and improve fitness',
    status: options.status ?? 'active',
    age: options.age ?? null,
    gender: options.gender ?? null,
    height: options.height ?? null,
    weight: options.weight ?? null,
    activityLevel: null,
    neckCircumference: null,
    waistCircumference: null,
    hipCircumference: null,
    createdAt: new Date('2025-01-15T00:00:00Z'),
    lastSession: null,
    nextSession: null,
  };
}

let _workoutCounter = 0;

/**
 * Create a test Workout object with sensible defaults.
 * Every call produces a unique ID and title unless overridden.
 */
export function createTestWorkout(options: TestWorkoutOptions = {}): Workout {
  _workoutCounter += 1;
  const id = options.id ?? `test-workout-${_workoutCounter}`;

  return {
    id,
    trainerId: options.trainerId ?? 'test-trainer-1',
    title: options.title ?? `Test Workout ${_workoutCounter}`,
    description: options.description ?? 'A test workout for unit testing',
    duration: options.duration ?? 45,
    difficulty: options.difficulty ?? 'intermediate',
    category: options.category ?? 'strength',
    createdAt: new Date('2025-02-01T00:00:00Z'),
  };
}

// ──────────────────────────────────────────────
// Utility helpers
// ──────────────────────────────────────────────

/**
 * Create a `next` function spy for Express middleware testing.
 */
export function createMockNext() {
  return vi.fn();
}

/**
 * Reset all internal counters. Call this in `beforeEach` if you need
 * deterministic IDs across tests.
 */
export function resetFactoryCounters(): void {
  _requestCounter = 0;
  _userCounter = 0;
  _clientCounter = 0;
  _workoutCounter = 0;
}
