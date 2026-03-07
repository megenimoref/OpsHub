import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import {
  ensureBattalionDatabase,
  importSoldiers,
  listBattalions,
  getSoldiersFromBattalion,
  searchSoldierByPersonalNumber,
  searchSoldierByName,
  searchSoldierGlobal,
  updateSoldier,
  getSoldierChanges,
  getDashboardData,
  getGlobalStats,
  getBattalionPieStats,
  getAssistanceStats,
  getBattalionStatusBreakdown,
  getSoldiersByAssistanceType,
  SoldierRow,
} from '../services/battalionService';
import { logger } from '../services/logger';

// Hebrew column headers mapped to DB field names
const COLUMN_MAP: Record<string, keyof SoldierRow> = {
  'מספר אישי': 'personal_number',
  'שם משפחה': 'last_name',
  'שם פרטי': 'first_name',
  'טלפון נייד': 'mobile_phone',
  'סטוס פנייה': 'request_status',
  'מצב משפחתי': 'marital_status',
  'מספר ילדים': 'children_count',
  'אינדיקציית סטודנט': 'student_indicator',
  'בן/בת זוג': 'spouse',
  'מספר טלפון בן/בת זוג': 'spouse_phone',
  'אינדיקציות שעלו מהנתונים': 'data_indicators',
  'מי יצרה קשר': 'contact_by',
  'תאריך': 'contact_date',
  'מול מי נוצר הקשר': 'contact_with',
  'סטטוס תעסוקתי': 'employment_status',
  'מיצוי זכויות קרן סיוע פרוט': 'welfare_fund',
  'ביטוח לאומי': 'national_insurance',
  'סיוע אחר': 'other_assistance',
  'אילו בקשות צריך להגיש': 'applications_needed',
  'פירוט/ הערות': 'notes',
  'פירוט/הערות': 'notes',
};

export const importBattalion = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalionName = req.body.battalionName?.trim();
    if (!battalionName) {
      res.status(400).json({ error: 'חסר שם גדוד' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'חסר קובץ Excel' });
      return;
    }

    logger.info('Battalion import started', {
      battalionName,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    // Parse Excel from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      logger.error('Battalion import failed - empty file', { battalionName, fileName: req.file.originalname });
      res.status(400).json({ error: 'הקובץ ריק או לא תקין' });
      return;
    }

    // Read header row (first row)
    const headerRow = worksheet.getRow(1);
    const columnIndexMap: Record<number, keyof SoldierRow> = {};
    const seenFields = new Set<keyof SoldierRow>();
    const unknownHeaders: string[] = [];
    const allRawHeaders: string[] = [];

    headerRow.eachCell((cell, colNumber) => {
      const header = cell.text?.trim();
      if (!header) return;
      allRawHeaders.push(header);
      if (COLUMN_MAP[header]) {
        const field = COLUMN_MAP[header];
        if (!seenFields.has(field)) {
          columnIndexMap[colNumber] = field;
          seenFields.add(field);
        }
      } else {
        unknownHeaders.push(header);
      }
    });

    // Security check: cannot have both personal_number and ID number (ת.ז) in the same file
    // Match only exact column names like "ת.ז", "ת.ז.", "תז", "תעודת זהות", "מספר ת.ז"
    const tzPattern = /^(ת\.?ז\.?|תעודת\s*זהות|מספר\s*ת\.?ז\.?)$/i;
    const hasTz = allRawHeaders.some((h) => tzPattern.test(h.trim()));
    const hasPersonalNumber = seenFields.has('personal_number');
    if (hasPersonalNumber && hasTz) {
      logger.info('Battalion import blocked - security violation: personal_number + tz', { battalionName, fileName: req.file.originalname });
      res.status(400).json({
        error: 'לפי אבטחת מידע של הלשכה המרכזית לסטטיסטיקה (הבלמ"ס), אין אפשרות לייבא קובץ המכיל גם מספר אישי וגם תעודת זהות באותו קובץ.',
      });
      return;
    }

    logger.info('Headers parsed', {
      battalionName,
      mappedColumns: Object.values(columnIndexMap),
      unknownHeaders,
    });

    if (Object.keys(columnIndexMap).length === 0) {
      logger.error('Battalion import failed - no recognized columns', {
        battalionName,
        fileName: req.file.originalname,
        unknownHeaders,
      });
      res.status(400).json({
        error: `לא נמצאו עמודות מוכרות בקובץ. עמודות שנמצאו: ${unknownHeaders.join(', ')}`,
      });
      return;
    }

    // Parse data rows
    const soldiers: SoldierRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const soldier: SoldierRow = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const field = columnIndexMap[colNumber];
        if (field) {
          const value = cell.text?.trim() || '';
          if (value) {
            (soldier as any)[field] = value;
            hasData = true;
          }
        }
      });

      if (hasData) {
        soldiers.push(soldier);
      }
    });

    if (soldiers.length === 0) {
      logger.error('Battalion import failed - no data rows', { battalionName });
      res.status(400).json({ error: 'לא נמצאו שורות נתונים בקובץ' });
      return;
    }

    // Create DB and table if not exists
    await ensureBattalionDatabase(battalionName);

    // Import soldiers
    const insertedCount = await importSoldiers(battalionName, soldiers);

    logger.info('Battalion import completed', {
      battalionName,
      totalRows: soldiers.length,
      insertedRows: insertedCount,
    });

    res.json({
      success: true,
      battalionName,
      totalRows: soldiers.length,
      insertedRows: insertedCount,
      unknownHeaders,
      message: `יובאו ${insertedCount} חיילים לגדוד "${battalionName}"`,
    });
  } catch (error: any) {
    logger.error('Battalion import exception', {
      battalionName: req.body?.battalionName,
      fileName: req.file?.originalname,
      errorMessage: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: error.message || 'שגיאה ביבוא הגדוד' });
  }
};

export const getBattalions = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalions = await listBattalions();
    res.json({ battalions });
  } catch (error: any) {
    logger.error('Get battalions failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בקבלת רשימת גדודים' });
  }
};

export const getBattalionSoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    if (!name) {
      res.status(400).json({ error: 'חסר שם גדוד' });
      return;
    }
    const soldiers = await getSoldiersFromBattalion(decodeURIComponent(name));
    res.json({ soldiers });
  } catch (error: any) {
    logger.error('Get battalion soldiers failed', {
      battalionName: req.params?.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: error.message || 'שגיאה בקבלת חיילי הגדוד' });
  }
};

export const searchSoldier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const { personal_number } = req.query;

    if (!name) {
      res.status(400).json({ error: 'חסר שם גדוד' });
      return;
    }

    if (!personal_number) {
      res.status(400).json({ error: 'חסר מספר אישי' });
      return;
    }

    const soldier = await searchSoldierByPersonalNumber(
      decodeURIComponent(name),
      String(personal_number)
    );

    if (!soldier) {
      res.status(404).json({ error: 'חייל לא נמצא' });
      return;
    }
    res.json({ soldier });
  } catch (error: any) {
    logger.error('Search soldier failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בחיפוש חייל' });
  }
};

export const searchSoldierGlobalHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { personal_number } = req.query;
    if (!personal_number) {
      res.status(400).json({ error: 'חסר מספר אישי' });
      return;
    }
    const result = await searchSoldierGlobal(String(personal_number).trim());
    if (!result) {
      res.status(404).json({ error: 'חייל לא נמצא' });
      return;
    }
    res.json({ soldier: result.soldier, battalionName: result.battalionName });
  } catch (error: any) {
    logger.error('Global search failed', { errorMessage: error.message });
    res.status(500).json({ error: error.message || 'שגיאה בחיפוש' });
  }
};

export const updateSoldierHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, id } = req.params;
    if (!name || !id) {
      res.status(400).json({ error: 'חסר שם גדוד או מזהה חייל' });
      return;
    }
    const changedBy = req.userFirstName && req.userLastName
      ? `${req.userFirstName} ${req.userLastName}`
      : req.userEmail;
    await updateSoldier(decodeURIComponent(name), Number(id), req.body, changedBy);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Update soldier failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בעדכון חייל' });
  }
};

export const getSoldierChangesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, id } = req.params;
    if (!name || !id) {
      res.status(400).json({ error: 'חסר שם גדוד או מזהה חייל' });
      return;
    }
    const changes = await getSoldierChanges(decodeURIComponent(name), Number(id));
    res.json({ changes });
  } catch (error: any) {
    logger.error('Get soldier changes failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בשליפת היסטוריית שינויים' });
  }
};

const DASHBOARD_PEOPLE = ['כוכב', 'נימרוד', 'לילך', 'יקי'];

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalionFilter = req.query.battalion ? String(req.query.battalion) : undefined;
    const [people, globalStats, battalions, battalionPieStats, assistanceStats, battalionStatusBreakdown] = await Promise.all([
      getDashboardData(DASHBOARD_PEOPLE, battalionFilter),
      getGlobalStats(battalionFilter),
      listBattalions(),
      getBattalionPieStats(battalionFilter),
      getAssistanceStats(battalionFilter),
      getBattalionStatusBreakdown(battalionFilter),
    ]);
    res.json({ people, globalStats, battalions, battalionPieStats, assistanceStats, battalionStatusBreakdown });
  } catch (error: any) {
    logger.error('Dashboard error', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בטעינת דשבורד' });
  }
};

const VALID_ASSISTANCE_TYPES = new Set(['national_insurance', 'welfare_fund', 'other_assistance']);

export const getAssistanceSoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const { type } = req.query;
    if (!name || !type || !VALID_ASSISTANCE_TYPES.has(String(type))) {
      res.status(400).json({ error: 'חסר שם גדוד או סוג סיוע לא תקין' });
      return;
    }
    const soldiers = await getSoldiersByAssistanceType(
      decodeURIComponent(name),
      String(type) as 'national_insurance' | 'welfare_fund' | 'other_assistance'
    );
    res.json({ soldiers });
  } catch (error: any) {
    logger.error('Get assistance soldiers failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בשליפת חיילים לפי סיוע' });
  }
};

export const downloadTemplate = async (_req: Request, res: Response): Promise<void> => {
  const headers = [
    'מספר אישי', 'שם משפחה', 'שם פרטי', 'טלפון נייד',
    'סטוס פנייה', 'מצב משפחתי', 'מספר ילדים',
    'אינדיקציית סטודנט', 'בן/בת זוג', 'מספר טלפון בן/בת זוג',
    'אינדיקציות שעלו מהנתונים', 'מי יצרה קשר', 'תאריך', 'מול מי נוצר הקשר',
    'סטטוס תעסוקתי', 'מיצוי זכויות קרן סיוע פרוט', 'ביטוח לאומי',
    'סיוע אחר', 'אילו בקשות צריך להגיש', 'פירוט/ הערות',
  ];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('גדוד', { views: [{ rightToLeft: true }] });

  sheet.addRow(headers);

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  headerRow.alignment = { horizontal: 'center' };
  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = 22;
  });

  // Add one example row
  sheet.addRow([
    '1234567', 'כהן', 'ישראל', '050-1234567',
    'ממתין לטיפול', 'נשוי', '2',
    'לא', 'שרה כהן', '050-7654321',
    '', '', '', 'החייל',
    'שכיר', '', 'לא נדרש',
    '', '', '',
  ]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="battalion_template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};
