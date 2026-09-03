export interface ReceiptRecognitionResult {
  amount?: number;
  date?: string; // Format: YYYY-MM-DD
  merchant?: string;
  category?: string;
  type?: 'income' | 'expense';
  note?: string;

  confidence?: {
    amount?: number;
    date?: number;
    merchant?: number;
    category?: number;
    type?: number;
  };
  rawText?: string;
}

export interface ReceiptRecognizer {
  recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult>;
}

export interface RawReceiptExtraction {
  documentType?: 'receipt' | 'invoice' | 'bill' | 'unknown' | null;
  transactionType?: 'expense' | 'income' | 'transfer' | 'debt' | 'unknown' | null;
  merchant?: string | null;
  date?: string | null;
  time?: string | null;
  address?: string | null;
  invoiceCode?: string | null;
  currency?: string | null;
  items?: Array<{
    name?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
  }> | null;
  financials?: {
    subtotal?: number | null;
    discount?: number | null;
    tax?: number | null;
    serviceFee?: number | null;
    grandTotal?: number | null;
    amountDue?: number | null;
    cashReceived?: number | null;
    change?: number | null;
  } | null;
  paymentMethod?: string | null;
  categorySuggestion?: string | null;
  description?: string | null;
  confidence?: {
    amount?: number;
    date?: number;
    merchant?: number;
    category?: number;
    paymentMethod?: number;
    transactionType?: number;
  };
  warnings?: string[];
}
