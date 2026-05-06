import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, adminMiddleware, adminOrSuperMiddleware, allocateMiddleware } from '../middleware/auth';
import { createBattalion, importBattalion, getBattalions, getBattalionSoldiers, searchSoldier, searchSoldierGlobalHandler, updateSoldierHandler, getSoldierChangesHandler, getDashboard, getAssistanceSoldiers, downloadTemplate, deleteBattalion, exportBattalion, refreshAllocations, searchFieldTeam, getDuplicateSoldiersHandler, deleteSoldierHandler, verifyExcelDetails, syncExcelDetails } from '../controllers/battalionController';
import { allocateSoldiers, getMySoldiers, getAllocationsByBattalion, getUserAllocationStats, deallocateSoldiers, assignSoldiers } from '../controllers/allocationController';
import { getSheagatHaariStats } from '../services/sheagatHaariService';
import { logger } from '../services/logger';

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

// "שאגת הארי" — battalion-level statistics with category breakdown.
// Heavy query (touches every battalion DB once); cache layer can be added
// later if it becomes a hot endpoint.
router.get('/sheagat-haari', authMiddleware, async (req, res) => {
  try {
    const data = await getSheagatHaariStats();
    res.json(data);
  } catch (error: any) {
    logger.error('sheagat-haari endpoint failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: 'שגיאה בטעינת סטטיסטיקת שאגת הארי' });
  }
});
router.post('/import', authMiddleware, upload.single('file'), importBattalion);
router.post('/verify-excel', authMiddleware, upload.single('file'), verifyExcelDetails);
router.post('/sync-excel-details', authMiddleware, upload.single('file'), syncExcelDetails);
router.post('/allocate', authMiddleware, allocateMiddleware, allocateSoldiers);
router.post('/deallocate', authMiddleware, allocateMiddleware, deallocateSoldiers);
router.post('/assign', authMiddleware, allocateMiddleware, assignSoldiers);
router.get('/allocation-stats', authMiddleware, allocateMiddleware, getUserAllocationStats);
router.get('/search-global', authMiddleware, searchSoldierGlobalHandler);
router.get('/field-team-search', authMiddleware, searchFieldTeam);
router.get('/duplicate-soldiers', authMiddleware, adminMiddleware, getDuplicateSoldiersHandler);
router.get('/my-soldiers', authMiddleware, getMySoldiers);
router.get('/allocations/:name', authMiddleware, getAllocationsByBattalion);
router.post('/:name/refresh-allocations', authMiddleware, allocateMiddleware, refreshAllocations);
router.get('/:name/export', authMiddleware, exportBattalion);
router.get('/:name/assistance-soldiers', authMiddleware, getAssistanceSoldiers);
router.get('/:name/soldiers', authMiddleware, getBattalionSoldiers);
router.get('/:name/soldiers/search', authMiddleware, searchSoldier);
router.put('/:name/soldiers/:id', authMiddleware, updateSoldierHandler);
router.delete('/:name/soldiers/:personal_number', authMiddleware, adminMiddleware, deleteSoldierHandler);
router.get('/:name/soldiers/:id/changes', authMiddleware, getSoldierChangesHandler);

export default router;
