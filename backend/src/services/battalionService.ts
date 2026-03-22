import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

export function sanitizeBattalionName(name: string): string {
  // Convert to ASCII-safe: replace Hebrew and special chars with their hex code points
  let result = '';
  for (const char of name.trim()) {
    if (/[a-zA-Z0-9]/.test(char)) {
      result += char;
    } else if (char === ' ' || char === '-') {
      result += '_';
    } else {
      result += char.charCodeAt(0).toString(16);
    }
  }
  return result.replace(/_+/g, '_').replace(/^_|_$/g, '') || 'unnamed';
}

export function getBattalionDbName(battalionName: string): string {
  return `battalion_${sanitizeBattalionName(battalionName)}`;
}

const SOLDIER_CHANGES_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS soldier_changes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  soldier_id INT NOT NULL,
  soldier_name VARCHAR(200),
  field_name VARCHAR(100),
  field_label VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_soldier_id (soldier_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const SOLDIERS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS soldiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personal_number VARCHAR(50) UNIQUE,
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  mobile_phone VARCHAR(30),
  request_status TEXT,
  marital_status TEXT,
  children_count TEXT,
  student_indicator TEXT,
  spouse TEXT,
  spouse_phone VARCHAR(30),
  data_indicators TEXT,
  contact_by TEXT,
  contact_date TEXT,
  contact_with TEXT,
  employment_status TEXT,
  welfare_fund TEXT,
  national_insurance TEXT,
  other_assistance TEXT,
  applications_needed TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureBattalionDatabase(battalionName: string): Promise<void> {
  const dbName = getBattalionDbName(battalionName);

  // Step 1: Create the database (no specific DB selected)
  const conn = await mysql.createConnection(dbConfig);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await conn.end();
  }

  // Step 2: Connect directly to the new database, create table + migrate old schema
  const dbConn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    await dbConn.query(SOLDIERS_TABLE_DDL);
    await dbConn.query(SOLDIER_CHANGES_TABLE_DDL);

    // Migrate old tables: drop removed columns if they exist
    const OLD_COLUMNS = ['rank', 'company', 'department', 'student_2026', 'attached'];
    const [cols] = await dbConn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
      [dbName]
    );
    const existingCols = new Set(cols.map((c) => c.COLUMN_NAME as string));
    for (const col of OLD_COLUMNS) {
      if (existingCols.has(col)) {
        await dbConn.query(`ALTER TABLE soldiers DROP COLUMN \`${col}\``);
      }
    }

    // Add UNIQUE constraint on personal_number if missing
    const [indexes] = await dbConn.execute<mysql.RowDataPacket[]>(
      `SHOW INDEX FROM soldiers WHERE Column_name = 'personal_number' AND Non_unique = 0`
    );
    if (indexes.length === 0) {
      await dbConn.query(`ALTER TABLE soldiers ADD UNIQUE (personal_number)`);
    }
  } finally {
    await dbConn.end();
  }
}

export interface SoldierRow {
  personal_number?: string;
  last_name?: string;
  first_name?: string;
  mobile_phone?: string;
  request_status?: string;
  marital_status?: string;
  children_count?: string;
  student_indicator?: string;
  spouse?: string;
  spouse_phone?: string;
  data_indicators?: string;
  contact_by?: string;
  contact_date?: string;
  contact_with?: string;
  employment_status?: string;
  welfare_fund?: string;
  national_insurance?: string;
  other_assistance?: string;
  applications_needed?: string;
  notes?: string;
}

export type SoldierRowWithExtras = SoldierRow & { [key: string]: string | undefined };

const FIXED_COLUMNS = [
  'personal_number', 'last_name', 'first_name', 'mobile_phone',
  'request_status', 'marital_status', 'children_count',
  'student_indicator', 'spouse', 'spouse_phone', 'data_indicators',
  'contact_by', 'contact_date', 'contact_with', 'employment_status',
  'welfare_fund', 'national_insurance', 'other_assistance',
  'applications_needed', 'notes',
];

// Import never overwrites existing data — only fills in missing (null/empty) fields
const ALWAYS_OVERWRITE = new Set<string>();

export async function importSoldiers(
  battalionName: string,
  soldiers: SoldierRowWithExtras[],
  extraColumns: string[] = []
): Promise<number> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });

  let insertedCount = 0;
  try {
    // Add any new columns to the table dynamically
    for (const col of extraColumns) {
      await conn.execute(`ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS \`${col}\` TEXT`);
    }

    const allColumns = [...FIXED_COLUMNS, ...extraColumns];

    for (const soldier of soldiers) {
      const colList = allColumns.map((c) => `\`${c}\``).join(', ');
      const placeholders = allColumns.map(() => '?').join(', ');

      const updates = allColumns
        .filter((c) => c !== 'personal_number')
        .map((c) => {
          const q = `\`${c}\``;
          if (ALWAYS_OVERWRITE.has(c)) return `${q} = VALUES(${q})`;
          return `${q} = IF(${q} IS NULL OR TRIM(${q}) = '', VALUES(${q}), ${q})`;
        })
        .join(',\n');

      const values = allColumns.map((c) => soldier[c] || null);

      await conn.execute(
        `INSERT INTO soldiers (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
        values
      );
      insertedCount++;
    }
  } finally {
    await conn.end();
  }

  return insertedCount;
}

export async function listBattalions(): Promise<string[]> {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
    );
    return rows.map((r) => r.SCHEMA_NAME.replace(/^battalion_/, ''));
  } finally {
    await conn.end();
  }
}

export interface PersonDashboard {
  name: string;
  total: number;
  byBattalion: { battalion: string; count: number }[];
  byStatus: { status: string; count: number }[];
  todayCount: number;
}

export async function getDashboardData(people: string[], battalionFilter?: string): Promise<PersonDashboard[]> {
  let dbNames: string[] = [];

  if (battalionFilter) {
    dbNames = [getBattalionDbName(battalionFilter)];
  } else {
    const conn = await mysql.createConnection(dbConfig);
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
      );
      dbNames = rows.map((r) => r.SCHEMA_NAME as string);
    } finally {
      await conn.end();
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // For each person, aggregate across all battalions
  const results: PersonDashboard[] = await Promise.all(
    people.map(async (person) => {
      let total = 0;
      let todayCount = 0;
      const battalionCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};

      for (const dbName of dbNames) {
        const c = await mysql.createConnection({ ...dbConfig, database: dbName });
        try {
          const [rows] = await c.execute<mysql.RowDataPacket[]>(
            `SELECT request_status, contact_date FROM soldiers WHERE contact_by = ?`,
            [person]
          );
          const shortName = dbName.replace(/^battalion_/, '');
          if (rows.length > 0) {
            battalionCounts[shortName] = (battalionCounts[shortName] || 0) + rows.length;
          }
          for (const row of rows) {
            total++;
            const status = (row.request_status as string)?.trim() || 'לא מוגדר';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            if (row.contact_date && (row.contact_date as string).startsWith(today)) {
              todayCount++;
            }
          }
        } finally {
          await c.end();
        }
      }

      return {
        name: person,
        total,
        todayCount,
        byBattalion: Object.entries(battalionCounts)
          .map(([battalion, count]) => ({ battalion, count }))
          .sort((a, b) => b.count - a.count),
        byStatus: Object.entries(statusCounts)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    })
  );

  return results;
}

export interface GlobalStats {
  totalSoldiers: number;
  totalStudents: number;
  byStatus: { status: string; count: number }[];
}

export async function getGlobalStats(battalionFilter?: string): Promise<GlobalStats> {
  let dbNames: string[] = [];

  if (battalionFilter) {
    dbNames = [getBattalionDbName(battalionFilter)];
  } else {
    const conn = await mysql.createConnection(dbConfig);
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
      );
      dbNames = rows.map((r) => r.SCHEMA_NAME as string);
    } finally {
      await conn.end();
    }
  }

  let totalSoldiers = 0;
  let totalStudents = 0;
  const statusCounts: Record<string, number> = {};

  for (const dbName of dbNames) {
    const c = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const [rows] = await c.execute<mysql.RowDataPacket[]>(
        `SELECT request_status, student_indicator FROM soldiers`
      );
      for (const row of rows) {
        totalSoldiers++;
        const indicator = (row.student_indicator as string)?.trim()?.toLowerCase() || '';
        if (indicator && indicator !== 'לא' && indicator !== '0' && indicator !== 'no') {
          totalStudents++;
        }
        const status = (row.request_status as string)?.trim() || 'לא מוגדר';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    } finally {
      await c.end();
    }
  }

  return {
    totalSoldiers,
    totalStudents,
    byStatus: Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export interface BattalionPieStat {
  battalion: string;
  totalSoldiers: number;
  contactedSoldiers: number;
}

export async function getBattalionPieStats(battalionFilter?: string): Promise<BattalionPieStat[]> {
  let dbNames: string[] = [];

  if (battalionFilter) {
    dbNames = [getBattalionDbName(battalionFilter)];
  } else {
    const conn = await mysql.createConnection(dbConfig);
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
      );
      dbNames = rows.map((r) => r.SCHEMA_NAME as string);
    } finally {
      await conn.end();
    }
  }

  const results: BattalionPieStat[] = [];

  for (const dbName of dbNames) {
    const c = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const [rows] = await c.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN contact_by IS NOT NULL AND TRIM(contact_by) != '' THEN 1 ELSE 0 END) AS contacted FROM soldiers`
      );
      const row = rows[0];
      results.push({
        battalion: dbName.replace(/^battalion_/, ''),
        totalSoldiers: Number(row.total) || 0,
        contactedSoldiers: Number(row.contacted) || 0,
      });
    } finally {
      await c.end();
    }
  }

  return results;
}

export interface AssistanceStat {
  battalion: string;
  nationalInsurance: number;
  welfareFund: number;
  otherAssistance: number;
}

export async function getAssistanceStats(battalionFilter?: string): Promise<AssistanceStat[]> {
  let dbNames: string[] = [];

  if (battalionFilter) {
    dbNames = [getBattalionDbName(battalionFilter)];
  } else {
    const conn = await mysql.createConnection(dbConfig);
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
      );
      dbNames = rows.map((r) => r.SCHEMA_NAME as string);
    } finally {
      await conn.end();
    }
  }

  const results: AssistanceStat[] = [];

  for (const dbName of dbNames) {
    const c = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const [rows] = await c.execute<mysql.RowDataPacket[]>(
        `SELECT
          SUM(CASE WHEN national_insurance IS NOT NULL AND TRIM(national_insurance) != '' AND TRIM(national_insurance) NOT IN (?, ?) THEN 1 ELSE 0 END) AS ni,
          SUM(CASE WHEN welfare_fund IS NOT NULL AND TRIM(welfare_fund) != '' AND TRIM(welfare_fund) NOT IN (?, ?) THEN 1 ELSE 0 END) AS wf,
          SUM(CASE WHEN other_assistance IS NOT NULL AND TRIM(other_assistance) != '' AND TRIM(other_assistance) NOT IN (?, ?) THEN 1 ELSE 0 END) AS oa
        FROM soldiers`,
        ['לא', 'אין', 'לא', 'אין', 'לא', 'אין']
      );
      const row = rows[0];
      results.push({
        battalion: dbName.replace(/^battalion_/, ''),
        nationalInsurance: Number(row.ni) || 0,
        welfareFund: Number(row.wf) || 0,
        otherAssistance: Number(row.oa) || 0,
      });
    } finally {
      await c.end();
    }
  }

  return results;
}

export interface BattalionStatusBreakdown {
  battalion: string;
  byStatus: { status: string; count: number }[];
}

export async function getBattalionStatusBreakdown(battalionFilter?: string): Promise<BattalionStatusBreakdown[]> {
  let dbNames: string[] = [];

  if (battalionFilter) {
    dbNames = [getBattalionDbName(battalionFilter)];
  } else {
    const conn = await mysql.createConnection(dbConfig);
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
      );
      dbNames = rows.map((r) => r.SCHEMA_NAME as string);
    } finally {
      await conn.end();
    }
  }

  const results: BattalionStatusBreakdown[] = [];

  for (const dbName of dbNames) {
    const c = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const [rows] = await c.execute<mysql.RowDataPacket[]>(
        `SELECT COALESCE(NULLIF(TRIM(request_status), ''), 'לא מוגדר') AS status, COUNT(*) AS count
         FROM soldiers
         GROUP BY status
         ORDER BY count DESC
         LIMIT 8`
      );
      results.push({
        battalion: dbName.replace(/^battalion_/, ''),
        byStatus: rows.map((r) => ({
          status: r.status as string,
          count: Number(r.count),
        })),
      });
    } finally {
      await c.end();
    }
  }

  return results;
}

export interface AssistanceSoldier {
  firstName: string;
  lastName: string;
  personalNumber: string;
  value: string;
}

export async function getSoldiersByAssistanceType(
  battalionName: string,
  assistanceType: 'national_insurance' | 'welfare_fund' | 'other_assistance'
): Promise<AssistanceSoldier[]> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT first_name, last_name, personal_number, ${assistanceType} AS val FROM soldiers WHERE ${assistanceType} IS NOT NULL AND TRIM(${assistanceType}) != '' AND TRIM(${assistanceType}) NOT IN (?, ?)`,
      ['לא', 'אין']
    );
    return rows.map((r) => ({
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      personalNumber: r.personal_number || '',
      value: r.val || '',
    }));
  } finally {
    await conn.end();
  }
}

export async function getSoldiersFromBattalion(battalionName: string): Promise<SoldierRow[]> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT personal_number, first_name, last_name, mobile_phone FROM soldiers WHERE personal_number IS NOT NULL AND personal_number != ''`
    );
    return rows as SoldierRow[];
  } finally {
    await conn.end();
  }
}

export interface SoldierFullRow extends SoldierRow {
  id?: number;
}

export async function searchSoldierByPersonalNumber(
  battalionName: string,
  personalNumber: string
): Promise<SoldierFullRow | null> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM soldiers WHERE personal_number = ? LIMIT 1`,
      [personalNumber]
    );
    return rows.length > 0 ? (rows[0] as SoldierFullRow) : null;
  } finally {
    await conn.end();
  }
}

export async function searchSoldierGlobal(
  personalNumber: string
): Promise<{ soldier: SoldierFullRow; battalionName: string } | null> {
  const battalions = await listBattalions();
  for (const bn of battalions) {
    const soldier = await searchSoldierByPersonalNumber(bn, personalNumber);
    if (soldier) return { soldier, battalionName: bn };
  }
  return null;
}

export async function searchSoldierByName(
  battalionName: string,
  searchName: string
): Promise<SoldierFullRow | null> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const searchTerm = `%${searchName}%`;
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM soldiers WHERE first_name LIKE ? OR last_name LIKE ? LIMIT 1`,
      [searchTerm, searchTerm]
    );
    return rows.length > 0 ? (rows[0] as SoldierFullRow) : null;
  } finally {
    await conn.end();
  }
}

const FIELD_LABEL_MAP: Record<string, string> = {
  personal_number: 'מספר אישי',
  last_name: 'שם משפחה',
  first_name: 'שם פרטי',
  mobile_phone: 'טלפון נייד',
  request_status: 'סטטוס פנייה',
  marital_status: 'מצב משפחתי',
  children_count: 'מספר ילדים',
  student_indicator: 'אינדיקציית סטודנט',
  spouse: 'בן/בת זוג',
  spouse_phone: 'טלפון בן/בת זוג',
  data_indicators: 'אינדיקציות מהנתונים',
  contact_by: 'מי יצרה קשר',
  contact_date: 'תאריך קשר',
  contact_with: 'מול מי נוצר קשר',
  employment_status: 'סטטוס תעסוקתי',
  welfare_fund: 'קרן סיוע',
  national_insurance: 'ביטוח לאומי',
  other_assistance: 'סיוע אחר',
  applications_needed: 'בקשות להגשה',
  notes: 'פירוט/הערות',
};

async function ensureChangesTable(conn: mysql.Connection): Promise<void> {
  await conn.query(SOLDIER_CHANGES_TABLE_DDL);
  // Migrate: add changed_by column if missing
  try {
    await conn.query(`ALTER TABLE soldier_changes ADD COLUMN changed_by VARCHAR(255) AFTER new_value`);
  } catch {
    // Column already exists
  }
}

export async function updateSoldier(
  battalionName: string,
  id: number,
  data: Partial<SoldierRow>,
  changedBy?: string
): Promise<void> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    await ensureChangesTable(conn);
    const READONLY_FIELDS = new Set(['id', 'created_at', 'updated_at']);
    const keys = Object.keys(data).filter((k) => !READONLY_FIELDS.has(k));
    if (keys.length === 0) return;

    // Fetch current soldier data to detect changes
    const [currentRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM soldiers WHERE id = ? LIMIT 1`,
      [id]
    );
    const current = currentRows[0] as Record<string, any> | undefined;

    // Perform the update
    const fields = keys.map((k) => `${k} = ?`);
    const values = keys.map((k) => (data as any)[k]);
    await conn.execute(
      `UPDATE soldiers SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    // Log changes
    if (current) {
      const soldierName = `${current.first_name || ''} ${current.last_name || ''}`.trim();
      for (const key of keys) {
        const oldVal = (current[key] ?? '') as string;
        const newVal = ((data as any)[key] ?? '') as string;
        if (String(oldVal).trim() !== String(newVal).trim()) {
          await conn.execute(
            `INSERT INTO soldier_changes (soldier_id, soldier_name, field_name, field_label, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, soldierName, key, FIELD_LABEL_MAP[key] || key, oldVal, newVal, changedBy || null]
          );
        }
      }
    }
  } finally {
    await conn.end();
  }
}

export interface SoldierChange {
  id: number;
  soldier_id: number;
  soldier_name: string;
  field_name: string;
  field_label: string;
  old_value: string;
  new_value: string;
  changed_by: string | null;
  changed_at: string;
}

export async function getSoldierChanges(
  battalionName: string,
  soldierId: number
): Promise<SoldierChange[]> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    await ensureChangesTable(conn);
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM soldier_changes WHERE soldier_id = ? ORDER BY changed_at DESC LIMIT 100`,
      [soldierId]
    );
    return rows as SoldierChange[];
  } finally {
    await conn.end();
  }
}
