import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { Request, Response } from 'express';
import DistributionListMember from '../models/distributionList';
import User from '../models/user';
import { sendWhatsAppMessage } from '../services/whatsappService';
import WhatsAppLog from '../models/whatsappLog';

const router = Router();
router.use(authMiddleware);

// Get all members
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const members = await DistributionListMember.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ members });
  } catch { res.status(500).json({ error: 'שגיאה' }); }
});

// Add member
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { soldierPersonalNumber, soldierName, battalion, phone } = req.body;
    if (!soldierPersonalNumber || !soldierName || !battalion || !phone) {
      res.status(400).json({ error: 'חסרים פרטים' }); return;
    }
    const user = await User.findByPk(req.userId, { attributes: ['firstName', 'lastName'] });
    const adderName = user ? `${user.firstName} ${user.lastName}` : 'unknown';
    const [member, created] = await DistributionListMember.findOrCreate({
      where: { soldierPersonalNumber },
      defaults: { soldierName, battalion, phone, addedByName: adderName },
    });
    res.json({ member, created });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Remove member
router.delete('/:personalNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    await DistributionListMember.destroy({ where: { soldierPersonalNumber: req.params.personalNumber } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'שגיאה' }); }
});

// Send WhatsApp to all members
router.post('/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'נדרשת הודעה' }); return; }
    const members = await DistributionListMember.findAll();
    if (members.length === 0) { res.status(400).json({ error: 'רשימת התפוצה ריקה' }); return; }

    const user = await User.findByPk(req.userId, { attributes: ['firstName', 'lastName'] });
    const senderName = user ? `${user.firstName} ${user.lastName}` : 'unknown';

    const results = [];
    for (const m of members) {
      const result = await sendWhatsAppMessage(m.phone, message.trim());
      results.push({ soldierName: m.soldierName, phone: m.phone, success: result.success });
      if (result.success) {
        try {
          await WhatsAppLog.create({
            soldierPersonalNumber: m.soldierPersonalNumber,
            soldierName: m.soldierName,
            battalion: m.battalion,
            phone: m.phone,
            messagePreview: message.trim().slice(0, 160),
            sentByName: senderName,
          });
        } catch { /* non-fatal */ }
      }
    }
    const succeeded = results.filter(r => r.success).length;
    res.json({ results, succeeded, failed: members.length - succeeded });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
