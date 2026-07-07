import { Request, Response, NextFunction } from 'express';
import { validateCsvUpload } from '../validators/upload.validator';
import { generatePreview } from '../services/csv/preview';
import { parseCsv } from '../services/csv/parser';
import { runImportPipeline } from '../services/ai/ai.service';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { TooManyRecordsError, GatewayTimeoutError } from '../utils/errors';

/**
 * Handles CSV Upload Preview request.
 * Parses the CSV file headers and returns the first 15 rows for rendering.
 */
export async function handleUploadPreview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const start = Date.now();
  try {
    validateCsvUpload(req.file);
    const file = req.file!;

    logger.info(`[UploadController] Parsing preview for file: ${file.originalname} (${file.size} bytes).`);

    const preview = await generatePreview(file.buffer, file.originalname, file.size);
    const duration = Date.now() - start;

    logger.info(`[UploadController] Preview generated successfully in ${duration}ms.`);
    
    res.status(200).json(preview);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles CSV Import request.
 * Parses the CSV and runs the AI pipeline, returning the final CRM Lead records and statistics.
 *
 * Guards:
 * 1. Max records: Rejects imports exceeding config.maxRecords (default 2000) with HTTP 422.
 * 2. Request timeout: Fires a 504 GatewayTimeoutError if processing approaches
 *    the platform's connection timeout (config.requestTimeoutMs, default 28 000 ms).
 */
export async function handleImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const start = Date.now();

  // ─── Set up a hard timeout to avoid the Render 30s gateway timeout ────────────
  // If the AI pipeline is still running at requestTimeoutMs we abort early and
  // return a 504 so the client gets a meaningful error instead of a bare TCP reset.
  let timeoutFired = false;
  const timeoutHandle = setTimeout(() => {
    timeoutFired = true;
    logger.error(
      `[UploadController] Request timeout after ${config.requestTimeoutMs}ms. ` +
      `Returning 504 to prevent bare platform timeout.`
    );
    next(
      new GatewayTimeoutError(
        `The import is taking too long (>${(config.requestTimeoutMs / 1000).toFixed(0)}s). ` +
        `Try splitting the file into smaller batches and re-uploading.`
      )
    );
  }, config.requestTimeoutMs);

  try {
    validateCsvUpload(req.file);
    const file = req.file!;

    logger.info(`[UploadController] Initiating lead import for file: ${file.originalname} (${file.size} bytes).`);

    const rawRecords = await parseCsv(file.buffer);

    // ─── Guard 1: Max records check ───────────────────────────────────────────
    if (rawRecords.length > config.maxRecords) {
      clearTimeout(timeoutHandle);
      throw new TooManyRecordsError(
        `CSV contains ${rawRecords.length.toLocaleString()} rows, which exceeds the ` +
        `maximum of ${config.maxRecords.toLocaleString()} records per import. ` +
        `Please split the file into smaller batches and re-upload.`,
        { rowCount: rawRecords.length, limit: config.maxRecords }
      );
    }

    const importResult = await runImportPipeline(rawRecords);

    // If the timeout already fired, do not attempt to send another response
    if (timeoutFired) return;
    clearTimeout(timeoutHandle);

    const duration = Date.now() - start;
    logger.info(
      `[UploadController] Import completed in ${duration}ms. ` +
      `Rows parsed: ${rawRecords.length}. Imported: ${importResult.metrics.importedCount}.`
    );

    res.status(200).json(importResult);
  } catch (err) {
    if (!timeoutFired) {
      clearTimeout(timeoutHandle);
    }
    next(err);
  }
}

/**
 * Basic health check endpoint.
 */
export function healthCheck(req: Request, res: Response): void {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Version information endpoint.
 */
export function versionInfo(req: Request, res: Response): void {
  res.status(200).json({
    name: 'groweasy-crm-api',
    version: '1.0.0',
  });
}
