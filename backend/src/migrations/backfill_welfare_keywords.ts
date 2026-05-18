/**
 * backfill_welfare_keywords.ts
 *
 * Pass 1 — Dropdown fields:
 *   Scans all free-text / notes fields per soldier.
 *   Finds keywords → sets the matching structured dropdown field to 'נדרש'
 *   (only when the field is currently empty).
 *
 * Pass 2 — Text routing:
 *   Takes content from generic/old text fields (notes, data_indicators,
 *   other_assistance, applications_needed, aid_fund_submission, notes_general)
 *   and appends each line to the most relevant section notes field
 *   (notes_welfare, notes_rights, notes_employment, notes_family, notes_reserve, notes_personal).
 *   Lines that don't match any section stay in notes_general (or notes).
 *
 * Run:
 *   npx ts-node src/migrations/backfill_welfare_keywords.ts
 *   DRY_RUN=1 npx ts-node src/migrations/backfill_welfare_keywords.ts
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = process.env.DRY_RUN === '1';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

// ─── Pass 1: Keyword → dropdown field ────────────────────────────────────────

interface Rule {
  keywords: string[];
  field: string;
  targetValue: string;
}

const DROPDOWN_RULES: Rule[] = [
  { keywords: ['קרן הסיוע', 'קרן סיוע'], field: 'welfare_fund', targetValue: 'נדרש' },
  { keywords: ['כביש 6', 'כביש6', 'כביש-6'], field: 'route_6', targetValue: 'נדרש' },
  { keywords: ['עורך דין', 'עו"ד', "עו''ד", 'ייעוץ משפטי', 'עורך-דין'], field: 'legal_advice', targetValue: 'נדרש' },
  { keywords: ['ביטוח לאומי', 'ב"ל', "ב''ל", 'בטוח לאומי'], field: 'national_insurance', targetValue: 'נדרש' },
  { keywords: ['מס הכנסה', 'רואה חשבון', 'ר"ח', "ר''ח", 'רו"ח'], field: 'income_tax', targetValue: 'נדרש' },
  { keywords: ['קייטנה', 'קייטנות', 'קיטנה'], field: 'summer_camp', targetValue: 'נדרש' },
  { keywords: ['בייביסיטר', 'בייבי סיטר', 'בייבי-סיטר', 'babysitter', 'baby sitter'], field: 'household_assistance', targetValue: 'נדרש' },
  { keywords: ['מענק לידה', 'לידה'], field: 'birth_grant', targetValue: 'נדרש' },
  { keywords: ['תיקונים', 'תיקון בית', 'שיפוץ'], field: 'repairs', targetValue: 'נדרש' },
  { keywords: ['מעבר דירה', 'העברת דירה', 'מעבר-דירה'], field: 'moving_assistance', targetValue: 'נדרש' },
  { keywords: ['ציוד אישי', 'ציוד קרבי'], field: 'personal_equipment', targetValue: 'נדרש' },
  { keywords: ['פייטר'], field: 'fighter', targetValue: 'נדרש' },
  { keywords: ['שובר חופשה', 'שובר נופש'], field: 'vacation_break', targetValue: 'נדרש' },
  { keywords: ['פיצוי חופשות', 'פיצוי חופשה'], field: 'vacation_compensation', targetValue: 'פיצוי חופשות' },
  { keywords: ['חוסן זוגי', 'חוסן רגשי', 'חוסן עמית'], field: 'resilience_couples', targetValue: 'נדרש' },
  { keywords: ['עמותה', 'עמותות', 'ארגון התנדבות'], field: 'nonprofit_assistance', targetValue: 'נדרש' },
];

// All text fields to scan for Pass 1
const ALL_TEXT_FIELDS = [
  'notes_personal', 'notes_family', 'notes_employment', 'notes_welfare',
  'notes_reserve', 'notes_rights', 'notes_general', 'notes',
  'data_indicators', 'other_assistance', 'applications_needed',
  'aid_fund_submission', 'birth_assistance', 'mobilization_dates',
  'income_tax', 'legal_advice', 'nonprofit_assistance',
];

// ─── Pass 2: Route free text to section notes ─────────────────────────────────

// Source fields whose content we redistribute (old/generic fields)
const SOURCE_TEXT_FIELDS = [
  'notes', 'data_indicators', 'other_assistance',
  'applications_needed', 'aid_fund_submission', 'notes_general',
];

// Section keyword clusters — ordered from most specific to least
interface SectionRoute {
  notesField: string;       // destination notes field
  keywords: string[];
}

const SECTION_ROUTES: SectionRoute[] = [
  {
    notesField: 'notes_welfare',
    keywords: [
      'קרן הסיוע', 'קרן סיוע', 'כביש 6', 'כביש-6', 'קייטנה', 'קייטנות',
      'בייביסיטר', 'בייבי סיטר', 'מענק לידה', 'תיקונים', 'שיפוץ',
      'מעבר דירה', 'ציוד אישי', 'פייטר', 'שובר חופשה', 'פיצוי חופשות',
      'חוסן זוגי', 'חוסן רגשי', 'חוסן עמית', 'עמותה', 'עמותות',
    ],
  },
  {
    notesField: 'notes_rights',
    keywords: [
      'ביטוח לאומי', 'ב"ל', "ב''ל", 'בטוח לאומי',
      'מס הכנסה', 'רואה חשבון', 'רו"ח', 'ר"ח',
      'עורך דין', 'עו"ד', "עו''ד", 'ייעוץ משפטי', 'ייעוץ משפטי',
    ],
  },
  {
    notesField: 'notes_employment',
    keywords: [
      'עבודה', 'תעסוקה', 'שכיר', 'עצמאי', 'מובטל', 'פיטורים',
      'לימודים', 'סטודנט', 'שכר לימוד', 'אובדן הכנסה', 'הכנסה',
      'מעסיק', 'משכורת', 'שכר', 'מלגה', 'מענק',
    ],
  },
  {
    notesField: 'notes_family',
    keywords: [
      'ילדים', 'ילד', 'ילדה', 'בת זוג', 'אישה', 'גרוש', 'גרושה',
      'לידה', 'הריון', 'משפחה', 'הורים', 'אמא', 'אבא',
      'whatsapp', 'ווצאפ', 'קבוצה',
    ],
  },
  {
    notesField: 'notes_reserve',
    keywords: [
      'מילואים', 'גדוד', 'פלוגה', 'מחלקה', 'סבב', 'גיוס',
      'שחרור', 'צבא', 'פיקוד', 'קצין', 'מפקד',
    ],
  },
  {
    notesField: 'notes_personal',
    keywords: [
      'טלפון', 'כתובת', 'מגורים', 'עיר', 'אימייל', 'פרטים אישיים',
    ],
  },
];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function routeLine(line: string): string | null {
  for (const route of SECTION_ROUTES) {
    if (containsKeyword(line, route.keywords)) return route.notesField;
  }
  return null; // stays in source / general
}

function appendText(existing: string, addition: string): string {
  const ex = (existing || '').trim();
  const add = addition.trim();
  if (!add) return ex;
  return ex ? `${ex}\n${add}` : add;
}

async function processBattalion(conn: mysql.Connection, dbName: string): Promise<void> {
  await conn.query(`USE \`${dbName}\``);

  const [colRows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
    [dbName]
  );
  const existingCols = new Set(colRows.map((r) => r.COLUMN_NAME as string));

  const [soldiers] = await conn.query<mysql.RowDataPacket[]>('SELECT * FROM soldiers');

  let updated = 0;

  for (const soldier of soldiers) {
    const updates: Record<string, string> = {};

    // ── Pass 1: dropdown fields ──────────────────────────────────────────────
    const combinedText = ALL_TEXT_FIELDS
      .filter((f) => existingCols.has(f))
      .map((f) => (soldier[f] as string) || '')
      .join(' ');

    for (const rule of DROPDOWN_RULES) {
      if (!existingCols.has(rule.field)) continue;
      const current = (soldier[rule.field] as string) || '';
      if (current.trim()) continue;
      if (containsKeyword(combinedText, rule.keywords)) {
        updates[rule.field] = rule.targetValue;
      }
    }

    // ── Pass 2: route text content to section notes ──────────────────────────
    // Collect all text from source fields
    const sourceLines: string[] = [];
    for (const sf of SOURCE_TEXT_FIELDS) {
      if (!existingCols.has(sf)) continue;
      const val = ((soldier[sf] as string) || '').trim();
      if (!val) continue;
      // Split by newlines and punctuation to get individual chunks
      val.split(/[\n\r]+/).forEach((line) => {
        const l = line.trim();
        if (l) sourceLines.push(l);
      });
    }

    // Accumulate routed text per destination notes field
    const routed: Record<string, string[]> = {};
    const unrouted: string[] = [];

    for (const line of sourceLines) {
      const dest = routeLine(line);
      if (dest && existingCols.has(dest)) {
        if (!routed[dest]) routed[dest] = [];
        routed[dest].push(line);
      } else {
        unrouted.push(line);
      }
    }

    // Apply routed text — append to existing section notes (avoid duplicates)
    for (const [destField, lines] of Object.entries(routed)) {
      const existing = (soldier[destField] as string) || '';
      const toAdd = lines.filter((l) => !existing.includes(l)).join('\n');
      if (toAdd) {
        updates[destField] = appendText(updates[destField] ?? existing, toAdd);
      }
    }

    if (Object.keys(updates).length === 0) continue;

    const setClauses = Object.keys(updates).map((f) => `\`${f}\` = ?`).join(', ');
    const values = [...Object.values(updates), soldier.id];

    const soldierLabel =
      `${soldier.first_name || ''} ${soldier.last_name || ''} (${soldier.personal_number || soldier.id})`.trim();
    console.log(`  ✔ ${soldierLabel}:`, Object.keys(updates));

    if (!DRY_RUN) {
      await conn.query(`UPDATE soldiers SET ${setClauses} WHERE id = ?`, values);
    }
    updated++;
  }

  console.log(`  → ${soldiers.length} soldiers scanned, ${updated} updated${DRY_RUN ? ' [DRY RUN]' : ''}`);
}

async function main() {
  console.log(`\n🔍 Welfare keyword backfill + text routing${DRY_RUN ? ' [DRY RUN — no writes]' : ''}\n`);

  const conn = await mysql.createConnection(dbConfig);

  try {
    const [dbRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
    );

    const battalionDbs = dbRows.map((r) => r.SCHEMA_NAME as string);
    console.log(`Found ${battalionDbs.length} battalion databases.\n`);

    for (const dbName of battalionDbs) {
      console.log(`📂 ${dbName}`);
      try {
        await processBattalion(conn, dbName);
      } catch (err) {
        console.error(`  ❌ Error processing ${dbName}:`, err);
      }
      console.log();
    }

    console.log('✅ Done.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
