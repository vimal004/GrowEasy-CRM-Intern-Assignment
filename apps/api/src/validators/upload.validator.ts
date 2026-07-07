import { UploadError, FileTooLargeError } from '../utils/errors';
import { config } from '../config/env';

/**
 * Validates the uploaded file to ensure it is present, matches the CSV extension,
 * falls within size constraints, and corresponds to allowed MIME types.
 * 
 * @param file The Multer file object from the request.
 * @throws UploadError If validation fails.
 */
export function validateCsvUpload(file: Express.Multer.File | undefined): void {
  if (!file) {
    throw new UploadError('No file uploaded. Please upload a CSV file with the key "file".');
  }

  // Validate file size
  if (file.size > config.maxFileSize) {
    const limitMb = (config.maxFileSize / 1024 / 1024).toFixed(0);
    throw new FileTooLargeError(`File size exceeds the limit of ${limitMb}MB.`);
  }

  // Validate file extension
  const fileName = file.originalname || '';
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension !== 'csv') {
    throw new UploadError('Invalid file extension. Only CSV files (.csv) are allowed.');
  }

  // Validate MIME type
  const allowedMimes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/comma-separated-values',
    'text/x-comma-separated-values',
    'text/plain', // fallback since raw text is common
    'application/octet-stream', // some clients/browsers send CSVs with this MIME type
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    throw new UploadError(`Invalid file type: ${file.mimetype}. Please upload a standard CSV file.`);
  }
}
