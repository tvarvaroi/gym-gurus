/**
 * Vitest global test setup for server-side tests
 * Configures environment, mocks external services, and provides lifecycle hooks.
 */
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ──────────────────────────────────────────────
// 1. Mock environment variables
// ──────────────────────────────────────────────

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/gymgurus_test';
process.env.SESSION_SECRET = 'test-session-secret-do-not-use-in-production';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-not-real';

// ──────────────────────────────────────────────
// 2. Mock external services
// ──────────────────────────────────────────────

// Mock Anthropic / AI SDK so tests never hit a real API
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => {
    const modelFn = vi.fn(() => ({
      doGenerate: vi.fn().mockResolvedValue({ text: 'mocked AI response' }),
      doStream: vi.fn().mockResolvedValue({
        stream: new ReadableStream(),
        rawCall: { rawPrompt: '', rawSettings: {} },
      }),
    }));
    return modelFn;
  }),
}));

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mocked AI text response',
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
  }),
  generateObject: vi.fn().mockResolvedValue({
    object: {},
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
  }),
  streamText: vi.fn().mockReturnValue({
    textStream: (async function* () {
      yield 'Mocked ';
      yield 'stream ';
      yield 'response';
    })(),
    fullStream: (async function* () {
      yield { type: 'text-delta', textDelta: 'Mocked stream response' };
    })(),
    text: Promise.resolve('Mocked stream response'),
  }),
  tool: vi.fn((config: unknown) => config),
}));

// Mock Stripe so tests never create real charges
vi.mock('stripe', () => {
  const mockStripe = {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test_123' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_test_123', email: 'test@example.com' }),
    },
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test',
        status: 'requires_payment_method',
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      }),
    },
    prices: {
      create: vi.fn().mockResolvedValue({ id: 'price_test_123' }),
    },
    products: {
      create: vi.fn().mockResolvedValue({ id: 'prod_test_123' }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      }),
    },
  };

  return {
    default: vi.fn(() => mockStripe),
    Stripe: vi.fn(() => mockStripe),
  };
});

// ──────────────────────────────────────────────
// 3. Global setup and teardown hooks
// ──────────────────────────────────────────────

beforeAll(() => {
  // Suppress noisy console output during tests unless DEBUG_TESTS is set
  if (!process.env.DEBUG_TESTS) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    // Keep console.error and console.warn visible for debugging
  }
});

afterEach(() => {
  // Reset all mocks between tests to avoid cross-test contamination
  vi.restoreAllMocks();
});

afterAll(() => {
  // Clean up any remaining timers or handles
  vi.useRealTimers();
});
