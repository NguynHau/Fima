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
