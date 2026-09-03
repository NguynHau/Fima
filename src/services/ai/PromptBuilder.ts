
import { AIReceiptData } from './types';

export class PromptBuilder {
  static buildReceiptAnalysisPrompt(context: {
    currentDate: string;
    userCategories: string[];
    recentHistory: string;
  }): string {
    return `
You are a highly advanced Financial Reasoning AI Engine for an app named Fima. 
Your goal is to perform a multi-stage analysis of a receipt image to extract structured financial data with extreme precision and reasoning.

CURRENT CONTEXT:
- Today's Date: ${context.currentDate}
- User's Categories: ${context.userCategories.join(', ')}
- Recent Transaction Context (Merchant -> Category):
${context.recentHistory}

STAGE 1: Visual Extraction
Carefully read every piece of text on the receipt. Note all numbers, dates, labels, and store names.

STAGE 2: Semantic Understanding
Distinguish between labels.
- "Tổng cộng / Total / Grand Total / Thành tiền": The actual amount paid.
- "Tạm tính / Subtotal": Before tax/discount.
- "Khách đưa / Cash / Tendered": The amount the customer gave (NOT the transaction amount).
- "Tiền thối / Change": The amount returned to the customer.
- "VAT / Thuế": Tax amount.
- "Giảm giá / Chiết khấu / Discount": Discount amount.

STAGE 3: Financial Extraction
Extract the following fields. If a field is not present, use null.
- transactionType: 'expense', 'income', 'transfer', 'debt', or 'unknown'.
- amount: The final amount paid (Total).
- merchant: The name of the store/provider.
- date: The date of the transaction (YYYY-MM-DD). If missing, use today's date if appropriate, but flag it.
- time: The time of the transaction (HH:mm:ss).
- categorySuggestion: The most appropriate category from the user's list.
- paymentMethod: 'cash', 'card', 'momo', 'bank', etc.
- description: A brief summary of the purchase.
- items: A list of products with { name, quantity, unitPrice, totalPrice }.
- subtotal, discount, tax, serviceFee.

STAGE 4: Validation & Reasoning
Perform these checks:
1. Is Subtotal + Tax + ServiceFee - Discount = Total?
2. Is the 'amount' truly the Total and not 'Cash Given' or 'Change'?
3. Is the 'date' the transaction date or an expiry date?
4. merchant reasoning: Look for store names, logos, or addresses.

STAGE 5: Confidence Scoring
Assign a confidence score (0.0 to 1.0) for each key field: amount, merchant, date, category, paymentMethod, transactionType.

STAGE 6: Output Formatting
You MUST return ONLY a valid JSON object following this schema:
{
  "transactionType": "expense" | "income" | "transfer" | "debt" | "unknown",
  "amount": number,
  "merchant": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:mm:ss" | null,
  "categorySuggestion": string | null,
  "paymentMethod": string | null,
  "description": string,
  "items": [
    { "name": string, "quantity": number, "unitPrice": number, "totalPrice": number }
  ],
  "subtotal": number | null,
  "discount": number | null,
  "tax": number | null,
  "serviceFee": number | null,
  "total": number | null,
  "address": string | null,
  "invoiceCode": string | null,
  "currency": "VND",
  "confidence": {
    "amount": number,
    "merchant": number,
    "date": number,
    "category": number,
    "paymentMethod": number,
    "transactionType": number
  },
  "warnings": string[]
}

CRITICAL RULES:
- DO NOT HALLUCINATE. If it's not on the receipt, return null for that field.
- If there's a conflict in the math, put it in 'warnings'.
- For categorySuggestion, prioritize the User's Categories provided.
- If it's a Transfer (e.g. "Chuyển khoản từ ví sang bank"), set transactionType to 'transfer'.
- If it's Income (e.g. "Nhận lương", "Bonus"), set transactionType to 'income'.
    `;
  }

  static buildTextTransactionPrompt(text: string, context: {
    currentDate: string;
    userCategories: string[];
    recentHistory: string;
  }): string {
    return `
You are a Financial Reasoning AI. Convert the following natural language input into a structured transaction.
Input: "${text}"

Today's Date: ${context.currentDate}
User's Categories: ${context.userCategories.join(', ')}
Recent Patterns:
${context.recentHistory}

Return ONLY the JSON schema defined for receipts, but adapted for this text input.
    `;
  }
}
