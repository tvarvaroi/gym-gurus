import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import {
  programs,
  programWeeks,
  programEnrollments,
  programDayCompletions,
} from '../../shared/schema';
import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// ---------- Validation Schemas ----------

const createProgramSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal: z.enum(['strength', 'hypertrophy', 'fat_loss', 'endurance', 'general']),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  durationWeeks: z.number().int().min(1).max(52),
  daysPerWeek: z.number().int().min(1).max(7),
  isPublic: z.boolean().optional(),
  source: z.enum(['manual', 'ai', 'template']).optional(),
  tags: z.array(z.string()).optional(),
  weeks: z
    .array(
      z.object({
        weekNumber: z.number().int().min(1),
        label: z.string().optional(),
        notes: z.string().optional(),
        days: z.array(
          z.object({
            dayNumber: z.number().int().min(1),
            label: z.string(),
            exercises: z.array(
              z.object({
                name: z.string(),
                sets: z.number().int().min(1),
                reps: z.string(),
                rpe: z.number().optional(),
                rest: z.string(),
                notes: z.string().optional(),
              })
            ),
          })
        ),
      })
    )
    .optional(),
});

// ---------- GET /programs — list user's programs + public templates ----------

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();

    // Fetch user's own programs + public templates
    const allPrograms = await db
      .select()
      .from(programs)
      .where(
        and(
          isNull(programs.deletedAt),
          or(eq(programs.creatorId, user.id), eq(programs.isPublic, true))
        )
      )
      .orderBy(desc(programs.createdAt));

    res.json(allPrograms);
  } catch (error) {
    console.error('List programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

// ---------- GET /programs/templates — public template library ----------

router.get('/templates', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const templates = await db
      .select()
      .from(programs)
      .where(
        and(isNull(programs.deletedAt), eq(programs.isTemplate, true), eq(programs.isPublic, true))
      )
      .orderBy(desc(programs.createdAt));

    res.json(templates);
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ---------- GET /programs/:id — full program with weeks ----------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    const [program] = await db
      .select()
      .from(programs)
      .where(and(eq(programs.id, id), isNull(programs.deletedAt)));

    if (!program) return res.status(404).json({ error: 'Program not found' });

    // Must be owner or public
    if (program.creatorId !== user.id && !program.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const weeks = await db
      .select()
      .from(programWeeks)
      .where(eq(programWeeks.programId, id))
      .orderBy(programWeeks.weekNumber);

    // If user is enrolled, include enrollment data
    const [enrollment] = await db
      .select()
      .from(programEnrollments)
      .where(and(eq(programEnrollments.userId, user.id), eq(programEnrollments.programId, id)))
      .limit(1);

    let completions: (typeof programDayCompletions.$inferSelect)[] = [];
    if (enrollment) {
      completions = await db
        .select()
        .from(programDayCompletions)
        .where(eq(programDayCompletions.enrollmentId, enrollment.id));
    }

    res.json({ ...program, weeks, enrollment: enrollment || null, completions });
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Failed to fetch program' });
  }
});

// ---------- POST /programs — create new program ----------

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const body = createProgramSchema.parse(req.body);
    const db = await getDb();

    const [program] = await db
      .insert(programs)
      .values({
        creatorId: user.id,
        title: body.title,
        description: body.description,
        goal: body.goal,
        experienceLevel: body.experienceLevel,
        durationWeeks: body.durationWeeks,
        daysPerWeek: body.daysPerWeek,
        isPublic: body.isPublic ?? false,
        source: body.source ?? 'manual',
        tags: body.tags ?? [],
      })
      .returning();

    // Insert weeks if provided
    if (body.weeks && body.weeks.length > 0) {
      await db.insert(programWeeks).values(
        body.weeks.map((w) => ({
          programId: program.id,
          weekNumber: w.weekNumber,
          label: w.label,
          notes: w.notes,
          days: w.days,
        }))
      );
    }

    res.status(201).json(program);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

// ---------- PUT /programs/:id — update program ----------

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    // Ownership check
    const [existing] = await db
      .select()
      .from(programs)
      .where(and(eq(programs.id, id), eq(programs.creatorId, user.id), isNull(programs.deletedAt)));

    if (!existing) return res.status(404).json({ error: 'Program not found' });

    const body = createProgramSchema.partial().parse(req.body);

    const [updated] = await db
      .update(programs)
      .set({
        title: body.title,
        description: body.description,
        goal: body.goal,
        experienceLevel: body.experienceLevel,
        durationWeeks: body.durationWeeks,
        daysPerWeek: body.daysPerWeek,
        isPublic: body.isPublic,
        tags: body.tags,
      })
      .where(eq(programs.id, id))
      .returning();

    // Replace weeks if provided
    if (body.weeks) {
      await db.delete(programWeeks).where(eq(programWeeks.programId, id));
      if (body.weeks.length > 0) {
        await db.insert(programWeeks).values(
          body.weeks.map((w) => ({
            programId: id,
            weekNumber: w.weekNumber,
            label: w.label,
            notes: w.notes,
            days: w.days,
          }))
        );
      }
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

// ---------- DELETE /programs/:id — soft delete ----------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    const [existing] = await db
      .select()
      .from(programs)
      .where(and(eq(programs.id, id), eq(programs.creatorId, user.id), isNull(programs.deletedAt)));

    if (!existing) return res.status(404).json({ error: 'Program not found' });

    await db.update(programs).set({ deletedAt: new Date() }).where(eq(programs.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

// ---------- POST /programs/:id/enroll — start a program ----------

router.post('/:id/enroll', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = z.object({ id: z.string() }).parse(req.params);
    const db = await getDb();

    // Check program exists
    const [program] = await db
      .select()
      .from(programs)
      .where(and(eq(programs.id, id), isNull(programs.deletedAt)));

    if (!program) return res.status(404).json({ error: 'Program not found' });

    // Check not already enrolled in an active program
    const [existing] = await db
      .select()
      .from(programEnrollments)
      .where(
        and(
          eq(programEnrollments.userId, user.id),
          eq(programEnrollments.programId, id),
          eq(programEnrollments.status, 'active')
        )
      )
      .limit(1);

    if (existing) return res.status(409).json({ error: 'Already enrolled in this program' });

    const [enrollment] = await db
      .insert(programEnrollments)
      .values({
        userId: user.id,
        programId: id,
        currentWeek: 1,
        currentDay: 1,
        status: 'active',
      })
      .returning();

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll in program' });
  }
});

// ---------- POST /programs/enrollments/:enrollmentId/complete-day ----------

router.post('/enrollments/:enrollmentId/complete-day', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { enrollmentId } = z.object({ enrollmentId: z.string() }).parse(req.params);
    const { weekNumber, dayNumber, workoutLogId } = z
      .object({
        weekNumber: z.number().int().min(1),
        dayNumber: z.number().int().min(1),
        workoutLogId: z.string().optional(),
      })
      .parse(req.body);

    const db = await getDb();

    // Ownership check
    const [enrollment] = await db
      .select()
      .from(programEnrollments)
      .where(and(eq(programEnrollments.id, enrollmentId), eq(programEnrollments.userId, user.id)))
      .limit(1);

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    const [completion] = await db
      .insert(programDayCompletions)
      .values({
        enrollmentId,
        weekNumber,
        dayNumber,
        workoutLogId,
      })
      .returning();

    // Advance current position
    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, enrollment.programId))
      .limit(1);

    if (program) {
      let nextDay = dayNumber + 1;
      let nextWeek = weekNumber;
      if (nextDay > program.daysPerWeek) {
        nextDay = 1;
        nextWeek = weekNumber + 1;
      }

      if (nextWeek > program.durationWeeks) {
        // Program complete!
        await db
          .update(programEnrollments)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(programEnrollments.id, enrollmentId));
      } else {
        await db
          .update(programEnrollments)
          .set({ currentWeek: nextWeek, currentDay: nextDay })
          .where(eq(programEnrollments.id, enrollmentId));
      }
    }

    res.json(completion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Complete day error:', error);
    res.status(500).json({ error: 'Failed to complete day' });
  }
});

// ---------- GET /programs/enrollments/active — user's active enrollment ----------

router.get('/enrollments/active', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();

    const enrollments = await db
      .select()
      .from(programEnrollments)
      .where(and(eq(programEnrollments.userId, user.id), eq(programEnrollments.status, 'active')))
      .orderBy(desc(programEnrollments.startedAt));

    res.json(enrollments);
  } catch (error) {
    console.error('Active enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch active enrollments' });
  }
});

export default router;
