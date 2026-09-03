import { createWorker } from 'tesseract.js';
import { ReceiptRecognitionResult, ReceiptRecognizer } from './ReceiptTypes';
import { parseReceiptText } from './ReceiptParser';
import { AIManager } from '../ai/AIManager';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Local client-side OCR using Tesseract.js fallback
 */
export class LocalTesseractRecognizer implements ReceiptRecognizer {
  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    try {
      const imageUrl = URL.createObjectURL(imageBlob);
      const worker = await createWorker('vie', 1, { logger: () => {} });
      const { data } = await worker.recognize(imageUrl);
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);

      if (!data || !data.text) {
        return {};
      }

      return parseReceiptText(data.text);
    } catch (err) {
      console.warn('Local OCR notice:', err);
      try {
        const imageUrl = URL.createObjectURL(imageBlob);
        const worker = await createWorker('eng');
        const { data } = await worker.recognize(imageUrl);
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);

        if (data && data.text) {
          return parseReceiptText(data.text);
        }
      } catch (fallbackErr) {
        console.warn('Fallback OCR notice:', fallbackErr);
      }
      return {};
    }
  }
}

/**
 * Enhanced Gemini Vision AI Recognizer with new Financial Engine
 */
export class ApiGeminiRecognizer implements ReceiptRecognizer {
  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    try {
      const data = await AIManager.analyzeReceipt(imageBlob);
      const amount = data.financials?.grandTotal || data.financials?.amountDue || data.financials?.subtotal || 0;

      return {
        amount: amount || undefined,
        date: data.date || undefined,
        merchant: data.merchant || undefined,
        category: data.categorySuggestion || undefined,
        type: data.transactionType === 'income' ? 'income' : 'expense',
        note: data.merchant || data.description || (data.items?.[0]?.name) || undefined,
        confidence: data.confidence,
        rawText: JSON.stringify(data, null, 2)
      };
    } catch (err) {
      console.error('AI Engine error, falling back:', err);
      throw err;
    }
  }
}

/**
 * Hybrid Recognizer: Tries Gemini AI Vision API (with 1 retry); if fails or low reliability, falls back to local Tesseract OCR.
 */
export class HybridReceiptRecognizer implements ReceiptRecognizer {
  private apiRecognizer = new ApiGeminiRecognizer();
  private localRecognizer = new LocalTesseractRecognizer();

  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    try {
      const result = await this.apiRecognizer.recognize(imageBlob);
      if (result.amount || result.merchant || result.category) {
        return result;
      }
    } catch {
      console.warn('Gemini AI endpoint unavailable or error returned -> Falling back to local OCR');
    }

    // Fallback to local OCR
    return this.localRecognizer.recognize(imageBlob);
  }
}

// Singleton default instance
export const defaultReceiptRecognizer: ReceiptRecognizer = new HybridReceiptRecognizer();
