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
  // Allow Hebrew letters, English letters, digits, and underscores as-is
  // Convert spaces/dashes to underscores; encode anything else to hex
  let result = '';
  for (const char of name.trim()) {
    if (/[a-zA-Z0-9\u05D0-\u05EA\u05F0-\u05F4_]/.test(char)) {
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
  mobile_phone TEXT,
  request_status TEXT,
  marital_status TEXT,
  children_count TEXT,
  student_indicator TEXT,
  spouse TEXT,
  spouse_phone TEXT,
  data_indicators TEXT,
  contact_by TEXT,
  contact_date TEXT,
  contact_with TEXT,
  employment_status TEXT,
  welfare_fund TEXT,
  aid_fund_submission TEXT,
  national_insurance TEXT,
  other_assistance TEXT,
  applications_needed TEXT,
  notes TEXT,
  reserve_days_2025 TEXT,
  reserve_days_2026 TEXT,
  command_role TEXT,
  children_ages TEXT,
  age TEXT,
  platoon TEXT,
  current_rotation TEXT,
  special_family_status TEXT,
  spouse_call_doc TEXT,
  whatsapp_battalion TEXT,
  whatsapp_family TEXT,
  divorced_assistance TEXT,
  birth_assistance TEXT,
  moving_assistance TEXT,
  household_assistance TEXT,
  complex_problems TEXT,
  resilience_treatment TEXT,
  followup_1 TEXT,
  followup_2 TEXT,
  personal_equipment TEXT,
  mobilization_dates TEXT,
  route_6 TEXT,
  professional TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const NEW_SOLDIER_COLUMNS = [
  'reserve_days_2025', 'reserve_days_2026', 'command_role', 'children_ages',
  'age', 'platoon', 'current_rotation', 'special_family_status',
  'spouse_call_doc', 'whatsapp_battalion', 'whatsapp_family',
  'divorced_assistance', 'birth_assistance', 'moving_assistance',
  'household_assistance', 'complex_problems', 'resilience_treatment',
  'followup_1', 'followup_2', 'personal_equipment', 'aid_fund_submission', 'mobilization_dates',
  'route_6', 'professional',
];

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

    // Add new columns to existing tables if missing
    for (const col of NEW_SOLDIER_COLUMNS) {
      if (!existingCols.has(col)) {
        await dbConn.query(`ALTER TABLE soldiers ADD COLUMN \`${col}\` TEXT`);
      }
    }

    // Widen narrow phone columns from VARCHAR(30) to TEXT — Excel imports may contain
    // multiple numbers / formatting that exceed 30 chars (e.g. "Data too long for column 'spouse_phone'").
    const PHONE_COLS_TO_WIDEN = ['mobile_phone', 'spouse_phone'];
    if (PHONE_COLS_TO_WIDEN.some((c) => existingCols.has(c))) {
      const [colInfo] = await dbConn.execute<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers' AND COLUMN_NAME IN (?, ?)`,
        [dbName, ...PHONE_COLS_TO_WIDEN]
      );
      for (const row of colInfo) {
        if (String(row.DATA_TYPE).toLowerCase() !== 'text') {
          await dbConn.query(`ALTER TABLE soldiers MODIFY COLUMN \`${row.COLUMN_NAME}\` TEXT`);
        }
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
  aid_fund_submission?: string;
  national_insurance?: string;
  other_assistance?: string;
  applications_needed?: string;
  notes?: string;
  reserve_days_2025?: string;
  reserve_days_2026?: string;
  command_role?: string;
  children_ages?: string;
  // Extended fields from גדוד 240 and similar Excel layouts
  age?: string;
  platoon?: string;
  current_rotation?: string;
  special_family_status?: string;
  spouse_call_doc?: string;
  whatsapp_battalion?: string;
  whatsapp_family?: string;
  divorced_assistance?: string;
  birth_assistance?: string;
  moving_assistance?: string;
  household_assistance?: string;
  complex_problems?: string;
  resilience_treatment?: string;
  followup_1?: string;
  followup_2?: string;
  personal_equipment?: string;
  mobilization_dates?: string;
  route_6?: string;
  professional?: string;
}

export type SoldierRowWithExtras = SoldierRow & { [key: string]: string | undefined };

const FIXED_COLUMNS = [
  'personal_number', 'last_name', 'first_name', 'mobile_phone',
  'request_status', 'marital_status', 'children_count',
  'student_indicator', 'spouse', 'spouse_phone', 'data_indicators',
  'contact_by', 'contact_date', 'contact_with', 'employment_status',
  'welfare_fund', 'aid_fund_submission', 'national_insurance', 'other_assistance',
  'applications_needed', 'notes', 'reserve_days_2025', 'reserve_days_2026',
  'command_role', 'children_ages',
  'age', 'platoon', 'current_rotation', 'special_family_status',
  'spouse_call_doc', 'whatsapp_battalion', 'whatsapp_family',
  'divorced_assistance', 'birth_assistance', 'moving_assistance',
  'household_assistance', 'complex_problems', 'resilience_treatment',
  'followup_1', 'followup_2', 'personal_equipment', 'mobilization_dates',
  'route_6', 'professional',
];

// Import always overwrites all fields from Excel — Excel is the single source of truth

export async function importSoldiers(
  battalionName: string,
  soldiers: SoldierRowWithExtras[],
  extraColumns: string[] = [],
  isNewBattalion: boolean = false
): Promise<number> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });

  let insertedCount = 0;
  try {
    // Add any new columns to the table dynamically (outside transaction — DDL causes implicit commit)
    for (const col of extraColumns) {
      await conn.execute(`ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS \`${col}\` TEXT`);
    }

    const allColumns = [...FIXED_COLUMNS, ...extraColumns];

    if (isNewBattalion) {
      // Wrap DELETE + all INSERTs in a transaction so that if any INSERT fails,
      // we ROLLBACK and the DB is restored to its previous state instead of being left empty.
      await conn.beginTransaction();
      try {
        await conn.execute(`DELETE FROM soldiers`);

        for (const soldier of soldiers) {
          const colList = allColumns.map((c) => `\`${c}\``).join(', ');
          const placeholders = allColumns.map(() => '?').join(', ');
          // New import: overwrite every field exactly as it appears in the Excel (1:1)
          const updates = allColumns
            .filter((c) => c !== 'personal_number')
            .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
            .join(',\n');
          const values = allColumns.map((c) => soldier[c] ?? null);
          await conn.execute(
            `INSERT INTO soldiers (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
            values
          );
          insertedCount++;
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    } else {
      const PROTECTED_FIELDS = new Set([
        'contact_by', 'contact_date', 'contact_with',
        'request_status', 'notes', 'other_assistance', 'applications_needed',
      ]);
      const extraSet = new Set(extraColumns);

      for (const soldier of soldiers) {
        const colList = allColumns.map((c) => `\`${c}\``).join(', ');
        const placeholders = allColumns.map(() => '?').join(', ');

        const excelStatus = (soldier.request_status || '').trim();
        const hasActionableStatus = excelStatus !== '' && excelStatus !== 'לא נוצר קשר';

        const updates = allColumns
          .filter((c) => c !== 'personal_number')
          .map((c) => {
            if (hasActionableStatus) {
              return `\`${c}\` = COALESCE(NULLIF(VALUES(\`${c}\`), ''), \`${c}\`)`;
            }
            if (PROTECTED_FIELDS.has(c) || extraSet.has(c)) {
              return `\`${c}\` = COALESCE(NULLIF(\`${c}\`, ''), VALUES(\`${c}\`))`;
            }
            return `\`${c}\` = COALESCE(NULLIF(VALUES(\`${c}\`), ''), \`${c}\`)`;
          })
          .join(',\n');

        const values = allColumns.map((c) => soldier[c] || null);

        await conn.execute(
          `INSERT INTO soldiers (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
          values
        );
        insertedCount++;
      }
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

export interface BattalionDemographics {
  battalion: string;
  married: number;
  single: number;
  divorced: number;
  selfEmployed: number;
  employed: number;
  resilience: number;
}

export async function getBattalionDemographics(battalionFilter?: string): Promise<BattalionDemographics[]> {
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

  const results: BattalionDemographics[] = [];

  for (const dbName of dbNames) {
    const c = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const [rows] = await c.execute<mysql.RowDataPacket[]>(
        `SELECT
          SUM(CASE WHEN marital_status LIKE '%נשוי%' OR marital_status LIKE '%נשואה%' THEN 1 ELSE 0 END) AS married,
          SUM(CASE WHEN marital_status LIKE '%רווק%' OR marital_status LIKE '%רווקה%' THEN 1 ELSE 0 END) AS single_count,
          SUM(CASE WHEN marital_status LIKE '%גרוש%' OR marital_status LIKE '%פרוד%' THEN 1 ELSE 0 END) AS divorced,
          SUM(CASE WHEN employment_status LIKE '%עצמאי%' THEN 1 ELSE 0 END) AS self_employed,
          SUM(CASE WHEN employment_status LIKE '%שכיר%' THEN 1 ELSE 0 END) AS employed,
          SUM(CASE WHEN data_indicators LIKE '%חוסן%' OR request_status LIKE '%חוסן%' THEN 1 ELSE 0 END) AS resilience
        FROM soldiers`
      );
      const row = rows[0];
      results.push({
        battalion: dbName.replace(/^battalion_/, ''),
        married: Number(row.married) || 0,
        single: Number(row.single_count) || 0,
        divorced: Number(row.divorced) || 0,
        selfEmployed: Number(row.self_employed) || 0,
        employed: Number(row.employed) || 0,
        resilience: Number(row.resilience) || 0,
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

/**
 * For each personal_number in the given list, find if it already exists in any
 * battalion database OTHER than currentBattalionName.
 * Returns only the conflicts found.
 */
export async function findCrossBattalionDuplicates(
  currentBattalionName: string,
  personalNumbers: string[]
): Promise<{ personalNumber: string; foundInBattalion: string }[]> {
  if (personalNumbers.length === 0) return [];

  const currentDbName = getBattalionDbName(currentBattalionName);
  const conn = await mysql.createConnection(dbConfig);
  let allDbNames: string[] = [];
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
    );
    allDbNames = rows
      .map((r) => r.SCHEMA_NAME as string)
      .filter((name) => name !== currentDbName);
  } finally {
    await conn.end();
  }

  if (allDbNames.length === 0) return [];

  const placeholders = personalNumbers.map(() => '?').join(', ');
  const conflicts: { personalNumber: string; foundInBattalion: string }[] = [];

  await Promise.all(
    allDbNames.map(async (dbName) => {
      const c = await mysql.createConnection({ ...dbConfig, database: dbName });
      try {
        const [rows] = await c.execute<mysql.RowDataPacket[]>(
          `SELECT personal_number FROM soldiers WHERE personal_number IN (${placeholders})`,
          personalNumbers
        );
        for (const row of rows) {
          conflicts.push({
            personalNumber: row.personal_number as string,
            foundInBattalion: dbName.replace(/^battalion_/, ''),
          });
        }
      } catch {
        // DB might not have the soldiers table yet — skip silently
      } finally {
        await c.end();
      }
    })
  );

  return conflicts;
}

export async function getSoldiersFromBattalion(battalionName: string): Promise<SoldierRow[]> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    // Some older battalion DBs may not have `platoon` / `request_status` columns —
    // detect what's available and build the SELECT dynamically so we don't 500.
    const [colRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
      [dbName]
    );
    const existing = new Set(colRows.map((r) => String(r.COLUMN_NAME)));
    const base = ['personal_number', 'first_name', 'last_name', 'mobile_phone'];
    const optional = ['platoon', 'request_status', 'contact_date', 'contact_by'];
    const cols = [...base, ...optional.filter((c) => existing.has(c))];
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT ${cols.join(', ')} FROM soldiers WHERE personal_number IS NOT NULL AND personal_number != ''`
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

/** Search across ALL battalions by first/last name or phone. Returns up to `limit` results. */
export async function searchSoldiersGlobalByNameOrPhone(
  query: string,
  limit = 50
): Promise<Array<{ soldier: { personal_number: string; first_name: string; last_name: string; mobile_phone: string; request_status: string }; battalionName: string }>> {
  const battalions = await listBattalions();
  const results: Array<{ soldier: any; battalionName: string }> = [];
  const seen = new Set<string>();
  const term = `%${query}%`;

  for (const bn of battalions) {
    if (results.length >= limit) break;
    const dbName = getBattalionDbName(bn);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT personal_number, first_name, last_name, mobile_phone, request_status
         FROM soldiers
         WHERE first_name LIKE ? OR last_name LIKE ? OR mobile_phone LIKE ?
         LIMIT ?`,
        [term, term, term, limit - results.length]
      );
      for (const row of rows) {
        const key = String(row.personal_number || '').trim();
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        results.push({ soldier: row, battalionName: bn });
      }
    } finally {
      await conn.end();
    }
  }
  return results;
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
  aid_fund_submission: 'מה החייל הגיש לקרן הסיוע',
  mobilization_dates: 'תאריכי גיוס/סבבים',
  national_insurance: 'ביטוח לאומי',
  other_assistance: 'סיוע אחר',
  applications_needed: 'בקשות להגשה',
  notes: 'פירוט/הערות',
  reserve_days_2025: 'ימי מילואים 2025',
  reserve_days_2026: 'ימי מילואים 2026',
  command_role: 'תפקיד פיקודי',
  children_ages: 'גילאי ילדים',
};

async function ensureSoldiersColumns(conn: mysql.Connection, dbName: string): Promise<void> {
  const [cols] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
    [dbName]
  );
  const existingCols = new Set(cols.map((c) => c.COLUMN_NAME as string));
  for (const col of NEW_SOLDIER_COLUMNS) {
    if (!existingCols.has(col)) {
      await conn.query(`ALTER TABLE soldiers ADD COLUMN \`${col}\` TEXT`);
    }
  }
}

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
): Promise<{ personalNumber: string }> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    await ensureSoldiersColumns(conn, dbName);
    await ensureChangesTable(conn);
    // Fetch current soldier data to detect changes
    const [currentRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM soldiers WHERE id = ? LIMIT 1`,
      [id]
    );
    const current = currentRows[0] as Record<string, any> | undefined;

    const READONLY_FIELDS = new Set(['id', 'created_at', 'updated_at']);
    const keys = Object.keys(data).filter((k) => !READONLY_FIELDS.has(k));
    if (keys.length === 0) return { personalNumber: current?.personal_number || '' };

    // Perform the update — wrap column names in backticks to support Hebrew/dynamic column names
    const fields = keys.map((k) => `\`${k}\` = ?`);
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
    return { personalNumber: current?.personal_number || '' };
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

export interface DuplicateBattalionEntry {
  battalionName: string;
  last_updated?: string;
}

export interface DuplicateSoldier {
  personal_number: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  request_status: string;
  battalions: DuplicateBattalionEntry[];
}

/** Find soldiers that appear in more than one battalion DB (by personal_number or mobile_phone). */
export async function findDuplicateSoldiers(): Promise<{ byPersonalNumber: DuplicateSoldier[]; byPhone: DuplicateSoldier[] }> {
  const battalions = await listBattalions();

  const byPN = new Map<string, { soldier: any; battalionName: string }[]>();
  const byPhone = new Map<string, { soldier: any; battalionName: string }[]>();

  for (const bn of battalions) {
    const dbName = getBattalionDbName(bn);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      // Detect available date columns to avoid errors on older DBs
      const [colRows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
        [dbName]
      );
      const availableCols = new Set(colRows.map((r) => r.COLUMN_NAME as string));
      const dateExpr = availableCols.has('contact_date') && availableCols.has('updated_at')
        ? 'COALESCE(NULLIF(TRIM(contact_date),\'\'), updated_at) AS last_updated'
        : availableCols.has('contact_date')
          ? 'contact_date AS last_updated'
          : availableCols.has('updated_at')
            ? 'updated_at AS last_updated'
            : 'NULL AS last_updated';

      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT personal_number, first_name, last_name, mobile_phone, request_status, ${dateExpr} FROM soldiers`
      );
      for (const row of rows) {
        const pn = String(row.personal_number || '').trim();
        const phone = String(row.mobile_phone || '').replace(/\D/g, '').trim();

        if (pn) {
          if (!byPN.has(pn)) byPN.set(pn, []);
          byPN.get(pn)!.push({ soldier: row, battalionName: bn });
        }
        if (phone && phone.length >= 9) {
          if (!byPhone.has(phone)) byPhone.set(phone, []);
          byPhone.get(phone)!.push({ soldier: row, battalionName: bn });
        }
      }
    } finally {
      await conn.end();
    }
  }

  const toDuplicates = (map: Map<string, { soldier: any; battalionName: string }[]>): DuplicateSoldier[] =>
    [...map.entries()]
      .filter(([, entries]) => entries.length > 1)
      .map(([, entries]) => ({
        ...entries[0].soldier,
        battalions: entries.map((e) => ({
          battalionName: e.battalionName,
          last_updated: e.soldier.last_updated ? String(e.soldier.last_updated) : undefined,
        })),
      }));

  return {
    byPersonalNumber: toDuplicates(byPN),
    byPhone: toDuplicates(byPhone),
  };
}

/** Delete a single soldier from a battalion DB by personal_number. */
export async function deleteSoldierFromBattalion(
  battalionName: string,
  personalNumber: string
): Promise<{ deleted: boolean }> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      `DELETE FROM soldiers WHERE personal_number = ? LIMIT 1`,
      [personalNumber]
    );
    return { deleted: result.affectedRows > 0 };
  } finally {
    await conn.end();
  }
}
