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
 * Server-side Gemini Vision AI Recognizer with retry mechanism
 */
export class ApiGeminiRecognizer implements ReceiptRecognizer {
  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    const base64Data = await blobToBase64(imageBlob);

    // Attempt 1
    try {
      return await this.callApi(base64Data, imageBlob.type || 'image/jpeg', 1);
    } catch (firstErr) {
      console.warn('Gemini AI API Attempt 1 failed, retrying Attempt 2 with stronger focus...', firstErr);
      // Attempt 2 Retry
      try {
        return await this.callApi(base64Data, imageBlob.type || 'image/jpeg', 2);
      } catch (secondErr) {
        console.error('Gemini AI API Attempt 2 failed:', secondErr);
        throw secondErr;
      }
    }
  }

  private async callApi(imageBase64: string, mimeType: string, attempt: number): Promise<ReceiptRecognitionResult> {
    const response = await fetch('/api/receipt/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        attempt,
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
      category: d.category && typeof d.category === 'string' ? d.category : 'Khác',
      type: d.type === 'income' ? 'income' : 'expense',
      note: d.note && typeof d.note === 'string' ? d.note : (d.merchant || undefined),
      confidence: d.confidence || {
        amount: d.amount ? 0.9 : 0.4,
        category: 0.85,
        merchant: d.merchant ? 0.9 : 0.4,
        date: d.date ? 0.9 : 0.4,
        type: 0.95,
      },
    };
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
