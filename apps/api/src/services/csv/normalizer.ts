/**
 * Normalizes a raw CSV record's keys and values by trimming whitespace
 * and removing empty columns.
 * 
 * @param rawRecord Key-value pairs representing a single CSV row.
 * @returns A standardized record with cleaned keys and values.
 */
export function normalizeRecord(rawRecord: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, val] of Object.entries(rawRecord)) {
    const cleanKey = key.trim();
    if (cleanKey === '') continue; // Skip columns with empty headers
    
    normalized[cleanKey] = (val || '').trim();
  }

  return normalized;
}

/**
 * Batch-normalizes an array of raw CSV records.
 * 
 * @param rawRecords Array of raw CSV records.
 * @returns Array of normalized CSV records.
 */
export function normalizeRecords(rawRecords: Record<string, string>[]): Record<string, string>[] {
  return rawRecords.map(normalizeRecord);
}
