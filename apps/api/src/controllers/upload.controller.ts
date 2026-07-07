import { Request, Response, NextFunction } from 'express';
import { validateCsvUpload } from '../validators/upload.validator';
import { generatePreview } from '../services/csv/preview';
import { parseCsv } from '../services/csv/parser';
import { runImportPipeline } from '../services/ai/ai.service';
import { logger } from '../config/logger';

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
 */
export async function handleImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const start = Date.now();
  try {
    validateCsvUpload(req.file);
    const file = req.file!;

    logger.info(`[UploadController] Initiating lead import for file: ${file.originalname} (${file.size} bytes).`);

    const rawRecords = await parseCsv(file.buffer);
    const importResult = await runImportPipeline(rawRecords);
    
    const duration = Date.now() - start;
    logger.info(`[UploadController] Import completed in ${duration}ms. Rows parsed: ${rawRecords.length}. Imported: ${importResult.metrics.importedCount}.`);

    res.status(200).json(importResult);
  } catch (err) {
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
