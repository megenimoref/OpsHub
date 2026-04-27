import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import mysql from 'mysql2/promise';
import { fn, col, Op } from 'sequelize';
import SoldierAllocation from '../models/soldierAllocation';
import User from '../models/user';
import Notification from '../models/notification';
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
  getBattalionDemographics,
  getSoldiersByAssistanceType,
  getBattalionDbName,
  findCrossBattalionDuplicates,
  SoldierRow,
  SoldierRowWithExtras,
} from '../services/battalionService';
import { logger } from '../services/logger';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

// Normalize imported field values to match frontend dropdown options
function normalizeImportedValue(field: keyof SoldierRow, raw: string): string {
  const v = raw.trim();
  if (!v) return v;

  if (field === 'marital_status') {
    if (/^נשו/.test(v)) return 'נשוי';      // נשוי, נשוי/ה, נשואה
    if (/^רווק/.test(v)) return 'רווק';     // רווק, רווק/ה, רווקה
    if (/^גרוש/.test(v)) return 'גרוש';    // גרוש, גרוש/ה, גרושה
    if (/^אלמ/.test(v)) return 'אלמן';      // אלמן, אלמנה
    if (v === 'נ') return 'נשוי';           // single-letter codes from מצב אישי ר\נ\ג\א\פ column
    if (v === 'ר') return 'רווק';
    if (v === 'ג') return 'גרוש';
    if (v === 'א') return 'אלמן';
    if (v === 'פ') return 'פרוד';
    return v;
  }

  if (field === 'student_indicator') {
    if (v === 'כן' || v === 'y' || v === 'yes' || v === '1' || v === 'true') return 'כן';
    if (v === 'לא' || v === 'n' || v === 'no' || v === '0' || v === 'false') return 'לא';
    return v;
  }

  if (field === 'children_count') {
    // Excel may store as number; keep as string digit
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0) return String(n);
    return v;
  }

  if (field === 'employment_status') {
    if (/^מובטל/.test(v)) return 'מובטל';   // מובטל, מובטלת
    if (/^עצמאי/.test(v)) return 'עצמאי';   // עצמאי, עצמאית
    if (/^שכיר/.test(v)) return 'שכיר';     // שכיר, שכירה
    return v;
  }

  if (field === 'contact_with') {
    if (/^החייל/.test(v)) return 'החייל';   // החייל, החיילת
    if (/^קרוב/.test(v)) return 'קרוב';     // קרוב, קרובה, קרוב משפחה
    return v;
  }

  if (field === 'national_insurance') {
    if (v === 'לא' || v === 'לא נדרש') return 'לא נדרש';
    if (v === 'כן' || v === 'נדרש') return 'נדרש';
    if (v === 'לא נדרש' || v === 'נדרש' || v === 'אחר') return v;
    // Any other text → treat as 'אחר' with detail
    if (!v.startsWith('אחר - ')) return `אחר - ${v}`;
    return v;
  }

  if (field === 'contact_date') {
    // Already converted from Date object before calling this function
    return v;
  }

  return v;
}

// Hebrew column headers mapped to DB field names
const COLUMN_MAP: Record<string, keyof SoldierRow> = {
  'מספר אישי': 'personal_number',
  "מס' אישי": 'personal_number',
  'מס אישי': 'personal_number',
  'מספר.אישי': 'personal_number',
  'שם משפחה': 'last_name',
  'שם פרטי': 'first_name',
  'טלפון נייד': 'mobile_phone',
  'טלפון': 'mobile_phone',
  'נייד': 'mobile_phone',
  'טלפון עיקרי': 'mobile_phone',
  'סטטוס פנייה': 'request_status',
  'סטטוס': 'request_status',
  'מצב משפחתי': 'marital_status',
  'מצב אישי ר\\נ\\ג\\א\\פ': 'marital_status',
  'מצב אישי': 'marital_status',
  'מספר ילדים': 'children_count',
  'אינדיקציית סטודנט': 'student_indicator',
  'סטודנט (מלגה\\לא)': 'student_indicator',
  'סטודנט': 'student_indicator',
  'בן/בת זוג': 'spouse',
  'בת זוג/אמא': 'spouse',
  'מספר טלפון בן/בת זוג': 'spouse_phone',
  'טלפון בת זוג/אמא': 'spouse_phone',
  'אינדיקציות שעלו מהנתונים': 'data_indicators',
  'מי יצרה קשר': 'contact_by',
  'תאריך': 'contact_date',
  'מול מי נוצר הקשר': 'contact_with',
  'סטטוס תעסוקתי': 'employment_status',
  'מיצוי זכויות קרן סיוע פרוט': 'welfare_fund',
  'קרן סיוע הגשות': 'welfare_fund',
  'מה החייל הגיש לקרן הסיוע': 'aid_fund_submission',
  'הגשות לקרן הסיוע': 'aid_fund_submission',
  'ביטוח לאומי': 'national_insurance',
  'ביטוח לאומי בעיות': 'national_insurance',
  'סיוע אחר': 'other_assistance',
  'סיוע כללי': 'other_assistance',
  'אילו בקשות צריך להגיש': 'applications_needed',
  'פירוט/ הערות': 'notes',
  'פירוט/הערות': 'notes',
  'הודעות': 'notes',
  'ימי מילואים 2025': 'reserve_days_2025',
  'ימי מילואים שנת 2025': 'reserve_days_2025',
  'מילואים 2025': 'reserve_days_2025',
  'ימי מילואים 2026': 'reserve_days_2026',
  'ימי מילואים שנת 2026': 'reserve_days_2026',
  'מילואים 2026': 'reserve_days_2026',
  'תפקיד פיקודי': 'command_role',
  'תפקיד': 'command_role',
  'גילאי ילדים': 'children_ages',
  'גילאי הילדים': 'children_ages',
  'גיל': 'age',
  'מחלקה': 'platoon',
  'סבב נוכחי כן\\לא': 'current_rotation',
  'סבב נוכחי': 'current_rotation',
  'סטטוס מיוחד משפחתי': 'special_family_status',
  'תיעוד שיחה בת זוג\\אמא': 'spouse_call_doc',
  'תיעוד שיחה בת זוג/אמא': 'spouse_call_doc',
  'whatsapp גדודי ופלוגתי': 'whatsapp_battalion',
  'whatsapp משפחה גדודי': 'whatsapp_family',
  'גרוש\\פרוד- עזרה': 'divorced_assistance',
  'גרוש/פרוד- עזרה': 'divorced_assistance',
  'גרוש\\פרוד-עזרה': 'divorced_assistance',
  'לידה (לפני\\אחרי\\צריכים)': 'birth_assistance',
  'לידה (לפני/אחרי/צריכים)': 'birth_assistance',
  'לידה': 'birth_assistance',
  'מעבר דירה במהלך לפ': 'moving_assistance',
  'מעבר דירה': 'moving_assistance',
  'כלכלת בית (בייביס)': 'household_assistance',
  'כלכלת בית': 'household_assistance',
  'בעיות מורכבות': 'complex_problems',
  'חוסן טיפולים רגשיים': 'resilience_treatment',
  'חוסן': 'resilience_treatment',
  'מעקב 1': 'followup_1',
  'מעקב1': 'followup_1',
  'מעקב 2': 'followup_2',
  'מעקב2': 'followup_2',
  'ציוד אישי': 'personal_equipment',
  'תאריכי גיוס/סבבים': 'mobilization_dates',
  'תאריכי גיוס': 'mobilization_dates',
  'סבבים': 'mobilization_dates',
  'כביש 6': 'route_6',
  'כביש6': 'route_6',
  'איש מקצוע': 'professional',
};

// Columns that are silently skipped during import for security/privacy reasons.
// "תעודת זהות" must not be stored alongside personal_number (CBS privacy rules).
const SKIP_COLUMNS = new Set(['תעודת זהות']);

export const createBattalion = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalionName = req.body.battalionName?.trim();
    if (!battalionName) {
      res.status(400).json({ error: 'חסר מספר גדוד' });
      return;
    }

    if (battalionName.includes(' ')) {
      res.status(400).json({ error: 'שם הגדוד לא יכול להכיל רווחים. השתמש בקו תחתון במקום רווח (לדוגמה: מפקדה_גדוד)' });
      return;
    }
    if (!/^[\u05D0-\u05EA\u05F0-\u05F4a-zA-Z0-9_]+$/.test(battalionName)) {
      res.status(400).json({ error: 'שם הגדוד יכול להכיל אותיות עבריות/אנגליות, ספרות וקו תחתון בלבד' });
      return;
    }

    const existing = await listBattalions();
    if (existing.includes(battalionName)) {
      res.status(409).json({ error: `גדוד "${battalionName}" כבר קיים` });
      return;
    }

    await ensureBattalionDatabase(battalionName);
    logger.info('Battalion created', { battalionName });
    res.json({ success: true, message: `גדוד "${battalionName}" נוצר בהצלחה` });
  } catch (error: any) {
    logger.error('Create battalion failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה ביצירת הגדוד' });
  }
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

    // Parse Excel from buffer.
    // ExcelJS only supports .xlsx (zip+XML). .xls / .csv / corrupted files
    // throw a cryptic JSZip error ("Can't find end of central directory") —
    // intercept and replace with a Hebrew message the user can act on.
    const workbook = new ExcelJS.Workbook();
    try {
      // .xlsx files are zip archives — first 2 bytes must be "PK" (0x50 0x4B).
      const buf = req.file.buffer;
      const looksLikeZip = buf && buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b;
      if (!looksLikeZip) {
        const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
        const hint =
          ext === 'xls'
            ? ' (זוהה קובץ .xls ישן — יש לשמור אותו מחדש כ-Excel Workbook ‎.xlsx‎)'
            : ext === 'csv'
            ? ' (זוהה קובץ .csv — יש לפתוח ב-Excel ולשמור כ-‎.xlsx‎)'
            : '';
        logger.error('Battalion import failed - not an xlsx file', {
          battalionName,
          fileName: req.file.originalname,
          ext,
        });
        res.status(400).json({
          error: `הקובץ אינו בפורמט Excel תקין (.xlsx)${hint}.`,
        });
        return;
      }
      await workbook.xlsx.load(buf as any);
    } catch (parseErr: any) {
      logger.error('Battalion import failed - xlsx parse error', {
        battalionName,
        fileName: req.file.originalname,
        errorMessage: parseErr?.message,
      });
      res.status(400).json({
        error: 'לא ניתן לקרוא את הקובץ. ייתכן שהוא פגום, או נשמר בפורמט ישן (.xls). יש לשמור אותו מחדש כ-Excel Workbook (‎.xlsx‎).',
      });
      return;
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      logger.error('Battalion import failed - empty file', { battalionName, fileName: req.file.originalname });
      res.status(400).json({ error: 'הקובץ ריק או לא תקין' });
      return;
    }

    // Read header row (first row)
    const headerRow = worksheet.getRow(1);
    const columnIndexMap: Record<number, keyof SoldierRow> = {};
    const extraColumnIndexMap: Record<number, string> = {};
    const seenFields = new Set<keyof SoldierRow>();
    const seenExtraFields = new Set<string>();
    const unknownHeaders: string[] = [];
    const allRawHeaders: string[] = [];

    const skippedColumns: string[] = [];
    // Columns that represent split employment booleans → merged into employment_status
    const EMPLOYMENT_SPLIT: Record<string, string> = {
      'שכיר': 'שכיר',
      'עצמאי': 'עצמאי',
      'לא עובד': 'לא עובד',
    };
    const employmentColumnMap: Record<number, string> = {}; // colNumber → label

    headerRow.eachCell((cell, colNumber) => {
      const header = cell.text?.trim();
      if (!header) return;
      allRawHeaders.push(header);

      // Skip privacy-sensitive columns silently
      if (SKIP_COLUMNS.has(header)) {
        skippedColumns.push(header);
        return;
      }

      // Split employment columns → will be merged into employment_status per row
      if (EMPLOYMENT_SPLIT[header] && !seenFields.has('employment_status')) {
        employmentColumnMap[colNumber] = EMPLOYMENT_SPLIT[header];
        // Mark employment_status as "seen" so a direct employment_status column still wins if present
        seenFields.add('employment_status');
        return;
      }

      if (COLUMN_MAP[header]) {
        const field = COLUMN_MAP[header];
        if (!seenFields.has(field)) {
          columnIndexMap[colNumber] = field;
          seenFields.add(field);
        }
      } else {
        // Sanitize: remove backticks, limit length
        const safeHeader = header.replace(/`/g, '').substring(0, 64);
        if (safeHeader && !seenExtraFields.has(safeHeader)) {
          extraColumnIndexMap[colNumber] = safeHeader;
          seenExtraFields.add(safeHeader);
          unknownHeaders.push(header);
        }
      }
    });

    // Security check: cannot have both personal_number and a ת.ז column that wasn't skipped
    // "תעודת זהות" is handled by SKIP_COLUMNS above; block only if an un-skipped ת.ז variant appears
    const tzPattern = /^(ת\.?ז\.?|מספר\s*ת\.?ז\.?)$/i;
    const hasTz = allRawHeaders.some((h) => tzPattern.test(h.trim()) && !SKIP_COLUMNS.has(h.trim()));
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
    const soldiers: SoldierRowWithExtras[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const soldier: SoldierRowWithExtras = {};
      let hasData = false;

      const employmentParts: string[] = [];

      row.eachCell((cell, colNumber) => {
        // Handle Date objects (ExcelJS returns Date for date cells; cell.text is empty for them)
        let value: string;
        const cv = cell.value;
        if (cv instanceof Date) {
          const d = cv;
          value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          value = cell.text?.trim() || '';
        }
        if (!value) return;

        // Split employment columns: collect non-empty ones and merge later
        if (employmentColumnMap[colNumber]) {
          employmentParts.push(employmentColumnMap[colNumber]);
          hasData = true;
          return;
        }

        const field = columnIndexMap[colNumber];
        if (field) {
          (soldier as any)[field] = normalizeImportedValue(field, value);
          hasData = true;
        } else {
          const extraField = extraColumnIndexMap[colNumber];
          if (extraField) {
            soldier[extraField] = value;
            hasData = true;
          }
        }
      });

      // Merge split employment columns into employment_status (only if not already set by a direct column)
      if (employmentParts.length > 0 && !(soldier as any).employment_status) {
        (soldier as any).employment_status = employmentParts.join(' + ');
      }

      // Default: if national_insurance not set (empty in Excel) → 'לא נדרש'
      if (hasData && seenFields.has('national_insurance') && !(soldier as any).national_insurance) {
        (soldier as any).national_insurance = 'לא נדרש';
      }

      if (hasData) {
        soldiers.push(soldier);
      }
    });

    if (soldiers.length === 0) {
      logger.error('Battalion import failed - no data rows', { battalionName });
      res.status(400).json({ error: 'לא נמצאו שורות נתונים בקובץ' });
      return;
    }

    // ── Duplicate detection ──────────────────────────────────────────────────

    // 1. Within-file duplicates: same personal_number appearing more than once
    const personalNumbersSeen = new Map<string, number>(); // pn → first row index
    const inFileDuplicates: { personalNumber: string; name: string; rowCount: number }[] = [];
    const pnRowCount = new Map<string, number>();
    for (const s of soldiers) {
      const pn = (s.personal_number as string | undefined)?.trim();
      if (!pn) continue;
      pnRowCount.set(pn, (pnRowCount.get(pn) || 0) + 1);
    }
    for (const [pn, count] of pnRowCount) {
      if (count > 1) {
        const first = soldiers.find((s) => (s.personal_number as string)?.trim() === pn);
        const name = first ? `${first.first_name || ''} ${first.last_name || ''}`.trim() : '';
        inFileDuplicates.push({ personalNumber: pn, name, rowCount: count });
      }
    }

    // 2. Cross-battalion duplicates: personal_number already in a different battalion DB
    const allPersonalNumbers = soldiers
      .map((s) => (s.personal_number as string | undefined)?.trim())
      .filter((pn): pn is string => !!pn);
    const crossBattalionDuplicates = await findCrossBattalionDuplicates(battalionName, allPersonalNumbers);

    if (inFileDuplicates.length > 0 || crossBattalionDuplicates.length > 0) {
      logger.info('Duplicate soldiers detected during import', {
        battalionName,
        inFileDuplicates: inFileDuplicates.length,
        crossBattalionDuplicates: crossBattalionDuplicates.length,
      });
    }

    // ────────────────────────────────────────────────────────────────────────

    // importMode: 'new' = overwrite all fields + skip existing allocations
    //             'existing' = only update non-empty fields + upsert allocations by contact_by
    const importMode: 'new' | 'existing' = req.body.importMode === 'new' ? 'new' : 'existing';
    const isNewImport = importMode === 'new';

    // Create DB and table if not exists
    await ensureBattalionDatabase(battalionName);

    // Import soldiers (including any new dynamic columns)
    const extraColumns = Object.values(extraColumnIndexMap).filter(
      (v, i, arr) => arr.indexOf(v) === i
    );
    const insertedCount = await importSoldiers(battalionName, soldiers, extraColumns, isNewImport);

    // Auto-allocate soldiers to users based on contact_by field matching user firstName
    let allocatedCount = 0;
    const unmatchedContactNames: string[] = [];
    try {
      const uniqueContactByNames = [
        ...new Set(
          soldiers
            .filter((s) => s.contact_by && s.personal_number)
            .map((s) => (s.contact_by as string).trim())
        ),
      ];

      if (uniqueContactByNames.length > 0) {
        // Fetch all users and build a trimmed-firstName → userId map
        const allUsers = await User.findAll({
          attributes: ['id', 'firstName', 'lastName'],
          raw: true,
        });

        const nameToUserId: Record<string, number> = {};
        (allUsers as any[]).forEach((u: any) => {
          if (u.firstName) nameToUserId[u.firstName.trim()] = u.id;
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          if (fullName) nameToUserId[fullName] = u.id;
        });

        // Resolve a contact_by value (may contain "/" separated names) to a user ID.
        // Tries the full value first, then each individual part split by "/".
        const resolveContactBy = (contactBy: string): number | undefined => {
          const full = contactBy.trim();
          if (nameToUserId[full]) return nameToUserId[full];
          const parts = full.split('/').map((p) => p.trim()).filter(Boolean);
          for (const part of parts) {
            if (nameToUserId[part]) return nameToUserId[part];
          }
          return undefined;
        };

        // Track which contact_by names had no matching user
        uniqueContactByNames.forEach((name) => {
          if (!resolveContactBy(name)) unmatchedContactNames.push(name);
        });

        const allocationsToInsert: { user_id: number; battalion_name: string; soldier_personal_number: string }[] = [];
        for (const soldier of soldiers) {
          const contactBy = (soldier.contact_by as string | undefined)?.trim();
          const userId = contactBy ? resolveContactBy(contactBy) : undefined;
          if (contactBy && soldier.personal_number && userId) {
            allocationsToInsert.push({
              user_id: userId,
              battalion_name: battalionName,
              soldier_personal_number: soldier.personal_number as string,
            });
          }
        }

        if (isNewImport) {
          // New import: wipe all existing allocations for this battalion so the
          // result matches the Excel exactly, then re-insert from scratch.
          await SoldierAllocation.destroy({ where: { battalion_name: battalionName } });
        }

        if (allocationsToInsert.length > 0) {
          if (isNewImport) {
            // All old allocations were just deleted — plain insert, no conflicts possible
            await SoldierAllocation.bulkCreate(allocationsToInsert);
          } else {
            // Existing import: overwrite allocation based on contact_by (one user per soldier)
            await SoldierAllocation.bulkCreate(allocationsToInsert, {
              updateOnDuplicate: ['user_id', 'updatedAt'],
            });
          }
          allocatedCount = allocationsToInsert.length;
          // Create notifications for each newly allocated soldier
          const notificationsToInsert = allocationsToInsert.map((a) => ({
            user_id: a.user_id,
            message: `יובא לטיפולך חייל ${a.soldier_personal_number} מגדוד ${battalionName}`,
          }));
          await Notification.bulkCreate(notificationsToInsert);
        }
      }
    } catch (allocErr: any) {
      logger.error('Auto-allocation after import failed (non-fatal)', {
        battalionName,
        errorMessage: allocErr.message,
      });
    }

    logger.info('Battalion import completed', {
      battalionName,
      totalRows: soldiers.length,
      insertedRows: insertedCount,
      allocatedSoldiers: allocatedCount,
      unmatchedContactNames,
    });

    const withoutContactBy = soldiers.filter((s) => !s.contact_by || !(s.contact_by as string).trim()).length;

    res.json({
      success: true,
      battalionName,
      totalRows: soldiers.length,
      insertedRows: insertedCount,
      allocatedSoldiers: allocatedCount,
      withoutContactBy,
      unmatchedContactNames,
      unknownHeaders,
      skippedColumns,
      inFileDuplicates,
      crossBattalionDuplicates,
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

// Refresh allocations for a battalion based on contact_by field in soldiers table.
// For each soldier with a contact_by that matches a user firstName, upsert the allocation.
// Soldiers without contact_by are left as-is (unallocated).
export const refreshAllocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalionName = decodeURIComponent(req.params.name);
    if (!battalionName) {
      res.status(400).json({ error: 'חסר שם גדוד' });
      return;
    }

    const dbName = getBattalionDbName(battalionName);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    let soldiers: { personal_number: string; contact_by: string | null }[] = [];
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT personal_number, contact_by FROM soldiers'
      );
      soldiers = rows as { personal_number: string; contact_by: string | null }[];
    } finally {
      await conn.end();
    }

    const allUsers = await User.findAll({ attributes: ['id', 'firstName', 'lastName'], raw: true });
    const nameToUserId: Record<string, number> = {};
    (allUsers as any[]).forEach((u: any) => {
      if (u.firstName) nameToUserId[u.firstName.trim()] = u.id;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      if (fullName) nameToUserId[fullName] = u.id;
    });

    // Resolve a contact_by value (may contain "/" separated names) to a user ID
    const resolveContactBy = (contactBy: string): number | undefined => {
      const full = contactBy.trim();
      if (nameToUserId[full]) return nameToUserId[full];
      const parts = full.split('/').map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (nameToUserId[part]) return nameToUserId[part];
      }
      return undefined;
    };

    const allocationsToUpsert: { user_id: number; battalion_name: string; soldier_personal_number: string }[] = [];
    const unmatched: string[] = [];

    for (const s of soldiers) {
      const contactBy = s.contact_by?.trim();
      if (!contactBy) continue;
      const userId = resolveContactBy(contactBy);
      if (userId) {
        allocationsToUpsert.push({
          user_id: userId,
          battalion_name: battalionName,
          soldier_personal_number: s.personal_number,
        });
      } else {
        if (!unmatched.includes(contactBy)) unmatched.push(contactBy);
      }
    }

    if (allocationsToUpsert.length > 0) {
      await SoldierAllocation.bulkCreate(allocationsToUpsert, {
        updateOnDuplicate: ['user_id', 'updatedAt'],
      });
    }

    logger.info('Refresh allocations completed', {
      battalionName,
      updated: allocationsToUpsert.length,
      unmatched,
    });

    res.json({
      success: true,
      updated: allocationsToUpsert.length,
      unmatched,
      message: `עודכנו ${allocationsToUpsert.length} הקצאות לגדוד "${battalionName}"`,
    });
  } catch (error: any) {
    logger.error('Refresh allocations failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה ברענון הקצאות' });
  }
};

export const deleteBattalion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    if (!name) {
      res.status(400).json({ error: 'חסר שם גדוד' });
      return;
    }

    const dbName = getBattalionDbName(name);
    logger.info('Delete battalion started', { battalionName: name, dbName });

    // Drop the battalion database
    const conn = await mysql.createConnection(dbConfig);
    try {
      await conn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
    } finally {
      await conn.end();
    }

    // Remove all SoldierAllocation records for this battalion
    await SoldierAllocation.destroy({ where: { battalion_name: name } });

    logger.info('Delete battalion completed', { battalionName: name, dbName });
    res.json({ success: true, message: `גדוד "${name}" נמחק בהצלחה` });
  } catch (error: any) {
    logger.error('Delete battalion failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה במחיקת הגדוד' });
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
    const battalionName = decodeURIComponent(name);
    const changedBy = req.userFirstName && req.userLastName
      ? `${req.userFirstName} ${req.userLastName}`
      : req.userEmail;
    const { personalNumber } = await updateSoldier(battalionName, Number(id), req.body, changedBy);

    // Auto-allocate to the user matching contact_by when it changes
    const contactBy = (req.body.contact_by || '').trim();
    if (contactBy && personalNumber) {
      const [firstName, ...lastParts] = contactBy.split(' ');
      const lastName = lastParts.join(' ');
      const targetUser = await User.findOne({
        where: { firstName, ...(lastName ? { lastName } : {}) },
      });
      if (targetUser) {
        const existing = await SoldierAllocation.findOne({
          where: { battalion_name: battalionName, soldier_personal_number: personalNumber },
        });
        if (existing) {
          await existing.update({ user_id: targetUser.id });
        } else {
          await SoldierAllocation.create({
            user_id: targetUser.id,
            battalion_name: battalionName,
            soldier_personal_number: personalNumber,
          });
        }
        // Notify the target user
        await Notification.create({
          user_id: targetUser.id,
          message: `${changedBy || 'מישהו'} העביר/ה לטיפולך פנייה של חייל ${personalNumber} מגדוד ${battalionName}`,
        });
      }
    }

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


async function getUsersAllocation(battalionFilter?: string): Promise<{ id: number; firstName: string; lastName: string; email: string; role: string; allocated: number; byStatus: { status: string; count: number }[] }[]> {
  const users = await User.findAll({ attributes: ['id', 'firstName', 'lastName', 'email', 'role'], raw: true });

  const whereClause = battalionFilter ? { battalion_name: battalionFilter } : {};
  const allocations = await SoldierAllocation.findAll({
    where: whereClause,
    attributes: ['user_id', 'battalion_name', 'soldier_personal_number'],
    raw: true,
  });

  // Group allocations: userId → battalionName → personalNumbers[]
  const userBattalionMap: Record<number, Record<string, string[]>> = {};
  for (const alloc of allocations as any[]) {
    if (!userBattalionMap[alloc.user_id]) userBattalionMap[alloc.user_id] = {};
    if (!userBattalionMap[alloc.user_id][alloc.battalion_name]) userBattalionMap[alloc.user_id][alloc.battalion_name] = [];
    userBattalionMap[alloc.user_id][alloc.battalion_name].push(alloc.soldier_personal_number);
  }

  // Query each battalion DB for request_status counts per user
  const userStatusMap: Record<number, Record<string, number>> = {};
  const userAllocatedMap: Record<number, number> = {};

  for (const [userIdStr, battalionMap] of Object.entries(userBattalionMap)) {
    const userId = Number(userIdStr);
    userAllocatedMap[userId] = 0;
    userStatusMap[userId] = {};

    for (const [battalionName, personalNumbers] of Object.entries(battalionMap)) {
      if (personalNumbers.length === 0) continue;
      userAllocatedMap[userId] += personalNumbers.length;

      const dbName = getBattalionDbName(battalionName);
      try {
        const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
        try {
          const placeholders = personalNumbers.map(() => '?').join(',');
          const [rows] = await conn.execute<mysql.RowDataPacket[]>(
            `SELECT request_status, COUNT(*) as cnt FROM soldiers WHERE personal_number IN (${placeholders}) GROUP BY request_status`,
            personalNumbers
          );
          for (const row of rows) {
            const status = row.request_status || '';
            userStatusMap[userId][status] = (userStatusMap[userId][status] || 0) + Number(row.cnt);
          }
        } finally {
          await conn.end();
        }
      } catch {
        // Battalion DB might be inaccessible — skip silently
      }
    }
  }

  return (users as any[])
    .map((u) => ({
      ...u,
      allocated: userAllocatedMap[u.id] || 0,
      byStatus: Object.entries(userStatusMap[u.id] || {})
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.allocated - a.allocated);
}

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalionFilter = req.query.battalion ? String(req.query.battalion) : undefined;

    // Dynamically load all user firstNames for the "by handler" general tab section
    const allUsersRaw = await User.findAll({ attributes: ['firstName'], raw: true });
    const peopleNames = [...new Set(
      (allUsersRaw as any[]).map((u: any) => u.firstName).filter(Boolean)
    )];

    const [people, globalStats, battalions, battalionPieStats, assistanceStats, battalionStatusBreakdown, usersAllocation, battalionDemographics] = await Promise.all([
      getDashboardData(peopleNames, battalionFilter),
      getGlobalStats(battalionFilter),
      listBattalions(),
      getBattalionPieStats(battalionFilter),
      getAssistanceStats(battalionFilter),
      getBattalionStatusBreakdown(battalionFilter),
      getUsersAllocation(battalionFilter),
      getBattalionDemographics(battalionFilter),
    ]);
    res.json({ people, globalStats, battalions, battalionPieStats, assistanceStats, battalionStatusBreakdown, usersAllocation, battalionDemographics });
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

// Reverse map: DB field → Hebrew header (for export)
const REVERSE_COLUMN_MAP: Record<string, string> = Object.entries(COLUMN_MAP).reduce(
  (acc, [heb, field]) => ({ ...acc, [field]: acc[field] ?? heb }),
  {} as Record<string, string>
);

const EXPORT_SKIP_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

export const exportBattalion = async (req: Request, res: Response): Promise<void> => {
  try {
    const battalionName = decodeURIComponent(req.params.name || '');
    if (!battalionName) {
      res.status(400).json({ error: 'חסר שם גדוד' });
      return;
    }

    const dbName = getBattalionDbName(battalionName);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });

    let rows: mysql.RowDataPacket[] = [];
    let columns: string[] = [];
    try {
      const [colRows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'
         ORDER BY ORDINAL_POSITION`,
        [dbName]
      );
      columns = (colRows as any[])
        .map((r: any) => r.COLUMN_NAME as string)
        .filter((c) => !EXPORT_SKIP_COLUMNS.has(c));

      [rows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM soldiers ORDER BY id ASC');
    } finally {
      await conn.end();
    }

    // Build Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(battalionName, { views: [{ rightToLeft: true }] });

    // Header row — use Hebrew label where available, else raw column name
    const headers = columns.map((c) => REVERSE_COLUMN_MAP[c] || c);
    sheet.addRow(headers);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    headerRow.alignment = { horizontal: 'center' };
    columns.forEach((_, i) => { sheet.getColumn(i + 1).width = 22; });

    // Data rows
    for (const row of rows) {
      sheet.addRow(columns.map((c) => row[c] ?? ''));
    }

    logger.info('Battalion export completed', { battalionName, rows: rows.length });

    // HTTP headers must be ASCII — Hebrew battalion names break Content-Disposition
    // unless we use RFC 5987 (filename*) and provide an ASCII fallback for filename=.
    const asciiFallback = `battalion_export.xlsx`;
    const utf8Encoded = encodeURIComponent(`${battalionName}_export.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    logger.error('Battalion export failed', { battalionName: req.params?.name, errorMessage: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'שגיאה ביצוא הגדוד' });
    } else {
      res.end();
    }
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
    'ימי מילואים 2025', 'ימי מילואים 2026',
    'תפקיד פיקודי', 'גילאי ילדים',
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
    '120', '100',
    'מ"פ', '5,8,12',
  ]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="battalion_template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};
