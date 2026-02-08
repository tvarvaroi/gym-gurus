import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';

// Types
export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  mealPlanId: string | null;
  storeId: string | null;
  status: 'active' | 'completed' | 'archived';
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  notes: string | null;
  estimatedPrice: number | null;
  purchased: boolean;
  purchasedAt: string | null;
  createdAt: string;
}

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingListItem[];
}

export interface GroceryStore {
  id: string;
  name: string;
  location: string | null;
  logoUrl: string | null;
}

export interface ShoppingStats {
  totalLists: number;
  activeLists: number;
  completedLists: number;
  archivedLists: number;
}

// Grocery categories for organizing items
export const GROCERY_CATEGORIES = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bread & Bakery',
  'Frozen',
  'Pantry',
  'Snacks',
  'Beverages',
  'Health & Supplements',
  'Other',
] as const;

// Common units
export const QUANTITY_UNITS = [
  'item',
  'lb',
  'oz',
  'kg',
  'g',
  'gallon',
  'quart',
  'liter',
  'ml',
  'cup',
  'tbsp',
  'tsp',
  'bunch',
  'pack',
  'bag',
  'box',
  'can',
  'bottle',
  'jar',
] as const;

// API functions
async function fetchShoppingLists(userId: string, status?: string): Promise<ShoppingList[]> {
  const url = status
    ? `/api/shopping/lists/${userId}?status=${status}`
    : `/api/shopping/lists/${userId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch shopping lists');
  return response.json();
}

async function fetchShoppingList(userId: string, listId: string): Promise<ShoppingListWithItems> {
  const response = await fetch(`/api/shopping/lists/${userId}/${listId}`);
  if (!response.ok) throw new Error('Failed to fetch shopping list');
  return response.json();
}

async function createShoppingList(
  userId: string,
  data: { name: string; mealPlanId?: string; storeId?: string }
): Promise<ShoppingList> {
  const response = await fetch('/api/shopping/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!response.ok) throw new Error('Failed to create shopping list');
  return response.json();
}

async function deleteShoppingList(listId: string): Promise<void> {
  const response = await fetch(`/api/shopping/lists/${listId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete shopping list');
}

async function updateListStatus(
  listId: string,
  status: 'active' | 'completed' | 'archived'
): Promise<ShoppingList> {
  const response = await fetch(`/api/shopping/lists/${listId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update list status');
  return response.json();
}

async function addShoppingItem(
  listId: string,
  data: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    notes?: string;
    estimatedPrice?: number;
  }
): Promise<ShoppingListItem> {
  const response = await fetch(`/api/shopping/lists/${listId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to add item');
  return response.json();
}

async function addBulkItems(
  listId: string,
  items: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    notes?: string;
    estimatedPrice?: number;
  }>
): Promise<ShoppingListItem[]> {
  const response = await fetch(`/api/shopping/lists/${listId}/items/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Failed to add items');
  return response.json();
}

async function toggleItemPurchased(itemId: string): Promise<ShoppingListItem> {
  const response = await fetch(`/api/shopping/items/${itemId}/toggle`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to toggle item');
  return response.json();
}

async function updateShoppingItem(
  itemId: string,
  data: Partial<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    notes: string;
    estimatedPrice: number;
    purchased: boolean;
  }>
): Promise<ShoppingListItem> {
  const response = await fetch(`/api/shopping/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update item');
  return response.json();
}

async function deleteShoppingItem(itemId: string): Promise<void> {
  const response = await fetch(`/api/shopping/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete item');
}

async function fetchGroceryStores(): Promise<GroceryStore[]> {
  const response = await fetch('/api/shopping/stores');
  if (!response.ok) throw new Error('Failed to fetch stores');
  return response.json();
}

async function fetchShoppingStats(userId: string): Promise<ShoppingStats> {
  const response = await fetch(`/api/shopping/stats/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

async function generateListFromMealPlan(
  userId: string,
  mealPlanId: string,
  listName?: string
): Promise<ShoppingList> {
  const response = await fetch('/api/shopping/generate-from-meal-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mealPlanId, listName }),
  });
  if (!response.ok) throw new Error('Failed to generate shopping list');
  return response.json();
}

// Main hook for shopping lists
export function useShopping(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch all shopping lists
  const {
    data: lists,
    isLoading: isLoadingLists,
    error: listsError,
    refetch: refetchLists,
  } = useQuery({
    queryKey: ['shopping', 'lists', userId],
    queryFn: () => fetchShoppingLists(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Fetch active lists
  const {
    data: activeLists,
    isLoading: isLoadingActive,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['shopping', 'lists', userId, 'active'],
    queryFn: () => fetchShoppingLists(userId!, 'active'),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Fetch stores
  const {
    data: stores,
    isLoading: isLoadingStores,
  } = useQuery({
    queryKey: ['shopping', 'stores'],
    queryFn: fetchGroceryStores,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch stats
  const {
    data: stats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['shopping', 'stats', userId],
    queryFn: () => fetchShoppingStats(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: (data: { name: string; mealPlanId?: string; storeId?: string }) =>
      createShoppingList(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'lists', userId] });
      queryClient.invalidateQueries({ queryKey: ['shopping', 'stats', userId] });
    },
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: deleteShoppingList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'lists', userId] });
      queryClient.invalidateQueries({ queryKey: ['shopping', 'stats', userId] });
    },
  });

  // Update list status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ listId, status }: { listId: string; status: 'active' | 'completed' | 'archived' }) =>
      updateListStatus(listId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'lists', userId] });
      queryClient.invalidateQueries({ queryKey: ['shopping', 'stats', userId] });
    },
  });

  // Generate from meal plan mutation
  const generateFromMealPlanMutation = useMutation({
    mutationFn: ({ mealPlanId, listName }: { mealPlanId: string; listName?: string }) =>
      generateListFromMealPlan(userId!, mealPlanId, listName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'lists', userId] });
      queryClient.invalidateQueries({ queryKey: ['shopping', 'stats', userId] });
    },
  });

  return {
    // Lists data
    lists,
    activeLists,
    isLoadingLists,
    isLoadingActive,
    listsError,
    refetchLists,
    refetchActive,

    // Stores
    stores,
    isLoadingStores,

    // Stats
    stats,
    refetchStats,

    // Mutations
    createList: createListMutation.mutate,
    isCreatingList: createListMutation.isPending,
    deleteList: deleteListMutation.mutate,
    isDeletingList: deleteListMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    generateFromMealPlan: generateFromMealPlanMutation.mutate,
    isGenerating: generateFromMealPlanMutation.isPending,

    // Constants
    GROCERY_CATEGORIES,
    QUANTITY_UNITS,
  };
}

// Hook for a specific shopping list
export function useShoppingList(userId: string | undefined, listId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch single list with items
  const {
    data: list,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shopping', 'list', userId, listId],
    queryFn: () => fetchShoppingList(userId!, listId!),
    enabled: !!userId && !!listId,
    staleTime: 10 * 1000,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: (data: {
      name: string;
      quantity?: number;
      unit?: string;
      category?: string;
      notes?: string;
      estimatedPrice?: number;
    }) => addShoppingItem(listId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'list', userId, listId] });
    },
  });

  // Add bulk items mutation
  const addBulkItemsMutation = useMutation({
    mutationFn: (items: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      category?: string;
    }>) => addBulkItems(listId!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'list', userId, listId] });
    },
  });

  // Toggle item mutation
  const toggleItemMutation = useMutation({
    mutationFn: toggleItemPurchased,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'list', userId, listId] });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<ShoppingListItem> }) =>
      updateShoppingItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'list', userId, listId] });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: deleteShoppingItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'list', userId, listId] });
    },
  });

  // Computed values
  const items = list?.items || [];
  const purchasedItems = useMemo(() => items.filter((i) => i.purchased), [items]);
  const unpurchasedItems = useMemo(() => items.filter((i) => !i.purchased), [items]);

  const itemsByCategory = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, ShoppingListItem[]>
    );
  }, [items]);

  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round((purchasedItems.length / items.length) * 100);
  }, [items, purchasedItems]);

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
  }, [items]);

  return {
    // List data
    list,
    items,
    purchasedItems,
    unpurchasedItems,
    itemsByCategory,
    progress,
    estimatedTotal,
    isLoading,
    error,
    refetch,

    // Mutations
    addItem: addItemMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    addBulkItems: addBulkItemsMutation.mutate,
    isAddingBulk: addBulkItemsMutation.isPending,
    toggleItem: toggleItemMutation.mutate,
    isTogglingItem: toggleItemMutation.isPending,
    updateItem: updateItemMutation.mutate,
    isUpdatingItem: updateItemMutation.isPending,
    deleteItem: deleteItemMutation.mutate,
    isDeletingItem: deleteItemMutation.isPending,

    // Constants
    GROCERY_CATEGORIES,
    QUANTITY_UNITS,
  };
}

export default useShopping;
