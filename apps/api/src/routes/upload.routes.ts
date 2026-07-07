import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  handleUploadPreview,
  handleImport,
  healthCheck,
  versionInfo,
} from '../controllers/upload.controller';
import { config } from '../config/env';
import { UploadError, FileTooLargeError } from '../utils/errors';

const router = Router();

// Configure Multer for secure, in-memory storage with file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize, // 5MB default
    files: 1,                    // Only 1 file per request
  },
});

// Wrapper to handle Multer errors (e.g. wrong field name → 400, file too large → 413)
function uploadSingle(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const limitMb = (config.maxFileSize / 1024 / 1024).toFixed(0);
          return next(new FileTooLargeError(`File size exceeds the limit of ${limitMb}MB.`));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new UploadError('Unexpected field name. Please upload a CSV file with the key "file".'));
        }
        return next(err);
      }
      next();
    });
  };
}

// Route mapping
// Single file uploads must use the form-data key "file"
router.post('/upload', uploadSingle('file'), handleUploadPreview);
router.post('/upload/preview', uploadSingle('file'), handleUploadPreview);
router.post('/import', uploadSingle('file'), handleImport);

// Utility routes
router.get('/health', healthCheck);
router.get('/version', versionInfo);

export default router;
