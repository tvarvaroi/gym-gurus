import { Router } from 'express';
import { db } from '../db';
import { shoppingLists, shoppingListItems, groceryStores } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * Create a new shopping list
 * POST /api/shopping/lists
 */
router.post('/lists', async (req, res) => {
  try {
    const { userId, name, mealPlanId, storeId } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'User ID and name are required' });
    }

    const [newList] = await db
      .insert(shoppingLists)
      .values({
        userId,
        name,
        mealPlanId: mealPlanId || null,
        storeId: storeId || null,
        status: 'active',
      })
      .returning();

    res.status(201).json(newList);
  } catch (error) {
    console.error('Create shopping list error:', error);
    res.status(500).json({ error: 'Failed to create shopping list' });
  }
});

/**
 * Get user's shopping lists
 * GET /api/shopping/lists/:userId
 */
router.get('/lists/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = req.query.status as string;

    let query = db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId))
      .orderBy(desc(shoppingLists.createdAt));

    if (status === 'completed') {
      query = db
        .select()
        .from(shoppingLists)
        .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.isCompleted, true)))
        .orderBy(desc(shoppingLists.createdAt));
    } else if (status === 'active') {
      query = db
        .select()
        .from(shoppingLists)
        .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.isCompleted, false)))
        .orderBy(desc(shoppingLists.createdAt));
    }

    const lists = await query;
    res.json(lists);
  } catch (error) {
    console.error('Get shopping lists error:', error);
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
  }
});

/**
 * Get a specific shopping list with items
 * GET /api/shopping/lists/:userId/:listId
 */
router.get('/lists/:userId/:listId', async (req, res) => {
  try {
    const { userId, listId } = req.params;

    const [list] = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)));

    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, listId))
      .orderBy(shoppingListItems.category, shoppingListItems.itemName);

    res.json({
      ...list,
      items,
    });
  } catch (error) {
    console.error('Get shopping list error:', error);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

/**
 * Add item to shopping list
 * POST /api/shopping/lists/:listId/items
 */
router.post('/lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, quantity, unit, category, notes, estimatedPrice } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const [newItem] = await db
      .insert(shoppingListItems)
      .values({
        shoppingListId: listId,
        name,
        quantity: quantity || 1,
        unit: unit || 'item',
        category: category || 'Other',
        notes: notes || null,
        estimatedPrice: estimatedPrice || null,
        purchased: false,
      })
      .returning();

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Add shopping item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

/**
 * Add multiple items to shopping list
 * POST /api/shopping/lists/:listId/items/bulk
 */
router.post('/lists/:listId/items/bulk', async (req, res) => {
  try {
    const { listId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const itemsToInsert = items.map((item: any) => ({
      shoppingListId: listId,
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'item',
      category: item.category || 'Other',
      notes: item.notes || null,
      estimatedPrice: item.estimatedPrice || null,
      purchased: false,
    }));

    const newItems = await db
      .insert(shoppingListItems)
      .values(itemsToInsert)
      .returning();

    res.status(201).json(newItems);
  } catch (error) {
    console.error('Bulk add shopping items error:', error);
    res.status(500).json({ error: 'Failed to add items' });
  }
});

/**
 * Toggle item purchased status
 * PATCH /api/shopping/items/:itemId/toggle
 */
router.patch('/items/:itemId/toggle', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get current status
    const [currentItem] = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.id, itemId));

    if (!currentItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Toggle purchased status
    const [updatedItem] = await db
      .update(shoppingListItems)
      .set({
        purchased: !currentItem.purchased,
        purchasedAt: !currentItem.purchased ? new Date() : null,
      })
      .where(eq(shoppingListItems.id, itemId))
      .returning();

    res.json(updatedItem);
  } catch (error) {
    console.error('Toggle item error:', error);
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

/**
 * Update shopping list item
 * PATCH /api/shopping/items/:itemId
 */
router.patch('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, quantity, unit, category, notes, estimatedPrice, purchased } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;
    if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice;
    if (purchased !== undefined) {
      updateData.purchased = purchased;
      updateData.purchasedAt = purchased ? new Date() : null;
    }

    const [updatedItem] = await db
      .update(shoppingListItems)
      .set(updateData)
      .where(eq(shoppingListItems.id, itemId))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * Delete shopping list item
 * DELETE /api/shopping/items/:itemId
 */
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));

    res.json({ success: true });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

/**
 * Update shopping list status
 * PATCH /api/shopping/lists/:listId/status
 */
router.patch('/lists/:listId/status', async (req, res) => {
  try {
    const { listId } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [updatedList] = await db
      .update(shoppingLists)
      .set(updateData)
      .where(eq(shoppingLists.id, listId))
      .returning();

    if (!updatedList) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    res.json(updatedList);
  } catch (error) {
    console.error('Update list status error:', error);
    res.status(500).json({ error: 'Failed to update list status' });
  }
});

/**
 * Delete shopping list
 * DELETE /api/shopping/lists/:listId
 */
router.delete('/lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;

    // Delete all items first
    await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, listId));

    // Delete the list
    await db.delete(shoppingLists).where(eq(shoppingLists.id, listId));

    res.json({ success: true });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Failed to delete shopping list' });
  }
});

/**
 * Get grocery stores
 * GET /api/shopping/stores
 */
router.get('/stores', async (req, res) => {
  try {
    const stores = await db.select().from(groceryStores);
    res.json(stores);
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

/**
 * Generate shopping list from meal plan
 * POST /api/shopping/generate-from-meal-plan
 */
router.post('/generate-from-meal-plan', async (req, res) => {
  try {
    const { userId, mealPlanId, listName } = req.body;

    if (!userId || !mealPlanId) {
      return res.status(400).json({ error: 'User ID and meal plan ID are required' });
    }

    // TODO: Fetch meal plan and extract ingredients
    // For now, create an empty list

    const [newList] = await db
      .insert(shoppingLists)
      .values({
        userId,
        name: listName || 'Meal Plan Shopping List',
        mealPlanId,
        status: 'active',
      })
      .returning();

    res.status(201).json({
      list: newList,
      message: 'Shopping list created. Add items from your meal plan manually for now.',
    });
  } catch (error) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({ error: 'Failed to generate shopping list' });
  }
});

/**
 * Get shopping list statistics
 * GET /api/shopping/stats/:userId
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const lists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId));

    const completedLists = lists.filter((l) => l.status === 'completed').length;
    const activeLists = lists.filter((l) => l.status === 'active').length;

    res.json({
      totalLists: lists.length,
      activeLists,
      completedLists,
      archivedLists: lists.length - completedLists - activeLists,
    });
  } catch (error) {
    console.error('Get shopping stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
