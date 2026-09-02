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
  merchant?: string | null;
  date?: string | null;
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
    serviceCharge?: number | null;
    grandTotal?: number | null;
    amountDue?: number | null;
    cashReceived?: number | null;
    change?: number | null;
  } | null;
  paymentMethod?: string | null;
  rawCandidates?: Array<{
    label?: string | null;
    value?: number | null;
    location?: 'top' | 'middle' | 'bottom' | 'unknown' | null;
  }> | null;
  categoryEvidence?: Array<{
    text?: string | null;
    type?: 'merchant' | 'item' | 'keyword' | null;
    confidence?: number | null;
  }> | null;
}
