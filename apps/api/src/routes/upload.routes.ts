import { Router } from 'express';
import multer from 'multer';
import {
  handleUploadPreview,
  handleImport,
  healthCheck,
  versionInfo,
} from '../controllers/upload.controller';

const router = Router();

// Configure Multer for secure, in-memory storage of uploaded files
const upload = multer({
  storage: multer.memoryStorage(),
});

// Route mapping
// Single file uploads must use the form-data key "file"
router.post('/upload', upload.single('file'), handleUploadPreview);
router.post('/upload/preview', upload.single('file'), handleUploadPreview);
router.post('/import', upload.single('file'), handleImport);

// Utility routes
router.get('/health', healthCheck);
router.get('/version', versionInfo);

export default router;
