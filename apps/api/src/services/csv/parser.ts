import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { CSVError } from '../../utils/errors';
import { logger } from '../../config/logger';

/**
 * Parses a CSV file buffer and returns an array of raw records as key-value pairs.
 * Each key is a column header, and the value is the row's value for that column.
 * 
 * @param csvBuffer The raw buffer of the uploaded CSV file.
 * @returns A promise resolving to an array of raw record objects.
 */
export function parseCsv(csvBuffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];
    const stream = Readable.from(csvBuffer);

    stream
      .pipe(
        csvParser({
          // Map headers to trim spaces and remove outer quotes
          mapHeaders: ({ header }) => header.trim().replace(/^["']|["']$/g, ''),
          // Skip empty lines gracefully
          skipLines: 0,
        })
      )
      .on('data', (data) => {
        // Clean values of outer quotes and trim spaces
        const cleanedRow: Record<string, string> = {};
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'string') {
            cleanedRow[key] = val.trim().replace(/^["']|["']$/g, '');
          } else {
            cleanedRow[key] = String(val);
          }
        }
        results.push(cleanedRow);
      })
      .on('end', () => {
        logger.debug(`CSV parsing completed. Total parsed rows: ${results.length}`);
        resolve(results);
      })
      .on('error', (err) => {
        logger.error('CSV parser stream error:', err);
        reject(new CSVError(`Failed to parse CSV: ${err.message}`));
      });
  });
}
