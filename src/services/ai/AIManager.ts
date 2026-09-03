import { RawReceiptExtraction } from '../receiptRecognition/ReceiptTypes';
import { LocalHistoryLearner } from './LocalHistoryLearner';

export interface AIContext {
  currentDate: string;
  userCategories: string[];
  recentHistory: string;
}

const STORAGE_KEY_BACKEND_URL = 'fima_ai_backend_url';

export class AIManager {
  /**
   * Resolves the AI backend server URL
   * 1. User manual configuration in localStorage (highest priority)
   * 2. Build-time environment variable VITE_AI_BACKEND_URL
   * 3. Fallback: Empty string (relative path /api/... for same-origin full-stack deployments)
   */
  static getBackendUrl(): string {
    const saved = localStorage.getItem(STORAGE_KEY_BACKEND_URL);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }

    const envUrl = (import.meta as any).env?.VITE_AI_BACKEND_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, '');
    }

    // Default to relative root for same-domain deployments
    return '';
  }

  /**
   * Sets or clears the custom backend server URL
   */
  static setBackendUrl(url: string) {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean) {
      localStorage.removeItem(STORAGE_KEY_BACKEND_URL);
    } else {
      localStorage.setItem(STORAGE_KEY_BACKEND_URL, clean);
    }
  }

  /**
   * Checks connectivity to the backend health endpoint
   */
  static async checkHealth(customUrl?: string): Promise<{
    ok: boolean;
    latency: number;
    message?: string;
    server?: string;
    geminiConfigured?: boolean;
  }> {
    const base = customUrl !== undefined
      ? customUrl.trim().replace(/\/+$/, '')
      : this.getBackendUrl();
    const endpoint = `${base}/api/health`;

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - start;
      if (!res.ok) {
        return {
          ok: false,
          latency,
          message: `Máy chủ phản hồi mã lỗi HTTP ${res.status}`,
        };
      }

      const data = await res.json().catch(() => null);
      return {
        ok: true,
        latency,
        server: data?.server || 'Fima AI Server',
        geminiConfigured: data?.geminiConfigured,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      if (err.name === 'AbortError') {
        return { ok: false, latency, message: 'Hết thời gian chờ kết nối (Timeout sau 8s)' };
      }
      return { ok: false, latency, message: err.message || 'Không thể kết nối đến máy chủ' };
    }
  }

  /**
   * Resilient request sender with AbortController timeout & actionable error messages
   */
  private static async sendRequest(endpoint: string, body: any, timeoutMs: number = 25000): Promise<any> {
    const baseUrl = this.getBackendUrl();
    const url = `${baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const serverError = errData?.error;

        if (response.status === 503) {
          throw new Error(serverError || 'Máy chủ AI chưa được cấu hình GEMINI_API_KEY.');
        }
        if (response.status === 404) {
          throw new Error('Không tìm thấy endpoint AI trên máy chủ. Vui lòng kiểm tra lại URL Backend.');
        }
        throw new Error(serverError || `Yêu cầu AI thất bại (Mã lỗi ${response.status})`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error(`Thời gian chờ xử lý AI quá ${Math.round(timeoutMs / 1000)} giây. Máy chủ có thể đang khởi động lại hoặc mạng chậm. Vui lòng thử lại.`);
      }

      if (err instanceof TypeError && err.message.includes('fetch')) {
        const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
        if (isGitHubPages && !baseUrl) {
          throw new Error(
            'Chưa cấu hình URL Máy chủ AI! Khi chạy trên GitHub Pages, bạn cần cung cấp URL Backend công khai trong mục Cài đặt -> Máy chủ AI.'
          );
        }
        throw new Error(
          'Không thể kết nối đến máy chủ AI (Backend). Vui lòng kiểm tra đường truyền mạng hoặc xem lại URL Backend trong Cài đặt.'
        );
      }

      throw err;
    }
  }

  private static async getContext(): Promise<AIContext> {
    const [categories, history] = await Promise.all([
      LocalHistoryLearner.getUserCategories(),
      LocalHistoryLearner.getRecentPatterns(),
    ]);

    return {
      currentDate: new Date().toISOString().split('T')[0],
      userCategories: categories,
      recentHistory: history,
    };
  }

  /**
   * Analyzes a receipt image using the multi-stage AI pipeline
   */
  static async analyzeReceipt(imageBlob: Blob): Promise<RawReceiptExtraction> {
    const context = await this.getContext();
    const base64 = await this.blobToBase64(imageBlob);

    const result = await this.sendRequest(
      '/api/ai/analyze-receipt',
      {
        imageBase64: base64,
        mimeType: imageBlob.type,
        context,
      },
      40000 // 40 seconds for image upload + OCR + vision analysis
    );

    return result.data;
  }

  /**
   * Processes natural language text into a transaction
   */
  static async processText(text: string): Promise<any> {
    const context = await this.getContext();

    const result = await this.sendRequest(
      '/api/ai/text-to-transaction',
      { text, context },
      25000
    );

    return result.data;
  }

  /**
   * Asks the AI assistant a question about finances
   */
  static async askAssistant(question: string, transactions: any[]): Promise<string> {
    const context = await this.getContext();
    // Only send the most relevant summary of transactions to keep context small
    const dataSummary = transactions.slice(0, 100).map((t) => ({
      date: t.date,
      amount: t.amount,
      type: t.type,
      category: t.category,
      note: t.note,
    }));

    const result = await this.sendRequest(
      '/api/ai/ask',
      {
        question,
        context: {
          ...context,
          transactions: dataSummary,
        },
      },
      30000
    );

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
