import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { Request, Response } from 'express';
import { sendBulkWhatsApp, sendWhatsAppMessage } from '../services/whatsappService';
import { logger } from '../services/logger';
import MessageCampaign from '../models/messageCampaign';
import WhatsAppLog from '../models/whatsappLog';
import User from '../models/user';

const router = Router();
router.use(authMiddleware);

router.post('/send-bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phones, message, battalion } = req.body;

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

    logger.info('WhatsApp bulk send started', { recipientCount: phones.length, initiatedBy: req.userEmail });
    const results = await sendBulkWhatsApp(phones, message.trim());

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('WhatsApp bulk send completed', { succeeded, failed, initiatedBy: req.userEmail });

    // Persist campaign record
    await MessageCampaign.create({
      channel: 'whatsapp',
      battalion: battalion || null,
      message_preview: message.trim().slice(0, 160),
      recipient_count: phones.length,
      succeeded,
      failed,
      sent_by: req.userEmail || 'unknown',
    });

    res.json({ results, succeeded, failed });
  } catch (error: any) {
    logger.error('WhatsApp bulk send error', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בשליחת הודעות WhatsApp' });
  }
});

router.post('/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message?.trim()) {
      res.status(400).json({ error: 'phone and message are required' });
      return;
    }
    if (!process.env.GREEN_API_ID_INSTANCE || !process.env.GREEN_API_TOKEN) {
      res.status(500).json({ error: 'WhatsApp API not configured' });
      return;
    }
    const result = await sendWhatsAppMessage(phone, message.trim());
    if (result.success) {
      try {
        const user = await User.findByPk(req.userId, { attributes: ['firstName', 'lastName'] });
        const senderName = user ? `${user.firstName} ${user.lastName}` : 'unknown';
        const { soldierPersonalNumber, soldierName, battalion } = req.body;
        if (soldierPersonalNumber) {
          await WhatsAppLog.create({
            soldierPersonalNumber,
            soldierName: soldierName || null,
            battalion: battalion || null,
            phone,
            messagePreview: message.trim().slice(0, 160),
            sentByName: senderName,
          });
        }
      } catch { /* non-fatal */ }
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error || 'שגיאה בשליחה' });
    }
  } catch (error: any) {
    logger.error('WhatsApp send error', { errorMessage: error.message });
    res.status(500).json({ error: error.message || 'שגיאה בשליחה' });
  }
});

router.get('/count', async (req: Request, res: Response): Promise<void> => {
  try {
    const { soldierPersonalNumber } = req.query;
    if (!soldierPersonalNumber) { res.json({ count: 0 }); return; }
    const count = await WhatsAppLog.count({ where: { soldierPersonalNumber } });
    const last = await WhatsAppLog.findOne({ where: { soldierPersonalNumber }, order: [['createdAt', 'DESC']] });
    res.json({ count, lastSentAt: last?.createdAt || null });
  } catch {
    res.json({ count: 0 });
  }
});

export default router;
