import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for JSON with base64 image payload
  app.use(express.json({ limit: '10mb' }));

  // API endpoint for receipt vision analysis via Gemini AI
  app.post('/api/receipt/analyze', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY environment variable is not configured',
        });
      }

      const { imageBase64, mimeType } = req.body || {};
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 input' });
      }

      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Bạn là trợ lý AI chuyên nghiệp phân tích hóa đơn / chứng từ cho ứng dụng Fima.
Hãy phân tích nội dung hóa đơn trong ảnh và trích xuất thông tin giao dịch chính xác:

1. amount: SỐ TIỀN TỔNG THỰC TẾ KHÁCH PHẢI THANH TOÁN (dạng số nguyên/thực, ví dụ 88000).
   QUAN TRỌNG: Phân biệt rõ giữa:
   - Đơn giá từng sản phẩm
   - Tổng tiền hàng (Subtotal)
   - Giảm giá / Chiết khấu (Discount)
   - Thuế (VAT/Tax)
   - TỔNG CỘNG / PHẢI TRẢ (Total / Grand Total / Amount Due)
   - Tiền khách đưa (Cash received / Tendered)
   - Tiền thối (Change)
   => Chọn số tiền TỔNG CỘNG CUỐI CÙNG thực sự phải trả (sau giảm giá & cộng thuế). TUYỆT ĐỐI KHÔNG lấy tiền khách đưa hoặc tiền thối.

2. date: Ngày giao dịch ghi trên hóa đơn dưới dạng 'YYYY-MM-DD'. Nếu chỉ ghi ngày/tháng thì mặc định lấy năm 2026. Nếu không thấy ngày, trả về null.

3. merchant: Tên cửa hàng, thương hiệu hoặc đơn vị phát hành hóa đơn (VD: 'Phúc Long', 'WinMart', 'Highlands Coffee', 'Shopee', 'Circle K', 'Grab').

4. category: BẮT BUỘC chọn 1 danh mục khớp nhất trong các danh mục sau:
   - Chi tiêu: 'Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn', 'Giải trí', 'Sức khỏe', 'Giáo dục', 'Nhà cửa', 'Khác'
   - Thu nhập: 'Lương', 'Thưởng', 'Freelance', 'Được cho', 'Bán hàng', 'Đầu tư', 'Khác'

5. type: 'expense' (chi tiêu) hoặc 'income' (thu nhập). Mặc định là 'expense' cho đa số hóa đơn.

6. note: Ghi chú ngắn gọn (VD: tên cửa hàng hoặc mô tả 2-4 từ, không viết thành câu dài).`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER, description: 'Final total net amount paid or payable' },
          date: { type: Type.STRING, description: 'Transaction date in YYYY-MM-DD or null' },
          merchant: { type: Type.STRING, description: 'Store or brand name' },
          category: { type: Type.STRING, description: 'Exact matching category name from app list' },
          type: { type: Type.STRING, enum: ['expense', 'income'], description: 'Transaction type' },
          note: { type: Type.STRING, description: 'Short note or merchant name' },
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: 'Empty AI response' });
      }

      const parsedData = JSON.parse(responseText);
      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error('Gemini Receipt Analysis Error:', error);
      return res.status(500).json({
        error: error.message || 'Error processing receipt image',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'Fima Express Server' });
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
