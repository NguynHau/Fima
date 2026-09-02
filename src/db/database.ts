import Dexie, { type Table } from 'dexie';
import {
  type Transaction,
  type TransactionImage,
  type UserSettings,
  type BalancesSummary,
  type AccountType,
  type TransactionType,
} from '../types';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  images!: Table<TransactionImage, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('FinanceJournalDB');
    this.version(1).stores({
      transactions: 'id, date, type, account, category, createdAt, [date+type]',
      images: 'id, createdAt',
      settings: 'id',
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
  const item = await db.images.get(imageId);
  return item?.blob;
}

export async function createTransaction(params: {
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  account: AccountType;
  imageBlob: Blob;
}): Promise<Transaction> {
  const id = crypto.randomUUID();
  const imageId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.transaction('rw', db.transactions, db.images, async () => {
    // 1. Save Image Blob
    await db.images.put({
      id: imageId,
      blob: params.imageBlob,
      mimeType: params.imageBlob.type || 'image/jpeg',
      createdAt: now,
    });

    // 2. Save Transaction Record
    await db.transactions.put({
      id,
      date: params.date,
      type: params.type,
      amount: Math.abs(params.amount),
      category: params.category,
      note: params.note || '',
      account: params.account,
      imageId,
      createdAt: now,
      updatedAt: now,
    });
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
    note: string;
    account: AccountType;
    newImageBlob?: Blob;
  }
): Promise<Transaction> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new Error('Không tìm thấy giao dịch để sửa');

  const now = new Date().toISOString();
  let imageId = existing.imageId;

  await db.transaction('rw', db.transactions, db.images, async () => {
    if (params.newImageBlob) {
      // Delete previous image if exists
      if (existing.imageId) {
        await db.images.delete(existing.imageId);
      }
      // Create new image
      imageId = crypto.randomUUID();
      await db.images.put({
        id: imageId,
        blob: params.newImageBlob,
        mimeType: params.newImageBlob.type || 'image/jpeg',
        createdAt: now,
      });
    }

    await db.transactions.put({
      ...existing,
      date: params.date,
      type: params.type,
      amount: Math.abs(params.amount),
      category: params.category,
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

  await db.transaction('rw', db.transactions, db.images, async () => {
    if (existing.imageId) {
      await db.images.delete(existing.imageId);
    }
    await db.transactions.delete(id);
  });
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
  await db.transaction('rw', db.transactions, db.images, db.settings, async () => {
    await db.transactions.clear();
    await db.images.clear();
    await db.settings.clear();
  });
}
