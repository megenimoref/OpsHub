import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, adminMiddleware, adminOrSuperMiddleware, allocateMiddleware } from '../middleware/auth';
import { createBattalion, importBattalion, getBattalions, getBattalionSoldiers, searchSoldier, searchSoldierGlobalHandler, updateSoldierHandler, getSoldierChangesHandler, getDashboard, getAssistanceSoldiers, downloadTemplate, deleteBattalion } from '../controllers/battalionController';
import { allocateSoldiers, getMySoldiers, getAllocationsByBattalion, getUserAllocationStats, deallocateSoldiers } from '../controllers/allocationController';

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

router.get('/template', authMiddleware, downloadTemplate);
router.get('/list', authMiddleware, getBattalions);
router.post('/create', authMiddleware, adminMiddleware, createBattalion);
router.delete('/:name', authMiddleware, adminMiddleware, deleteBattalion);
router.get('/dashboard', authMiddleware, getDashboard);
router.post('/import', authMiddleware, upload.single('file'), importBattalion);
router.post('/allocate', authMiddleware, allocateMiddleware, allocateSoldiers);
router.post('/deallocate', authMiddleware, allocateMiddleware, deallocateSoldiers);
router.get('/allocation-stats', authMiddleware, allocateMiddleware, getUserAllocationStats);
router.get('/search-global', authMiddleware, searchSoldierGlobalHandler);
router.get('/my-soldiers', authMiddleware, getMySoldiers);
router.get('/allocations/:name', authMiddleware, getAllocationsByBattalion);
router.get('/:name/assistance-soldiers', authMiddleware, getAssistanceSoldiers);
router.get('/:name/soldiers', authMiddleware, getBattalionSoldiers);
router.get('/:name/soldiers/search', authMiddleware, searchSoldier);
router.put('/:name/soldiers/:id', authMiddleware, updateSoldierHandler);
router.get('/:name/soldiers/:id/changes', authMiddleware, getSoldierChangesHandler);

export default router;
