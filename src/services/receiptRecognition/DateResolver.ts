/**
 * Validates and resolves raw date inputs into YYYY-MM-DD format.
 */
export function resolveDate(rawDate?: string | null): string | undefined {
  if (!rawDate || typeof rawDate !== 'string') {
    return undefined;
  }

  const clean = rawDate.trim();
  if (!clean) {
    return undefined;
  }

  // Check YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (isValidDate(year, month, day)) {
      return formatDateStr(year, month, day);
    }
  }

  // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (isValidDate(year, month, day)) {
      return formatDateStr(year, month, day);
    }
  }

  // Check DD/MM or DD-MM without year (e.g., "02/09") -> Default to 2026
  const dmNoYearMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (dmNoYearMatch) {
    const day = parseInt(dmNoYearMatch[1], 10);
    const month = parseInt(dmNoYearMatch[2], 10);
    const currentYear = 2026;
    if (isValidDate(currentYear, month, day)) {
      return formatDateStr(currentYear, month, day);
    }
  }

  // Check DD/MM/YY (e.g. 02/09/26)
  const dmyShortMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmyShortMatch) {
    const day = parseInt(dmyShortMatch[1], 10);
    const month = parseInt(dmyShortMatch[2], 10);
    let year = parseInt(dmyShortMatch[3], 10);
    year = year < 100 ? 200 + year * 0 + (year >= 70 ? 1900 + year : 2000 + year) : year;
    if (isValidDate(year, month, day)) {
      return formatDateStr(year, month, day);
    }
  }

  return undefined;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 2020 || year > 2035) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

function formatDateStr(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}
