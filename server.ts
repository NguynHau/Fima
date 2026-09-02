import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { resolveAmount } from './src/services/receiptRecognition/AmountResolver';
import { resolveCategory } from './src/services/receiptRecognition/CategoryResolver';
import { resolveDate } from './src/services/receiptRecognition/DateResolver';
import { RawReceiptExtraction } from './src/services/receiptRecognition/ReceiptTypes';

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

      const { imageBase64, mimeType, attempt = 1 } = req.body || {};
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 input' });
      }

      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const ai = new GoogleGenAI({ apiKey });

      const prompt = attempt === 2
        ? `RETRY ATTEMPT: Focus exclusively on identifying the final payable total amount and detailed item evidence from this receipt.
Do not guess or confuse item prices, subtotal, discount, VAT, or cash received. Inspect all totals carefully.`
        : `You are a specialized financial document analyzer for the Fima expense tracker app.
Inspect the ENTIRE receipt image carefully and extract all raw structured values.

CRITICAL INSTRUCTIONS FOR FINANCIAL NUMBERS:
1. Do not guess the final transaction amount from arbitrary numbers.
2. Identify all monetary candidates and their exact surrounding labels.
3. Distinguish clearly between:
   - Individual item prices & unit prices
   - Quantities
   - Subtotal (Tổng tiền hàng / Cộng tiền hàng)
   - Discounts & vouchers (Giảm giá / Chiết khấu)
   - Taxes & VAT (Thuế GTGT / VAT)
   - Service charges / Fees
   - Grand Total / Amount Due / Total Payment (TỔNG CỘNG / TỔNG THÀNH TOÁN / TỔNG TIỀN / PHẢI TRẢ / THÀNH TIỀN)
   - Cash Received / Tendered (Tiền khách đưa / Tiền mặt)
   - Change (Tiền thối / Tiền trả lại)
4. If both Cash Received and Change are listed, do NOT set either as the transaction amount.
5. Identify all items purchased with clean item names and total prices.
6. Extract merchant/store name and date (YYYY-MM-DD or DD/MM/YYYY).
7. Extract category evidence keywords from store name and purchased items.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          documentType: { type: Type.STRING, enum: ['receipt', 'invoice', 'bill', 'unknown'] },
          merchant: { type: Type.STRING, description: 'Store, brand, or issuer name' },
          date: { type: Type.STRING, description: 'Transaction date in YYYY-MM-DD or DD/MM/YYYY format' },
          currency: { type: Type.STRING, description: 'Currency symbol or code e.g. VND' },
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
              subtotal: { type: Type.NUMBER, description: 'Subtotal before discounts/taxes' },
              discount: { type: Type.NUMBER, description: 'Discount amount subtracted' },
              tax: { type: Type.NUMBER, description: 'VAT or tax added' },
              serviceCharge: { type: Type.NUMBER, description: 'Service charge or fee added' },
              grandTotal: { type: Type.NUMBER, description: 'Final grand total amount' },
              amountDue: { type: Type.NUMBER, description: 'Final net amount due/payable' },
              cashReceived: { type: Type.NUMBER, description: 'Cash or money tendered by customer' },
              change: { type: Type.NUMBER, description: 'Change returned to customer' },
            },
          },
          paymentMethod: { type: Type.STRING },
          rawCandidates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.NUMBER },
                location: { type: Type.STRING, enum: ['top', 'middle', 'bottom', 'unknown'] },
              },
            },
          },
          categoryEvidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['merchant', 'item', 'keyword'] },
                confidence: { type: Type.NUMBER },
              },
            },
          },
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

      const rawExtraction: RawReceiptExtraction = JSON.parse(responseText);

      // Backend Deterministic Pipeline
      const amountRes = resolveAmount({
        financials: rawExtraction.financials,
        rawCandidates: rawExtraction.rawCandidates,
        items: rawExtraction.items,
      });

      const categoryRes = resolveCategory({
        merchant: rawExtraction.merchant,
        items: rawExtraction.items,
        categoryEvidence: rawExtraction.categoryEvidence,
      });

      const dateRes = resolveDate(rawExtraction.date);

      // Backend Debug Logs
      console.log('==================================================');
      console.log('[Receipt AI Raw Extraction]');
      console.log('merchant:', rawExtraction.merchant);
      console.log('items:', rawExtraction.items?.map((i) => `${i.name} (${i.totalPrice})`).join(', '));
      console.log('subtotal:', rawExtraction.financials?.subtotal);
      console.log('discount:', rawExtraction.financials?.discount);
      console.log('tax:', rawExtraction.financials?.tax);
      console.log('grandTotal:', rawExtraction.financials?.grandTotal);
      console.log('amountDue:', rawExtraction.financials?.amountDue);
      console.log('cashReceived:', rawExtraction.financials?.cashReceived);
      console.log('change:', rawExtraction.financials?.change);

      console.log('\n[Amount Resolver]');
      console.log('selected:', amountRes.amount);
      console.log('source:', amountRes.source);
      console.log('confidence:', amountRes.confidence);
      console.log('reason:', amountRes.reason);

      console.log('\n[Category Resolver]');
      console.log('selected:', categoryRes.category);
      console.log('type:', categoryRes.type);
      console.log('score:', categoryRes.score);
      console.log('reason:', categoryRes.reason);
      console.log('==================================================');

      return res.json({
        success: true,
        data: {
          amount: amountRes.amount,
          date: dateRes,
          merchant: rawExtraction.merchant || undefined,
          category: categoryRes.category,
          type: categoryRes.type,
          note: rawExtraction.merchant ? rawExtraction.merchant : (rawExtraction.items?.[0]?.name || undefined),
          confidence: {
            amount: amountRes.confidence === 'high' ? 0.98 : amountRes.confidence === 'medium' ? 0.75 : 0.4,
            category: categoryRes.score,
            merchant: rawExtraction.merchant ? 0.9 : 0.4,
            date: dateRes ? 0.95 : 0.4,
            type: 0.95,
          },
        },
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
