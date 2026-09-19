import Dexie, { type Table } from 'dexie';
import {
  type Transaction,
  type TransactionImage,
  type UserSettings,
  type Category,
  type BalancesSummary,
  type AccountType,
  type TransactionType,
  type PhotoQuality,
  type Debt,
  type Budget,
  type SavingsGoal,
  type BudgetPeriodType,
  type BudgetHistoryRecord,
} from '../types';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  images!: Table<TransactionImage, string>;
  settings!: Table<UserSettings, string>;
  categories!: Table<Category, string>;
  debts!: Table<Debt, string>;
  budgets!: Table<Budget, string>;
  savings!: Table<SavingsGoal, string>;
  budgetHistory!: Table<BudgetHistoryRecord, string>;

  constructor() {
    super('FinanceJournalDB');
    this.version(1).stores({
      transactions: 'id, date, type, account, category, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
    });
    this.version(2).stores({
      transactions: 'id, date, type, account, category, categoryId, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
      categories: 'id, name, type, order, isDefault, createdAt',
    });
    this.version(3).stores({
      transactions: 'id, date, type, account, category, categoryId, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
      categories: 'id, name, type, order, isDefault, createdAt',
      debts: 'id, name, amount, date, type, status, createdAt',
    });
    this.version(4).stores({
      transactions: 'id, date, type, account, category, categoryId, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
      categories: 'id, name, type, order, isDefault, createdAt',
      debts: 'id, name, amount, date, type, status, createdAt',
      budgets: 'id, categoryId, categoryName, createdAt',
      savings: 'id, name, targetAmount, createdAt',
    });
    this.version(5).stores({
      transactions: 'id, date, type, account, category, categoryId, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
      categories: 'id, name, type, order, isDefault, createdAt',
      debts: 'id, name, amount, date, type, status, createdAt',
      budgets: 'id, categoryId, categoryName, createdAt',
      savings: 'id, name, targetAmount, createdAt',
      budgetHistory: 'id, budgetId, categoryId, periodType, startDate, endDate, closedAt',
    });
    this.version(6).stores({
      transactions: 'id, date, type, account, category, categoryId, imageId, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
      categories: 'id, name, type, order, isDefault, createdAt',
      debts: 'id, name, amount, date, type, status, createdAt',
      budgets: 'id, categoryId, categoryName, createdAt',
      savings: 'id, name, targetAmount, createdAt',
      budgetHistory: 'id, budgetId, categoryId, periodType, startDate, endDate, closedAt',
    });
  }
}

export const db = new FinanceDatabase();

// Default initial settings
const DEFAULT_SETTINGS_ID = 'default_user_settings';

export async function getUserSettings(): Promise<UserSettings> {
  const existing = await db.settings.get(DEFAULT_SETTINGS_ID);
  if (existing) {
    return existing;
  }
  const defaultSettings: UserSettings = {
    id: DEFAULT_SETTINGS_ID,
    initialWalletBalance: 0,
    initialBankBalance: 0,
    isInitialSetupDone: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.settings.put(defaultSettings);
  return defaultSettings;
}

export async function updateUserSettings(
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getUserSettings();
  const updated: UserSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.settings.put(updated);
  return updated;
}

export async function getTransactions(): Promise<Transaction[]> {
  return await db.transactions.orderBy('createdAt').reverse().toArray();
}

export async function getTransactionsByDate(date: string): Promise<Transaction[]> {
  return await db.transactions
    .where('date')
    .equals(date)
    .reverse()
    .sortBy('createdAt');
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const end = `${year}-${monthStr}-31`;
  return await db.transactions
    .where('date')
    .between(start, end, true, true)
    .toArray();
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  return await db.transactions.get(id);
}

export async function getImageBlob(imageId: string): Promise<Blob | undefined> {
  if (!imageId) return undefined;
  
  let item = await db.images.get(imageId);
  if (!item) {
    const clean = imageId.replace(/\.[^/.]+$/, '');
    item = await db.images.get(clean);
  }
  if (!item) {
    item = await db.images.get(`${imageId}.jpg`);
  }
  if (!item || !item.blob) return undefined;

  if (item.blob instanceof Blob) {
    return item.blob;
  }

  // Handle ArrayBuffer, Uint8Array or serialized data
  try {
    const raw: any = item.blob;
    if (raw instanceof ArrayBuffer) {
      return new Blob([raw], { type: item.mimeType || 'image/jpeg' });
    }
    if (ArrayBuffer.isView(raw)) {
      return new Blob([raw.buffer as ArrayBuffer], { type: item.mimeType || 'image/jpeg' });
    }
    if (typeof raw === 'string' && raw.startsWith('data:')) {
      const parts = raw.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      return new Blob([u8arr], { type: mime });
    }
  } catch (err) {
    console.error('Error parsing blob in getImageBlob:', err);
  }

  return undefined;
}

export async function createTransaction(params: {
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  categoryId?: string;
  note: string;
  account: AccountType;
  imageBlob: Blob;
  photoQuality?: PhotoQuality;
}): Promise<Transaction> {
  const id = crypto.randomUUID();
  const imageId = params.imageBlob ? crypto.randomUUID() : undefined;
  const now = new Date().toISOString();

  await db.transaction('rw', db.transactions, db.images, async () => {
    // 1. Save Image Blob if present
    if (params.imageBlob && imageId) {
      await db.images.put({
        id: imageId,
        blob: params.imageBlob,
        mimeType: params.imageBlob.type || 'image/jpeg',
        createdAt: now,
        quality: params.photoQuality || 'low',
      });
    }

    // 2. Save Main Transaction Record
    await db.transactions.put({
      id,
      date: params.date,
      type: params.type,
      amount: Math.abs(params.amount),
      category: params.category,
      categoryId: params.categoryId,
      note: params.note || '',
      account: params.account,
      imageId,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Auto companion transaction for "Chuyển tiền" (Expense -> Income)
    const isTransferExpense =
      params.type === 'expense' &&
      params.category.trim().toLowerCase() === 'chuyển tiền';

    if (isTransferExpense) {
      const companionAccount: AccountType = params.account === 'bank' ? 'wallet' : 'bank';
      const companionId = crypto.randomUUID();
      const companionCreatedAt = new Date(Date.now() + 10).toISOString();
      const companionNote = params.note
        ? params.note
        : params.account === 'bank'
        ? 'Nhận từ Ngân hàng'
        : 'Nhận từ Ví';

      await db.transactions.put({
        id: companionId,
        date: params.date,
        type: 'income',
        amount: Math.abs(params.amount),
        category: 'Nhận tiền',
        categoryId: 'cat_inc_receive',
        note: companionNote,
        account: companionAccount,
        imageId, // Reuse same image
        createdAt: companionCreatedAt,
        updatedAt: companionCreatedAt,
      });
    }
  });

  const created = await db.transactions.get(id);
  if (!created) throw new Error('Không thể tạo giao dịch');
  return created;
}

export async function updateTransaction(
  id: string,
  params: {
    date: string;
    type: TransactionType;
    amount: number;
    category: string;
    categoryId?: string;
    note: string;
    account: AccountType;
    newImageBlob?: Blob;
    photoQuality?: PhotoQuality;
  }
): Promise<Transaction> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new Error('Không tìm thấy giao dịch để sửa');

  const now = new Date().toISOString();
  let imageId = existing.imageId;

  await db.transaction('rw', db.transactions, db.images, async () => {
    if (params.newImageBlob) {
      // Delete previous image if exists and not referenced elsewhere
      if (existing.imageId) {
        try {
          const otherUsing = await db.transactions
            .filter((t) => t.id !== id && t.imageId === existing.imageId)
            .count();
          if (otherUsing === 0) {
            await db.images.delete(existing.imageId);
          }
        } catch (imgErr) {
          console.warn('Không thể dọn dẹp ảnh cũ:', imgErr);
        }
      }
      // Create new image
      imageId = crypto.randomUUID();
      await db.images.put({
        id: imageId,
        blob: params.newImageBlob,
        mimeType: params.newImageBlob.type || 'image/jpeg',
        createdAt: now,
        quality: params.photoQuality || 'low',
      });
    }

    await db.transactions.put({
      ...existing,
      date: params.date,
      type: params.type,
      amount: Math.abs(params.amount),
      category: params.category,
      categoryId: params.categoryId || existing.categoryId,
      note: params.note || '',
      account: params.account,
      imageId,
      updatedAt: now,
    });
  });

  const updated = await db.transactions.get(id);
  if (!updated) throw new Error('Không thể cập nhật giao dịch');
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing) return;

  const imageIdToDelete = existing.imageId;

  // First, safely delete the transaction record
  await db.transactions.delete(id);

  // If the transaction had an associated image, clean it up if no other transaction uses it
  if (imageIdToDelete) {
    try {
      const otherTxUsingImage = await db.transactions
        .filter((t) => t.id !== id && t.imageId === imageIdToDelete)
        .count();
      if (otherTxUsingImage === 0) {
        await db.images.delete(imageIdToDelete);
      }
    } catch (imgErr) {
      console.warn('Không thể xóa tệp ảnh liên kết:', imgErr);
    }
  }
}

/**
 * Calculates current real-time balances for Wallet, Bank, and Total Assets
 */
export async function calculateBalances(): Promise<BalancesSummary> {
  const [settings, allTransactions] = await Promise.all([
    getUserSettings(),
    db.transactions.toArray(),
  ]);

  let walletIncome = 0;
  let walletExpense = 0;
  let bankIncome = 0;
  let bankExpense = 0;

  for (const t of allTransactions) {
    if (t.account === 'wallet') {
      if (t.type === 'income') walletIncome += t.amount;
      else walletExpense += t.amount;
    } else if (t.account === 'bank') {
      if (t.type === 'income') bankIncome += t.amount;
      else bankExpense += t.amount;
    }
  }

  const walletBalance = settings.initialWalletBalance + walletIncome - walletExpense;
  const bankBalance = settings.initialBankBalance + bankIncome - bankExpense;
  const totalAssets = walletBalance + bankBalance;

  return {
    initialWallet: settings.initialWalletBalance,
    initialBank: settings.initialBankBalance,
    walletIncome,
    walletExpense,
    bankIncome,
    bankExpense,
    walletBalance,
    bankBalance,
    totalAssets,
  };
}

/**
 * Clear all data for complete reset
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.transactions, db.images, db.settings, db.debts, async () => {
    await db.transactions.clear();
    await db.images.clear();
    await db.settings.clear();
    if (db.debts) {
      await db.debts.clear();
    }
  });
}

/**
 * Debts Database Operations
 */
export async function getDebts(): Promise<Debt[]> {
  if (!db.debts) return [];
  return await db.debts.orderBy('createdAt').reverse().toArray();
}

export async function getDebtById(id: string): Promise<Debt | undefined> {
  if (!db.debts) return undefined;
  return await db.debts.get(id);
}

export async function createDebt(params: {
  name: string;
  amount: number;
  paidAmount: number;
  date?: string;
  type: 'lend' | 'borrow';
  status: 'unpaid' | 'paid' | 'partially_paid';
  note?: string;
}): Promise<Debt> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const newDebt: Debt = {
    id,
    name: params.name,
    amount: Math.abs(params.amount),
    paidAmount: Math.abs(params.paidAmount),
    date: params.date || new Date().toISOString().split('T')[0],
    type: params.type,
    status: params.status,
    note: params.note || '',
    createdAt: now,
    updatedAt: now,
  };

  if (db.debts) {
    await db.debts.put(newDebt);
  }
  return newDebt;
}

export async function updateDebt(
  id: string,
  params: Partial<Omit<Debt, 'id' | 'createdAt'>>
): Promise<Debt> {
  const existing = await getDebtById(id);
  if (!existing) throw new Error('Không tìm thấy khoản nợ để cập nhật');

  const now = new Date().toISOString();
  const updated: Debt = {
    ...existing,
    ...params,
    updatedAt: now,
  };

  // Re-evaluate status automatically based on paidAmount if not explicitly passed
  if (params.paidAmount !== undefined || params.amount !== undefined) {
    const finalAmount = params.amount !== undefined ? Math.abs(params.amount) : existing.amount;
    const finalPaid = params.paidAmount !== undefined ? Math.abs(params.paidAmount) : existing.paidAmount;
    
    if (finalPaid >= finalAmount) {
      updated.status = 'paid';
      updated.paidAmount = finalAmount;
    } else if (finalPaid > 0) {
      updated.status = 'partially_paid';
    } else {
      updated.status = 'unpaid';
    }
  }

  if (db.debts) {
    await db.debts.put(updated);
  }
  return updated;
}

export async function deleteDebt(id: string): Promise<void> {
  if (db.debts) {
    await db.debts.delete(id);
  }
}

// ---------------------------------------------------------------------------
// BUDGETS & SAVINGS HELPERS
// ---------------------------------------------------------------------------
const BUDGETS_EVENT = 'fima-budgets-updated';
const SAVINGS_EVENT = 'fima-savings-updated';

function notifyBudgetSubscribers() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BUDGETS_EVENT));
  }
}

function notifySavingsSubscribers() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SAVINGS_EVENT));
  }
}

/**
 * Get all budgets. Auto seeds default budgets (Ăn uống & Giải trí) if table is empty.
 */
export async function getBudgets(): Promise<Budget[]> {
  if (!db.budgets) return [];
  const list = await db.budgets.orderBy('createdAt').toArray();
  if (list.length === 0) {
    const now = new Date().toISOString();
    const defaults: Budget[] = [
      {
        id: 'budget_default_food',
        categoryId: 'cat_exp_food',
        categoryName: 'Ăn uống',
        limitAmount: 3000000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'budget_default_entertainment',
        categoryId: 'cat_exp_entertainment',
        categoryName: 'Giải trí',
        limitAmount: 2000000,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await db.budgets.bulkPut(defaults);
    notifyBudgetSubscribers();
    return defaults;
  }
  return list;
}

export async function saveBudget(input: {
  id?: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  periodType?: BudgetPeriodType;
  startDate?: string;
  endDate?: string;
}): Promise<Budget> {
  if (!db.budgets) throw new Error('Database table for budgets is not ready');
  const now = new Date().toISOString();
  const id = input.id || `budget_${crypto.randomUUID()}`;
  const budget: Budget = {
    id,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    limitAmount: Math.abs(input.limitAmount),
    periodType: input.periodType || 'month',
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: now,
    updatedAt: now,
  };
  await db.budgets.put(budget);
  notifyBudgetSubscribers();
  return budget;
}

export async function deleteBudget(id: string): Promise<void> {
  if (db.budgets) {
    await db.budgets.delete(id);
    notifyBudgetSubscribers();
  }
}

/**
 * Budget History Records (Xem lại Chi tiêu / Expense & Budget Review)
 */
export async function getBudgetHistory(): Promise<BudgetHistoryRecord[]> {
  if (!db.budgetHistory) return [];
  // Ensure table exists and sync any expired cycles/months
  await syncExpiredBudgetsToHistory();
  return await db.budgetHistory.orderBy('closedAt').reverse().toArray();
}

export async function saveBudgetHistoryRecord(record: BudgetHistoryRecord): Promise<void> {
  if (!db.budgetHistory) return;
  await db.budgetHistory.put(record);
}

export async function deleteBudgetHistoryRecord(id: string): Promise<void> {
  if (!db.budgetHistory) return;
  await db.budgetHistory.delete(id);
}

/**
 * Automatically archives expired budget cycles or past months
 */
export async function syncExpiredBudgetsToHistory(): Promise<void> {
  if (!db.budgetHistory || !db.budgets) return;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const activeBudgets = await db.budgets.toArray();
    const existingHistory = await db.budgetHistory.toArray();

    // Check each budget
    for (const b of activeBudgets) {
      if (b.periodType === 'cycle' && b.startDate && b.endDate) {
        // If the cycle has ended (today > endDate)
        if (today > b.endDate) {
          const historyId = `hist_${b.id}_${b.startDate}_${b.endDate}`;
          const alreadyArchived = existingHistory.some(
            (h) => h.id === historyId || (h.budgetId === b.id && h.startDate === b.startDate && h.endDate === b.endDate)
          );

          if (!alreadyArchived) {
            // Calculate total expenses for this category in the date range
            const txs = await db.transactions
              .where('date')
              .between(b.startDate, b.endDate, true, true)
              .and((t) => t.type === 'expense' && (t.categoryId === b.categoryId || t.category.trim().toLowerCase() === b.categoryName.trim().toLowerCase()))
              .toArray();

            const spent = txs.reduce((sum, t) => sum + t.amount, 0);

            const startFormatted = b.startDate.split('-').reverse().join('/');
            const endFormatted = b.endDate.split('-').reverse().join('/');

            const newRecord: BudgetHistoryRecord = {
              id: historyId,
              budgetId: b.id,
              categoryId: b.categoryId,
              categoryName: b.categoryName,
              limitAmount: b.limitAmount,
              spentAmount: spent,
              periodType: 'cycle',
              periodLabel: `Kỳ: ${startFormatted} - ${endFormatted}`,
              startDate: b.startDate,
              endDate: b.endDate,
              closedAt: `${b.endDate}T23:59:59.000Z`,
            };

            await db.budgetHistory.put(newRecord);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error syncing expired budgets to history:', err);
  }
}

/**
 * Get all savings goals. Auto seeds default savings goal (Tiết kiệm) if table is empty.
 */
export async function getSavings(): Promise<SavingsGoal[]> {
  if (!db.savings) return [];
  const list = await db.savings.orderBy('createdAt').toArray();
  if (list.length === 0) {
    const now = new Date().toISOString();
    const defaults: SavingsGoal[] = [
      {
        id: 'savings_default_general',
        name: 'Tiết kiệm',
        targetAmount: 10000000,
        currentAmount: 4000000,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await db.savings.bulkPut(defaults);
    notifySavingsSubscribers();
    return defaults;
  }
  return list;
}

export async function saveSavings(input: {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}): Promise<SavingsGoal> {
  if (!db.savings) throw new Error('Database table for savings is not ready');
  const now = new Date().toISOString();
  const id = input.id || `savings_${crypto.randomUUID()}`;
  const goal: SavingsGoal = {
    id,
    name: input.name.trim() || 'Mục tiêu tiết kiệm',
    targetAmount: Math.abs(input.targetAmount),
    currentAmount: Math.max(0, input.currentAmount),
    createdAt: now,
    updatedAt: now,
  };
  await db.savings.put(goal);
  notifySavingsSubscribers();
  return goal;
}

export async function deleteSavings(id: string): Promise<void> {
  if (db.savings) {
    await db.savings.delete(id);
    notifySavingsSubscribers();
  }
}

export function subscribeBudgets(callback: () => void): () => void {
  if (typeof window !== 'undefined') {
    window.addEventListener(BUDGETS_EVENT, callback);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(BUDGETS_EVENT, callback);
    }
  };
}

export function subscribeSavings(callback: () => void): () => void {
  if (typeof window !== 'undefined') {
    window.addEventListener(SAVINGS_EVENT, callback);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(SAVINGS_EVENT, callback);
    }
  };
}
