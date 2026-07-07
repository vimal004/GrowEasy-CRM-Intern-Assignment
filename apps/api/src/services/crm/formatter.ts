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
 * If the input is invalid, returns the current ISO timestamp as a fallback.
 * 
 * @param dateStr Raw date string.
 * @returns Valid ISO-8601 date string.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  const parsed = Date.parse(dateStr.trim());
  if (isNaN(parsed)) {
    logger.warn(`Could not parse date "${dateStr}". Falling back to current time.`);
    return new Date().toISOString();
  }

  return new Date(parsed).toISOString();
}
