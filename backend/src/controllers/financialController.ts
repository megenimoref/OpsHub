import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import FinancialDocument from '../models/financialDocument';
import User from '../models/user';
import FinancialCalculation from '../models/financialCalculation';

// Lazy-init so missing API key doesn't crash the server on startup
const getAnthropic = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on this server');
  return new Anthropic({ apiKey });
};


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

// Helper: build Anthropic content blocks for a payslip file
const buildSlipBlocks = (
  fileBuffer: Buffer,
  ext: string,
  label: string,
): Anthropic.ContentBlockParam[] => {
  const blocks: Anthropic.ContentBlockParam[] = [{ type: 'text', text: label }];
  if (ext === '.pdf') {
    blocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: fileBuffer.toString('base64'),
      },
    } as Anthropic.ContentBlockParam);
  } else {
    const mediaType = (ext === '.png' ? 'image/png' : 'image/jpeg') as 'image/png' | 'image/jpeg';
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: fileBuffer.toString('base64'),
      },
    } as Anthropic.ContentBlockParam);
  }
  return blocks;
};

// Analyze payslips with Claude
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

    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    contentBlocks.push({
      type: 'text',
      text: `אתה מומחה לתגמולי מילואים בישראל. קיבלת ${docs.length} תלושי שכר של חייל מילואים (לפני תקופת המילואים). נתח אותם לפי הסעיפים הבאים וספק דוח מפורט בעברית:

## 1. חישוב תגמולי מילואים
חפש בכל תלוש את שורת "שכ.ב.לאומי" / "שכר חייב בביטוח לאומי" / "ברוטו לביטוח לאומי".
- חבר את הסכומים מ-3 החודשים → סה"כ
- חלק ב-90 → שכר יומי ממוצע
- הצג את החישוב המפורט
- ⚠️ חודשים עם מחלה ממושכת לפני המילואים יכולים להקטין את הממוצע

## 2. בדיקת ימי חופשה
- האם ירדו ימי חופשה בתקופת המילואים?
- האם יש סעיף "ניצול חופשה" בתאריכים החופפים לצו?
- האם יתרת החופשה קטנה שלא כדין?

## 3. בדיקת ימי מחלה
- האם סומנו ימי מחלה בזמן המילואים?
- האם נוכה תשלום בגלל מחלה בתקופת הצו?
- כמה ימי מחלה נוצלו? מה היתרה?

## 4. הצלבת נתונים
- האם הימים מסומנים כ"מילואים" בלבד ואין כפילות עם חופשה/מחלה?

## 5. סיכום והמלצות
- חריגים: חל"ת, מחלה ממושכת, חודש חריג
- המלצות מעשיות לפעולה

אם מידע מסוים לא מופיע בתלוש — ציין זאת במפורש.`,
    });

    let slipIndex = 0;
    for (const doc of docs) {
      const filePath = path.join(UPLOADS_DIR, doc.fileName);
      if (!fs.existsSync(filePath)) continue;
      slipIndex++;
      const ext = path.extname(doc.fileName).toLowerCase();
      const fileBuffer = fs.readFileSync(filePath);
      const blocks = buildSlipBlocks(fileBuffer, ext, `\n--- תלוש ${slipIndex}: ${doc.originalName} ---`);
      contentBlocks.push(...blocks);
    }

    const message = await getAnthropic().messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const analysis = (message.content[0] as Anthropic.TextBlock)?.text || 'לא התקבלה תגובה';
    res.json({ analysis, slipsAnalyzed: docs.length });
  } catch (err: any) {
    console.error('Claude payslip analysis error:', err);
    res.status(500).json({ error: 'שגיאה בניתוח: ' + (err.message || 'שגיאה לא ידועה') });
  }
};

// Reserve compensation calculator — powered by Claude with native PDF support
export const calculateReserve = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }

    const { documentIds, reserveDays } = req.body as { documentIds: number[]; reserveDays: number };
    if (!Array.isArray(documentIds) || documentIds.length < 3) {
      res.status(400).json({ error: 'נדרשים לפחות 3 תלושי שכר' });
      return;
    }
    if (!reserveDays || reserveDays <= 0) {
      res.status(400).json({ error: 'נדרש מספר ימי מילואים תקין' });
      return;
    }

    const docs = await FinancialDocument.findAll({ where: { id: documentIds, type: 'payslip' } });
    if (docs.length < 3) {
      res.status(400).json({ error: `נמצאו ${docs.length} תלושים בלבד — נדרשים לפחות 3` });
      return;
    }

    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    contentBlocks.push({
      type: 'text',
      text: `אתה מחשב תגמולי מילואים מתוך תלושי שכר ישראליים (תלושים מהחודשים לפני המילואים).

משימתך: מצא בכל תלוש את הסכום בשורת "שכ.ב.לאומי" (שכר חייב בביטוח לאומי).
חפש לפי סדר עדיפות:
1. "שכ.ב.לאומי" (קיצור נפוץ בתלושים)
2. "שכר חייב בביטוח לאומי"
3. "ברוטו לביטוח לאומי" / "ברוטו לב.ל"
4. "סה"כ ברוטו" / "ברוטו כולל" / "שכר ברוטו"
5. "הכנסה חייבת"
אם לא נמצא אף שדה — קח את הסכום הגבוה ביותר בתלוש.

זהה גם את חודש התלוש (לדוגמה: "מרץ 2025").

החזר JSON בלבד, ללא טקסט נוסף:
{
  "months": [
    { "label": "חודש שנה", "amount": 12345 },
    { "label": "חודש שנה", "amount": 12345 },
    { "label": "חודש שנה", "amount": 12345 }
  ],
  "notes": "הערות אם יש"
}

חשוב: amount הוא מספר בלבד (ללא פסיקים, ללא ₪). JSON תקני בלבד.`,
    });

    let slipIndex = 0;
    for (const doc of docs) {
      const filePath = path.join(UPLOADS_DIR, doc.fileName);
      if (!fs.existsSync(filePath)) continue;
      slipIndex++;
      const ext = path.extname(doc.fileName).toLowerCase();
      const fileBuffer = fs.readFileSync(filePath);
      const blocks = buildSlipBlocks(fileBuffer, ext, `\n--- תלוש ${slipIndex}: ${doc.originalName} ---`);
      contentBlocks.push(...blocks);
    }

    const message = await getAnthropic().messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const raw = (message.content[0] as Anthropic.TextBlock)?.text?.trim() || '{}';
    let parsed: { months?: { label: string; amount: number }[]; notes?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    const months = (parsed.months || []).slice(0, 3).map((m) => ({
      label: m.label || 'חודש',
      amount: Number(m.amount) || 0,
    }));
    while (months.length < 3) months.push({ label: `תלוש ${months.length + 1}`, amount: 0 });

    const total = months.reduce((sum, m) => sum + m.amount, 0);
    const dailyAverage = total / 90;
    const estimatedCompensation = Math.round(dailyAverage * reserveDays);

    // Save calculation history
    try {
      const user = await User.findByPk(req.userId, { attributes: ['firstName', 'lastName'] });
      const callerName = user ? `${user.firstName} ${user.lastName}` : `משתמש ${req.userId}`;
      await FinancialCalculation.create({
        soldierPersonalNumber: docs[0].soldierPersonalNumber,
        soldierName: docs[0].soldierName || null,
        battalion: docs[0].battalion,
        reserveDays,
        estimatedCompensation,
        dailyAverage: Math.round(dailyAverage * 100) / 100,
        monthsJson: JSON.stringify(months),
        notes: parsed.notes || null,
        calculatedByName: callerName,
      });
    } catch (e) { /* non-fatal */ }

    res.json({
      months,
      total,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      estimatedCompensation,
      reserveDays,
      notes: parsed.notes || '',
      rawText: raw,
    });
  } catch (err: any) {
    console.error('Reserve calculation error:', err);
    res.status(500).json({ error: 'שגיאה בחישוב: ' + (err.message || 'שגיאה לא ידועה') });
  }
};

export const getCalculationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) { res.status(403).json({ error: 'אין הרשאה' }); return; }
    const { soldierPersonalNumber } = req.query;
    const where: any = {};
    if (soldierPersonalNumber) where.soldierPersonalNumber = soldierPersonalNumber;
    const rows = await FinancialCalculation.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ history: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה בטעינת ההיסטוריה' });
  }
};

export const deleteCalculationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAllowed(req.userRole || '')) { res.status(403).json({ error: 'אין הרשאה' }); return; }
    const { id } = req.params;
    const row = await FinancialCalculation.findByPk(id);
    if (!row) { res.status(404).json({ error: 'רשומה לא נמצאה' }); return; }
    await row.destroy();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'שגיאה במחיקת הרשומה' });
  }
};
