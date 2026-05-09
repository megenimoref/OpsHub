import { Request, Response } from 'express';
import Feedback from '../models/feedback';
import User from '../models/user';

// Get all feedbacks (admin/super only) or own feedbacks (staff)
export const getFeedbacks = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super';

    const where = isAdmin ? {} : { userId: user.id };

    const feedbacks = await Feedback.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    // Enrich with user info
    const userIds = [...new Set(feedbacks.map((f) => f.userId))];
    const users = userIds.length > 0
      ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'firstName', 'lastName', 'email'] })
      : [];
    const userMap: Record<number, { firstName: string; lastName: string; email: string }> = {};
    for (const u of users) {
      userMap[u.id] = { firstName: u.firstName, lastName: u.lastName, email: u.email };
    }

    const result = feedbacks.map((f) => ({
      id: f.id,
      userId: f.userId,
      userName: userMap[f.userId] ? `${userMap[f.userId].firstName} ${userMap[f.userId].lastName}` : `משתמש ${f.userId}`,
      userEmail: userMap[f.userId]?.email || '',
      title: f.title,
      description: f.description,
      category: f.category,
      priority: f.priority,
      status: f.status,
      adminNote: f.adminNote,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    res.json({ feedbacks: result });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה בטעינת המשובים' });
  }
};

// Create new feedback
export const createFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { title, description, category, priority } = req.body;

    if (!title?.trim() || !description?.trim()) {
      res.status(400).json({ error: 'כותרת ותיאור הם שדות חובה' });
      return;
    }

    const feedback = await Feedback.create({
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      category: category || 'improvement',
      priority: priority || 'medium',
      status: 'new',
      adminNote: null,
    });

    res.status(201).json({ success: true, feedback });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה ביצירת המשוב' });
  }
};

// Update feedback status/adminNote (admin/super only)
export const updateFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super';
    const { id } = req.params;

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      res.status(404).json({ error: 'משוב לא נמצא' });
      return;
    }

    if (isAdmin) {
      const { status, adminNote } = req.body;
      if (status) feedback.status = status;
      if (adminNote !== undefined) feedback.adminNote = adminNote;
    } else {
      // Staff can only edit their own unreviewed feedbacks
      if (feedback.userId !== user.id) {
        res.status(403).json({ error: 'אין הרשאה' });
        return;
      }
      if (feedback.status !== 'new') {
        res.status(400).json({ error: 'לא ניתן לערוך משוב שכבר נסקר' });
        return;
      }
      const { title, description, category, priority } = req.body;
      if (title) feedback.title = title.trim();
      if (description) feedback.description = description.trim();
      if (category) feedback.category = category;
      if (priority) feedback.priority = priority;
    }

    await feedback.save();
    res.json({ success: true, feedback });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה בעדכון המשוב' });
  }
};

// Delete feedback
export const deleteFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super';
    const { id } = req.params;

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      res.status(404).json({ error: 'משוב לא נמצא' });
      return;
    }

    if (!isAdmin && feedback.userId !== user.id) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    await feedback.destroy();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה במחיקת המשוב' });
  }
};
