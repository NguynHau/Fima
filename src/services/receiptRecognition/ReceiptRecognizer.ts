import { createWorker } from 'tesseract.js';
import { ReceiptRecognitionResult, ReceiptRecognizer } from './ReceiptTypes';
import { parseReceiptText } from './ReceiptParser';

export class LocalTesseractRecognizer implements ReceiptRecognizer {
  private workerPromise: Promise<any> | null = null;

  /**
   * Perform local client-side OCR on an image Blob
   */
  async recognize(imageBlob: Blob): Promise<ReceiptRecognitionResult> {
    try {
      // 1. Convert Blob to Object URL or ImageBitmap for processing
      const imageUrl = URL.createObjectURL(imageBlob);

      // 2. Perform OCR using Tesseract.js
      // We can use 'vie+eng' or 'eng'
      const worker = await createWorker('vie', 1, {
        logger: () => {}, // silent
      });

      const { data } = await worker.recognize(imageUrl);
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);

      if (!data || !data.text) {
        return {};
      }

      // 3. Parse extracted raw text
      const result = parseReceiptText(data.text);
      return result;
    } catch (err) {
      console.warn('Local OCR processing skipped or encountered issue:', err);
      // Try fallback with English/general engine if Vietnamese language traineddata is unavailable offline
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
        console.warn('Fallback OCR error:', fallbackErr);
      }

      // Fail gracefully — return empty object so app continues normally
      return {};
    }
  }
}

// Singleton default instance
export const defaultReceiptRecognizer: ReceiptRecognizer = new LocalTesseractRecognizer();
