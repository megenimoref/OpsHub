import { Request, Response } from 'express';
import {
  getBackupConfig,
  saveBackupConfig,
  backupAllBattalions,
  listBackupFiles,
  restoreFromFile,
  startScheduler,
  BackupConfig,
} from '../services/backupService';
import { logger } from '../services/logger';

export const getConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await getBackupConfig();
    res.json({ config });
  } catch (error: any) {
    logger.error('Get backup config failed', { error: error.message });
    res.status(500).json({ error: 'שגיאה בקריאת הגדרות הגיבוי' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { enabled, hour, days, backupPath } = req.body as Partial<BackupConfig>;

    if (
      typeof enabled !== 'boolean' ||
      typeof hour !== 'number' || hour < 0 || hour > 23 ||
      !Array.isArray(days) || days.some((d) => d < 0 || d > 6) ||
      typeof backupPath !== 'string' || !backupPath.trim()
    ) {
      res.status(400).json({ error: 'נתונים לא תקינים' });
      return;
    }

    const config: BackupConfig = { enabled, hour, days, backupPath: backupPath.trim() };
    await saveBackupConfig(config);

    // Restart scheduler with new settings
    await startScheduler();

    logger.info('Backup config updated', config);
    res.json({ success: true, config });
  } catch (error: any) {
    logger.error('Update backup config failed', { error: error.message });
    res.status(500).json({ error: 'שגיאה בשמירת הגדרות הגיבוי' });
  }
};

export const triggerBackup = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Manual backup triggered');
    const result = await backupAllBattalions();
    logger.info('Manual backup completed', result);
    res.json({
      success: true,
      message: `גובו ${result.success.length} גדודים${result.failed.length ? `, נכשלו: ${result.failed.join(', ')}` : ''}`,
      succeeded: result.success,
      failed: result.failed,
    });
  } catch (error: any) {
    logger.error('Manual backup failed', { error: error.message });
    res.status(500).json({ error: error.message || 'שגיאה בגיבוי' });
  }
};

export const getBackupList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const files = await listBackupFiles();
    res.json({ files });
  } catch (error: any) {
    logger.error('List backups failed', { error: error.message });
    res.status(500).json({ error: 'שגיאה בקריאת רשימת הגיבויים' });
  }
};

export const restoreBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, battalionName } = req.body;

    if (!filename || typeof filename !== 'string' ||
        !battalionName || typeof battalionName !== 'string') {
      res.status(400).json({ error: 'חסר שם קובץ או שם גדוד' });
      return;
    }

    logger.info('Restore started', { filename, battalionName });
    await restoreFromFile(filename, battalionName);
    logger.info('Restore completed', { filename, battalionName });

    res.json({ success: true, message: `גדוד "${battalionName}" שוחזר בהצלחה מ-${filename}` });
  } catch (error: any) {
    logger.error('Restore failed', { error: error.message });
    res.status(500).json({ error: error.message || 'שגיאה בשחזור הגיבוי' });
  }
};
