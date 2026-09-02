import { createWorker } from 'tesseract.js';
import { ReceiptRecognitionResult, ReceiptRecognizer } from './ReceiptTypes';
import { parseReceiptText } from './ReceiptParser';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Local client-side OCR using Tesseract.js
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
 * Server-side Gemini 3.7 Flash Vision AI Recognizer
 */
export class ApiGeminiRecognizer implements ReceiptRecognizer {
  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    try {
      const base64Data = await blobToBase64(imageBlob);

      const response = await fetch('/api/receipt/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: imageBlob.type || 'image/jpeg',
        }),
      });

      if (!response.ok) {
        throw new Error(`API response status ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson.success || !resJson.data) {
        throw new Error(resJson.error || 'Failed to analyze receipt via AI API');
      }

      const d = resJson.data;

      return {
        amount: typeof d.amount === 'number' && d.amount > 0 ? d.amount : undefined,
        date: d.date && typeof d.date === 'string' && d.date.length >= 8 ? d.date : undefined,
        merchant: d.merchant && typeof d.merchant === 'string' ? d.merchant : undefined,
        category: d.category && typeof d.category === 'string' ? d.category : undefined,
        type: d.type === 'income' ? 'income' : 'expense',
        note: d.note && typeof d.note === 'string' ? d.note : (d.merchant || undefined),
        confidence: {
          amount: 0.98,
          date: 0.98,
          merchant: 0.95,
          category: 0.95,
          type: 0.99,
        },
      };
    } catch (err) {
      console.warn('Gemini AI API recognition failed, falling back to local OCR:', err);
      throw err;
    }
  }
}

/**
 * Hybrid Recognizer: Tries Gemini AI Vision API first; if unavailable or fails, falls back to local Tesseract OCR.
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
      // API call failed or error returned -> Fall back to local OCR
    }

    // Fallback to local OCR
    return this.localRecognizer.recognize(imageBlob);
  }
}

// Singleton default instance uses the hybrid Gemini API + Local Fallback strategy
export const defaultReceiptRecognizer: ReceiptRecognizer = new HybridReceiptRecognizer();
