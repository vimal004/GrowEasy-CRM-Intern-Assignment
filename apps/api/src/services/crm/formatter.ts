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
 * Ensures `new Date(created_at)` is never an Invalid Date.
 *
 * ## Parsing order
 * 1. Epoch millisecond/second timestamps (pure digit strings).
 * 2. Slash/dash/dot-separated numeric dates (`DD/MM/YYYY`, `MM/DD/YYYY`, etc.) —
 *    see the **Ambiguity note** below.
 * 3. Anything else via `Date.parse()` — handles ISO-8601, RFC 2822, natural
 *    language like "May 15, 2026", SQL timestamps like "2026-05-13 14:20:48", etc.
 * 4. If all strategies fail, returns the current ISO timestamp as a safe fallback.
 *
 * ## Ambiguity note: DD/MM/YYYY vs MM/DD/YYYY
 * When both the first and second numeric components are ≤ 12 (e.g. `05/06/2026`),
 * there is no way to determine the format from the data alone. This implementation
 * **assumes DD/MM/YYYY** (day first), which is the dominant convention in India,
 * Europe, and most of Asia — matching the GrowEasy CRM's primary user base.
 *
 * ⚠️  If your CSV source uses the US MM/DD/YYYY convention, pre-process dates
 *     to ISO-8601 (YYYY-MM-DD) before import to avoid silent mis-parsing.
 *
 * When the first component is > 12 (e.g. `13/05/2026`), it is unambiguously a
 * day — DD/MM/YYYY is used. When the second component is > 12 (e.g. `05/13/2026`),
 * it is unambiguously a day — MM/DD/YYYY is used and `Date.parse` handles it.
 *
 * @param dateStr Raw date string from the CSV.
 * @returns Valid ISO-8601 date string.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  const trimmed = dateStr.trim();

  // 1. Check for epoch millisecond timestamp (only digits, 10 or 13 digits)
  if (/^\d+$/.test(trimmed)) {
    const epoch = parseInt(trimmed, 10);
    const dateObj = new Date(epoch);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }

  // 2. Try DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY patterns.
  //    Captures optional trailing time component (e.g. " 14:20:48").
  const ddMmYyyyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(.*)$/);
  if (ddMmYyyyMatch) {
    const [, dayOrMonth, monthOrDay, year, timePart] = ddMmYyyyMatch;
    const a = parseInt(dayOrMonth, 10);
    const b = parseInt(monthOrDay, 10);

    if (a > 12) {
      // Unambiguous: first component > 12 → must be day (DD/MM/YYYY)
      const isoStr = `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}${timePart || ''}`;
      const parsed = Date.parse(isoStr);
      if (!isNaN(parsed)) return new Date(parsed).toISOString();
    } else if (b > 12) {
      // Unambiguous: second component > 12 → must be day (MM/DD/YYYY)
      // Rewrite to YYYY-MM-DD for reliable ISO parsing
      const isoStr = `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}${timePart || ''}`;
      const parsed = Date.parse(isoStr);
      if (!isNaN(parsed)) return new Date(parsed).toISOString();
    } else {
      // Ambiguous (both ≤ 12): assume DD/MM/YYYY — see JSDoc Ambiguity note above.
      const isoStr = `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}${timePart || ''}`;
      const parsed = Date.parse(isoStr);
      if (!isNaN(parsed)) return new Date(parsed).toISOString();
    }
  }

  // 3. Standard Date.parse (handles ISO-8601, "May 15, 2026", "2026-05-13 14:20:48", etc.)
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  logger.warn(`Could not parse date "${dateStr}". Falling back to current time.`);
  return new Date().toISOString();
}

