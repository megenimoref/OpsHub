import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import FinancialDocument from '../models/financialDocument';
import User from '../models/user';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/financial');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const isAllowed = (role: string) => role === 'admin' || role === 'accountant';

// Upload document
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'לא צורף קובץ' });
      return;
    }

    const { type, soldierPersonalNumber, soldierName, battalion } = req.body;
    if (!type || !soldierPersonalNumber || !battalion) {
      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }

    const doc = await FinancialDocument.create({
      type,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      soldierPersonalNumber: soldierPersonalNumber.trim(),
      soldierName: soldierName?.trim() || null,
      battalion: battalion.trim(),
      uploadedBy: req.userId,
    });

    res.status(201).json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה בהעלאת המסמך' });
  }
};

// Get documents (filter by type/soldier/battalion)
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    const { type, soldierPersonalNumber, battalion } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (soldierPersonalNumber) where.soldierPersonalNumber = soldierPersonalNumber;
    if (battalion) where.battalion = battalion;

    const docs = await FinancialDocument.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    // Enrich with uploader name
    const userIds = [...new Set(docs.map((d) => d.uploadedBy))];
    const users = userIds.length > 0
      ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'firstName', 'lastName'] })
      : [];
    const userMap: Record<number, string> = {};
    for (const u of users) userMap[u.id] = `${u.firstName} ${u.lastName}`;

    const result = docs.map((d) => ({
      id: d.id,
      type: d.type,
      originalName: d.originalName,
      soldierPersonalNumber: d.soldierPersonalNumber,
      soldierName: d.soldierName,
      battalion: d.battalion,
      uploadedBy: userMap[d.uploadedBy] || `משתמש ${d.uploadedBy}`,
      createdAt: d.createdAt,
    }));

    res.json({ documents: result });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה בטעינת המסמכים' });
  }
};

// Download document
export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    const doc = await FinancialDocument.findByPk(req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, doc.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'קובץ לא נמצא בשרת' });
      return;
    }

    res.download(filePath, doc.originalName);
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה בהורדת המסמך' });
  }
};

// Delete document
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    const doc = await FinancialDocument.findByPk(req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, doc.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.destroy();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה במחיקת המסמך' });
  }
};
