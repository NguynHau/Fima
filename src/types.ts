export type TransactionType = 'income' | 'expense';
export type AccountType = 'wallet' | 'bank';
export type CalendarAccountFilter = 'all' | 'wallet' | 'bank';
export type ActiveTab = 'flow' | 'statistics' | 'settings' | 'profile';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number; // positive integer/decimal in VND
  category: string;
  note: string;
  account: AccountType;
  imageId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface TransactionImage {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  initialWalletBalance: number;
  initialBankBalance: number;
  isInitialSetupDone: boolean;
  nickname?: string;
  avatarDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInfo {
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
}

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  { name: 'Ăn uống', iconName: 'UtensilsCrossed', color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.15)' },
  { name: 'Di chuyển', iconName: 'Car', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.15)' },
  { name: 'Mua sắm', iconName: 'ShoppingBag', color: '#f472b6', bgColor: 'rgba(244, 114, 182, 0.15)' },
  { name: 'Hóa đơn', iconName: 'Receipt', color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.15)' },
  { name: 'Giải trí', iconName: 'Gamepad2', color: '#c084fc', bgColor: 'rgba(192, 132, 252, 0.15)' },
  { name: 'Sức khỏe', iconName: 'HeartPulse', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.15)' },
  { name: 'Giáo dục', iconName: 'GraduationCap', color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.15)' },
  { name: 'Nhà cửa', iconName: 'Home', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.15)' },
  { name: 'Khác', iconName: 'MoreHorizontal', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.15)' },
];

export const INCOME_CATEGORIES: CategoryInfo[] = [
  { name: 'Lương', iconName: 'Briefcase', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  { name: 'Thưởng', iconName: 'Award', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.15)' },
  { name: 'Freelance', iconName: 'Laptop', color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.15)' },
  { name: 'Được cho', iconName: 'Gift', color: '#f472b6', bgColor: 'rgba(244, 114, 182, 0.15)' },
  { name: 'Bán hàng', iconName: 'Store', color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.15)' },
  { name: 'Đầu tư', iconName: 'TrendingUp', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.15)' },
  { name: 'Khác', iconName: 'MoreHorizontal', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.15)' },
];

export interface BalancesSummary {
  initialWallet: number;
  initialBank: number;
  walletIncome: number;
  walletExpense: number;
  bankIncome: number;
  bankExpense: number;
  walletBalance: number;
  bankBalance: number;
  totalAssets: number;
}
