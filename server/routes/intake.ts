// Client Intake / PAR-Q Routes
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { clientIntake } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /api/intake/:clientId - Get client's intake form
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { clientId } = req.params;
    const database = await db;

    const result = await database
      .select()
      .from(clientIntake)
      .where(eq(clientIntake.clientId, clientId))
      .limit(1);

    if (result.length === 0) {
      return res.json(null);
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error getting client intake:', error);
    res.status(500).json({ error: 'Failed to get client intake' });
  }
});

// POST /api/intake/:clientId - Submit client intake form
router.post('/:clientId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { clientId } = req.params;
    const database = await db;

    // Check if intake already exists
    const existing = await database
      .select()
      .from(clientIntake)
      .where(eq(clientIntake.clientId, clientId))
      .limit(1);

    const intakeData = {
      clientId,
      trainerId: userId,
      // PAR-Q Questions
      parqHeartCondition: req.body.parqHeartCondition || false,
      parqChestPainActivity: req.body.parqChestPainActivity || false,
      parqChestPainRest: req.body.parqChestPainRest || false,
      parqDizziness: req.body.parqDizziness || false,
      parqBoneJoint: req.body.parqBoneJoint || false,
      parqBloodPressureMeds: req.body.parqBloodPressureMeds || false,
      parqOtherReason: req.body.parqOtherReason || false,
      parqOtherDetails: req.body.parqOtherDetails || null,
      // Fitness Background
      fitnessExperience: req.body.fitnessExperience || null,
      currentActivityLevel: req.body.currentActivityLevel || null,
      previousInjuries: req.body.previousInjuries || null,
      medicalConditions: req.body.medicalConditions || null,
      medications: req.body.medications || null,
      // Goals & Preferences
      primaryGoal: req.body.primaryGoal || null,
      secondaryGoals: req.body.secondaryGoals || null,
      preferredTrainingDays: req.body.preferredTrainingDays || null,
      preferredSessionDuration: req.body.preferredSessionDuration || null,
      dietaryRestrictions: req.body.dietaryRestrictions || null,
      // Emergency Contact
      emergencyContactName: req.body.emergencyContactName || null,
      emergencyContactPhone: req.body.emergencyContactPhone || null,
      emergencyContactRelation: req.body.emergencyContactRelation || null,
      // Consent
      consentSigned: req.body.consentSigned || false,
      consentSignedAt: req.body.consentSigned ? new Date() : null,
      completedAt: new Date(),
    };

    if (existing.length > 0) {
      // Update existing
      const result = await database
        .update(clientIntake)
        .set(intakeData)
        .where(eq(clientIntake.clientId, clientId))
        .returning();
      res.json(result[0]);
    } else {
      // Create new
      const result = await database
        .insert(clientIntake)
        .values(intakeData)
        .returning();
      res.status(201).json(result[0]);
    }
  } catch (error) {
    console.error('Error saving client intake:', error);
    res.status(500).json({ error: 'Failed to save client intake' });
  }
});

export default router;
