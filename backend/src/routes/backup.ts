import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { getConfig, updateConfig, triggerBackup, getBackupList, restoreBackup } from '../controllers/backupController';

const router = Router();

// All backup routes: authenticated + admin only
router.get('/config', authMiddleware, adminMiddleware, getConfig);
router.post('/config', authMiddleware, adminMiddleware, updateConfig);
router.post('/trigger', authMiddleware, adminMiddleware, triggerBackup);
router.get('/list', authMiddleware, adminMiddleware, getBackupList);
router.post('/restore', authMiddleware, adminMiddleware, restoreBackup);

export default router;
