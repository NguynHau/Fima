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
      if (!data) return {};

      // Robust resolution of total amount:
      // Priority: data.amount (from backend Vision) -> financials.grandTotal -> financials.total -> amountDue -> subtotal
      const rawAmount = (typeof (data as any).amount === 'number' && (data as any).amount > 0)
        ? (data as any).amount
        : (data.financials?.grandTotal || (data.financials as any)?.total || data.financials?.amountDue || data.financials?.subtotal || 0);

      const amount = (typeof rawAmount === 'number' && rawAmount > 0) ? Math.round(rawAmount) : undefined;

      // Meaningful, clean note construction without OCR garbage
      let cleanMerchant = data.merchant?.trim();
      if (cleanMerchant && (cleanMerchant.toLowerCase() === 'unknown' || cleanMerchant.length < 2)) {
        cleanMerchant = undefined;
      }

      let note = cleanMerchant || '';
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const itemNames = data.items
          .map((i) => i.name?.trim())
          .filter((name): name is string => Boolean(name && name.length > 1 && !/^[0-9\W]+$/.test(name)));
        
        if (itemNames.length > 0) {
          const itemSummary = itemNames.slice(0, 3).join(', ');
          note = note ? `${note} (${itemSummary})` : itemSummary;
        }
      }

      if (!note && data.description && data.description.trim().length > 2) {
        note = data.description.trim();
      }

      const isValidDate = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date);

      return {
        amount,
        date: isValidDate ? data.date! : undefined,
        merchant: cleanMerchant,
        category: data.categorySuggestion?.trim() || undefined,
        type: data.transactionType === 'income' ? 'income' : 'expense',
        note: note || undefined,
        confidence: data.confidence,
        rawText: JSON.stringify(data, null, 2)
      };
    } catch (err) {
      console.error('Gemini AI Vision error, falling back:', err);
      throw err;
    }
  }
}

/**
 * Hybrid Recognizer: Tries Gemini AI Vision API; if fails or low reliability, falls back to local Tesseract OCR.
 */
export class HybridReceiptRecognizer implements ReceiptRecognizer {
  private apiRecognizer = new ApiGeminiRecognizer();
  private localRecognizer = new LocalTesseractRecognizer();

  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    // If offline, do NOT call backend / Gemini
    if (!AIManager.isOnline()) {
      // Local offline fallback
      try {
        return await this.localRecognizer.recognize(imageBlob);
      } catch (ocrErr) {
        return {};
      }
    }

    try {
      const result = await this.apiRecognizer.recognize(imageBlob);
      // If Gemini returned amount or merchant, return high quality Vision result
      if (result.amount || result.merchant) {
        return result;
      }
      console.warn('Gemini AI Vision returned empty key fields -> Falling back to local OCR');
    } catch (err) {
      console.warn('Gemini AI endpoint unavailable or error returned -> Falling back to local OCR:', err);
    }

    // Fallback to local OCR
    try {
      return await this.localRecognizer.recognize(imageBlob);
    } catch (ocrErr) {
      console.warn('Local OCR fallback notice:', ocrErr);
      return {};
    }
  }
}

// Singleton default instance
export const defaultReceiptRecognizer: ReceiptRecognizer = new HybridReceiptRecognizer();
