import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../middleware/auth';
import type { Request, Response } from 'express';

const router = Router();

// PostgreSQL error code for "relation does not exist" — the calculator_results
// table may not have been created yet if drizzle-kit push hasn't been run.
function isTableMissing(error: unknown): boolean {
  return (error as any)?.code === '42P01';
}

/**
 * @route   GET /api/calculator-results
 * @desc    Get all saved calculator results for the authenticated user
 * @access  Private
 */
router.get('/calculator-results', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID found' });
    }

    const results = await storage.getCalculatorResults(userId);
    res.json(results);
  } catch (error) {
    if (isTableMissing(error)) {
      return res.json([]);
    }
    console.error('Error fetching calculator results:', error);
    res.status(500).json({ error: 'Failed to fetch calculator results' });
  }
});

/**
 * @route   GET /api/calculator-results/:type
 * @desc    Get saved calculator results by calculator type for the authenticated user
 * @access  Private
 */
router.get('/calculator-results/:type', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID found' });
    }

    const results = await storage.getCalculatorResultsByType(userId, type);
    res.json(results);
  } catch (error) {
    if (isTableMissing(error)) {
      return res.json([]);
    }
    console.error('Error fetching calculator results by type:', error);
    res.status(500).json({ error: 'Failed to fetch calculator results' });
  }
});

/**
 * @route   POST /api/calculator-results
 * @desc    Save a new calculator result
 * @access  Private
 */
router.post('/calculator-results', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { calculatorType, inputs, results, notes, isFavorite } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID found' });
    }

    if (!calculatorType || !inputs || !results) {
      return res.status(400).json({
        error: 'Missing required fields: calculatorType, inputs, and results are required',
      });
    }

    const saved = await storage.createCalculatorResult({
      userId,
      calculatorType,
      inputs,
      results,
      notes: notes || null,
      isFavorite: isFavorite || false,
    });

    res.status(201).json(saved);
  } catch (error) {
    if (isTableMissing(error)) {
      return res.status(503).json({
        error: 'Calculator results storage is not yet available. Please try again later.',
      });
    }
    console.error('Error creating calculator result:', error);
    res.status(500).json({ error: 'Failed to save calculator result' });
  }
});

/**
 * @route   PATCH /api/calculator-results/:id
 * @desc    Update a calculator result (notes, favorite status)
 * @access  Private
 */
router.patch('/calculator-results/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { notes, isFavorite } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID found' });
    }

    // TODO: Add ownership verification - ensure the result belongs to this user

    const updated = await storage.updateCalculatorResult(id, {
      notes: notes !== undefined ? notes : undefined,
      isFavorite: isFavorite !== undefined ? isFavorite : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Calculator result not found' });
    }

    res.json(updated);
  } catch (error) {
    if (isTableMissing(error)) {
      return res.status(503).json({
        error: 'Calculator results storage is not yet available. Please try again later.',
      });
    }
    console.error('Error updating calculator result:', error);
    res.status(500).json({ error: 'Failed to update calculator result' });
  }
});

/**
 * @route   DELETE /api/calculator-results/:id
 * @desc    Delete a calculator result
 * @access  Private
 */
router.delete('/calculator-results/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID found' });
    }

    // TODO: Add ownership verification - ensure the result belongs to this user

    await storage.deleteCalculatorResult(id);
    res.status(204).send();
  } catch (error) {
    if (isTableMissing(error)) {
      return res.status(503).json({
        error: 'Calculator results storage is not yet available. Please try again later.',
      });
    }
    console.error('Error deleting calculator result:', error);
    res.status(500).json({ error: 'Failed to delete calculator result' });
  }
});

export default router;
