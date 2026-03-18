// Appointment / Schedule Routes
// CRUD operations for trainer-client appointments with recurrence support

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import { clients, insertAppointmentSchema } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { ZodError } from 'zod';
import { requireClientOwnership } from '../middleware/auth';
import { apiRateLimit, strictRateLimit } from '../middleware/rateLimiter';

const router = Router();

// GET /api/appointments - Get all appointments for authenticated trainer (secured)
router.get('/', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const appointmentList = await storage.getAppointmentsByTrainer(trainerId);

    // Fire session reminders for appointments starting within 1 hour (async, non-blocking)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const apt of appointmentList) {
      if (apt.date === today && apt.status === 'scheduled' && apt.startTime) {
        const [h, m] = apt.startTime.split(':').map(Number);
        const aptMinutes = h * 60 + m;
        const diff = aptMinutes - currentMinutes;
        if (diff > 0 && diff <= 60) {
          // Session starting within 1 hour — notify trainer
          import('../services/notificationService').then(({ notifySessionReminder }) => {
            notifySessionReminder(trainerId, apt.title, apt.startTime, apt.id).catch(() => {});
          });
        }
      }
    }

    res.json(appointmentList);
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET /api/appointments/me - Get appointments for the authenticated Disciple (client role).
// Resolves user ID → client record via email. Must be declared before /client/:clientId.
router.get('/me', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const authenticatedUser = await storage.getUser(userId);
    if (!authenticatedUser || authenticatedUser.role !== 'client') {
      return res.status(403).json({ error: 'Only clients can access this endpoint' });
    }

    // Find the client record by matching email
    const db = await getDb();
    const [clientRecord] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.email, authenticatedUser.email), isNull(clients.deletedAt)))
      .limit(1);

    if (!clientRecord) {
      return res.json([]);
    }

    const appointmentList = await storage.getAppointmentsByClient(clientRecord.id);
    res.json(appointmentList);
  } catch (error) {
    console.error('Failed to fetch client appointments (me):', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET /api/appointments/client/:clientId - Get all appointments for a client (secured + ownership)
router.get(
  '/client/:clientId',
  requireClientOwnership,
  apiRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const appointments = await storage.getAppointmentsByClient(clientId);
      res.json(appointments);
    } catch (error) {
      console.error('Failed to fetch client appointments:', error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  }
);

// POST /api/appointments - Create a new appointment
router.post('/', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;

    // Extract workout assignment fields and recurrence fields if present
    const {
      workoutId,
      workoutDuration,
      workoutCustomTitle,
      workoutCustomNotes,
      recurrencePattern,
      recurrenceEndDate,
      ...appointmentFields
    } = req.body;

    const validatedData = insertAppointmentSchema.parse({ ...appointmentFields, trainerId });

    // Generate dates for recurring appointments
    const appointmentDates: string[] = [validatedData.date];
    const pattern = recurrencePattern || 'none';

    if (pattern !== 'none' && recurrenceEndDate) {
      const startDate = new Date(validatedData.date + 'T00:00:00');
      const endDate = new Date(recurrenceEndDate + 'T00:00:00');
      const intervalDays = pattern === 'weekly' ? 7 : pattern === 'biweekly' ? 14 : 0;

      if (intervalDays > 0) {
        let nextDate = new Date(startDate);
        nextDate.setDate(nextDate.getDate() + intervalDays);
        while (nextDate <= endDate) {
          appointmentDates.push(nextDate.toISOString().split('T')[0]);
          nextDate.setDate(nextDate.getDate() + intervalDays);
        }
      } else if (pattern === 'monthly') {
        let nextDate = new Date(startDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        while (nextDate <= endDate) {
          appointmentDates.push(nextDate.toISOString().split('T')[0]);
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
      }
    }

    // Create first (parent) appointment
    const parentAppointment = await storage.createAppointment({
      ...validatedData,
      recurrencePattern: pattern !== 'none' ? pattern : undefined,
      recurrenceEndDate: recurrenceEndDate || undefined,
    });

    // Create child appointments for recurring series
    for (let i = 1; i < appointmentDates.length; i++) {
      try {
        await storage.createAppointment({
          ...validatedData,
          date: appointmentDates[i],
          recurrencePattern: pattern,
          recurrenceEndDate: recurrenceEndDate || undefined,
          parentAppointmentId: parentAppointment.id,
        });
      } catch {
        // Continue creating remaining appointments if one fails
      }
    }

    // If workout details are provided, create workout assignments for all dates
    if (workoutId && workoutId.trim() !== '') {
      for (const date of appointmentDates) {
        const workoutAssignmentData = {
          workoutId,
          clientId: validatedData.clientId,
          scheduledDate: date,
          scheduledTime: validatedData.startTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          durationMinutes: workoutDuration,
          customTitle: workoutCustomTitle || undefined,
          customNotes: workoutCustomNotes || undefined,
        };

        try {
          await storage.assignWorkoutToClient(workoutAssignmentData);
        } catch {
          // Don't fail the whole request if workout assignment fails
        }
      }
    }

    const totalCreated = appointmentDates.length;
    res.status(201).json({
      ...parentAppointment,
      recurringCount: totalCreated > 1 ? totalCreated : undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid appointment data', details: error.errors });
    }
    console.error('Failed to create appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/appointments/:id - Update an appointment
router.put('/:id', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedUpdates = insertAppointmentSchema.partial().parse(req.body);
    const appointment = await storage.updateAppointment(id, validatedUpdates);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid appointment data', details: error.errors });
    }
    console.error('Failed to update appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE /api/appointments/:id - Delete an appointment
router.delete('/:id', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteAppointment(id);

    if (!success) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
