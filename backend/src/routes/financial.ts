import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadDocument, getDocuments, downloadDocument, deleteDocument, analyzePayslips, calculateReserve, getCalculationHistory } from '../controllers/financialController';
import { authMiddleware } from '../middleware/auth';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/financial');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('סוג קובץ לא נתמך. מותר: PDF, JPG, PNG'));
  },
});

const router = Router();
router.use(authMiddleware);

router.get('/history', getCalculationHistory);
router.get('/', getDocuments);
router.post('/upload', upload.single('file'), uploadDocument);
router.post('/analyze', analyzePayslips);
router.post('/calculate-reserve', calculateReserve);
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

export default router;
