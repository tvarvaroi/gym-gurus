import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertClientSchema, insertExerciseSchema, insertWorkoutSchema, 
  insertWorkoutExerciseSchema, insertWorkoutAssignmentSchema,
  type InsertClient, type InsertExercise, type InsertWorkout, 
  type InsertWorkoutExercise, type InsertWorkoutAssignment 
} from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User Management Routes (for demo purposes)
  
  // POST /api/users - Create new user/trainer (demo only)
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json({ id: user.id, username: user.username, displayName: user.displayName, email: user.email });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Client Management Routes
  
  // GET /api/clients/:trainerId - Get all clients for a trainer
  app.get("/api/clients/:trainerId", async (req, res) => {
    try {
      const { trainerId } = req.params;
      const clients = await storage.getClientsByTrainer(trainerId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // GET /api/clients/detail/:id - Get specific client details
  app.get("/api/clients/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // POST /api/clients - Create new client
  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // PUT /api/clients/:id - Update client
  app.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Prevent trainerId changes by omitting it from the validation schema
      const validatedUpdates = insertClientSchema.omit({ trainerId: true }).partial().parse(req.body);
      
      const client = await storage.updateClient(id, validatedUpdates);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  // DELETE /api/clients/:id - Delete client
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Exercise Library Routes
  
  // GET /api/exercises - Get all exercises
  app.get("/api/exercises", async (req, res) => {
    try {
      const exercises = await storage.getAllExercises();
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  // POST /api/exercises - Create new exercise
  app.post("/api/exercises", async (req, res) => {
    try {
      const validatedData = insertExerciseSchema.parse(req.body);
      const exercise = await storage.createExercise(validatedData);
      res.status(201).json(exercise);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid exercise data", details: error.errors });
      }
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  // Workout Management Routes
  
  // GET /api/workouts/:trainerId - Get all workouts for a trainer
  app.get("/api/workouts/:trainerId", async (req, res) => {
    try {
      const { trainerId } = req.params;
      const workouts = await storage.getWorkoutsByTrainer(trainerId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ error: "Failed to fetch workouts" });
    }
  });

  // GET /api/workouts/detail/:id - Get specific workout with exercises
  app.get("/api/workouts/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const workout = await storage.getWorkout(id);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      const exercises = await storage.getWorkoutExercises(id);
      res.json({ ...workout, exercises });
    } catch (error) {
      console.error("Error fetching workout:", error);
      res.status(500).json({ error: "Failed to fetch workout" });
    }
  });

  // POST /api/workouts - Create new workout
  app.post("/api/workouts", async (req, res) => {
    try {
      const validatedData = insertWorkoutSchema.parse(req.body);
      const workout = await storage.createWorkout(validatedData);
      res.status(201).json(workout);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid workout data", details: error.errors });
      }
      console.error("Error creating workout:", error);
      res.status(500).json({ error: "Failed to create workout" });
    }
  });

  // PUT /api/workouts/:id - Update workout
  app.put("/api/workouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Prevent trainerId changes by omitting it from the validation schema
      const validatedUpdates = insertWorkoutSchema.omit({ trainerId: true }).partial().parse(req.body);
      
      const workout = await storage.updateWorkout(id, validatedUpdates);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.json(workout);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating workout:", error);
      res.status(500).json({ error: "Failed to update workout" });
    }
  });

  // DELETE /api/workouts/:id - Delete workout
  app.delete("/api/workouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWorkout(id);
      if (!success) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.json({ message: "Workout deleted successfully" });
    } catch (error) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ error: "Failed to delete workout" });
    }
  });

  // Workout Exercise Routes
  
  // POST /api/workouts/:workoutId/exercises - Add exercise to workout
  app.post("/api/workouts/:workoutId/exercises", async (req, res) => {
    try {
      const { workoutId } = req.params;
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
      console.error("Error adding exercise to workout:", error);
      res.status(500).json({ error: "Failed to add exercise to workout" });
    }
  });

  // DELETE /api/workouts/:workoutId/exercises/:exerciseId - Remove exercise from workout
  app.delete("/api/workouts/:workoutId/exercises/:exerciseId", async (req, res) => {
    try {
      const { workoutId, exerciseId } = req.params;
      const success = await storage.removeExerciseFromWorkout(workoutId, exerciseId);
      if (!success) {
        return res.status(404).json({ error: "Exercise not found in workout" });
      }
      res.json({ message: "Exercise removed from workout successfully" });
    } catch (error) {
      console.error("Error removing exercise from workout:", error);
      res.status(500).json({ error: "Failed to remove exercise from workout" });
    }
  });

  // Workout Assignment Routes
  
  // GET /api/clients/:clientId/workouts - Get client's assigned workouts
  app.get("/api/clients/:clientId/workouts", async (req, res) => {
    try {
      const { clientId } = req.params;
      const assignments = await storage.getClientWorkouts(clientId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching client workouts:", error);
      res.status(500).json({ error: "Failed to fetch client workouts" });
    }
  });

  // POST /api/workout-assignments - Assign workout to client
  app.post("/api/workout-assignments", async (req, res) => {
    try {
      const validatedData = insertWorkoutAssignmentSchema.parse(req.body);
      const assignment = await storage.assignWorkoutToClient(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid assignment data", details: error.errors });
      }
      console.error("Error assigning workout:", error);
      res.status(500).json({ error: "Failed to assign workout" });
    }
  });

  // PUT /api/workout-assignments/:id/complete - Mark workout assignment as completed
  app.put("/api/workout-assignments/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const assignment = await storage.completeWorkoutAssignment(id, notes);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error completing workout assignment:", error);
      res.status(500).json({ error: "Failed to complete workout assignment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
