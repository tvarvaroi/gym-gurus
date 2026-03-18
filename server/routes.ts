import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { storage } from './storage';
import { getDb } from './db';
import { sql } from 'drizzle-orm';
import { secureAuth, rateLimitWebSocket } from './middleware/auth';
import {
  generalRateLimit,
  authRateLimit,
  loginRateLimit,
  strictRateLimit,
  apiRateLimit,
  aiRateLimit,
  writeRateLimit,
} from './middleware/rateLimiter';

// ─── Sub-router imports ──────────────────────────────────────────────────────
import authRoutes from './routes/auth';
import gamificationRoutes from './routes/gamification';
import calculatorRoutes from './routes/calculators';
import calculatorResultsRoutes from './routes/calculatorResults';
import strengthRoutes from './routes/strength';
import recoveryRoutes from './routes/recovery';
import aiRoutes from './routes/ai';
import leaderboardRoutes from './routes/leaderboards';
import notificationRoutes from './routes/notifications';
import intakeRoutes from './routes/intake';
import paymentRoutes from './routes/payments';
import soloRoutes from './routes/solo';
import settingsRoutes from './routes/settings';
import uploadsRoutes from './routes/uploads';
// Sprint 5 extractions
import onboardingRoutes from './routes/onboarding';
import dashboardRoutes from './routes/dashboard';
import clientRoutes from './routes/clients';
import exerciseRoutes from './routes/exercises';
import workoutRoutes from './routes/workoutsRouter';
import assignmentRoutes from './routes/assignments';
import progressRoutes from './routes/progress';
import scheduleRoutes from './routes/schedule';

export async function registerRoutes(app: Express): Promise<Server> {
  // ─── Health check — public, NO rate limiting, NO auth ───────────────────
  app.get('/api/health', async (_req: Request, res: Response) => {
    const start = Date.now();
    try {
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'healthy',
        db: 'connected',
        env: process.env.NODE_ENV,
        version: process.env.npm_package_version || 'unknown',
        uptimeSeconds: Math.floor(process.uptime()),
        responseMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        db: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown DB error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── Global rate limiting ───────────────────────────────────────────────
  app.use('/api', generalRateLimit);

  // ─── Authentication routes ──────────────────────────────────────────────
  app.use('/api/auth', authRateLimit);
  app.post('/api/auth/login', loginRateLimit);
  app.post('/api/auth/register', loginRateLimit);
  app.post('/api/auth/forgot-password', loginRateLimit);
  app.post('/api/auth/reset-password', loginRateLimit);
  app.post('/api/auth/disciple-login', loginRateLimit);
  app.use('/api/auth', authRoutes);

  // ─── Feature routes (pre-existing extractions) ─────────────────────────
  app.use('/api/gamification', secureAuth, apiRateLimit, gamificationRoutes);
  app.use('/api/calculators', calculatorRoutes);
  app.use('/api', secureAuth, apiRateLimit, calculatorResultsRoutes);
  app.use('/api/strength', secureAuth, apiRateLimit, strengthRoutes);
  app.use('/api/recovery', secureAuth, apiRateLimit, recoveryRoutes);
  app.use('/api/ai', secureAuth, aiRateLimit, aiRoutes);
  app.use('/api/leaderboards', secureAuth, apiRateLimit, leaderboardRoutes);
  app.use('/api/notifications', secureAuth, apiRateLimit, notificationRoutes);
  app.use('/api/intake', secureAuth, apiRateLimit, intakeRoutes);
  app.use('/api/payments', secureAuth, strictRateLimit, paymentRoutes);
  app.use('/api/solo', secureAuth, apiRateLimit, soloRoutes);
  app.use('/api/settings', secureAuth, apiRateLimit, settingsRoutes);
  app.use('/api/uploads', secureAuth, writeRateLimit, uploadsRoutes);

  // ─── Sprint 5 extracted routes ─────────────────────────────────────────
  app.use('/api', secureAuth, onboardingRoutes);
  app.use('/api', secureAuth, dashboardRoutes);
  app.use('/api', secureAuth, clientRoutes);
  app.use('/api/exercises', secureAuth, exerciseRoutes);
  app.use('/api/workouts', secureAuth, workoutRoutes);
  app.use('/api', secureAuth, assignmentRoutes);
  app.use('/api', secureAuth, progressRoutes);
  app.use('/api/appointments', secureAuth, scheduleRoutes);

  // ─── Contact form (public, rate-limited) ────────────────────────────────
  app.post('/api/contact', strictRateLimit, async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      if (message.length > 5000) {
        return res.status(400).json({ error: 'Message is too long (max 5000 characters).' });
      }
      console.log(
        `[Contact Form] Name: ${name}, Email: ${email}, Message: ${message.substring(0, 100)}...`
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({ error: 'Failed to process your message. Please try again.' });
    }
  });

  // ─── HTTP + WebSocket server ────────────────────────────────────────────
  const httpServer = createServer(app);

  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    verifyClient: async (info: { req: IncomingMessage; secure: boolean; origin: string }) => {
      try {
        const cookies = parseCookie(info.req.headers.cookie || '');
        const sessionId = cookies['connect.sid']?.replace('s:', '').split('.')[0];

        if (!sessionId) {
          return false;
        }

        const userId = sessionId;
        if (!userId) {
          return false;
        }

        (info.req as any).authenticatedUserId = userId;
        return true;
      } catch (error) {
        return false;
      }
    },
  });

  const authenticatedConnections = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const authenticatedUserId = (req as any).authenticatedUserId;
    (ws as any).authenticatedUserId = authenticatedUserId;
    let currentRoom: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (!rateLimitWebSocket(authenticatedUserId)) {
          ws.send(
            JSON.stringify({
              type: 'error',
              data: { message: 'Rate limit exceeded. Please slow down.' },
            })
          );
          return;
        }

        switch (message.type) {
          case 'join_room':
            try {
              const { clientId } = message.data;

              if (!clientId) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    data: { message: 'clientId is required' },
                  })
                );
                return;
              }

              const client = await storage.getClient(clientId, authenticatedUserId);
              if (!client) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    data: { message: 'Unauthorized access to client' },
                  })
                );
                return;
              }

              const roomId = `${authenticatedUserId}:${clientId}`;

              if (currentRoom && authenticatedConnections.has(currentRoom)) {
                authenticatedConnections.get(currentRoom)!.delete(ws);
                if (authenticatedConnections.get(currentRoom)!.size === 0) {
                  authenticatedConnections.delete(currentRoom);
                }
              }

              if (!authenticatedConnections.has(roomId)) {
                authenticatedConnections.set(roomId, new Set());
              }
              authenticatedConnections.get(roomId)!.add(ws);

              (ws as any).clientId = clientId;
              (ws as any).trainerId = authenticatedUserId;
              (ws as any).roomId = roomId;
              currentRoom = roomId;

              ws.send(
                JSON.stringify({
                  type: 'room_joined',
                  data: { roomId, clientId, trainerId: authenticatedUserId },
                })
              );
            } catch (error) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  data: { message: 'Failed to join room' },
                })
              );
            }
            break;

          case 'typing': {
            if (!currentRoom) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  data: { message: 'Must join room before sending typing indicator' },
                })
              );
              return;
            }

            const roomClients = authenticatedConnections.get(currentRoom);
            if (roomClients) {
              roomClients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      type: 'typing',
                      data: message.data,
                    })
                  );
                }
              });
            }
            break;
          }

          default:
            if (!currentRoom) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  data: { message: 'Must join room first' },
                })
              );
            }
            break;
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' },
          })
        );
      }
    });

    ws.on('close', () => {
      if (currentRoom && authenticatedConnections.has(currentRoom)) {
        authenticatedConnections.get(currentRoom)!.delete(ws);
        if (authenticatedConnections.get(currentRoom)!.size === 0) {
          authenticatedConnections.delete(currentRoom);
        }
      }
    });

    ws.on('error', (error) => {
      // WebSocket error
    });
  });

  return httpServer;
}
