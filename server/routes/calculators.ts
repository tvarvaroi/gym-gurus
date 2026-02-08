// Calculator API Routes
// These are mostly client-side calculations, but we provide server endpoints for:
// 1. Saving calculation results to user profiles
// 2. Historical tracking of calculations
// 3. Complex calculations that benefit from server processing

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { userFitnessProfile, personalRecords, userStrengthStandards } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// ==================== 1RM Calculator ====================

// Calculate 1RM (can be done client-side, but useful for logging)
router.post('/1rm', async (req: Request, res: Response) => {
  try {
    const { weight, reps, formula = 'epley' } = req.body;

    if (!weight || !reps || weight <= 0 || reps <= 0) {
      return res.status(400).json({ error: 'Valid weight and reps required' });
    }

    let oneRM: number;

    switch (formula) {
      case 'epley':
        oneRM = weight * (1 + reps / 30);
        break;
      case 'brzycki':
        oneRM = reps >= 37 ? weight * 10 : weight * (36 / (37 - reps));
        break;
      case 'lombardi':
        oneRM = weight * Math.pow(reps, 0.1);
        break;
      case 'mayhew':
        oneRM = (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
        break;
      case 'oconner':
        oneRM = weight * (1 + 0.025 * reps);
        break;
      case 'wathen':
        oneRM = (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
        break;
      default:
        oneRM = weight * (1 + reps / 30);
    }

    res.json({
      weight,
      reps,
      formula,
      oneRepMax: Math.round(oneRM * 10) / 10,
    });
  } catch (error) {
    console.error('Error calculating 1RM:', error);
    res.status(500).json({ error: 'Failed to calculate 1RM' });
  }
});

// ==================== TDEE Calculator ====================

router.post('/tdee', async (req: Request, res: Response) => {
  try {
    const { weight, height, age, gender, activityLevel, formula = 'mifflin' } = req.body;

    if (!weight || !height || !age || !gender) {
      return res.status(400).json({ error: 'Weight, height, age, and gender required' });
    }

    let bmr: number;

    // Calculate BMR
    if (formula === 'mifflin') {
      // Mifflin-St Jeor
      if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }
    } else {
      // Harris-Benedict
      if (gender === 'male') {
        bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
      } else {
        bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
      }
    }

    // Activity multipliers
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const multiplier = multipliers[activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    res.json({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      activityLevel,
      formula,
      // Macro suggestions
      macros: {
        maintenance: {
          calories: Math.round(tdee),
          protein: Math.round(weight * 2), // 2g per kg
          carbs: Math.round((tdee * 0.4) / 4), // 40% from carbs
          fat: Math.round((tdee * 0.3) / 9), // 30% from fat
        },
        cutting: {
          calories: Math.round(tdee * 0.8), // 20% deficit
          protein: Math.round(weight * 2.2), // Higher protein when cutting
          carbs: Math.round((tdee * 0.8 * 0.35) / 4),
          fat: Math.round((tdee * 0.8 * 0.25) / 9),
        },
        bulking: {
          calories: Math.round(tdee * 1.15), // 15% surplus
          protein: Math.round(weight * 1.8),
          carbs: Math.round((tdee * 1.15 * 0.45) / 4),
          fat: Math.round((tdee * 1.15 * 0.25) / 9),
        },
      },
    });
  } catch (error) {
    console.error('Error calculating TDEE:', error);
    res.status(500).json({ error: 'Failed to calculate TDEE' });
  }
});

// ==================== BMI Calculator ====================

router.post('/bmi', async (req: Request, res: Response) => {
  try {
    const { weight, height } = req.body; // weight in kg, height in cm

    if (!weight || !height || weight <= 0 || height <= 0) {
      return res.status(400).json({ error: 'Valid weight and height required' });
    }

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    let category: string;
    let color: string;

    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'yellow';
    } else if (bmi < 25) {
      category = 'Normal';
      color = 'green';
    } else if (bmi < 30) {
      category = 'Overweight';
      color = 'orange';
    } else {
      category = 'Obese';
      color = 'red';
    }

    res.json({
      bmi: Math.round(bmi * 10) / 10,
      category,
      color,
      healthyRange: {
        min: Math.round(18.5 * heightM * heightM * 10) / 10,
        max: Math.round(24.9 * heightM * heightM * 10) / 10,
      },
    });
  } catch (error) {
    console.error('Error calculating BMI:', error);
    res.status(500).json({ error: 'Failed to calculate BMI' });
  }
});

// ==================== Body Fat Calculator (Navy Method) ====================

router.post('/bodyfat', async (req: Request, res: Response) => {
  try {
    const { gender, height, neck, waist, hip } = req.body; // All in cm

    if (!gender || !height || !neck || !waist) {
      return res.status(400).json({ error: 'Gender, height, neck, and waist required' });
    }

    if (gender === 'female' && !hip) {
      return res.status(400).json({ error: 'Hip measurement required for females' });
    }

    let bodyFat: number;

    if (gender === 'male') {
      // Male formula
      bodyFat =
        495 /
          (1.0324 -
            0.19077 * Math.log10(waist - neck) +
            0.15456 * Math.log10(height)) -
        450;
    } else {
      // Female formula
      bodyFat =
        495 /
          (1.29579 -
            0.35004 * Math.log10(waist + hip - neck) +
            0.221 * Math.log10(height)) -
        450;
    }

    // Clamp to reasonable range
    bodyFat = Math.max(2, Math.min(60, bodyFat));

    // Categories
    let category: string;
    if (gender === 'male') {
      if (bodyFat < 6) category = 'Essential Fat';
      else if (bodyFat < 14) category = 'Athletic';
      else if (bodyFat < 18) category = 'Fitness';
      else if (bodyFat < 25) category = 'Average';
      else category = 'Above Average';
    } else {
      if (bodyFat < 14) category = 'Essential Fat';
      else if (bodyFat < 21) category = 'Athletic';
      else if (bodyFat < 25) category = 'Fitness';
      else if (bodyFat < 32) category = 'Average';
      else category = 'Above Average';
    }

    res.json({
      bodyFatPercentage: Math.round(bodyFat * 10) / 10,
      category,
      measurements: { height, neck, waist, hip },
    });
  } catch (error) {
    console.error('Error calculating body fat:', error);
    res.status(500).json({ error: 'Failed to calculate body fat' });
  }
});

// ==================== Strength Standards Calculator ====================

router.post('/strength-standards', async (req: Request, res: Response) => {
  try {
    const { exercise, gender, bodyweight, oneRepMax } = req.body;

    if (!exercise || !gender || !bodyweight || !oneRepMax) {
      return res.status(400).json({ error: 'Exercise, gender, bodyweight, and 1RM required' });
    }

    // Simplified strength standards (full data in client-side)
    const relativeStrength = oneRepMax / bodyweight;

    let classification: string;
    let percentile: number;

    // General standards (will be refined per exercise)
    if (relativeStrength >= 2.5) {
      classification = 'Elite';
      percentile = 95;
    } else if (relativeStrength >= 2.0) {
      classification = 'Advanced';
      percentile = 80;
    } else if (relativeStrength >= 1.5) {
      classification = 'Intermediate';
      percentile = 50;
    } else if (relativeStrength >= 1.0) {
      classification = 'Novice';
      percentile = 20;
    } else if (relativeStrength >= 0.5) {
      classification = 'Beginner';
      percentile = 5;
    } else {
      classification = 'Untrained';
      percentile = 1;
    }

    res.json({
      exercise,
      gender,
      bodyweight,
      oneRepMax,
      relativeStrength: Math.round(relativeStrength * 100) / 100,
      classification,
      percentile,
    });
  } catch (error) {
    console.error('Error calculating strength standards:', error);
    res.status(500).json({ error: 'Failed to calculate strength standards' });
  }
});

// ==================== Plates Calculator ====================

router.post('/plates', async (req: Request, res: Response) => {
  try {
    const { targetWeight, unit = 'kg', barbellType = 'olympic' } = req.body;

    if (!targetWeight || targetWeight <= 0) {
      return res.status(400).json({ error: 'Valid target weight required' });
    }

    const barbellWeights: Record<string, Record<string, number>> = {
      kg: { olympic: 20, womens: 15, training: 15, ez_bar: 10 },
      lbs: { olympic: 45, womens: 35, training: 35, ez_bar: 25 },
    };

    const plates: Record<string, number[]> = {
      kg: [25, 20, 15, 10, 5, 2.5, 1.25],
      lbs: [45, 35, 25, 10, 5, 2.5],
    };

    const barbellWeight = barbellWeights[unit][barbellType];
    const availablePlates = plates[unit];

    let weightToLoad = (targetWeight - barbellWeight) / 2;
    const platesPerSide: { plate: number; count: number }[] = [];

    if (weightToLoad > 0) {
      for (const plate of availablePlates) {
        if (weightToLoad >= plate) {
          const count = Math.floor(weightToLoad / plate);
          platesPerSide.push({ plate, count });
          weightToLoad -= count * plate;
        }
      }
    }

    const actualPerSide = platesPerSide.reduce((sum, p) => sum + p.plate * p.count, 0);
    const actualWeight = barbellWeight + actualPerSide * 2;

    res.json({
      targetWeight,
      actualWeight,
      barbellWeight,
      unit,
      platesPerSide,
      totalPlates: platesPerSide.map((p) => ({ plate: p.plate, count: p.count * 2 })),
      isExact: Math.abs(targetWeight - actualWeight) < 0.01,
      difference: targetWeight - actualWeight,
    });
  } catch (error) {
    console.error('Error calculating plates:', error);
    res.status(500).json({ error: 'Failed to calculate plates' });
  }
});

// ==================== Save Calculation to Profile ====================

router.post('/save-to-profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, data } = req.body;

    const database = await db;

    // Update user fitness profile based on calculation type
    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    switch (type) {
      case 'tdee':
        updates.dailyCalorieTarget = data.tdee;
        break;
      case 'bodyfat':
        updates.bodyFatPercentage = data.bodyFatPercentage;
        break;
      case 'macros':
        updates.proteinTargetGrams = data.protein;
        updates.carbsTargetGrams = data.carbs;
        updates.fatTargetGrams = data.fat;
        break;
    }

    await database
      .update(userFitnessProfile)
      .set(updates)
      .where(eq(userFitnessProfile.userId, userId));

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Error saving to profile:', error);
    res.status(500).json({ error: 'Failed to save to profile' });
  }
});

export default router;
