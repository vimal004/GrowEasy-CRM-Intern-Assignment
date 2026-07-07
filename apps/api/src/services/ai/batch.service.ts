import { logger } from '../../config/logger';

/**
 * Splits an array of items into smaller chunks of a specified size.
 * 
 * @param array The source array.
 * @param size The maximum size of each chunk.
 * @returns An array of chunks.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Coordinates sequential execution of batches, collecting statistics and logging progress.
 * 
 * @param records All records to process.
 * @param batchSize The number of records in each batch.
 * @param processBatch Callback to process a single batch of records.
 * @returns A promise resolving to an array of results from all batches.
 */
export async function processInBatches<T, R>(
  records: T[],
  batchSize: number,
  processBatch: (batch: T[], batchIndex: number, totalBatches: number) => Promise<R[]>
): Promise<R[]> {
  const batches = chunkArray(records, batchSize);
  const totalBatches = batches.length;
  
  logger.info(`[BatchService] Splitting ${records.length} records into ${totalBatches} batches (batch size: ${batchSize}).`);

  const allResults: R[] = [];
  const start = Date.now();

  for (let i = 0; i < totalBatches; i++) {
    const batchIndex = i + 1;
    logger.info(`[BatchService] Processing batch ${batchIndex}/${totalBatches} (${batches[i].length} records)...`);
    
    const batchStart = Date.now();
    try {
      const batchResults = await processBatch(batches[i], batchIndex, totalBatches);
      allResults.push(...batchResults);
      
      const latency = Date.now() - batchStart;
      logger.debug(`[BatchService] Batch ${batchIndex}/${totalBatches} completed in ${latency}ms.`);
    } catch (err: any) {
      logger.error(`[BatchService] Batch ${batchIndex}/${totalBatches} failed:`, err);
      // Re-throw so the pipeline registers the error
      throw err;
    }
  }

  const duration = Date.now() - start;
  logger.info(`[BatchService] Completed batch processing for all ${totalBatches} batches in ${duration}ms.`);
  return allResults;
}
