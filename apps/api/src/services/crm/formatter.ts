import { logger } from '../../config/logger';

/**
 * Escapes newlines in a string (converting \r\n and \n to literal \n strings)
 * to prevent breaking CSV row integrity when exported.
 */
export function escapeLineBreaks(str: string): string {
  if (!str) return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\\n');
}

/**
 * Prevents CSV Formula Injection (Formula Injection) by prepending a single quote
 * if a string starts with characters Excel/Spreadsheets treat as formula indicators:
 * '=', '+', '-', '@'.
 */
export function escapeCsvInjection(str: string): string {
  if (!str) return '';
  const formulaChars = ['=', '+', '-', '@'];
  if (formulaChars.some((char) => str.startsWith(char))) {
    return `'${str}`;
  }
  return str;
}

/**
 * Standardizes a mobile phone number by stripping the country code if it is at the
 * start, and removing all non-numeric characters.
 * 
 * @param phone The raw phone number string.
 * @param countryCode The prefix country code (e.g. "+91" or "1").
 * @returns The cleaned mobile number without country code or special characters.
 */
export function cleanMobileNumber(phone: string, countryCode: string): string {
  if (!phone) return '';
  
  let cleaned = phone.trim();

  // Normalize the country code (remove leading + if it's there for prefix checking)
  const normCC = countryCode.replace(/\+/g, '').trim();
  const cleanCC = `+${normCC}`;

  if (cleaned.startsWith(cleanCC)) {
    cleaned = cleaned.substring(cleanCC.length).trim();
  } else if (cleaned.startsWith(normCC) && normCC.length > 0) {
    cleaned = cleaned.substring(normCC.length).trim();
  }

  // Remove all non-digits
  return cleaned.replace(/\D/g, '');
}

/**
 * Safe date parsing to ISO-8601 string.
 * Ensures new Date(created_at) is never an Invalid Date.
 * Handles DD/MM/YYYY and DD-MM-YYYY formats that Date.parse() can't handle natively.
 * If the input is truly invalid, returns the current ISO timestamp as a fallback.
 * 
 * @param dateStr Raw date string.
 * @returns Valid ISO-8601 date string.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  const trimmed = dateStr.trim();

  // 1. Try DD/MM/YYYY or DD-MM-YYYY (day > 12 confirms DD/MM order)
  const ddMmYyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (ddMmYyyyMatch) {
    const [, dayOrMonth, monthOrDay, year, timePart] = ddMmYyyyMatch;
    const a = parseInt(dayOrMonth, 10);
    const b = parseInt(monthOrDay, 10);

    // If first number > 12, it must be a day (DD/MM/YYYY)
    // If second number > 12, it must be a day (MM/DD/YYYY — standard US, Date.parse handles this)
    // If both ≤ 12, assume DD/MM/YYYY (non-US convention, common in India/Europe)
    if (a > 12 || (a <= 12 && b <= 12)) {
      // Treat as DD/MM/YYYY → rewrite to YYYY-MM-DD for reliable parsing
      const isoStr = `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}${timePart || ''}`;
      const parsed = Date.parse(isoStr);
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }
  }

  // 2. Standard Date.parse (handles ISO-8601, "May 15, 2026", "2026-05-13 14:20:48", etc.)
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  logger.warn(`Could not parse date "${dateStr}". Falling back to current time.`);
  return new Date().toISOString();
}
