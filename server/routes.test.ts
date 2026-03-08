import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Set required environment variables for tests
process.env.REPLIT_DOMAINS = 'test-domain.repl.co';
process.env.NODE_ENV = 'test';

// Mock auth middleware — all tests run without real sessions or DB users.
// vi.mock is hoisted by Vitest so this applies before registerRoutes is imported.
vi.mock('./middleware/auth', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'solo',
    subscriptionStatus: 'active',
    subscriptionTier: 'solo',
    trialEndsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const passThrough = (_req: any, _res: any, next: any) => next();
  const injectUser = (req: any, _res: any, next: any) => {
    req.user = testUser;
    next();
  };
  return {
    isAuthenticated: passThrough,
    requireAuth: injectUser,
    requireClientOwnership: passThrough,
    requireTrainerOwnership: passThrough,
    secureAuth: [passThrough, injectUser],
    requireSubscription: () => passThrough,
    rateLimitWebSocket: () => true,
  };
});

import { registerRoutes } from './routes';

describe('API Routes Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('Health & Status', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      // 200 when DB is connected, 503 when DB is unavailable (CI/no-DB environments)
      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Authentication', () => {
    it('should get current user', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect('Content-Type', /json/);

      // In development, should return demo user or null
      expect(response.status).toBeOneOf([200, 401]);
    });
  });

  describe('Exercises API', () => {
    it('should get all exercises', async () => {
      const response = await request(app)
        .get('/api/exercises')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter exercises by category', async () => {
      const response = await request(app)
        .get('/api/exercises?category=strength')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('category');
      }
    });
  });

  describe('Workout Templates', () => {
    it('should get workout templates', async () => {
      const response = await request(app)
        .get('/api/workout-templates')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown-route')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/exercises')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow reasonable request rates', async () => {
      // Make multiple requests
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/exercises')
      );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).not.toBe(429); // Not rate limited
      });
    });
  });
});

// Helper matchers
expect.extend({
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be one of ${array.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be one of ${array.join(', ')}`,
        pass: false,
      };
    }
  },
});
