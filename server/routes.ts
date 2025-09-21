import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, authenticateWebSocketSession, getSession } from "./replitAuth";
import { 
  insertUserSchema, insertClientSchema, insertExerciseSchema, insertWorkoutSchema, 
  insertWorkoutExerciseSchema, insertWorkoutAssignmentSchema, insertProgressEntrySchema,
  insertMessageSchema, insertMessageTemplateSchema, insertClientCommunicationPrefSchema,
  type InsertClient, type InsertExercise, type InsertWorkout, 
  type InsertWorkoutExercise, type InsertWorkoutAssignment, type InsertProgressEntry,
  type InsertMessage, type InsertMessageTemplate, type InsertClientCommunicationPref
} from "@shared/schema";
import { ZodError } from "zod";
import { 
  secureAuth, 
  requireClientOwnership, 
  requireTrainerOwnership, 
  rateLimitMessages,
  rateLimitWebSocket
} from "./middleware/auth";
import { 
  apiRateLimit, 
  generalRateLimit, 
  authRateLimit,
  exportRateLimit
} from "./middleware/rateLimiter";
import { 
  simulateMessageDelivery, 
  getMessageDeliveryStatuses 
} from "./middleware/deliveredTracking";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup secure Replit Auth
  await setupAuth(app);

  // Apply general rate limiting to all API routes
  app.use('/api', generalRateLimit);
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, authRateLimit, async (req: Request, res: Response) => {
    try {
      // After isAuthenticated middleware, req.user contains JWT claims
      const jwtUser = req.user as any;
      const userId = jwtUser?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in token" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Client Management Routes
  
  // GET /api/clients - Get all clients for authenticated trainer with pagination
  app.get("/api/clients", secureAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const clients = await storage.getClientsByTrainer(trainerId);
      res.json(clients);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // GET /api/clients/:trainerId - Get all clients for specific trainer (for development)
  app.get("/api/clients/:trainerId", async (req: Request, res: Response) => {
    try {
      const { trainerId } = req.params;
      const clients = await storage.getClientsByTrainer(trainerId);
      res.json(clients);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // GET /api/clients/detail/:clientId - Get specific client details
  app.get("/api/clients/detail/:clientId", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // POST /api/clients - Create new client
  app.post("/api/clients", secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const validatedData = insertClientSchema.parse({ ...req.body, trainerId });
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // PUT /api/clients/:clientId - Update client
  app.put("/api/clients/:clientId", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      // Prevent trainerId changes by omitting it from the validation schema
      const validatedUpdates = insertClientSchema.omit({ trainerId: true }).partial().parse(req.body);
      
      const client = await storage.updateClient(clientId, validatedUpdates);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  // DELETE /api/clients/:clientId - Delete client
  app.delete("/api/clients/:clientId", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const success = await storage.deleteClient(clientId);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Exercise Library Routes
  
  // GET /api/exercises - Get all exercises
  app.get("/api/exercises", secureAuth, async (req: Request, res: Response) => {
    try {
      const exercises = await storage.getAllExercises();
      res.json(exercises);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  // POST /api/exercises - Create new exercise
  app.post("/api/exercises", secureAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertExerciseSchema.parse(req.body);
      const exercise = await storage.createExercise(validatedData);
      res.status(201).json(exercise);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid exercise data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  // Workout Management Routes
  
  // GET /api/workouts - Get all workouts for authenticated trainer
  app.get("/api/workouts", secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      // Fetching workouts for trainer
      const workouts = await storage.getWorkoutsByTrainer(trainerId);
      // Workouts retrieved successfully
      res.json(workouts);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch workouts" });
    }
  });

  // GET /api/workouts/:trainerId - Get all workouts for specific trainer (for development)
  app.get("/api/workouts/:trainerId", async (req: Request, res: Response) => {
    try {
      const { trainerId } = req.params;
      // Fetching workouts for trainer
      const workouts = await storage.getWorkoutsByTrainer(trainerId);
      // Workouts retrieved successfully
      res.json(workouts);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch workouts" });
    }
  });

  // GET /api/workouts/detail/:id - Get specific workout with exercises
  app.get("/api/workouts/detail/:id", secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workout = await storage.getWorkout(id);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      
      // Verify workout belongs to authenticated trainer
      if (workout.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this workout" });
      }
      
      const exercises = await storage.getWorkoutExercises(id);
      res.json({ ...workout, exercises });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch workout" });
    }
  });

  // POST /api/workouts - Create new workout
  app.post("/api/workouts", secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      // Creating workout for trainer
      const validatedData = insertWorkoutSchema.parse({ ...req.body, trainerId });
      const workout = await storage.createWorkout(validatedData);
      // Workout created successfully
      res.status(201).json(workout);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid workout data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to create workout" });
    }
  });

  // PUT /api/workouts/:id - Update workout
  app.put("/api/workouts/:id", secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify workout belongs to authenticated trainer
      const existingWorkout = await storage.getWorkout(id);
      if (!existingWorkout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existingWorkout.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this workout" });
      }
      
      // Prevent trainerId changes by omitting it from the validation schema
      const validatedUpdates = insertWorkoutSchema.omit({ trainerId: true }).partial().parse(req.body);
      
      const workout = await storage.updateWorkout(id, validatedUpdates);
      res.json(workout);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to update workout" });
    }
  });

  // DELETE /api/workouts/:id - Delete workout
  app.delete("/api/workouts/:id", secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify workout belongs to authenticated trainer
      const existingWorkout = await storage.getWorkout(id);
      if (!existingWorkout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existingWorkout.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this workout" });
      }
      
      const success = await storage.deleteWorkout(id);
      res.json({ message: "Workout deleted successfully" });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to delete workout" });
    }
  });

  // Workout Exercise Routes
  
  // POST /api/workouts/:workoutId/exercises - Add exercise to workout
  app.post("/api/workouts/:workoutId/exercises", secureAuth, async (req: Request, res: Response) => {
    try {
      const { workoutId } = req.params;
      
      // Verify workout belongs to authenticated trainer
      const workout = await storage.getWorkout(workoutId);
      if (!workout || workout.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this workout" });
      }
      
      const validatedData = insertWorkoutExerciseSchema.parse({ 
        ...req.body, 
        workoutId 
      });
      const workoutExercise = await storage.addExerciseToWorkout(validatedData);
      res.status(201).json(workoutExercise);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid workout exercise data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to add exercise to workout" });
    }
  });

  // DELETE /api/workouts/:workoutId/exercises/:exerciseId - Remove exercise from workout
  app.delete("/api/workouts/:workoutId/exercises/:exerciseId", secureAuth, async (req: Request, res: Response) => {
    try {
      const { workoutId, exerciseId } = req.params;
      
      // Verify workout belongs to authenticated trainer
      const workout = await storage.getWorkout(workoutId);
      if (!workout || workout.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this workout" });
      }
      
      const success = await storage.removeExerciseFromWorkout(workoutId, exerciseId);
      if (!success) {
        return res.status(404).json({ error: "Exercise not found in workout" });
      }
      res.json({ message: "Exercise removed from workout successfully" });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to remove exercise from workout" });
    }
  });

  // Workout Assignment Routes
  
  // GET /api/clients/:clientId/workouts - Get client's assigned workouts
  app.get("/api/clients/:clientId/workouts", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const assignments = await storage.getClientWorkouts(clientId);
      res.json(assignments);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch client workouts" });
    }
  });

  // POST /api/workout-assignments - Assign workout to client
  app.post("/api/workout-assignments", async (req: Request, res: Response) => {
    try {
      const validatedData = insertWorkoutAssignmentSchema.parse(req.body);
      const assignment = await storage.assignWorkoutToClient(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid assignment data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to assign workout" });
    }
  });

  // PUT /api/workout-assignments/:id/complete - Mark workout assignment as completed
  app.put("/api/workout-assignments/:id/complete", secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      // First get the assignment to verify ownership
      const assignments = await storage.getClientWorkouts(""); // We'll verify ownership differently
      const assignment = assignments.find(a => a.id === id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Verify the client belongs to authenticated trainer
      const client = await storage.getClient(assignment.clientId);
      if (!client || client.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this assignment" });
      }
      
      const completedAssignment = await storage.completeWorkoutAssignment(id, notes);
      res.json(completedAssignment);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to complete workout assignment" });
    }
  });

  // Progress Tracking Routes

  // GET /api/clients/:clientId/progress - Get client progress entries
  app.get("/api/clients/:clientId/progress", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const progress = await storage.getClientProgress(clientId);
      res.json(progress);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // GET /api/progress/:clientId - Get client progress entries (development route)
  app.get("/api/progress/:clientId", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const progress = await storage.getClientProgress(clientId);
      res.json(progress);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // POST /api/progress-entries - Add progress entry
  app.post("/api/progress-entries", secureAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertProgressEntrySchema.parse(req.body);
      
      // Verify client belongs to authenticated trainer
      const client = await storage.getClient(validatedData.clientId);
      if (!client || client.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Access denied to this client" });
      }
      
      const entry = await storage.addProgressEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid progress data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to add progress entry" });
    }
  });

  // Multi-Platform Messaging Routes
  
  // GET /api/messages - Get all messages for authenticated trainer
  app.get("/api/messages", secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const { platform } = req.query;
      const messages = await storage.getAllMessagesForTrainer(trainerId, platform as string);
      res.json(messages);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // GET /api/clients/:clientId/messages - Get client messages with optional platform filter
  app.get("/api/clients/:clientId/messages", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { platform } = req.query;
      const messages = await storage.getClientMessages(clientId, platform as string);
      res.json(messages);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // POST /api/messages - Send new message
  app.post("/api/messages", secureAuth, rateLimitMessages, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      
      // Remove trainerId from request body and use authenticated trainer ID
      const { trainerId: _, ...messageData } = req.body;
      const validatedData = insertMessageSchema.parse({ ...messageData, trainerId });
      
      // Verify client belongs to authenticated trainer
      const client = await storage.getClient(validatedData.clientId);
      if (!client || client.trainerId !== trainerId) {
        return res.status(403).json({ error: "Access denied to this client" });
      }
      
      const message = await storage.sendMessage(validatedData);
      
      // Simulate message delivery for external platforms
      if (validatedData.platform && validatedData.platform !== 'app') {
        simulateMessageDelivery(message.id, validatedData.platform, validatedData.content);
      }
      
      // Broadcast to WebSocket clients in the specific room using server-verified trainer ID
      const roomId = `${trainerId}:${validatedData.clientId}`;
      broadcastToRoom(roomId, {
        type: 'new_message',
        data: message
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // POST /api/messages/multi-platform - Send message to multiple platforms
  app.post("/api/messages/multi-platform", secureAuth, rateLimitMessages, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const { clientId, content, platforms } = req.body;
      if (!clientId || !content || !platforms || !Array.isArray(platforms)) {
        return res.status(400).json({ error: "clientId, content, and platforms array required" });
      }
      
      // Verify client belongs to authenticated trainer - CRITICAL SECURITY CHECK
      const client = await storage.getClient(clientId);
      if (!client || client.trainerId !== trainerId) {
        return res.status(403).json({ error: "Access denied to this client" });
      }
      
      const messages = await storage.sendMultiPlatformMessage(clientId, content, platforms);
      
      // Simulate message delivery for external platforms
      messages.forEach(message => {
        if (message.platform && message.platform !== 'app') {
          simulateMessageDelivery(message.id, message.platform, message.content);
        }
      });
      
      // Broadcast to WebSocket clients in the specific room
      if (messages.length > 0) {
        const roomId = `${messages[0].trainerId}:${clientId}`;
        messages.forEach(message => {
          broadcastToRoom(roomId, {
            type: 'new_message',
            data: message
          });
        });
      }
      
      res.status(201).json(messages);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to send multi-platform message" });
    }
  });

  // PUT /api/messages/:id/read - Mark message as read
  app.put("/api/messages/:id/read", secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const message = await storage.markMessageAsRead(id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Broadcast read status to WebSocket clients in the specific room
      const roomId = `${message.trainerId}:${message.clientId}`;
      broadcastToRoom(roomId, {
        type: 'message_read',
        data: { messageId: id, readAt: message.readAt }
      });
      
      res.json(message);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // Message Templates Routes
  
  // GET /api/trainers/:trainerId/message-templates - Get message templates
  app.get("/api/trainers/:trainerId/message-templates", secureAuth, requireTrainerOwnership, async (req: Request, res: Response) => {
    try {
      const { trainerId } = req.params;
      const { category } = req.query;
      const templates = await storage.getMessageTemplates(trainerId, category as string);
      res.json(templates);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch message templates" });
    }
  });

  // POST /api/message-templates - Create message template
  app.post("/api/message-templates", secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      
      // Remove trainerId from request body and use authenticated trainer ID - CRITICAL SECURITY FIX
      const { trainerId: _, ...templateData } = req.body;
      const validatedData = insertMessageTemplateSchema.parse({ ...templateData, trainerId });
      
      const template = await storage.createMessageTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to create message template" });
    }
  });

  // DELETE /api/message-templates/:id - Delete message template
  app.delete("/api/message-templates/:id", secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMessageTemplate(id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to delete message template" });
    }
  });

  // GET /api/message-templates - Get message templates for authenticated trainer
  app.get("/api/message-templates", secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const { category } = req.query;
      const templates = await storage.getMessageTemplates(trainerId, category as string);
      res.json(templates);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch message templates" });
    }
  });

  // Client Communication Preferences Routes
  
  // GET /api/clients/:clientId/communication-prefs - Get client communication preferences
  app.get("/api/clients/:clientId/communication-prefs", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const prefs = await storage.getClientCommunicationPrefs(clientId);
      res.json(prefs);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: "Failed to fetch communication preferences" });
    }
  });

  // PUT /api/clients/:clientId/communication-prefs - Update client communication preference
  app.put("/api/clients/:clientId/communication-prefs", secureAuth, requireClientOwnership, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const validatedData = insertClientCommunicationPrefSchema.parse(req.body);
      const pref = await storage.updateClientCommunicationPref(clientId, validatedData);
      res.json(pref);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid preference data", details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: "Failed to update communication preference" });
    }
  });

  const httpServer = createServer(app);

  // Secure WebSocket Server for Real-time Messaging
  // Get session store from the session middleware configuration
  const sessionMiddleware = getSession();
  const sessionStore = (sessionMiddleware as any).store;
  
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: async (info: { req: IncomingMessage; secure: boolean; origin: string }) => {
      try {
        // Parse cookies from WebSocket handshake
        const cookies = parseCookie(info.req.headers.cookie || '');
        const sessionId = cookies['connect.sid']?.replace('s:', '').split('.')[0];
        
        if (!sessionId) {
          // WebSocket connection rejected: No session cookie
          return false;
        }

        // Authenticate session during handshake
        const userId = await authenticateWebSocketSession(sessionId, sessionStore);
        if (!userId) {
          // WebSocket connection rejected: Invalid session
          return false;
        }

        // Store authenticated user ID for later use
        (info.req as any).authenticatedUserId = userId;
        // WebSocket connection authenticated
        return true;
      } catch (error) {
        // WebSocket authentication error
        return false;
      }
    }
  });
  
  // Store authenticated WebSocket connections by room
  const authenticatedConnections = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const authenticatedUserId = (req as any).authenticatedUserId;
    // Secure WebSocket connection established
    
    // Store authenticated user info on WebSocket
    (ws as any).authenticatedUserId = authenticatedUserId;
    let currentRoom: string | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Received WebSocket message
        
        // Rate limit WebSocket messages per user
        if (!rateLimitWebSocket(authenticatedUserId)) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Rate limit exceeded. Please slow down.' }
          }));
          return;
        }
        
        // Handle different message types
        switch (message.type) {
          case 'join_room':
            try {
              const { clientId } = message.data;
              
              if (!clientId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'clientId is required' }
                }));
                return;
              }

              // Verify client belongs to authenticated trainer (server-side verification)
              const client = await storage.getClient(clientId);
              if (!client || client.trainerId !== authenticatedUserId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Unauthorized access to client' }
                }));
                return;
              }

              // Authentication successful - join room using server-verified trainer ID
              const roomId = `${authenticatedUserId}:${clientId}`;
              
              // Remove from previous room if any
              if (currentRoom && authenticatedConnections.has(currentRoom)) {
                authenticatedConnections.get(currentRoom)!.delete(ws);
                if (authenticatedConnections.get(currentRoom)!.size === 0) {
                  authenticatedConnections.delete(currentRoom);
                }
              }
              
              // Add to new room
              if (!authenticatedConnections.has(roomId)) {
                authenticatedConnections.set(roomId, new Set());
              }
              authenticatedConnections.get(roomId)!.add(ws);
              
              // Store connection details (using server-verified trainer ID)
              (ws as any).clientId = clientId;
              (ws as any).trainerId = authenticatedUserId;
              (ws as any).roomId = roomId;
              currentRoom = roomId;
              
              // WebSocket client joined secure room
              ws.send(JSON.stringify({
                type: 'room_joined',
                data: { roomId, clientId, trainerId: authenticatedUserId }
              }));
              
            } catch (error) {
              // Error during secure room join
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Failed to join room' }
              }));
            }
            break;
            
          case 'typing':
            // Only allow typing messages from connections that have joined a room
            if (!currentRoom) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Must join room before sending typing indicator' }
              }));
              return;
            }
            
            // Broadcast typing indicator only to clients in the same room
            const roomClients = authenticatedConnections.get(currentRoom);
            if (roomClients) {
              roomClients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'typing',
                    data: message.data
                  }));
                }
              });
            }
            break;
            
          default:
            if (!currentRoom) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Must join room first' }
              }));
            }
            break;
        }
      } catch (error) {
        // WebSocket message parsing error
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', () => {
      // WebSocket connection closed
      
      // Clean up room membership
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
  
  // Helper function to broadcast message to specific room
  function broadcastToRoom(roomId: string, message: any) {
    const roomClients = authenticatedConnections.get(roomId);
    if (roomClients) {
      roomClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}
