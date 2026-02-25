import { Request, Response } from 'express';
import { sendBulkWhatsApp } from '../services/whatsappService';
import { logger } from '../services/logger';

export const sendBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phones, message } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      res.status(400).json({ error: 'phones array is required' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    if (!process.env.GREEN_API_ID_INSTANCE || !process.env.GREEN_API_TOKEN) {
      res.status(500).json({ error: 'WhatsApp API not configured. Set GREEN_API_ID_INSTANCE and GREEN_API_TOKEN in .env' });
      return;
    }

    logger.info('WhatsApp bulk send started', {
      recipientCount: phones.length,
      initiatedBy: req.userEmail,
    });

    const results = await sendBulkWhatsApp(phones, message.trim());

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('WhatsApp bulk send completed', {
      succeeded,
      failed,
      initiatedBy: req.userEmail,
    });

    res.json({ results, succeeded, failed });
  } catch (error: any) {
    logger.error('WhatsApp bulk send error', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בשליחת הודעות WhatsApp' });
  }
};
