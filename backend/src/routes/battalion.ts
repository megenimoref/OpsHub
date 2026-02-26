import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { importBattalion, getBattalions, getBattalionSoldiers, searchSoldier, updateSoldierHandler, getSoldierChangesHandler, getDashboard, getAssistanceSoldiers } from '../controllers/battalionController';

const router = Router();

// Store file in memory (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('יש להעלות קובץ Excel בלבד (.xlsx או .xls)'));
    }
  },
});

router.get('/list', authMiddleware, getBattalions);
router.get('/dashboard', authMiddleware, getDashboard);
router.get('/:name/assistance-soldiers', authMiddleware, getAssistanceSoldiers);
router.get('/:name/soldiers', authMiddleware, getBattalionSoldiers);
router.get('/:name/soldiers/search', authMiddleware, searchSoldier);
router.put('/:name/soldiers/:id', authMiddleware, updateSoldierHandler);
router.get('/:name/soldiers/:id/changes', authMiddleware, getSoldierChangesHandler);
router.post('/import', authMiddleware, upload.single('file'), importBattalion);

export default router;
