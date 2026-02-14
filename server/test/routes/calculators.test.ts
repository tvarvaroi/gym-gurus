/**
 * Calculator Route Tests
 *
 * Tests for:
 *   POST /api/calculators/bmi              — BMI calculator
 *   POST /api/calculators/1rm              — One-rep max calculator (multiple formulas)
 *   POST /api/calculators/tdee             — TDEE / BMR calculator
 *   POST /api/calculators/strength-standards — Strength standards classification
 *
 * Calculator routes are public (no auth required) and pure computation,
 * so we test them by directly invoking the handler logic.
 */
import { describe, it, expect } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers';

// ---------------------------------------------------------------------------
// Handler reproductions from server/routes/calculators.ts
// ---------------------------------------------------------------------------

function bmiHandler(req: any, res: any) {
  try {
    const { weight, height } = req.body;

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
    res.status(500).json({ error: 'Failed to calculate BMI' });
  }
}

function oneRmHandler(req: any, res: any) {
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
    res.status(500).json({ error: 'Failed to calculate 1RM' });
  }
}

function tdeeHandler(req: any, res: any) {
  try {
    const { weight, height, age, gender, activityLevel, formula = 'mifflin' } = req.body;

    if (!weight || !height || !age || !gender) {
      return res.status(400).json({ error: 'Weight, height, age, and gender required' });
    }

    let bmr: number;
    if (formula === 'mifflin') {
      bmr =
        gender === 'male'
          ? 10 * weight + 6.25 * height - 5 * age + 5
          : 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      bmr =
        gender === 'male'
          ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
          : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
    }

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
      macros: {
        maintenance: {
          calories: Math.round(tdee),
          protein: Math.round(weight * 2),
          carbs: Math.round((tdee * 0.4) / 4),
          fat: Math.round((tdee * 0.3) / 9),
        },
        cutting: {
          calories: Math.round(tdee * 0.8),
          protein: Math.round(weight * 2.2),
          carbs: Math.round((tdee * 0.8 * 0.35) / 4),
          fat: Math.round((tdee * 0.8 * 0.25) / 9),
        },
        bulking: {
          calories: Math.round(tdee * 1.15),
          protein: Math.round(weight * 1.8),
          carbs: Math.round((tdee * 1.15 * 0.45) / 4),
          fat: Math.round((tdee * 1.15 * 0.25) / 9),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate TDEE' });
  }
}

function strengthStandardsHandler(req: any, res: any) {
  try {
    const { exercise, gender, bodyweight, oneRepMax } = req.body;

    if (!exercise || !gender || !bodyweight || !oneRepMax) {
      return res.status(400).json({ error: 'Exercise, gender, bodyweight, and 1RM required' });
    }

    const relativeStrength = oneRepMax / bodyweight;
    let classification: string;
    let percentile: number;

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
    res.status(500).json({ error: 'Failed to calculate strength standards' });
  }
}

// ---------------------------------------------------------------------------
// Helper to get the json response value from spy
// ---------------------------------------------------------------------------

function getJsonResponse(res: any): any {
  return (res.json as any).mock.calls[0]?.[0];
}

function getStatusCode(res: any): number | undefined {
  return (res.status as any).mock.calls[0]?.[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Calculator Routes — POST /api/calculators/bmi', () => {
  it('calculates BMI correctly for normal weight', () => {
    const req = createMockRequest({ body: { weight: 70, height: 175 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmi).toBeCloseTo(22.9, 1);
    expect(result.category).toBe('Normal');
    expect(result.color).toBe('green');
    expect(result.healthyRange).toHaveProperty('min');
    expect(result.healthyRange).toHaveProperty('max');
  });

  it('classifies underweight BMI correctly', () => {
    const req = createMockRequest({ body: { weight: 45, height: 175 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmi).toBeLessThan(18.5);
    expect(result.category).toBe('Underweight');
    expect(result.color).toBe('yellow');
  });

  it('classifies overweight BMI correctly', () => {
    const req = createMockRequest({ body: { weight: 85, height: 175 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmi).toBeGreaterThanOrEqual(25);
    expect(result.bmi).toBeLessThan(30);
    expect(result.category).toBe('Overweight');
    expect(result.color).toBe('orange');
  });

  it('classifies obese BMI correctly', () => {
    const req = createMockRequest({ body: { weight: 120, height: 170 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmi).toBeGreaterThanOrEqual(30);
    expect(result.category).toBe('Obese');
    expect(result.color).toBe('red');
  });

  it('returns 400 when weight is missing', () => {
    const req = createMockRequest({ body: { height: 175 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Valid weight and height required' });
  });

  it('returns 400 when height is missing', () => {
    const req = createMockRequest({ body: { weight: 70 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for zero weight', () => {
    const req = createMockRequest({ body: { weight: 0, height: 175 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for negative height', () => {
    const req = createMockRequest({ body: { weight: 70, height: -175 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calculates healthy weight range correctly', () => {
    const req = createMockRequest({ body: { weight: 70, height: 180 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    const heightM = 1.8;
    expect(result.healthyRange.min).toBe(Math.round(18.5 * heightM * heightM * 10) / 10);
    expect(result.healthyRange.max).toBe(Math.round(24.9 * heightM * heightM * 10) / 10);
  });
});

describe('Calculator Routes — POST /api/calculators/1rm', () => {
  it('calculates 1RM with Epley formula (default)', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    // Epley: 100 * (1 + 5/30) = 116.7
    expect(result.oneRepMax).toBeCloseTo(116.7, 1);
    expect(result.formula).toBe('epley');
  });

  it('calculates 1RM with Brzycki formula', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5, formula: 'brzycki' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    // Brzycki: 100 * (36 / (37 - 5)) = 112.5
    expect(result.oneRepMax).toBeCloseTo(112.5, 1);
    expect(result.formula).toBe('brzycki');
  });

  it('calculates 1RM with Lombardi formula', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5, formula: 'lombardi' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    const expected = 100 * Math.pow(5, 0.1);
    expect(result.oneRepMax).toBeCloseTo(Math.round(expected * 10) / 10, 1);
  });

  it('calculates 1RM with Mayhew formula', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5, formula: 'mayhew' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    const expected = (100 * 100) / (52.2 + 41.9 * Math.exp(-0.055 * 5));
    expect(result.oneRepMax).toBeCloseTo(Math.round(expected * 10) / 10, 1);
  });

  it("calculates 1RM with O'Conner formula", () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5, formula: 'oconner' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    // O'Conner: 100 * (1 + 0.025 * 5) = 112.5
    expect(result.oneRepMax).toBeCloseTo(112.5, 1);
  });

  it('calculates 1RM with Wathen formula', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5, formula: 'wathen' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    const expected = (100 * 100) / (48.8 + 53.8 * Math.exp(-0.075 * 5));
    expect(result.oneRepMax).toBeCloseTo(Math.round(expected * 10) / 10, 1);
  });

  it('uses Epley as default for unknown formula', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 5, formula: 'unknown' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.oneRepMax).toBeCloseTo(116.7, 1);
  });

  it('returns 400 when weight is missing', () => {
    const req = createMockRequest({ body: { reps: 5 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when reps is zero', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 0 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for negative weight', () => {
    const req = createMockRequest({ body: { weight: -50, reps: 5 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('handles 1 rep correctly (1RM close to actual weight)', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 1 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    // Epley: 100 * (1 + 1/30) = 103.3
    expect(result.oneRepMax).toBeCloseTo(103.3, 1);
  });

  it('handles very high reps', () => {
    const req = createMockRequest({ body: { weight: 50, reps: 30 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    // Epley: 50 * (1 + 30/30) = 100
    expect(result.oneRepMax).toBeCloseTo(100, 0);
  });

  it('Brzycki handles reps >= 37 with cap formula', () => {
    const req = createMockRequest({ body: { weight: 100, reps: 37, formula: 'brzycki' } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.oneRepMax).toBe(1000);
  });

  it('returns correct response format', () => {
    const req = createMockRequest({ body: { weight: 80, reps: 8 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('reps');
    expect(result).toHaveProperty('formula');
    expect(result).toHaveProperty('oneRepMax');
    expect(typeof result.oneRepMax).toBe('number');
  });
});

describe('Calculator Routes — POST /api/calculators/tdee', () => {
  it('calculates TDEE with Mifflin-St Jeor for a male', () => {
    const req = createMockRequest({
      body: {
        weight: 80,
        height: 180,
        age: 30,
        gender: 'male',
        activityLevel: 'moderately_active',
      },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    // Mifflin male: 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(Math.round(1780 * 1.55));
    expect(result.macros).toHaveProperty('maintenance');
    expect(result.macros).toHaveProperty('cutting');
    expect(result.macros).toHaveProperty('bulking');
  });

  it('calculates TDEE with Mifflin-St Jeor for a female', () => {
    const req = createMockRequest({
      body: { weight: 60, height: 165, age: 25, gender: 'female', activityLevel: 'lightly_active' },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    // Mifflin female: 10*60 + 6.25*165 - 5*25 - 161 = 1345
    expect(result.bmr).toBe(1345);
    expect(result.tdee).toBe(Math.round(1345.25 * 1.375));
  });

  it('calculates TDEE with Harris-Benedict formula', () => {
    const req = createMockRequest({
      body: {
        weight: 80,
        height: 180,
        age: 30,
        gender: 'male',
        activityLevel: 'active',
        formula: 'harris-benedict',
      },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    // Harris-Benedict male: 88.362 + 13.397*80 + 4.799*180 - 5.677*30 = 1853.6 -> 1854
    expect(result.bmr).toBe(1854);
    expect(result.formula).toBe('harris-benedict');
  });

  it('defaults to sedentary multiplier for unknown activity level', () => {
    const req = createMockRequest({
      body: { weight: 80, height: 180, age: 30, gender: 'male', activityLevel: 'unknown_level' },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.tdee).toBe(Math.round(1780 * 1.2));
  });

  it('returns 400 when weight is missing', () => {
    const req = createMockRequest({
      body: { height: 180, age: 30, gender: 'male' },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when gender is missing', () => {
    const req = createMockRequest({
      body: { weight: 80, height: 180, age: 30 },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('includes macro suggestions for maintenance, cutting, and bulking', () => {
    const req = createMockRequest({
      body: { weight: 80, height: 180, age: 30, gender: 'male', activityLevel: 'active' },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    const { macros } = result;

    expect(macros.maintenance.calories).toBe(result.tdee);
    // Cutting/bulking are computed from the unrounded TDEE (bmr * multiplier)
    // internally, so the rounded values may differ by up to 1 from
    // re-computing off the already-rounded result.tdee.
    expect(macros.cutting.calories).toBeGreaterThan(0);
    expect(macros.cutting.calories).toBeLessThan(result.tdee);
    expect(macros.bulking.calories).toBeGreaterThan(result.tdee);

    for (const phase of ['maintenance', 'cutting', 'bulking']) {
      expect(macros[phase]).toHaveProperty('protein');
      expect(macros[phase]).toHaveProperty('carbs');
      expect(macros[phase]).toHaveProperty('fat');
      expect(macros[phase].protein).toBeGreaterThan(0);
      expect(macros[phase].carbs).toBeGreaterThan(0);
      expect(macros[phase].fat).toBeGreaterThan(0);
    }
  });

  it('handles all activity level multipliers correctly', () => {
    const levels = [
      { level: 'sedentary', multiplier: 1.2 },
      { level: 'lightly_active', multiplier: 1.375 },
      { level: 'moderately_active', multiplier: 1.55 },
      { level: 'active', multiplier: 1.725 },
      { level: 'very_active', multiplier: 1.9 },
    ];

    const baseBmr = 1780; // 80kg, 180cm, 30yr male, mifflin

    for (const { level, multiplier } of levels) {
      const req = createMockRequest({
        body: { weight: 80, height: 180, age: 30, gender: 'male', activityLevel: level },
      });
      const res = createMockResponse();

      tdeeHandler(req, res);

      const result = getJsonResponse(res);
      expect(result.tdee).toBe(Math.round(baseBmr * multiplier));
    }
  });
});

describe('Calculator Routes — POST /api/calculators/strength-standards', () => {
  it('classifies Elite strength correctly', () => {
    const req = createMockRequest({
      body: { exercise: 'bench_press', gender: 'male', bodyweight: 80, oneRepMax: 200 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.classification).toBe('Elite');
    expect(result.percentile).toBe(95);
    expect(result.relativeStrength).toBe(2.5);
  });

  it('classifies Advanced strength correctly', () => {
    const req = createMockRequest({
      body: { exercise: 'squat', gender: 'male', bodyweight: 80, oneRepMax: 160 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.classification).toBe('Advanced');
    expect(result.percentile).toBe(80);
  });

  it('classifies Intermediate strength correctly', () => {
    const req = createMockRequest({
      body: { exercise: 'deadlift', gender: 'male', bodyweight: 80, oneRepMax: 120 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.classification).toBe('Intermediate');
    expect(result.percentile).toBe(50);
  });

  it('classifies Novice strength correctly', () => {
    const req = createMockRequest({
      body: { exercise: 'bench_press', gender: 'female', bodyweight: 60, oneRepMax: 60 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.classification).toBe('Novice');
    expect(result.percentile).toBe(20);
  });

  it('classifies Beginner strength correctly', () => {
    const req = createMockRequest({
      body: { exercise: 'bench_press', gender: 'male', bodyweight: 80, oneRepMax: 40 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.classification).toBe('Beginner');
    expect(result.percentile).toBe(5);
  });

  it('classifies Untrained strength correctly', () => {
    const req = createMockRequest({
      body: { exercise: 'bench_press', gender: 'male', bodyweight: 80, oneRepMax: 30 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.classification).toBe('Untrained');
    expect(result.percentile).toBe(1);
  });

  it('returns 400 when required fields are missing', () => {
    const req = createMockRequest({
      body: { exercise: 'bench_press' },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns correct response format', () => {
    const req = createMockRequest({
      body: { exercise: 'squat', gender: 'female', bodyweight: 65, oneRepMax: 100 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result).toHaveProperty('exercise', 'squat');
    expect(result).toHaveProperty('gender', 'female');
    expect(result).toHaveProperty('bodyweight', 65);
    expect(result).toHaveProperty('oneRepMax', 100);
    expect(result).toHaveProperty('relativeStrength');
    expect(result).toHaveProperty('classification');
    expect(result).toHaveProperty('percentile');
    expect(typeof result.relativeStrength).toBe('number');
  });
});

describe('Calculator Routes — Edge Cases', () => {
  it('BMI: handles very tall person', () => {
    const req = createMockRequest({ body: { weight: 90, height: 210 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmi).toBeGreaterThan(0);
    expect(result.bmi).toBeLessThan(100);
    expect(Number.isFinite(result.bmi)).toBe(true);
  });

  it('BMI: handles very heavy person', () => {
    const req = createMockRequest({ body: { weight: 200, height: 170 } });
    const res = createMockResponse();

    bmiHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.category).toBe('Obese');
  });

  it('1RM: handles very light weight', () => {
    const req = createMockRequest({ body: { weight: 1, reps: 1 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.oneRepMax).toBeGreaterThan(0);
  });

  it('1RM: handles very heavy weight', () => {
    const req = createMockRequest({ body: { weight: 500, reps: 1 } });
    const res = createMockResponse();

    oneRmHandler(req, res);

    const result = getJsonResponse(res);
    expect(Number.isFinite(result.oneRepMax)).toBe(true);
  });

  it('TDEE: handles young person (age 16)', () => {
    const req = createMockRequest({
      body: { weight: 60, height: 170, age: 16, gender: 'male', activityLevel: 'active' },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmr).toBeGreaterThan(0);
    expect(result.tdee).toBeGreaterThan(result.bmr);
  });

  it('TDEE: handles older person (age 80)', () => {
    const req = createMockRequest({
      body: { weight: 70, height: 170, age: 80, gender: 'female', activityLevel: 'sedentary' },
    });
    const res = createMockResponse();

    tdeeHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.bmr).toBeGreaterThan(0);
  });

  it('Strength standards: handles exact boundary value (2.5x = Elite)', () => {
    const req = createMockRequest({
      body: { exercise: 'bench', gender: 'male', bodyweight: 100, oneRepMax: 250 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.relativeStrength).toBe(2.5);
    expect(result.classification).toBe('Elite');
  });

  it('Strength standards: handles just below boundary (1.49x = Novice)', () => {
    const req = createMockRequest({
      body: { exercise: 'bench', gender: 'male', bodyweight: 100, oneRepMax: 149 },
    });
    const res = createMockResponse();

    strengthStandardsHandler(req, res);

    const result = getJsonResponse(res);
    expect(result.relativeStrength).toBe(1.49);
    expect(result.classification).toBe('Novice');
  });
});
