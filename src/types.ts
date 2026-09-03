export type TransactionType = 'income' | 'expense';
export type AccountType = 'wallet' | 'bank';
export type CalendarAccountFilter = 'all' | 'wallet' | 'bank';
export type ActiveTab = 'flow' | 'statistics' | 'settings' | 'profile';
export type PhotoQuality = 'low' | 'high';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number; // positive integer/decimal in VND
  category: string;
  categoryId?: string;
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
  quality?: PhotoQuality;
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

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  iconName: string;
  color: string;
  bgColor: string;
  isDefault?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInfo {
  id?: string;
  name: string;
  type?: TransactionType;
  iconName: string;
  color: string;
  bgColor: string;
  isDefault?: boolean;
  order?: number;
}

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cat_exp_food', name: 'Ăn uống', type: 'expense', iconName: 'UtensilsCrossed', color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.25)', isDefault: true, order: 0 },
  { id: 'cat_exp_transport', name: 'Di chuyển', type: 'expense', iconName: 'Car', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.25)', isDefault: true, order: 1 },
  { id: 'cat_exp_shopping', name: 'Mua sắm', type: 'expense', iconName: 'ShoppingBag', color: '#f472b6', bgColor: 'rgba(244, 114, 182, 0.25)', isDefault: true, order: 2 },
  { id: 'cat_exp_bills', name: 'Hóa đơn', type: 'expense', iconName: 'Receipt', color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.25)', isDefault: true, order: 3 },
  { id: 'cat_exp_entertainment', name: 'Giải trí', type: 'expense', iconName: 'Gamepad2', color: '#c084fc', bgColor: 'rgba(192, 132, 252, 0.25)', isDefault: true, order: 4 },
  { id: 'cat_exp_health', name: 'Sức khỏe', type: 'expense', iconName: 'HeartPulse', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.25)', isDefault: true, order: 5 },
  { id: 'cat_exp_education', name: 'Giáo dục', type: 'expense', iconName: 'GraduationCap', color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.25)', isDefault: true, order: 6 },
  { id: 'cat_exp_housing', name: 'Nhà cửa', type: 'expense', iconName: 'Home', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.25)', isDefault: true, order: 7 },
  { id: 'cat_exp_other', name: 'Khác', type: 'expense', iconName: 'MoreHorizontal', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.25)', isDefault: true, order: 8 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cat_inc_salary', name: 'Lương', type: 'income', iconName: 'Briefcase', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.25)', isDefault: true, order: 0 },
  { id: 'cat_inc_bonus', name: 'Thưởng', type: 'income', iconName: 'Award', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.25)', isDefault: true, order: 1 },
  { id: 'cat_inc_freelance', name: 'Freelance', type: 'income', iconName: 'Laptop', color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.25)', isDefault: true, order: 2 },
  { id: 'cat_inc_gift', name: 'Được cho', type: 'income', iconName: 'Gift', color: '#f472b6', bgColor: 'rgba(244, 114, 182, 0.25)', isDefault: true, order: 3 },
  { id: 'cat_inc_sales', name: 'Bán hàng', type: 'income', iconName: 'Store', color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.25)', isDefault: true, order: 4 },
  { id: 'cat_inc_investment', name: 'Đầu tư', type: 'income', iconName: 'TrendingUp', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.25)', isDefault: true, order: 5 },
  { id: 'cat_inc_other', name: 'Khác', type: 'income', iconName: 'MoreHorizontal', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.25)', isDefault: true, order: 6 },
];

export const EXPENSE_CATEGORIES: CategoryInfo[] = DEFAULT_EXPENSE_CATEGORIES;
export const INCOME_CATEGORIES: CategoryInfo[] = DEFAULT_INCOME_CATEGORIES;

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
