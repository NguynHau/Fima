export interface CategoryResolveInput {
  merchant?: string | null;
  items?: Array<{ name?: string | null }> | string[] | null;
  rawText?: string | null;
  categoryEvidence?: Array<{ text?: string | null; type?: string | null }> | null;
}

export interface CategoryResolveResult {
  category: string;
  type: 'income' | 'expense';
  score: number;
  reason: string;
}

// Fixed Expense categories
export const EXPENSE_CATEGORIES = [
  'Ăn uống',
  'Di chuyển',
  'Mua sắm',
  'Hóa đơn',
  'Giải trí',
  'Sức khỏe',
  'Giáo dục',
  'Nhà cửa',
  'Khác',
] as const;

// Fixed Income categories
export const INCOME_CATEGORIES = [
  'Lương',
  'Thưởng',
  'Freelance',
  'Được cho',
  'Bán hàng',
  'Đầu tư',
  'Khác',
] as const;

interface CategoryRule {
  category: string;
  type: 'income' | 'expense';
  itemKeywords: string[];
  merchantKeywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Sức khỏe',
    type: 'expense',
    itemKeywords: [
      'thuoc', 'panadol', 'efferalgan', 'paracetamol', 'vitamin', 'khau trang', 'duoc',
      'so cuu', 'bang ca nhan', 'kham benh', 'xet nghiem', 'nha khoa', 'y te', 'sieu am',
      'chup x-quang', 'vac xin', 'siro', 'siro ho', 'thuoc ho', 'khang sinh'
    ],
    merchantKeywords: [
      'pharmacity', 'long chau', 'an nha', 'nha thuoc', 'phong kham', 'benh vien',
      'hospital', 'pharmacy', 'y te', 'duoc pham'
    ],
  },
  {
    category: 'Nhà cửa',
    type: 'expense',
    itemKeywords: [
      'nuoc lau san', 'nuoc giat', 'xa phong', 'bong den', 'dung cu sua', 'khan lau',
      'nuoc rua bat', 'nuoc rua chen', 'choi', 'moc treo', 'noi that', 'ban ghe', 'tu ao',
      'tu lanh', 'tu bep', 'do gia dung', 'phich cam', 'o dien', 'son nha', 'sua nha',
      'sua chua', 'o khoa', 'dieu hoa', 'may giat', 'khan giat'
    ],
    merchantKeywords: [
      'noi that', 'gia dung', 'dien may xanh', 'sua chua nha', 'dien may'
    ],
  },
  {
    category: 'Ăn uống',
    type: 'expense',
    itemKeywords: [
      'ca phe', 'coffee', 'tra sua', 'tra', 'banh', 'com', 'pho', 'bun', 'lau', 'nuong',
      'pizza', 'burger', 'ga ran', 'sua', 'sua tuoi', 'thit', 'thit heo', 'rau', 'ca', 'tom',
      'trai cay', 'nuoc ngot', 'bia', 'ruou', 'haidilao', 'tokbokki', 'sushi', 'buffet',
      'mi', 'hu tieu', 'do an', 'thuc uong', 'che', 'tra xanh', 'sinh to', 'nuoc ep'
    ],
    merchantKeywords: [
      'phuc long', 'highlands', 'starbucks', 'the coffee house', 'katinat', 'koi the',
      'kfc', 'lotteria', 'jollibee', 'mcdonald', 'domino', 'mixue', 'ding tea', 'gong cha',
      'tocotoco', 'nha hang', 'quan an', 'quan ca phe', 'tiem banh', 'quan com', 'haidilao'
    ],
  },
  {
    category: 'Di chuyển',
    type: 'expense',
    itemKeywords: [
      'xang', 'dau', 'petrolimex', 've xe', 've tau', 've may bay', 'cuoc di chuyen',
      'phi duong bo', 'gui xe', 'do xe', 'taxi', 'chuyen di', 'cuoc phi'
    ],
    merchantKeywords: [
      'grab', 'be', 'gojek', 'mai linh', 'vinasun', 'petrolimex', 'pvoil', 'vietjet',
      'vietnam airlines', 'bamboo', 'phuong trang', 'thanh buoi'
    ],
  },
  {
    category: 'Giải trí',
    type: 'expense',
    itemKeywords: [
      've xem phim', 'phim', 'bap nuoc', 'popcorn', 'karaoke', 'game', 'bida', 'bowling',
      've tham quan', 'trien lam', 'netflix', 'spotify', 'youtube premium', 'k+'
    ],
    merchantKeywords: [
      'cgv', 'lotte cinema', 'galaxy cinema', 'bhs cinema', 'cinestar', 'rap chieu phim'
    ],
  },
  {
    category: 'Hóa đơn',
    type: 'expense',
    itemKeywords: [
      'tien dien', 'tien nuoc', 'tien internet', 'truyen hinh', 'cuoc vien thong',
      'hoa don dien', 'hoa don nuoc', 'dien luc', 'cap nuoc'
    ],
    merchantKeywords: [
      'evn', 'dien luc', 'cap nuoc', 'viettel telecom', 'fpt telecom', 'vnpt'
    ],
  },
  {
    category: 'Giáo dục',
    type: 'expense',
    itemKeywords: [
      'hoc phi', 'khoa hoc', 'sach', 'vo', 'dung cu hoc tap', 'giao trinh', 'tien hoc'
    ],
    merchantKeywords: [
      'truong', 'truong dai hoc', 'trung tam ngoai ngu', 'nha sach', 'fahasa'
    ],
  },
  {
    category: 'Mua sắm',
    type: 'expense',
    itemKeywords: [
      'quan ao', 'giay', 'dep', 'tui xach', 'my pham', 'son', 'dien thoai', 'laptop',
      'tai nghe', 'phu kien', 'thoi trang', 'ao thun', 'ao so mi', 'quan jean'
    ],
    merchantKeywords: [
      'shopee', 'lazada', 'tiki', 'uniqlo', 'zara', 'h&m', 'the gioi di dong',
      'fpt shop', 'cellphones'
    ],
  },
  // Income
  {
    category: 'Lương',
    type: 'income',
    itemKeywords: ['luong', 'salary', 'payroll', 'thu nhap luong', 'chuyen luong'],
    merchantKeywords: ['payroll', 'cong ty', 'company'],
  },
  {
    category: 'Thưởng',
    type: 'income',
    itemKeywords: ['thuong', 'bonus', 'khen thuong'],
    merchantKeywords: ['khen thuong'],
  },
  {
    category: 'Freelance',
    type: 'income',
    itemKeywords: ['freelance', 'thu lao', 'du an', 'hop dong'],
    merchantKeywords: ['client', 'doi tac'],
  },
  {
    category: 'Được cho',
    type: 'income',
    itemKeywords: ['qua tang', 'li xi', 'duoc cho', 'bieu'],
    merchantKeywords: [],
  },
  {
    category: 'Bán hàng',
    type: 'income',
    itemKeywords: ['ban hang', 'doanh thu', 'tien hang'],
    merchantKeywords: [],
  },
  {
    category: 'Đầu tư',
    type: 'income',
    itemKeywords: ['lai', 'co tuc', 'chung khoan', 'tiet kiem', 'coin', 'crypto'],
    merchantKeywords: ['bank', 'ngan hang', 'vndirect', 'ssi'],
  },
];

const GENERIC_SUPERMARKET_MERCHANTS = [
  'winmart', 'lotte mart', 'coopmart', 'co.opmart', 'bach hoa xanh', 'circle k',
  'gs25', '7-eleven', 'mini stop', 'sieu thi', 'shopee', 'lazada', 'tiki'
];

function normalizeStr(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function matchesKw(text: string, kw: string): boolean {
  if (!text || !kw) return false;
  if (kw.length <= 3) {
    const regex = new RegExp(`(?:^|\\s|[^a-z0-9])${kw}(?:$|\\s|[^a-z0-9])`, 'i');
    return regex.test(text);
  }
  return text.includes(kw);
}

export function resolveCategory(input?: CategoryResolveInput | null): CategoryResolveResult {
  if (!input) {
    return {
      category: 'Khác',
      type: 'expense',
      score: 0.1,
      reason: 'No input provided, fallback to Khác',
    };
  }

  const merchantNorm = normalizeStr(input.merchant);
  const rawTextNorm = normalizeStr(input.rawText);

  let itemNamesNorm: string[] = [];
  if (Array.isArray(input.items)) {
    itemNamesNorm = input.items
      .map((item) => (typeof item === 'string' ? item : item?.name || ''))
      .filter((n) => n.trim().length > 0)
      .map((n) => normalizeStr(n));
  }

  const allItemsStr = itemNamesNorm.join(' ');

  let evidenceStr = '';
  if (Array.isArray(input.categoryEvidence)) {
    evidenceStr = input.categoryEvidence
      .map((e) => normalizeStr(e.text))
      .filter((t) => t.length > 0)
      .join(' ');
  }

  const isGenericMerchant = GENERIC_SUPERMARKET_MERCHANTS.some((m) => matchesKw(merchantNorm, m));

  const scores: Record<string, { score: number; type: 'income' | 'expense'; reason: string }> = {};

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    const matchReasons: string[] = [];

    // 1. Item matching (Highest Weight: +0.95)
    for (const kw of rule.itemKeywords) {
      if (matchesKw(allItemsStr, kw)) {
        score += 0.95;
        matchReasons.push(`item matched "${kw}"`);
        break;
      }
    }

    // 2. Merchant matching
    for (const kw of rule.merchantKeywords) {
      if (matchesKw(merchantNorm, kw)) {
        if (isGenericMerchant && rule.category === 'Ăn uống') {
          score += 0.55;
          matchReasons.push(`generic merchant matched "${kw}"`);
        } else if (isGenericMerchant && rule.category === 'Mua sắm') {
          score += 0.50;
          matchReasons.push(`generic e-commerce matched "${kw}"`);
        } else {
          score += 0.85;
          matchReasons.push(`merchant matched "${kw}"`);
        }
        break;
      }
    }

    // 3. AI Category Evidence matching
    for (const kw of rule.itemKeywords.concat(rule.merchantKeywords)) {
      if (matchesKw(evidenceStr, kw)) {
        score += 0.4;
        matchReasons.push(`evidence matched "${kw}"`);
        break;
      }
    }

    // 4. Raw text fallback keyword matching
    if (score < 0.5 && rawTextNorm) {
      for (const kw of rule.itemKeywords) {
        if (matchesKw(rawTextNorm, kw)) {
          score += 0.4;
          matchReasons.push(`raw text matched "${kw}"`);
          break;
        }
      }
    }

    if (score > 0) {
      scores[rule.category] = {
        score,
        type: rule.type,
        reason: matchReasons.join(', '),
      };
    }
  }

  let bestCategory = 'Khác';
  let bestType: 'income' | 'expense' = 'expense';
  let maxScore = 0;
  let bestReason = 'No strong category rules matched';

  for (const [cat, data] of Object.entries(scores)) {
    if (data.score > maxScore) {
      maxScore = data.score;
      bestCategory = cat;
      bestType = data.type;
      bestReason = data.reason;
    }
  }

  if (maxScore < 0.45) {
    return {
      category: 'Khác',
      type: 'expense',
      score: 0.2,
      reason: `Best candidate "${bestCategory}" score (${maxScore.toFixed(2)}) below threshold 0.45`,
    };
  }

  return {
    category: bestCategory,
    type: bestType,
    score: Math.min(maxScore, 0.99),
    reason: `Selected "${bestCategory}" (${bestType}): ${bestReason}`,
  };
}
