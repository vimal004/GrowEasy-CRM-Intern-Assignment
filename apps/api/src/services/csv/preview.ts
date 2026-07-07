import { CSVMetadata } from '@groweasy/shared';
import { parseCsv } from './parser';
import { normalizeRecords } from './normalizer';

/**
 * Parses the CSV file buffer and returns the structural metadata and the first 15 rows
 * for rendering on the frontend.
 * 
 * @param fileBuffer The raw file buffer.
 * @param fileName The name of the file.
 * @param fileSize The size of the file in bytes.
 * @returns A promise resolving to metadata and preview rows.
 */
export async function generatePreview(
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<{ metadata: CSVMetadata; previewRows: Record<string, string>[] }> {
  // Parse all rows from the CSV
  const rawRows = await parseCsv(fileBuffer);
  const normalizedRows = normalizeRecords(rawRows);

  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const rowCount = normalizedRows.length;
  const columnCount = headers.length;

  const metadata: CSVMetadata = {
    fileName,
    fileSize,
    rowCount,
    columnCount,
    uploadTime: new Date().toISOString(),
    headers,
  };

  // Return the first 15 rows as the preview selection
  const previewRows = normalizedRows.slice(0, 15);

  return {
    metadata,
    previewRows,
  };
}
