import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { resolveAmount } from './src/services/receiptRecognition/AmountResolver';
import { resolveCategory } from './src/services/receiptRecognition/CategoryResolver';
import { resolveDate } from './src/services/receiptRecognition/DateResolver';
import { RawReceiptExtraction } from './src/services/receiptRecognition/ReceiptTypes';
import { UsageStore } from './src/services/ai/UsageStore';
import { cleanPlainAssistantText } from './src/services/ai/cleanText';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS middleware: allow GitHub Pages and any client to call the AI backend securely
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Body parser for JSON with base64 image payload
  app.use(express.json({ limit: '10mb' }));

  // Helper for resilient Gemini calls with detailed usage tracking
  interface ExecuteGeminiOptions {
    ai: GoogleGenAI;
    params: any;
    endpoint: string;
    feature: 'vision' | 'text';
    isMultimodal?: boolean;
  }

  async function executeGeminiWithTracking({
    ai,
    params,
    endpoint,
    feature,
    isMultimodal = false,
  }: ExecuteGeminiOptions) {
    const startMs = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    let modelAttempted = 'gemini-3.1-flash-lite';
    let modelSucceeded = '';

    try {
      let response: any;
      try {
        response = await ai.models.generateContent({
          ...params,
          model: 'gemini-3.1-flash-lite',
        });
        modelSucceeded = 'gemini-3.1-flash-lite';
      } catch (primaryErr: any) {
        console.warn('gemini-3.1-flash-lite failed, falling back to gemini-3.8-flash:', primaryErr?.message || primaryErr);
        modelAttempted = 'gemini-3.8-flash';
        response = await ai.models.generateContent({
          ...params,
          model: 'gemini-3.8-flash',
        });
        modelSucceeded = 'gemini-3.8-flash';
      }

      const latencyMs = Date.now() - startMs;
      const usage = response.usageMetadata || {};

      const promptTokens = usage.promptTokenCount || 0;
      const candidatesTokens = usage.candidatesTokenCount || 0;
      const totalTokens = usage.totalTokenCount || (promptTokens + candidatesTokens);

      let imageTokens = 0;
      if (Array.isArray(usage.promptTokensDetails)) {
        const imgDetail = usage.promptTokensDetails.find((d: any) => d.modality === 'IMAGE');
        if (imgDetail) imageTokens = imgDetail.tokenCount || 0;
      }

      // Log success to UsageStore
      try {
        UsageStore.logRequest({
          requestId,
          timestamp: new Date().toISOString(),
          endpoint,
          feature,
          model: modelSucceeded || modelAttempted,
          success: true,
          httpStatus: 200,
          inputTokens: promptTokens,
          outputTokens: candidatesTokens,
          thinkingTokens: 0,
          totalTokens,
          imageTokens,
          latencyMs,
          errorType: null,
          isMultimodal,
        });
      } catch (logErr) {
        console.warn('[UsageStore] Non-fatal log error:', logErr);
      }

      return response;
    } catch (error: any) {
      const latencyMs = Date.now() - startMs;
      const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const errorType = is429 ? '429_RESOURCE_EXHAUSTED' : (error?.name || 'API_ERROR');

      try {
        UsageStore.logRequest({
          requestId,
          timestamp: new Date().toISOString(),
          endpoint,
          feature,
          model: modelAttempted,
          success: false,
          httpStatus: is429 ? 429 : (error?.status || 500),
          inputTokens: 0,
          outputTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          latencyMs,
          errorType,
          isMultimodal,
        });
      } catch (logErr) {
        console.warn('[UsageStore] Non-fatal error log error:', logErr);
      }

      throw error;
    }
  }

  // Health check endpoint for connectivity tests
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      server: 'Fima AI Backend Server',
      timestamp: new Date().toISOString(),
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // AI Usage & Quota Monitoring Endpoint (Reads cached store, NEVER calls Gemini)
  app.get('/api/ai/usage', (req, res) => {
    try {
      const summary = UsageStore.getUsageSummary('gemini-3.1-flash-lite', 'gemini-3.8-flash');
      return res.json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      console.error('Error fetching AI usage summary:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Could not fetch AI usage',
      });
    }
  });

  // Shared handler for receipt vision analysis via Gemini AI
  const handleReceiptAnalyze = async (req: express.Request, res: express.Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY environment variable is not configured',
        });
      }

      const { imageBase64, mimeType, context = {} } = req.body || {};
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 input' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const {
        currentDate = new Date().toISOString().split('T')[0],
        userCategories = [],
        recentHistory = '',
      } = context;

      // Standard default Vietnamese categories in Fima
      const defaultCategories = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn', 'Giải trí', 'Sức khỏe', 'Giáo dục', 'Nhà cửa', 'Khác'];
      const userCatList: string[] = Array.isArray(userCategories) && userCategories.length > 0 ? userCategories : defaultCategories;
      const allowedCategories = Array.from(new Set([...userCatList, ...defaultCategories]));

      const prompt = `
You are the world-class Financial Document Vision AI for Fima personal finance app.
Your task is to analyze the provided image of a receipt, invoice, bill, or ticket directly from pixels.

TODAY'S DATE (Context): ${currentDate}
ALLOWED USER CATEGORIES (You MUST choose categorySuggestion ONLY from this list):
${allowedCategories.join(', ')}

RECENT USER PATTERNS (For contextual reference):
${recentHistory || 'No prior history available'}

=== CRITICAL EXTRACTION RULES ===

1. DIRECT VISUAL INSPECTION:
- Scan the image visually from top to bottom and left to right.
- Account for angled, tilted, thermal-printed, wrinkled, or unevenly lit receipts.
- Detect store logo, header, printed text, tables, and total sections.
- If the image is NOT a receipt/bill (e.g. a selfie, scenery, random object, blank), set documentType="unknown", amount=null, confidence.amount=0, and add warning "Hình ảnh không phải hóa đơn hoặc chứng từ thanh toán".

2. EXACT MONETARY AMOUNTS (NO HALLUCINATION):
- NEVER guess, invent, or truncate numbers.
- In Vietnam (VND), periods or commas are used as thousand separators (e.g., "190.000đ", "190.000", "190,000 VND" all mean 190000).
- "50k" or "50K" means 50000.
- Convert strictly to raw integer numbers. For example:
  "190.000đ" -> 190000 (NEVER 19000, 1900000, or 190).
  "45.000" -> 45000.
  "1.250.000" -> 1250000.
- Accurately distinguish these separate figures:
  * subtotal: sum of items before discounts/tax (tiền hàng, tổng tiền hàng)
  * discount: discount, voucher, promotion deduction (giảm giá, chiết khấu, khuyến mãi)
  * tax: VAT or sales tax (thuế GTGT, VAT)
  * serviceFee: service charge (phí dịch vụ)
  * grandTotal: final payable total (TỔNG CỘNG, TỔNG TIỀN THANH TOÁN, CẦN THANH TOÁN, AMOUNT DUE, TOTAL)
  * cashReceived: cash given by customer (tiền khách đưa, tiền mặt)
  * change: change returned to customer (tiền thối lại, tiền thừa trả khách)
- The root 'amount' field MUST be the final grandTotal (the actual amount spent by the user).
  DO NOT use cashReceived as the amount.
  DO NOT use change as the amount.
- If you cannot clearly read the final total due to severe blur or cutoff, set amount=null and confidence.amount=0. DO NOT guess.

3. MERCHANT / STORE NAME:
- Extract the clean, official store or business name (e.g., "Highlands Coffee", "WinMart+", "Circle K", "Nhà sách Fahasa", "Phúc Long").
- Do NOT include full address, tax code, phone number, slogan, or header noise in merchant.
- If the store name is unreadable, set merchant=null. DO NOT output garbled text.

4. TRANSACTION DATE & TIME:
- Look for date stamps on the receipt (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY).
- Format strictly as YYYY-MM-DD.
- If year is 2 digits (e.g. 25, 26), convert to 4 digits (2025, 2026).
- If no date is found on the receipt, return null or fallback to ${currentDate} with low confidence (0.3).

5. LINE ITEMS:
- Extract line items if clearly visible: name, quantity, unitPrice, totalPrice.
- Filter out garbage rows. Verify that quantity * unitPrice ~ totalPrice.

6. CATEGORY CLASSIFICATION:
- Analyze the entire receipt context (merchant + items + services).
- Examples:
  * "TH true milk", coffee, food, restaurant, cafe -> "Ăn uống"
  * Grab, Be, taxi, petrol/gasoline (xăng dầu), parking -> "Di chuyển"
  * Supermarket (WinMart, Co.opmart, Bách Hóa Xanh), clothing, personal care, cosmetics, electronics -> "Mua sắm"
  * Electricity, water, internet, phone card/viễn thông -> "Hóa đơn"
  * Cinema (CGV, Lotte), games, karaoke -> "Giải trí"
  * Pharmacy, medicine, clinic, hospital -> "Sức khỏe"
  * Books, stationery (vở, bút), school fees -> "Giáo dục"
  * Furniture, home repairs, rent -> "Nhà cửa"
- You MUST select categorySuggestion strictly from: [${allowedCategories.join(', ')}].
- If unclear or doesn't fit specific categories, select "Khác".

7. TEXT HYGIENE:
- Strictly NO hallucinated OCR garbage (e.g. random strings like "TKI 1909 303 422").
- If a detail is missing or unreadable, output null.

8. PAYMENT METHOD:
- Identify if printed: "Tiền mặt" (Cash), "Thẻ" (Card/Visa/Master), "Chuyển khoản" (Bank Transfer/QR), "Ví điện tử" (MoMo, ZaloPay, ShopeePay).

RETURN ONLY PURE JSON matching the response schema.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          documentType: { type: Type.STRING, enum: ['receipt', 'invoice', 'bill', 'ticket', 'unknown'] },
          transactionType: { type: Type.STRING, enum: ['expense', 'income', 'transfer', 'debt', 'unknown'] },
          amount: { type: Type.NUMBER, description: 'Final payable grand total in integer VND or currency units' },
          merchant: { type: Type.STRING },
          date: { type: Type.STRING, description: 'YYYY-MM-DD' },
          time: { type: Type.STRING, description: 'HH:mm:ss' },
          address: { type: Type.STRING },
          invoiceCode: { type: Type.STRING },
          currency: { type: Type.STRING, description: 'VND, USD, etc.' },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                totalPrice: { type: Type.NUMBER },
              },
            },
          },
          financials: {
            type: Type.OBJECT,
            properties: {
              subtotal: { type: Type.NUMBER },
              discount: { type: Type.NUMBER },
              tax: { type: Type.NUMBER },
              serviceFee: { type: Type.NUMBER },
              grandTotal: { type: Type.NUMBER },
              amountDue: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              cashReceived: { type: Type.NUMBER },
              change: { type: Type.NUMBER },
            },
          },
          paymentMethod: { type: Type.STRING },
          categorySuggestion: { type: Type.STRING },
          description: { type: Type.STRING },
          confidence: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              merchant: { type: Type.NUMBER },
              date: { type: Type.NUMBER },
              category: { type: Type.NUMBER },
              paymentMethod: { type: Type.NUMBER },
              transactionType: { type: Type.NUMBER },
            },
          },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['transactionType', 'confidence'],
      };

      const isMultimodal = Boolean(cleanBase64 && cleanBase64.length > 50);

      const response = await executeGeminiWithTracking({
        ai,
        params: {
          contents: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1,
          },
        },
        endpoint: req.path || '/api/ai/analyze-receipt',
        feature: 'vision',
        isMultimodal,
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: 'Empty AI response' });
      }

      const result = JSON.parse(responseText);

      // 1. FINANCIAL EXTRACTION & TOTAL RESOLUTION
      const fin = result.financials || {};
      const resolvedTotal = (typeof fin.grandTotal === 'number' && fin.grandTotal > 0)
        ? fin.grandTotal
        : (typeof fin.amountDue === 'number' && fin.amountDue > 0)
        ? fin.amountDue
        : (typeof fin.total === 'number' && fin.total > 0)
        ? fin.total
        : (typeof result.amount === 'number' && result.amount > 0)
        ? result.amount
        : (typeof fin.subtotal === 'number' && fin.subtotal > 0)
        ? fin.subtotal
        : null;

      if (resolvedTotal !== null) {
        fin.grandTotal = resolvedTotal;
        fin.total = resolvedTotal;
        if (result.amount === undefined || result.amount === null || result.amount <= 0) {
          result.amount = resolvedTotal;
        }
      }

      // Guard against cashReceived being misidentified as payable amount
      if (typeof fin.cashReceived === 'number' && typeof fin.grandTotal === 'number' && fin.cashReceived > fin.grandTotal) {
        if (result.amount === fin.cashReceived) {
          result.amount = fin.grandTotal;
        }
      }

      // Integer rounding for VND currency
      if (typeof result.amount === 'number' && (!result.currency || result.currency.toUpperCase() === 'VND')) {
        result.amount = Math.round(result.amount);
      }

      result.financials = fin;

      // 2. CATEGORY STRICT NORMALIZATION
      if (result.categorySuggestion) {
        const norm = result.categorySuggestion.trim().toLowerCase();
        const exact = allowedCategories.find((c) => c.toLowerCase() === norm);
        if (exact) {
          result.categorySuggestion = exact;
        } else {
          // Robust synonyms mapping to Vietnamese categories
          const categoryMap: Record<string, string> = {
            'food': 'Ăn uống',
            'beverage': 'Ăn uống',
            'dining': 'Ăn uống',
            'restaurant': 'Ăn uống',
            'groceries': 'Ăn uống',
            'cafe': 'Ăn uống',
            'coffee': 'Ăn uống',
            'ẩm thực': 'Ăn uống',
            'cà phê': 'Ăn uống',
            'ăn': 'Ăn uống',
            'uống': 'Ăn uống',
            'transport': 'Di chuyển',
            'transportation': 'Di chuyển',
            'taxi': 'Di chuyển',
            'grab': 'Di chuyển',
            'xăng': 'Di chuyển',
            'xe': 'Di chuyển',
            'shopping': 'Mua sắm',
            'retail': 'Mua sắm',
            'siêu thị': 'Mua sắm',
            'mart': 'Mua sắm',
            'bills': 'Hóa đơn',
            'utilities': 'Hóa đơn',
            'điện': 'Hóa đơn',
            'nước': 'Hóa đơn',
            'entertainment': 'Giải trí',
            'cinema': 'Giải trí',
            'game': 'Giải trí',
            'health': 'Sức khỏe',
            'medical': 'Sức khỏe',
            'pharmacy': 'Sức khỏe',
            'thuốc': 'Sức khỏe',
            'education': 'Giáo dục',
            'school': 'Giáo dục',
            'sách': 'Giáo dục',
            'housing': 'Nhà cửa',
            'rent': 'Nhà cửa',
            'home': 'Nhà cửa',
            'other': 'Khác',
          };
          let mapped = '';
          for (const [key, target] of Object.entries(categoryMap)) {
            if (norm.includes(key)) {
              mapped = target;
              break;
            }
          }
          if (mapped && allowedCategories.includes(mapped)) {
            result.categorySuggestion = mapped;
          } else if (allowedCategories.includes('Khác')) {
            result.categorySuggestion = 'Khác';
          } else if (allowedCategories.length > 0) {
            result.categorySuggestion = allowedCategories[0];
          }
        }
      } else {
        result.categorySuggestion = allowedCategories.includes('Khác') ? 'Khác' : (allowedCategories[0] || 'Khác');
      }

      // 3. DATE NORMALIZATION
      if (result.date) {
        const dateStr = String(result.date).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          result.date = dateStr;
        } else {
          const dmy = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (dmy) {
            const day = dmy[1].padStart(2, '0');
            const month = dmy[2].padStart(2, '0');
            const year = dmy[3];
            result.date = `${year}-${month}-${day}`;
          } else {
            result.date = null;
          }
        }
      }

      // 4. GARBAGE TEXT SANITIZATION
      if (result.merchant) {
        const m = result.merchant.trim();
        if (m.length < 2 || /^[^a-zA-Z0-9\u00C0-\u1EF9]+$/.test(m) || m.toLowerCase() === 'unknown' || m.toLowerCase() === 'null') {
          result.merchant = null;
        }
      }

      if (result.description) {
        const d = result.description.trim();
        if (d.length < 2 || d.toLowerCase() === 'unknown' || d.toLowerCase() === 'null') {
          result.description = null;
        }
      }

      // 5. FINANCIAL VALIDATION WARNING
      if (result.financials) {
        const { subtotal = 0, tax = 0, serviceFee = 0, discount = 0, grandTotal = 0 } = result.financials;
        if (subtotal > 0 && grandTotal > 0) {
          const expected = (subtotal || 0) + (tax || 0) + (serviceFee || 0) - (discount || 0);
          if (Math.abs(expected - grandTotal) > 100) {
            result.warnings = result.warnings || [];
            result.warnings.push(`Cảnh báo lệch số tiền: Tiền hàng(${subtotal}) + Thuế(${tax}) + Phí(${serviceFee}) - Giảm giá(${discount}) = ${expected}, nhưng Tổng cộng là ${grandTotal}`);
          }
        }
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Gemini AI Vision Analysis Error:', error);
      return res.status(500).json({
        error: error.message || 'Error processing request',
      });
    }
  };

  // Support both endpoint paths for receipt analysis
  app.post('/api/receipt/analyze', handleReceiptAnalyze);
  app.post('/api/ai/analyze-receipt', handleReceiptAnalyze);

  // API endpoint for natural language text-to-transaction
  app.post('/api/ai/text-to-transaction', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const { text, context = {} } = req.body || {};
      if (!text) return res.status(400).json({ error: 'Missing text input' });

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const {
        currentDate = new Date().toISOString().split('T')[0],
        userCategories = [],
        recentHistory = '',
      } = context;

      const prompt = `
Convert this natural language into a structured transaction: "${text}"
Today's Date: ${currentDate}
User's Categories: ${userCategories.join(', ')}
Recent Patterns:
${recentHistory}

RETURN ONLY VALID JSON matching the financial schema.
`;

      const response = await executeGeminiWithTracking({
        ai,
        params: {
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transactionType: { type: Type.STRING, enum: ['expense', 'income', 'transfer', 'debt', 'unknown'] },
                amount: { type: Type.NUMBER },
                merchant: { type: Type.STRING },
                date: { type: Type.STRING },
                categorySuggestion: { type: Type.STRING },
                description: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
              },
            },
          },
        },
        endpoint: '/api/ai/text-to-transaction',
        feature: 'text',
        isMultimodal: false,
      });

      return res.json({
        success: true,
        data: JSON.parse(response.text || '{}'),
      });
    } catch (error: any) {
      console.error('Text AI Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API endpoint for Financial Reasoning Assistant
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

      const { question, context = {} } = req.body || {};
      if (!question) return res.status(400).json({ error: 'Missing question' });

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const {
        currentDate = new Date().toISOString().split('T')[0],
        transactions = [],
        userCategories = [],
      } = context;

      const prompt = `
Bạn là Fima, trợ lý tài chính cá nhân thông minh và tận tâm của ứng dụng quản lý chi tiêu Fima.
Trả lời câu hỏi tài chính của người dùng dựa trên dữ liệu giao dịch thực tế được cung cấp.

Ngày hiện tại: ${currentDate}
Danh mục tài chính: ${userCategories.join(', ')}

DỮ LIỆU GIAO DỊCH CỦA NGƯỜI DÙNG (tối đa 100 giao dịch gần nhất):
${JSON.stringify(transactions, null, 2)}

CÂU HỎI CỦA NGƯỜI DÙNG: "${question}"

CÁC NGUYÊN TẮC BẮT BUỘC KHI TRẢ LỜI:
1. KHÔNG SỬ DỤNG BẤT KỲ ĐỊNH DẠNG MARKDOWN NÀO:
   - TUYỆT ĐỐI KHÔNG dùng dấu sao **in đậm**, *in nghiêng*, không để ký tự ** hoặc * xuất hiện.
   - Không dùng dấu thăng (#, ##, ###) để làm tiêu đề.
   - Không dùng code block (\`\`\`), blockquote (>).
   - Chỉ xuất ra văn bản thuần túy (plain text). Nếu cần liệt kê, dùng dấu chấm tròn đơn giản (•) hoặc số thứ tự (1., 2.).

2. PHONG CÁCH & NGỮ ĐIỆU:
   - Trả lời bằng tiếng Việt tự nhiên, thân thiện, súc tích như một người cố vấn tài chính cá nhân.
   - Đi thẳng vào câu trả lời ngay lập tức, không mở đầu dài dòng hoặc chào hỏi rườm rà.
   - KHÔNG dùng các câu sáo rỗng xã giao như: "Chào bạn", "Dựa trên dữ liệu giao dịch của bạn...", "Theo như tôi thấy...", "Hy vọng thông tin này sẽ giúp ích cho bạn...".

3. ĐỘ DÀI & ĐỘ SÂU:
   - Câu hỏi đơn giản hoặc tra cứu số liệu: Trả lời ngắn gọn trong 1-2 câu.
   - Câu hỏi phân tích, đánh giá, lời khuyên: Tối đa 3-5 câu.
   - Không lặp lại câu hỏi của người dùng và không liệt kê lại các bảng dữ liệu đã có sẵn trên giao diện.
   - Chỉ đưa insight thực sự có giá trị, không kéo dài câu trả lời.

4. TÍNH CHÍNH XÁC & CẤU TRÚC:
   - Thứ tự ưu tiên: Kết luận -> Insight quan trọng -> Gợi ý ngắn gọn (nếu cần).
   - Sử dụng số liệu chính xác từ dữ liệu giao dịch (định dạng tiền tệ rõ ràng, ví dụ: 50.000đ, 1.250.000đ).
   - Tuyệt đối KHÔNG suy đoán, giả định hoặc bịa đặt số liệu tài chính.
   - Nếu không có giao dịch hoặc thiếu dữ liệu để trả lời, nói rõ: "Chưa đủ dữ liệu để kết luận." và gợi ý người dùng ghi chép thêm chi tiêu nếu cần.
`;

      const response = await executeGeminiWithTracking({
        ai,
        params: {
          contents: [{ text: prompt }],
          config: {
            temperature: 0.2,
          },
        },
        endpoint: '/api/ai/ask',
        feature: 'text',
        isMultimodal: false,
      });

      const sanitizedAnswer = cleanPlainAssistantText(response.text || '');

      return res.json({
        success: true,
        data: { answer: sanitizedAnswer },
      });
    } catch (error: any) {
      console.error('AI Assistant Error:', error);
      return res.status(500).json({ error: error.message || 'Error processing AI question' });
    }
  });

  // Vite development middleware or static production serve
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Explicit no-cache handler for version.json
    app.get(['/version.json', '*/version.json'], (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const versionFile = path.join(distPath, 'version.json');
      res.sendFile(versionFile);
    });

    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('version.json') || filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    }));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
