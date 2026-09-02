import { ReceiptRecognitionResult } from './ReceiptTypes';
import { parseLocalizedMoney } from './MoneyParser';
import { resolveAmount, RawCandidateInput } from './AmountResolver';
import { resolveCategory } from './CategoryResolver';
import { resolveDate } from './DateResolver';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/**
 * Parse raw OCR text lines into structured receipt fields for fallback OCR
 */
export function parseReceiptText(rawText: string): ReceiptRecognitionResult {
  if (!rawText || !rawText.trim()) {
    return {};
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. EXTRACT MERCHANT
  const merchant = extractMerchant(lines);

  // 2. EXTRACT CANDIDATES FOR AMOUNT RESOLVER
  const { candidates, subtotalVal, grandTotalVal, cashReceivedVal, changeVal } = parseCandidatesFromLines(lines);

  const amountRes = resolveAmount({
    financials: {
      subtotal: subtotalVal,
      grandTotal: grandTotalVal,
      cashReceived: cashReceivedVal,
      change: changeVal,
    },
    rawCandidates: candidates,
  });

  // 3. EXTRACT DATE
  const dateRaw = extractDateLine(lines);
  const date = resolveDate(dateRaw);

  // 4. RESOLVE CATEGORY
  const categoryRes = resolveCategory({
    merchant,
    rawText,
    items: lines,
  });

  const note = merchant ? merchant : '';

  return {
    amount: amountRes.amount,
    date,
    merchant,
    category: categoryRes.category,
    type: categoryRes.type,
    note,
    confidence: {
      amount: amountRes.confidence === 'high' ? 0.95 : amountRes.confidence === 'medium' ? 0.75 : 0.4,
      date: date ? 0.95 : 0.3,
      merchant: merchant ? 0.85 : 0.3,
      category: categoryRes.score,
      type: 0.95,
    },
    rawText,
  };
}

function parseCandidatesFromLines(lines: string[]): {
  candidates: RawCandidateInput[];
  subtotalVal?: number;
  grandTotalVal?: number;
  cashReceivedVal?: number;
  changeVal?: number;
} {
  const candidates: RawCandidateInput[] = [];
  let subtotalVal: number | undefined;
  let grandTotalVal: number | undefined;
  let cashReceivedVal: number | undefined;
  let changeVal: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNorm = normalizeText(line);

    // Extract numbers from line
    const parsedVal = parseLocalizedMoney(line);
    if (parsedVal && parsedVal >= 1000) {
      candidates.push({
        label: line,
        value: parsedVal,
        location: i < lines.length / 3 ? 'top' : i < (2 * lines.length) / 3 ? 'middle' : 'bottom',
      });

      if (lineNorm.includes('cong tien hang') || lineNorm.includes('subtotal')) {
        subtotalVal = parsedVal;
      } else if (lineNorm.includes('tong cong') || lineNorm.includes('phai tra') || lineNorm.includes('grand total')) {
        grandTotalVal = parsedVal;
      } else if (lineNorm.includes('tien khach dua') || lineNorm.includes('khach dua') || lineNorm.includes('cash')) {
        cashReceivedVal = parsedVal;
      } else if (lineNorm.includes('tien thoi') || lineNorm.includes('thoi lai') || lineNorm.includes('change')) {
        changeVal = parsedVal;
      }
    }
  }

  return {
    candidates,
    subtotalVal,
    grandTotalVal,
    cashReceivedVal,
    changeVal,
  };
}

function extractDateLine(lines: string[]): string | undefined {
  const dateRegexes = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
    /(\d{1,2})[\/\-\.](\d{1,2})/,
  ];

  for (const line of lines) {
    if (line.toLowerCase().includes('mst') || line.toLowerCase().includes('stk')) continue;

    for (const regex of dateRegexes) {
      const match = line.match(regex);
      if (match) {
        return match[0];
      }
    }
  }

  return undefined;
}

function extractMerchant(lines: string[]): string | undefined {
  const topLines = lines.slice(0, 6);

  const BRANDS = [
    'Phúc Long', 'Highlands', 'Starbucks', 'Lotte Mart', 'WinMart', 'Circle K', 'GS25',
    'Co.opmart', 'Bách Hóa Xanh', 'Pharmacity', 'Long Châu', 'CGV', 'KFC', 'Lotteria',
    'Jollibee', 'McDonald\'s', 'Shopee', 'Lazada', 'Tiki', 'Grab', 'Be', 'Gojek',
    'The Coffee House', 'Katinat', 'Koi Thé', 'Tocotoco', 'Mixue', '7-Eleven', 'Mini Stop',
    'FPT Shop', 'Thế Giới Di Động', 'Cellphones'
  ];

  for (const line of topLines) {
    for (const brand of BRANDS) {
      if (line.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }
  }

  for (const line of topLines) {
    const clean = line.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    const lineNorm = normalizeText(clean);
    if (
      clean.length >= 3 &&
      clean.length <= 40 &&
      !lineNorm.includes('hoa don') &&
      !lineNorm.includes('phieu') &&
      !lineNorm.includes('ngay') &&
      !lineNorm.includes('stk') &&
      !lineNorm.includes('mst') &&
      !lineNorm.includes('welcome')
    ) {
      return clean;
    }
  }

  return undefined;
}
