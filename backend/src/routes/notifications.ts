import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import Notification from '../models/notification';

const router = Router();

// GET /notifications — current user's notifications (newest first)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /notifications/read-all — mark all as read
router.put('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.userId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
