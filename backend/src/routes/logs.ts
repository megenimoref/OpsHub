import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
const LOGS_DIR = path.resolve(__dirname, '../../logs');

router.get('/list', authMiddleware, adminMiddleware, (_req: Request, res: Response) => {
  if (!fs.existsSync(LOGS_DIR)) {
    res.json({ files: [] });
    return;
  }
  const files = fs.readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith('.log'))
    .sort()
    .reverse()
    .map((f) => ({
      name: f,
      size: fs.statSync(path.join(LOGS_DIR, f)).size,
      modified: fs.statSync(path.join(LOGS_DIR, f)).mtime,
    }));
  res.json({ files });
});

router.get('/:filename', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = path.join(LOGS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'קובץ לוג לא נמצא' });
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ filename, content });
});

export default router;
