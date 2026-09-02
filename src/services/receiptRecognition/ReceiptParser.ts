import { ReceiptRecognitionResult } from './ReceiptTypes';

// Clean text for normalization
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// Map keywords to existing categories in the app
const CATEGORY_MAP: Array<{ category: string; type: 'income' | 'expense'; keywords: string[] }> = [
  {
    category: 'Ăn uống',
    type: 'expense',
    keywords: [
      'phuc long', 'highlands', 'starbucks', 'coffee', 'ca phe', 'tra sua', 'kfc', 'lotteria',
      'jollibee', 'mcdonald', 'pho', 'quan an', 'com', 'nha hang', 'pizza', 'domino', 'food',
      'beverage', 'tokbokki', 'bbq', 'sushi', 'haidilao', 'mixue', 'ding tea', 'gong cha', 'the coffee house',
      'katina', 'koi the', 'tocotoco', 'che', 'banh mi', 'buffet', 'lẩu', 'nuoc uong'
    ],
  },
  {
    category: 'Di chuyển',
    type: 'expense',
    keywords: [
      'grab', 'be', 'gojek', 'mai linh', 'vinasun', 'taxi', 'xang', 'dau', 'petrolimex',
      've xe', 'bus', 'may bay', 'vietjet', 'vietnam airlines', 'bamboo', 'dinh muc xang', 'gui xe', 'do xe', 'phi duong bo', 'pua'
    ],
  },
  {
    category: 'Mua sắm',
    type: 'expense',
    keywords: [
      'lotte mart', 'winmart', 'circle k', 'gs25', 'coopmart', 'co.opmart', 'bach hoa xanh',
      'shopee', 'lazada', 'tiki', 'uniqlo', 'zara', 'hm', 'quan ao', 'thoi trang', 'giay',
      'my pham', 'dien may', 'the gioi di dong', 'fpt shop', 'cellphones', 'sieu thi', 'mini stop', '7-eleven'
    ],
  },
  {
    category: 'Sức khỏe',
    type: 'expense',
    keywords: [
      'pharmacity', 'long chau', 'an nha', 'benh vien', 'phong kham', 'thuoc', 'y te', 'nha khoa', 'xet nghiem', 'kham benh'
    ],
  },
  {
    category: 'Hóa đơn',
    type: 'expense',
    keywords: [
      'dien', 'nuoc', 'internet', 'viettel', 'vnpt', 'fpt telecom', 'hoa don', 'tien dien', 'tien nuoc', 'truyen hinh'
    ],
  },
  {
    category: 'Giải trí',
    type: 'expense',
    keywords: [
      'cgv', 'lotte cinema', 'galaxy cinema', 'karaoke', 'game', 'rap chieu phim', 'netflix', 'spotify', 'bida', 'bowling', 've xem phim'
    ],
  },
  {
    category: 'Giáo dục',
    type: 'expense',
    keywords: [
      'hoc phi', 'truong', 'khoa hoc', 'sach', 'nha sach', 'fahasa', 'tiki trading', 'hoc tap', 'dung cu hoc sinh'
    ],
  },
  {
    category: 'Nhà cửa',
    type: 'expense',
    keywords: [
      'noi that', 'sua nha', 'gia dung', 'tien nha', 'quan ly chung cu', 'vesinh'
    ],
  },
  // Income categories
  {
    category: 'Lương',
    type: 'income',
    keywords: ['luong', 'salary', 'payroll', 'thu nhap luong', 'chuyen luong'],
  },
  {
    category: 'Thưởng',
    type: 'income',
    keywords: ['thuong', 'bonus', 'khen thuong'],
  },
  {
    category: 'Freelance',
    type: 'income',
    keywords: ['freelance', 'thu lao', 'nhan hop dong', 'project'],
  },
  {
    category: 'Bán hàng',
    type: 'income',
    keywords: ['ban hang', 'doanh thu', 'tien hang nhận'],
  },
];

/**
 * Parse raw OCR text into structured receipt fields
 */
export function parseReceiptText(rawText: string): ReceiptRecognitionResult {
  if (!rawText || !rawText.trim()) {
    return {};
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const normText = normalizeText(rawText);

  // 1. EXTRACT AMOUNT
  const amount = extractAmount(lines, normText);

  // 2. EXTRACT DATE
  const date = extractDate(lines, rawText);

  // 3. EXTRACT MERCHANT & NOTE
  const merchant = extractMerchant(lines);
  const note = merchant ? merchant : '';

  // 4. EXTRACT TYPE & CATEGORY
  const { type, category } = extractTypeAndCategory(normText, merchant);

  return {
    amount,
    date,
    merchant,
    category,
    type,
    note,
    confidence: {
      amount: amount ? 0.9 : 0,
      date: date ? 0.95 : 0,
      merchant: merchant ? 0.85 : 0,
      category: category ? 0.85 : 0,
      type: 0.95,
    },
    rawText,
  };
}

/**
 * Extract total payment amount from receipt text lines
 */
function extractAmount(lines: string[], normText: string): number | undefined {
  const TOTAL_KEYWORDS = [
    'tong cong',
    'tong tien',
    'tong thanh toan',
    'phai tra',
    'thanh tien',
    'can thanh toan',
    'grand total',
    'total amount',
    'total',
    'tien mat',
    'cong tien hang',
    'tong',
    'thanh toan',
  ];

  // Search for lines containing total keywords
  for (let i = 0; i < lines.length; i++) {
    const lineNorm = normalizeText(lines[i]);
    const matchesKeyword = TOTAL_KEYWORDS.some((kw) => lineNorm.includes(kw));

    if (matchesKeyword) {
      // Look for numbers in current line or next line
      const numCurrent = parseNumberFromLine(lines[i]);
      if (numCurrent && numCurrent >= 1000) {
        return numCurrent;
      }

      if (i + 1 < lines.length) {
        const numNext = parseNumberFromLine(lines[i + 1]);
        if (numNext && numNext >= 1000) {
          return numNext;
        }
      }
    }
  }

  // Fallback: search all lines for largest realistic amount (e.g., between 1,000 and 500,000,000)
  let maxAmount = 0;
  for (const line of lines) {
    const num = parseNumberFromLine(line);
    if (num && num >= 1000 && num <= 500000000) {
      // Ignore numbers that look like dates (e.g. 20260902) or phone numbers
      if (num > maxAmount && !isDateOrPhone(num, line)) {
        maxAmount = num;
      }
    }
  }

  return maxAmount > 0 ? maxAmount : undefined;
}

function parseNumberFromLine(line: string): number | null {
  // Replace commas or dots used as thousands separators
  // Standard Vietnamese VND: 75.000 or 75,000 or 75000 or 75.000đ or 75k
  let clean = line.replace(/(đ|vnd|vndo|d|k)/gi, '').trim();

  // Match numbers like 75.000, 75,000, 1.250.000, 1250000
  const matches = clean.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,9})/g);
  if (matches && matches.length > 0) {
    // Get the last match on the line (usually the price column)
    const rawNum = matches[matches.length - 1];
    const numericStr = rawNum.replace(/[.,]/g, '');
    const val = parseInt(numericStr, 10);
    return isNaN(val) ? null : val;
  }
  return null;
}

function isDateOrPhone(num: number, line: string): boolean {
  // Avoid years like 2024, 2025, 2026
  if (num >= 2020 && num <= 2035) return true;
  // Avoid phone numbers or tax IDs starting with 0
  if (line.trim().startsWith('0') || line.toLowerCase().includes('mst') || line.toLowerCase().includes('dt:')) return true;
  return false;
}

/**
 * Extract date in YYYY-MM-DD format
 */
function extractDate(lines: string[], rawText: string): string | undefined {
  // Regex for DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY
  const dateRegexes = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // DD/MM/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/,   // DD/MM/YY
  ];

  for (const line of lines) {
    // Skip tax numbers or phone lines if they match accidentally
    if (line.toLowerCase().includes('mst') || line.toLowerCase().includes('stk')) continue;

    for (const regex of dateRegexes) {
      const match = line.match(regex);
      if (match) {
        let year: number, month: number, day: number;

        if (match[1].length === 4) {
          // YYYY-MM-DD
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          day = parseInt(match[3], 10);
        } else {
          // DD/MM/YYYY or DD/MM/YY
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
          if (year < 100) year += 2000;
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2035) {
          const mStr = month.toString().padStart(2, '0');
          const dStr = day.toString().padStart(2, '0');
          return `${year}-${mStr}-${dStr}`;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract store / merchant name from top lines of receipt
 */
function extractMerchant(lines: string[]): string | undefined {
  // Look at first 5 lines
  const topLines = lines.slice(0, 6);

  // Known brand strings (case insensitive)
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

  // If no known brand found, pick first clean line that isn't metadata
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

/**
 * Determine type (expense / income) and best matching category
 */
function extractTypeAndCategory(normText: string, merchant?: string): { type: 'income' | 'expense'; category: string } {
  // Check if merchant matches
  const textToSearch = (merchant ? normalizeText(merchant) + ' ' : '') + normText;

  for (const item of CATEGORY_MAP) {
    for (const kw of item.keywords) {
      if (textToSearch.includes(kw)) {
        return { type: item.type, category: item.category };
      }
    }
  }

  // Fallback default
  return { type: 'expense', category: 'Khác' };
}
