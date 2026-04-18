import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { sendBulkSms } from '../services/smsService';
import { logger } from '../services/logger';
import MessageCampaign from '../models/messageCampaign';
import { Op } from 'sequelize';
import sequelize from '../config/database';

const router = Router();
router.use(authMiddleware);

router.post('/send-bulk', async (req: Request, res: Response): Promise<void> => {
  const { phones, message, battalion } = req.body;

  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    res.status(400).json({ error: 'phones array is required' });
    return;
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  if (message.trim().length > 268) {
    res.status(400).json({ error: 'הודעה חורגת מ-268 תווים' });
    return;
  }

  try {
    logger.info('SMS bulk send started', { recipientCount: phones.length, initiatedBy: req.userEmail });
    const result = await sendBulkSms(phones, message.trim());
    logger.info('SMS bulk send completed', { ...result, initiatedBy: req.userEmail });

    // Persist campaign record
    await MessageCampaign.create({
      channel: 'sms',
      battalion: battalion || null,
      message_preview: message.trim().slice(0, 160),
      recipient_count: phones.length,
      succeeded: result.succeeded,
      failed: result.failed,
      sent_by: req.userEmail || 'unknown',
    });

    res.json(result);
  } catch (error: any) {
    logger.error('SMS bulk send error', { errorMessage: error.message });
    res.status(500).json({ error: error.response?.data?.Message || error.message || 'שגיאה בשליחת SMS' });
  }
});

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalsRaw, recent, byDayRaw] = await Promise.all([
      // Aggregate totals
      MessageCampaign.findAll({
        attributes: [
          'channel',
          [sequelize.fn('COUNT', sequelize.col('id')), 'campaigns'],
          [sequelize.fn('SUM', sequelize.col('recipient_count')), 'recipients'],
          [sequelize.fn('SUM', sequelize.col('succeeded')), 'succeeded'],
          [sequelize.fn('SUM', sequelize.col('failed')), 'failed'],
        ],
        group: ['channel'],
        raw: true,
      }),
      // Last 20 campaigns
      MessageCampaign.findAll({
        order: [['createdAt', 'DESC']],
        limit: 20,
        raw: true,
      }),
      // By day (last 14 days)
      MessageCampaign.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          'channel',
          [sequelize.fn('SUM', sequelize.col('succeeded')), 'succeeded'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'campaigns'],
        ],
        where: { createdAt: { [Op.gte]: since } },
        group: [sequelize.fn('DATE', sequelize.col('createdAt')), 'channel'],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true,
      }),
    ]);

    // Reshape totals
    const totals = { whatsapp: { campaigns: 0, recipients: 0, succeeded: 0, failed: 0 }, sms: { campaigns: 0, recipients: 0, succeeded: 0, failed: 0 } };
    for (const row of totalsRaw as any[]) {
      const ch = row.channel as 'whatsapp' | 'sms';
      totals[ch] = { campaigns: +row.campaigns, recipients: +row.recipients, succeeded: +row.succeeded, failed: +row.failed };
    }

    // Reshape byDay → { date, whatsapp, sms }[]
    const dayMap: Record<string, { date: string; whatsapp: number; sms: number }> = {};
    for (const row of byDayRaw as any[]) {
      const d = row.date as string;
      if (!dayMap[d]) dayMap[d] = { date: d, whatsapp: 0, sms: 0 };
      dayMap[d][row.channel as 'whatsapp' | 'sms'] = +row.succeeded;
    }
    const byDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ totals, recent, byDay });
  } catch (error: any) {
    logger.error('SMS stats error', { errorMessage: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
