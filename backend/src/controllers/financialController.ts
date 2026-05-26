import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import FinancialDocument from '../models/financialDocument';
import User from '../models/user';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Analyze payslips with GPT-4o
export const analyzePayslips = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    const { documentIds } = req.body as { documentIds: number[] };
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({ error: 'לא סופקו מסמכים לניתוח' });
      return;
    }

    const docs = await FinancialDocument.findAll({ where: { id: documentIds, type: 'payslip' } });
    if (docs.length < 3) {
      res.status(400).json({ error: `נמצאו רק ${docs.length} תלושי שכר — נדרשים לפחות 3 לניתוח` });
      return;
    }

    // Build GPT content parts
    const contentParts: OpenAI.Chat.ChatCompletionContentPart[] = [];

    // System prompt
    contentParts.push({
      type: 'text',
      text: `אתה מנתח תלושי שכר של חייל מילואים בישראל. בדוק את ${docs.length} התלושים הבאים וספק דוח מפורט בעברית עם הכותרות הבאות:

## 1. ימי חופשה
כמה ימי חופשה הצטברו, כמה נוצלו, מה היתרה (בכל תלוש ובסיכום).

## 2. ימי מחלה
כמה ימי מחלה הצטברו, כמה נוצלו, מה היתרה.

## 3. ניכוי ימי מחלה
האם ישנם ניכויים של ימי מחלה מהשכר? האם הם תקינים לפי החוק? ציין אם יש משהו חשוד.

## 4. סיכום והמלצות
ממצאים מרכזיים והמלצות לפעולה.

אם מידע חסר בתלוש — ציין זאת בבירור.`,
    });

    let slipIndex = 0;
    for (const doc of docs) {
      const filePath = path.join(UPLOADS_DIR, doc.fileName);
      if (!fs.existsSync(filePath)) continue;

      slipIndex++;
      const ext = path.extname(doc.fileName).toLowerCase();
      const fileBuffer = fs.readFileSync(filePath);

      if (ext === '.pdf') {
        // Extract text from PDF
        try {
          const pdfData = await pdfParse(fileBuffer);
          const text = pdfData.text?.trim();
          if (text) {
            contentParts.push({
              type: 'text',
              text: `\n--- תלוש ${slipIndex}: ${doc.originalName} (טקסט מ-PDF) ---\n${text}`,
            });
          } else {
            contentParts.push({ type: 'text', text: `\n--- תלוש ${slipIndex}: ${doc.originalName} (PDF ריק/סרוק — לא ניתן לחלץ טקסט) ---` });
          }
        } catch {
          contentParts.push({ type: 'text', text: `\n--- תלוש ${slipIndex}: ${doc.originalName} (שגיאה בקריאת PDF) ---` });
        }
      } else {
        // Image file — send as base64 vision
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const base64 = fileBuffer.toString('base64');
        contentParts.push({ type: 'text', text: `\n--- תלוש ${slipIndex}: ${doc.originalName} ---` });
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
        });
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: contentParts }],
      max_tokens: 2500,
    });

    const analysis = completion.choices[0]?.message?.content || 'לא התקבלה תגובה מ-GPT';
    res.json({ analysis, slipsAnalyzed: docs.length });
  } catch (err: any) {
    console.error('GPT payslip analysis error:', err);
    res.status(500).json({ error: 'שגיאה בניתוח GPT: ' + (err.message || 'שגיאה לא ידועה') });
  }
};
