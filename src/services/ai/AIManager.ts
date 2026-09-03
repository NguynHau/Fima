
import { RawReceiptExtraction } from '../receiptRecognition/ReceiptTypes';
import { LocalHistoryLearner } from './LocalHistoryLearner';

export interface AIContext {
  currentDate: string;
  userCategories: string[];
  recentHistory: string;
}

export class AIManager {
  private static async getContext(): Promise<AIContext> {
    const [categories, history] = await Promise.all([
      LocalHistoryLearner.getUserCategories(),
      LocalHistoryLearner.getRecentPatterns()
    ]);

    return {
      currentDate: new Date().toISOString().split('T')[0],
      userCategories: categories,
      recentHistory: history
    };
  }

  /**
   * Analyzes a receipt image using the multi-stage AI pipeline
   */
  static async analyzeReceipt(imageBlob: Blob): Promise<RawReceiptExtraction> {
    const context = await this.getContext();
    const base64 = await this.blobToBase64(imageBlob);

    const response = await fetch('/api/receipt/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: imageBlob.type,
        context
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `AI Analysis failed (${response.status})`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Processes natural language text into a transaction
   */
  static async processText(text: string): Promise<any> {
    const context = await this.getContext();

    const response = await fetch('/api/ai/text-to-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `Text AI failed (${response.status})`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Asks the AI assistant a question about finances
   */
  static async askAssistant(question: string, transactions: any[]): Promise<string> {
    const context = await this.getContext();
    // Only send the most relevant summary of transactions to keep context small
    const dataSummary = transactions.slice(0, 100).map(t => ({
      date: t.date,
      amount: t.amount,
      type: t.type,
      category: t.category,
      note: t.note
    }));

    const response = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        context: {
          ...context,
          transactions: dataSummary
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `AI Assistant failed (${response.status})`);
    }

    const result = await response.json();
    return result.data.answer;
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
