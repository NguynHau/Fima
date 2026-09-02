import { parseLocalizedMoney } from './MoneyParser';

export interface RawFinancialsInput {
  subtotal?: number | string | null;
  discount?: number | string | null;
  tax?: number | string | null;
  serviceCharge?: number | string | null;
  grandTotal?: number | string | null;
  amountDue?: number | string | null;
  cashReceived?: number | string | null;
  change?: number | string | null;
}

export interface RawCandidateInput {
  label?: string | null;
  value?: number | string | null;
  location?: 'top' | 'middle' | 'bottom' | 'unknown' | null;
}

export interface AmountResolutionInput {
  financials?: RawFinancialsInput | null;
  rawCandidates?: RawCandidateInput[] | null;
  items?: Array<{ name?: string | null; totalPrice?: number | string | null }> | null;
}

export interface AmountResolutionResult {
  amount?: number;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  reason: string;
}

// Explicit Final Total keywords (Highest priority among labels)
const FINAL_TOTAL_KEYWORDS = [
  'tong cong',
  'tong thanh toan',
  'phai tra',
  'can thanh toan',
  'grand total',
  'amount due',
  'total payment',
  'net total',
  'tong tien',
];

// Subtotal or Intermediate total keywords
const SUBTOTAL_KEYWORDS = [
  'thanh tien',
  'cong tien hang',
  'subtotal',
  'tien hang',
  'tong',
  'total',
];

const FORBIDDEN_LABEL_KEYWORDS = [
  'tien khach dua',
  'khach dua',
  'tien mat',
  'cash',
  'tendered',
  'tien thoi',
  'tien dua lai',
  'thoi lai',
  'change',
  'giam gia',
  'chiet khau',
  'discount',
  'vat',
  'thue',
  'tax',
  'don gia',
  'unit price',
  'so luong',
  'quantity',
  'mst',
  'so hdon',
  'dt:',
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

export function resolveAmount(input?: AmountResolutionInput | null): AmountResolutionResult {
  if (!input) {
    return {
      confidence: 'low',
      source: 'none',
      reason: 'No financial or candidate input provided',
    };
  }

  const fin = input.financials || {};
  const amountDue = parseLocalizedMoney(fin.amountDue);
  const grandTotal = parseLocalizedMoney(fin.grandTotal);
  const subtotal = parseLocalizedMoney(fin.subtotal);
  const discount = parseLocalizedMoney(fin.discount) || 0;
  const tax = parseLocalizedMoney(fin.tax) || 0;
  const serviceCharge = parseLocalizedMoney(fin.serviceCharge) || 0;
  const cashReceived = parseLocalizedMoney(fin.cashReceived);
  const change = parseLocalizedMoney(fin.change);

  // Calculate expected grand total from formula
  const calculatedFromSubtotal = subtotal && subtotal > 0
    ? subtotal - discount + tax + serviceCharge
    : null;

  // Calculate net paid from Cash - Change
  const calculatedFromCashChange = cashReceived && change && cashReceived > change
    ? cashReceived - change
    : null;

  // 1. Check Amount Due
  if (amountDue && amountDue > 0 && amountDue !== cashReceived && amountDue !== change) {
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let reason = 'Explicit amount due extracted.';

    if (calculatedFromSubtotal && Math.abs(calculatedFromSubtotal - amountDue) <= 100) {
      reason += ' Matches subtotal - discount + tax.';
    } else if (calculatedFromCashChange && Math.abs(calculatedFromCashChange - amountDue) <= 100) {
      reason += ' Matches cash received minus change.';
    }

    return {
      amount: amountDue,
      confidence,
      source: 'amountDue',
      reason,
    };
  }

  // 2. Check Grand Total
  if (grandTotal && grandTotal > 0 && grandTotal !== cashReceived && grandTotal !== change) {
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let reason = 'Explicit grand total extracted.';

    if (calculatedFromSubtotal && Math.abs(calculatedFromSubtotal - grandTotal) <= 100) {
      reason += ' Matches subtotal - discount + tax.';
    } else if (calculatedFromCashChange && Math.abs(calculatedFromCashChange - grandTotal) <= 100) {
      reason += ' Matches cash received minus change.';
    }

    return {
      amount: grandTotal,
      confidence,
      source: 'grandTotal',
      reason,
    };
  }

  // 3. Check Calculated Net from Cash Received minus Change
  if (calculatedFromCashChange && calculatedFromCashChange > 0) {
    return {
      amount: calculatedFromCashChange,
      confidence: 'medium',
      source: 'cash_minus_change',
      reason: `Calculated from Cash Received (${cashReceived}) minus Change (${change}).`,
    };
  }

  // 4. Check Candidates with explicit FINAL TOTAL labels first
  if (input.rawCandidates && input.rawCandidates.length > 0) {
    for (const candidate of input.rawCandidates) {
      const val = parseLocalizedMoney(candidate.value);
      const labelNorm = normalizeStr(candidate.label);

      if (!val || val <= 0) continue;

      const isForbidden = FORBIDDEN_LABEL_KEYWORDS.some((kw) => labelNorm.includes(kw));
      if (isForbidden) continue;
      if (val === cashReceived || val === change) continue;

      const isFinalTotal = FINAL_TOTAL_KEYWORDS.some((kw) => labelNorm.includes(kw));
      if (isFinalTotal) {
        return {
          amount: val,
          confidence: 'medium',
          source: 'final_total_labeled_candidate',
          reason: `Found monetary candidate with final total label: "${candidate.label}".`,
        };
      }
    }

    // Secondary pass: SUBTOTAL labels
    for (const candidate of input.rawCandidates) {
      const val = parseLocalizedMoney(candidate.value);
      const labelNorm = normalizeStr(candidate.label);

      if (!val || val <= 0) continue;

      const isForbidden = FORBIDDEN_LABEL_KEYWORDS.some((kw) => labelNorm.includes(kw));
      if (isForbidden) continue;
      if (val === cashReceived || val === change) continue;

      const isSubtotal = SUBTOTAL_KEYWORDS.some((kw) => labelNorm.includes(kw));
      if (isSubtotal) {
        return {
          amount: val,
          confidence: 'medium',
          source: 'subtotal_labeled_candidate',
          reason: `Found monetary candidate with subtotal label: "${candidate.label}".`,
        };
      }
    }
  }

  // 5. Check Calculated total from Subtotal
  if (calculatedFromSubtotal && calculatedFromSubtotal > 0 && calculatedFromSubtotal !== cashReceived) {
    return {
      amount: calculatedFromSubtotal,
      confidence: 'medium',
      source: 'calculated_subtotal',
      reason: `Calculated from Subtotal (${subtotal}) - Discount (${discount}) + Tax (${tax}) + Service (${serviceCharge}).`,
    };
  }

  // 6. Check Subtotal alone as fallback if no grandTotal exists
  if (subtotal && subtotal > 0 && subtotal !== cashReceived && subtotal !== change) {
    return {
      amount: subtotal,
      confidence: 'medium',
      source: 'subtotal_fallback',
      reason: 'Used subtotal as final total fallback.',
    };
  }

  // 7. Last resort: largest non-cash candidate
  if (input.rawCandidates && input.rawCandidates.length > 0) {
    let bestVal = 0;
    let bestLabel = '';

    for (const candidate of input.rawCandidates) {
      const val = parseLocalizedMoney(candidate.value);
      const labelNorm = normalizeStr(candidate.label);

      if (!val || val < 1000 || val > 1000000000) continue;
      if (val === cashReceived || val === change) continue;

      const isForbidden = FORBIDDEN_LABEL_KEYWORDS.some((kw) => labelNorm.includes(kw));
      if (isForbidden) continue;

      if (val > bestVal) {
        bestVal = val;
        bestLabel = candidate.label || '';
      }
    }

    if (bestVal > 0) {
      return {
        amount: bestVal,
        confidence: 'low',
        source: 'unlabeled_candidate_fallback',
        reason: `Picked largest non-cash candidate (${bestVal}) with label "${bestLabel}".`,
      };
    }
  }

  return {
    confidence: 'low',
    source: 'none',
    reason: 'Could not reliably resolve final payable transaction amount.',
  };
}
