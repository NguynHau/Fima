
export type AITransactionType = 'expense' | 'income' | 'transfer' | 'debt' | 'unknown';

export interface AIConfidenceScores {
  amount: number;
  merchant: number;
  date: number;
  category: number;
  paymentMethod: number;
  transactionType: number;
}

export interface AIReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AIReceiptData {
  transactionType: AITransactionType;
  amount: number;
  merchant: string | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm:ss
  categorySuggestion: string | null;
  paymentMethod: string | null;
  description: string;
  items: AIReceiptItem[];
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  serviceFee: number | null;
  total: number | null;
  address: string | null;
  invoiceCode: string | null;
  currency: string;
  confidence: AIConfidenceScores;
  warnings: string[];
}

export interface AILearningRule {
  merchantPattern: string;
  preferredCategory: string;
  hitCount: number;
  lastUsedAt: string;
}

export interface AIProcessResult {
  data: AIReceiptData;
  rawText?: string;
}
