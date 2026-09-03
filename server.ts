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

  // Helper for resilient Gemini calls: uses gemini-3.1-flash-lite (fast & robust) with fallback to gemini-3.8-flash
  async function generateWithFallback(ai: GoogleGenAI, params: any) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: 'gemini-3.1-flash-lite',
      });
    } catch (err: any) {
      console.warn('gemini-3.1-flash-lite failed, falling back to gemini-3.8-flash:', err?.message || err);
      return await ai.models.generateContent({
        ...params,
        model: 'gemini-3.8-flash',
      });
    }
  }

  // API endpoint for receipt vision analysis via Gemini AI
  app.post('/api/receipt/analyze', async (req, res) => {
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

      const prompt = `
You are a highly advanced Financial Reasoning AI Engine for Fima.
Today's Date: ${currentDate}
User's Categories: ${userCategories.join(', ')}
Recent Pattern Context:
${recentHistory}

Analyze the receipt image carefully.
STAGE 1: Visual extraction of ALL text.
STAGE 2: Semantic understanding (distinguish Total vs Subtotal vs Cash Given).
STAGE 3: Financial extraction with validation.
STAGE 4: Category reasoning based on merchant, items, and user history.

RETURN ONLY VALID JSON.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          transactionType: { type: Type.STRING, enum: ['expense', 'income', 'transfer', 'debt', 'unknown'] },
          amount: { type: Type.NUMBER },
          merchant: { type: Type.STRING },
          date: { type: Type.STRING, description: 'YYYY-MM-DD' },
          time: { type: Type.STRING, description: 'HH:mm:ss' },
          address: { type: Type.STRING },
          invoiceCode: { type: Type.STRING },
          currency: { type: Type.STRING },
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
        required: ['transactionType', 'amount', 'confidence'],
      };

      const response = await generateWithFallback(ai, {
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
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: 'Empty AI response' });
      }

      const result = JSON.parse(responseText);

      // Final Backend Validation logic
      if (result.financials) {
        const { subtotal = 0, tax = 0, serviceFee = 0, discount = 0, total = 0 } = result.financials;
        const expectedTotal = (subtotal || 0) + (tax || 0) + (serviceFee || 0) - (discount || 0);
        if (total > 0 && Math.abs(expectedTotal - total) > 100) {
          result.warnings = result.warnings || [];
          result.warnings.push(`Amount mismatch: Subtotal(${subtotal}) + Tax(${tax}) + Fee(${serviceFee}) - Discount(${discount}) = ${expectedTotal}, but Total is ${total}`);
        }
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Gemini AI Analysis Error:', error);
      return res.status(500).json({
        error: error.message || 'Error processing request',
      });
    }
  });

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

      const response = await generateWithFallback(ai, {
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
You are the Fima AI Financial Assistant (Trợ lý tài chính cá nhân thông minh của ứng dụng Fima). 
Answer the user's question based on their REAL transaction data below.
Today's Date: ${currentDate}
User's Categories: ${userCategories.join(', ')}

TRANSACTION DATA (up to last 100 transactions):
${JSON.stringify(transactions, null, 2)}

USER QUESTION: "${question}"

GUIDELINES:
1. Be concise, friendly, analytical, and supportive in Vietnamese.
2. Use real numbers from the data. Do NOT guess or hallucinate. Format monetary numbers nicely with 'đ' or 'VND'.
3. If they ask about spending, breakdown by category, highest expense, or time period accurately using provided data.
4. If there are no transactions or insufficient data, explain gently and suggest recording a few expenses to get personalized insights.
5. Provide helpful actionable financial advice or budgeting tips when appropriate.
`;

      const response = await generateWithFallback(ai, {
        contents: [{ text: prompt }],
        config: {
          temperature: 0.2,
        },
      });

      return res.json({
        success: true,
        data: { answer: response.text },
      });
    } catch (error: any) {
      console.error('AI Assistant Error:', error);
      return res.status(500).json({ error: error.message || 'Error processing AI question' });
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
