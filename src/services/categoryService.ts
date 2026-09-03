import { db } from '../db/database';
import {
  type Category,
  type TransactionType,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../types';

let cachedCategories: Category[] = [];
let isInitialized = false;

const CATEGORIES_EVENT = 'fima-categories-updated';

function notifySubscribers() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATEGORIES_EVENT, { detail: cachedCategories }));
  }
}

/**
 * Initializes and seeds default categories if empty,
 * and safely maps existing transactions without categoryId.
 */
export async function ensureDefaultCategories(): Promise<Category[]> {
  try {
    const count = await db.categories.count();
    if (count === 0) {
      const now = new Date().toISOString();
      const defaults: Category[] = [
        ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
          ...c,
          bgColor: c.bgColor || 'rgba(255,255,255,0.1)',
          isDefault: true,
          order: i,
          createdAt: now,
          updatedAt: now,
        })),
        ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
          ...c,
          bgColor: c.bgColor || 'rgba(255,255,255,0.1)',
          isDefault: true,
          order: i,
          createdAt: now,
          updatedAt: now,
        })),
      ];
      await db.categories.bulkPut(defaults);
    }

    // Load current categories into memory cache
    cachedCategories = await db.categories.orderBy('order').toArray();
    isInitialized = true;

    // Safe migration: map existing transactions without categoryId to a valid categoryId
    const unmappedTx = await db.transactions.filter((tx) => !tx.categoryId).toArray();
    if (unmappedTx.length > 0) {
      const catMap = new Map<string, string>();
      for (const cat of cachedCategories) {
        catMap.set(cat.name.trim().toLowerCase(), cat.id);
      }

      await db.transaction('rw', db.transactions, async () => {
        for (const tx of unmappedTx) {
          const matchId = catMap.get(tx.category?.trim().toLowerCase());
          if (matchId) {
            tx.categoryId = matchId;
            await db.transactions.put(tx);
          }
        }
      });
    }

    notifySubscribers();
    return cachedCategories;
  } catch (err) {
    console.error('Error in ensureDefaultCategories:', err);
    return cachedCategories;
  }
}

/**
 * Returns all categories (ordered)
 */
export async function getAllCategories(): Promise<Category[]> {
  if (!isInitialized || cachedCategories.length === 0) {
    return await ensureDefaultCategories();
  }
  const cats = await db.categories.orderBy('order').toArray();
  cachedCategories = cats;
  return cats;
}

/**
 * Returns categories filtered by expense or income
 */
export async function getCategoriesByType(type: TransactionType): Promise<Category[]> {
  const all = await getAllCategories();
  return all.filter((c) => c.type === type);
}

/**
 * Synchronous cache getter for immediate UI rendering
 */
export function getCachedCategories(): Category[] {
  return cachedCategories;
}

/**
 * Synchronous lookup by name or ID
 */
export function findCategoryInCache(nameOrId: string, type?: TransactionType): Category | undefined {
  if (!nameOrId) return undefined;
  const target = nameOrId.trim().toLowerCase();

  // 1. Try exact ID match
  let found = cachedCategories.find((c) => c.id === nameOrId);
  if (found) return found;

  // 2. Try match by name and type
  if (type) {
    found = cachedCategories.find((c) => c.type === type && c.name.toLowerCase() === target);
    if (found) return found;
  }

  // 3. Try match by name across all types
  return cachedCategories.find((c) => c.name.toLowerCase() === target);
}

/**
 * Creates a new category and persists it
 */
export async function createCategory(input: {
  name: string;
  type: TransactionType;
  iconName: string;
  color: string;
  bgColor?: string;
}): Promise<Category> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Tên danh mục không được để trống');
  }

  const all = await getAllCategories();
  const duplicate = all.find(
    (c) => c.type === input.type && c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Danh mục "${trimmedName}" đã tồn tại trong nhóm ${input.type === 'expense' ? 'Chi' : 'Thu'}`);
  }

  const typeCats = all.filter((c) => c.type === input.type);
  const maxOrder = typeCats.reduce((max, c) => Math.max(max, c.order ?? 0), -1);

  const now = new Date().toISOString();
  const newCat: Category = {
    id: `cat_user_${crypto.randomUUID()}`,
    name: trimmedName,
    type: input.type,
    iconName: input.iconName || 'MoreHorizontal',
    color: input.color || '#f97316',
    bgColor: input.bgColor || `${input.color || '#f97316'}33`,
    isDefault: false,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.categories.put(newCat);
  cachedCategories = await db.categories.orderBy('order').toArray();
  notifySubscribers();
  return newCat;
}

/**
 * Updates an existing category.
 * If the category name changes, all historical transactions using this category
 * are safely updated to the new name and linked to this category ID.
 */
export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    iconName?: string;
    color?: string;
    bgColor?: string;
  }
): Promise<Category> {
  const existing = await db.categories.get(id);
  if (!existing) {
    throw new Error('Không tìm thấy danh mục để cập nhật');
  }

  const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
  if (!newName) {
    throw new Error('Tên danh mục không được để trống');
  }

  const nameChanged = newName.toLowerCase() !== existing.name.toLowerCase();

  if (nameChanged) {
    // Check if another category in the same group already has this name
    const all = await getAllCategories();
    const duplicate = all.find(
      (c) => c.id !== id && c.type === existing.type && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Tên danh mục "${newName}" đã tồn tại trong nhóm ${existing.type === 'expense' ? 'Chi' : 'Thu'}`);
    }
  }

  const now = new Date().toISOString();
  const updatedCat: Category = {
    ...existing,
    name: newName,
    iconName: updates.iconName || existing.iconName,
    color: updates.color || existing.color,
    bgColor: updates.bgColor || (updates.color ? `${updates.color}33` : existing.bgColor),
    updatedAt: now,
  };

  // Perform atomic update on categories and all linked transactions
  await db.transaction('rw', db.categories, db.transactions, async () => {
    await db.categories.put(updatedCat);

    if (nameChanged) {
      // Find all transactions using this category (by id or by old name)
      const affectedTransactions = await db.transactions
        .filter((tx) => tx.categoryId === id || tx.category.toLowerCase() === existing.name.toLowerCase())
        .toArray();

      for (const tx of affectedTransactions) {
        tx.category = newName;
        tx.categoryId = id;
        tx.updatedAt = now;
        await db.transactions.put(tx);
      }
    }
  });

  cachedCategories = await db.categories.orderBy('order').toArray();
  notifySubscribers();
  return updatedCat;
}

/**
 * Counts how many transactions are using a specific category.
 */
export async function getTransactionCountByCategory(id: string, name: string): Promise<number> {
  const lowerName = name.trim().toLowerCase();
  return await db.transactions
    .filter((tx) => tx.categoryId === id || (tx.category && tx.category.trim().toLowerCase() === lowerName))
    .count();
}

/**
 * Deletes a category.
 * If the category has existing transactions, a valid replacementCategoryId of the same type must be provided.
 * All transactions will be safely transferred to the replacement category before deletion.
 */
export async function deleteCategory(id: string, replacementCategoryId?: string): Promise<void> {
  const categoryToDelete = await db.categories.get(id);
  if (!categoryToDelete) {
    throw new Error('Không tìm thấy danh mục để xóa');
  }

  const txCount = await getTransactionCountByCategory(id, categoryToDelete.name);

  if (txCount > 0) {
    if (!replacementCategoryId) {
      throw new Error('Danh mục đang được sử dụng bởi các giao dịch. Cần chọn danh mục thay thế trước khi xóa.');
    }
    if (replacementCategoryId === id) {
      throw new Error('Danh mục thay thế không thể là danh mục đang xóa.');
    }

    const replacementCat = await db.categories.get(replacementCategoryId);
    if (!replacementCat) {
      throw new Error('Không tìm thấy danh mục thay thế.');
    }

    if (replacementCat.type !== categoryToDelete.type) {
      throw new Error('Danh mục thay thế phải cùng loại (Thu hoặc Chi).');
    }

    // Safely reassign all transactions to the replacement category
    const now = new Date().toISOString();
    await db.transaction('rw', db.categories, db.transactions, async () => {
      const affectedTransactions = await db.transactions
        .filter(
          (tx) => tx.categoryId === id || (tx.category && tx.category.trim().toLowerCase() === categoryToDelete.name.trim().toLowerCase())
        )
        .toArray();

      for (const tx of affectedTransactions) {
        tx.categoryId = replacementCat.id;
        tx.category = replacementCat.name;
        tx.updatedAt = now;
        await db.transactions.put(tx);
      }

      await db.categories.delete(id);
    });
  } else {
    // No transactions use this category; safe to delete directly
    await db.categories.delete(id);
  }

  cachedCategories = await db.categories.orderBy('order').toArray();
  notifySubscribers();
}

/**
 * Reorders categories in database
 */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      const cat = await db.categories.get(orderedIds[i]);
      if (cat) {
        cat.order = i;
        await db.categories.put(cat);
      }
    }
  });
  cachedCategories = await db.categories.orderBy('order').toArray();
  notifySubscribers();
}

/**
 * React hook or listener registration for categories updates
 */
export function subscribeCategories(callback: (categories: Category[]) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<Category[]>;
    callback(custom.detail || cachedCategories);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CATEGORIES_EVENT, handler);
  }

  // Also trigger immediately with current cached categories
  if (cachedCategories.length > 0) {
    callback(cachedCategories);
  } else {
    ensureDefaultCategories().then(callback);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(CATEGORIES_EVENT, handler);
    }
  };
}
