/**
 * backfill_welfare_keywords.ts
 *
 * Scans every soldier in every battalion DB.
 * For each free-text / notes field, searches for keywords and
 * auto-populates the matching structured field with 'נדרש'
 * (only when the structured field is currently empty).
 *
 * Run:  npx ts-node src/migrations/backfill_welfare_keywords.ts
 *       or: DRY_RUN=1 npx ts-node src/migrations/backfill_welfare_keywords.ts
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

// ─── Keyword → target field mapping ───────────────────────────────────────────
// Each rule: if ANY keyword found in text fields → set target field to targetValue
// Only applied when the target field is currently empty / null.

interface Rule {
  keywords: string[];
  field: string;
  targetValue: string;
}

const RULES: Rule[] = [
  // קרן הסיוע — general
  { keywords: ['קרן הסיוע', 'קרן סיוע'], field: 'welfare_fund', targetValue: 'נדרש' },

  // כביש 6
  { keywords: ['כביש 6', 'כביש6', 'כביש-6'], field: 'route_6', targetValue: 'נדרש' },

  // ייעוץ משפטי / עורך דין
  { keywords: ['עורך דין', 'עו"ד', "עו''ד", 'ייעוץ משפטי', 'עורך-דין'], field: 'legal_advice', targetValue: 'נדרש' },

  // ביטוח לאומי
  { keywords: ['ביטוח לאומי', 'ב"ל', "ב''ל", 'בטוח לאומי'], field: 'national_insurance', targetValue: 'נדרש' },

  // מס הכנסה / רואה חשבון
  { keywords: ['מס הכנסה', 'רואה חשבון', 'ר"ח', "ר''ח", 'רו"ח'], field: 'income_tax', targetValue: 'נדרש' },

  // קייטנות
  { keywords: ['קייטנה', 'קייטנות', 'קיטנה'], field: 'summer_camp', targetValue: 'נדרש' },

  // בייביסיטר
  { keywords: ['בייביסיטר', 'בייבי סיטר', 'בייבי-סיטר', 'babysitter', 'baby sitter'], field: 'household_assistance', targetValue: 'נדרש' },

  // מענק לידה / לידה
  { keywords: ['מענק לידה', 'לידה'], field: 'birth_grant', targetValue: 'נדרש' },

  // תיקונים
  { keywords: ['תיקונים', 'תיקון בית', 'שיפוץ'], field: 'repairs', targetValue: 'נדרש' },

  // מעבר דירה
  { keywords: ['מעבר דירה', 'העברת דירה', 'מעבר-דירה'], field: 'moving_assistance', targetValue: 'נדרש' },

  // ציוד אישי
  { keywords: ['ציוד אישי', 'ציוד קרבי'], field: 'personal_equipment', targetValue: 'נדרש' },

  // פייטר
  { keywords: ['פייטר'], field: 'fighter', targetValue: 'נדרש' },

  // שובר חופשה
  { keywords: ['שובר חופשה', 'שובר נופש'], field: 'vacation_break', targetValue: 'נדרש' },

  // פיצוי חופשות
  { keywords: ['פיצוי חופשות', 'פיצוי חופשה'], field: 'vacation_compensation', targetValue: 'פיצוי חופשות' },

  // חוסן זוגי
  { keywords: ['חוסן זוגי', 'חוסן רגשי', 'חוסן עמית'], field: 'resilience_couples', targetValue: 'נדרש' },

  // סיוע מעמותות
  { keywords: ['עמותה', 'עמותות', 'ארגון התנדבות'], field: 'nonprofit_assistance', targetValue: 'נדרש' },
];

// Free-text fields to scan for keywords
const TEXT_FIELDS_TO_SCAN = [
  'notes_personal', 'notes_family', 'notes_employment', 'notes_welfare',
  'notes_reserve', 'notes_rights', 'notes_general', 'notes',
  'data_indicators', 'other_assistance', 'applications_needed',
  'aid_fund_submission', 'birth_assistance', 'mobilization_dates',
  'income_tax', 'legal_advice', 'nonprofit_assistance',
];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

async function processBattalion(conn: mysql.Connection, dbName: string): Promise<void> {
  await conn.query(`USE \`${dbName}\``);

  // Get all columns in soldiers table
  const [colRows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
    [dbName]
  );
  const existingCols = new Set(colRows.map((r) => r.COLUMN_NAME as string));

  const [soldiers] = await conn.query<mysql.RowDataPacket[]>('SELECT * FROM soldiers');

  let updated = 0;

  for (const soldier of soldiers) {
    // Build combined text from all scannable fields
    const combinedText = TEXT_FIELDS_TO_SCAN
      .filter((f) => existingCols.has(f))
      .map((f) => (soldier[f] as string) || '')
      .join(' ');

    if (!combinedText.trim()) continue;

    const updates: Record<string, string> = {};

    for (const rule of RULES) {
      if (!existingCols.has(rule.field)) continue;
      const currentValue = (soldier[rule.field] as string) || '';
      if (currentValue.trim()) continue; // already filled — skip

      if (containsKeyword(combinedText, rule.keywords)) {
        updates[rule.field] = rule.targetValue;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    const setClauses = Object.keys(updates).map((f) => `\`${f}\` = ?`).join(', ');
    const values = [...Object.values(updates), soldier.id];

    const soldierLabel = `${soldier.first_name || ''} ${soldier.last_name || ''} (${soldier.personal_number || soldier.id})`.trim();
    console.log(`  ✔ ${soldierLabel}:`, updates);

    if (!DRY_RUN) {
      await conn.query(`UPDATE soldiers SET ${setClauses} WHERE id = ?`, values);
    }
    updated++;
  }

  console.log(`  → ${soldiers.length} soldiers scanned, ${updated} updated${DRY_RUN ? ' [DRY RUN]' : ''}`);
}

async function main() {
  console.log(`\n🔍 Welfare keyword backfill${DRY_RUN ? ' [DRY RUN — no writes]' : ''}\n`);

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
