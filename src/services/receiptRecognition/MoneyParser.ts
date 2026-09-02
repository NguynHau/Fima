/**
 * Parses Vietnamese and international localized currency strings / numbers into integer VND amounts.
 * Handles formats like:
 * - "88.000" -> 88000
 * - "1.250.000" -> 1250000
 * - "1,234,567" -> 1234567
 * - "88k" or "88 k" -> 88000
 * - "1.5tr" or "1,5tr" -> 1500000
 * - "88.000 đ" / "88,000 VND" / "88.000 ₫" -> 88000
 * - 88000 -> 88000
 */
export function parseLocalizedMoney(input: any): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input) || input <= 0) {
      return null;
    }
    return Math.round(input);
  }

  if (typeof input !== 'string') {
    return null;
  }

  let str = input.trim().toLowerCase();
  if (!str) {
    return null;
  }

  // Handle 'k' / 'kđ' (thousands) e.g., "88k", "88 k", "88.5k"
  const kMatch = str.match(/^([\d.,]+)\s*k(đ|d)?$/i);
  if (kMatch) {
    const rawNum = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000);
    }
  }

  // Handle 'tr' / 'm' (millions) e.g., "1.5tr", "1,5m"
  const trMatch = str.match(/^([\d.,]+)\s*(tr|m)(đ|d)?$/i);
  if (trMatch) {
    const rawNum = parseFloat(trMatch[1].replace(',', '.'));
    if (!isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000000);
    }
  }

  // Remove currency words / symbols
  str = str
    .replace(/(đ|₫|vnd|vndo|d|dola|usd|\$)/gi, '')
    .replace(/\s+/g, '')
    .trim();

  if (!str) {
    return null;
  }

  // Check if string contains both dots and commas (e.g. 1,250.00 or 1.250,00)
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastDot > lastComma) {
      // Format like 1,250,000.00 (dot is decimal, comma is thousands)
      const integerPart = str.substring(0, lastDot).replace(/,/g, '');
      const decimalPart = str.substring(lastDot + 1);
      const val = parseFloat(`${integerPart}.${decimalPart}`);
      return isNaN(val) ? null : Math.round(val);
    } else {
      // Format like 1.250.000,00 (comma is decimal, dot is thousands)
      const integerPart = str.substring(0, lastComma).replace(/\./g, '');
      const decimalPart = str.substring(lastComma + 1);
      const val = parseFloat(`${integerPart}.${decimalPart}`);
      return isNaN(val) ? null : Math.round(val);
    }
  }

  // Only dots or only commas or neither
  // Vietnamese standard: 88.000 or 1.250.000 (dots used for thousands)
  // Or English standard: 88,000 or 1,250,000 (commas used for thousands)
  if (/^\d{1,3}([.,]\d{3})+$/.test(str)) {
    // Pure thousands separator format, e.g. "88.000", "1.250.000", "1,250,000"
    const cleaned = str.replace(/[.,]/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? null : val;
  }

  // Handles simple decimals e.g., "88.5" or "88,5"
  if (/^\d+[.,]\d{1,2}$/.test(str)) {
    const normalizedDecimal = str.replace(',', '.');
    const val = parseFloat(normalizedDecimal);
    if (!isNaN(val) && val > 0) {
      // If value is small like 88.5 VND in context, if multiplied by 1000 or raw
      return val >= 1000 ? Math.round(val) : Math.round(val * 1000);
    }
  }

  // Fallback: strip all non-digits
  const digitsOnly = str.replace(/\D/g, '');
  if (!digitsOnly) {
    return null;
  }

  const val = parseInt(digitsOnly, 10);
  return isNaN(val) || val <= 0 ? null : val;
}
