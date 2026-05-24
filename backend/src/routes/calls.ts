import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import {
  ensureAllUsersFolders,
  uploadCallFile,
  transcribeAndSummarize,
  getCallSummaries,
  saveCallSummary,
  deleteCallSummary,
} from '../controllers/callsController';

const CALLS_BASE_DIR = path.join(__dirname, '../../uploads/calls');
if (!fs.existsSync(CALLS_BASE_DIR)) fs.mkdirSync(CALLS_BASE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as any).userId;
    const userDir = path.join(CALLS_BASE_DIR, String(userId));
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.webm', '.aac', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('סוג קובץ לא נתמך. מותר: MP3, MP4, WAV, M4A, OGG, WEBM'));
  },
});

const router = Router();
router.use(authMiddleware);

// Ensure all existing users have call folders (run once on startup via app.ts)
router.post('/init-folders', ensureAllUsersFolders);

// Upload audio file
router.post('/upload', upload.single('file'), uploadCallFile);

// Transcribe & summarize uploaded file via Transkriptor
router.post('/transcribe', transcribeAndSummarize);

// Get call summaries for a soldier
router.get('/:soldierPersonalNumber', getCallSummaries);

// Save final summary to DB
router.post('/save', saveCallSummary);

// Delete a call summary
router.delete('/:id', deleteCallSummary);

export default router;
