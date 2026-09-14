export const currencyConfig = {
  currency: 'VND' as 'VND' | 'USD',
  exchangeRate: 25400,
};

/**
 * Formats a number as Vietnamese Dong (VND) or US Dollars (USD) dynamically
 * Supports negative numbers cleanly (e.g. -85000 -> −85.000 ₫ or -3.34 $)
 * Example: 85000 -> 85.000 ₫ (VND) or $3.35 (USD)
 */
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currencyConfig.currency === 'USD' ? '$0.00' : '0 ₫';
  }
  if (currencyConfig.currency === 'USD') {
    const usdAmount = amount / currencyConfig.exchangeRate;
    const isNegative = usdAmount < 0;
    const abs = Math.abs(usdAmount);
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNegative ? `−$${formatted}` : `$${formatted}`;
  }
  const isNegative = Math.round(amount) < 0;
  const formatted = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `−${formatted} ₫` : `${formatted} ₫`;
}

/**
 * Format signed currency dynamically
 * Example: formatSignedVND(85000, 'expense') -> −85.000 ₫ or −$3.35
 */
export function formatSignedVND(amount: number, type: 'income' | 'expense' | 'net'): string {
  if (currencyConfig.currency === 'USD') {
    const usdAmount = amount / currencyConfig.exchangeRate;
    const absFormatted = Math.abs(usdAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedWithSign = `$${absFormatted}`;
    if (amount === 0) return `$0.00`;
    if (type === 'expense') return `−${formattedWithSign}`;
    if (type === 'income') return `+${formattedWithSign}`;
    return usdAmount > 0 ? `+${formattedWithSign}` : `−${formattedWithSign}`;
  }
  const absFormatted = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
  if (amount === 0) return absFormatted;
  if (type === 'expense') return `−${absFormatted}`;
  if (type === 'income') return `+${absFormatted}`;
  return amount > 0 ? `+${absFormatted}` : `−${absFormatted}`;
}

/**
 * Compact currency formatting for small calendar badges
 * Example: 500000 -> 500k (VND) or $19.65 (USD)
 */
export function formatCompactVND(amount: number): string {
  if (currencyConfig.currency === 'USD') {
    const usdAmount = amount / currencyConfig.exchangeRate;
    const abs = Math.abs(usdAmount);
    const sign = usdAmount < 0 ? '−' : '';
    if (abs >= 1_000_000) {
      const val = (abs / 1_000_000).toFixed(1).replace('.0', '');
      return `${sign}$${val}M`;
    }
    if (abs >= 1_000) {
      const val = (abs / 1_000).toFixed(1).replace('.0', '');
      return `${sign}$${val}K`;
    }
    const val = abs.toFixed(2).replace('.00', '');
    return `${sign}$${val}`;
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(1).replace('.0', '');
    return `${sign}${val}tỷ`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace('.0', '');
    return `${sign}${val}tr`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(0);
    return `${sign}${val}k`;
  }
  return `${sign}${abs}`;
}

/**
 * Formats a cash flow difference as kđ (VND) or $ (USD)
 */
export function formatFlowDiff(amount: number): string {
  if (amount === 0) return currencyConfig.currency === 'USD' ? '$0' : '0kđ';
  if (currencyConfig.currency === 'USD') {
    const usdAmount = amount / currencyConfig.exchangeRate;
    const isNegative = usdAmount < 0;
    const abs = Math.abs(usdAmount);
    const sign = isNegative ? '−' : '+';
    let valStr = '';
    if (abs >= 1000) {
      valStr = (abs / 1000).toFixed(2) + 'k';
    } else {
      valStr = abs.toFixed(2).replace('.00', '');
    }
    return `${sign}$${valStr}`;
  }
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const inK = Math.round(abs / 1000);
  const formatted = inK.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = isNegative ? '−' : '+';
  return `${sign}${formatted}kđ`;
}

/**
 * Formats a date string (YYYY-MM-DD) to Vietnamese standard DD/MM/YYYY
 * Example: 2026-09-02 -> 02/09/2026
 */
export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

import { languageConfig } from './translations';

/**
 * Formats a full readable Vietnamese or English date
 * Example: Thứ Tư, 02/09/2026 or Wednesday, 02/09/2026
 */
export function formatFullDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (languageConfig.language === 'en') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateObj.getDay()];
    return `${dayName}, ${formatDateVN(dateStr)}`;
  } else {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[dateObj.getDay()];
    return `${dayName}, ${formatDateVN(dateStr)}`;
  }
}

/**
 * Formats Month Header
 * Example: 2026, 9 -> Tháng 9, 2026 or September 2026
 */
export function formatMonthVN(year: number, month: number): string {
  if (languageConfig.language === 'en') {
    const enMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${enMonths[month - 1]} ${year}`;
  }
  return `Tháng ${month}, ${year}`;
}

/**
 * Gets today's date in YYYY-MM-DD format based on local time
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses numeric input string into positive number
 */
export function parseAmountInput(input: string): number {
  const clean = input.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

/**
 * Shifts a YYYY-MM-DD date string by a given number of days (+1 or -1)
 */
export function shiftDateString(dateStr: string, daysOffset: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + daysOffset);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO timestamp or date string into HH:mm in local time
 * Example: "2026-09-06T14:35:00.000Z" -> "14:35"
 */
export function formatTimeVN(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}
