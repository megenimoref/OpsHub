import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password_123',
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

const SOLDIERS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS soldiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personal_number VARCHAR(50),
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  mobile_phone VARCHAR(30),
  \`rank\` VARCHAR(50),
  company VARCHAR(100),
  department VARCHAR(100),
  student_2026 TEXT,
  attached TEXT,
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

  // Step 2: Connect directly to the new database, drop+recreate table for fresh import
  const dbConn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    await dbConn.query(`DROP TABLE IF EXISTS soldiers`);
    await dbConn.query(SOLDIERS_TABLE_DDL);
  } finally {
    await dbConn.end();
  }
}

export interface SoldierRow {
  personal_number?: string;
  last_name?: string;
  first_name?: string;
  mobile_phone?: string;
  rank?: string;
  company?: string;
  department?: string;
  student_2026?: string;
  attached?: string;
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

export async function importSoldiers(battalionName: string, soldiers: SoldierRow[]): Promise<number> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });

  let insertedCount = 0;
  try {
    for (const soldier of soldiers) {
      await conn.execute(
        `INSERT INTO soldiers (
          personal_number, last_name, first_name, mobile_phone, \`rank\`, company, department,
          student_2026, attached, request_status, marital_status, children_count,
          student_indicator, spouse, spouse_phone, data_indicators, contact_by,
          contact_date, contact_with, employment_status, welfare_fund, national_insurance,
          other_assistance, applications_needed, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          soldier.personal_number || null,
          soldier.last_name || null,
          soldier.first_name || null,
          soldier.mobile_phone || null,
          soldier.rank || null,
          soldier.company || null,
          soldier.department || null,
          soldier.student_2026 || null,
          soldier.attached || null,
          soldier.request_status || null,
          soldier.marital_status || null,
          soldier.children_count || null,
          soldier.student_indicator || null,
          soldier.spouse || null,
          soldier.spouse_phone || null,
          soldier.data_indicators || null,
          soldier.contact_by || null,
          soldier.contact_date || null,
          soldier.contact_with || null,
          soldier.employment_status || null,
          soldier.welfare_fund || null,
          soldier.national_insurance || null,
          soldier.other_assistance || null,
          soldier.applications_needed || null,
          soldier.notes || null,
        ]
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

export async function getDashboardData(people: string[]): Promise<PersonDashboard[]> {
  // Get all battalion DB names
  const conn = await mysql.createConnection(dbConfig);
  let dbNames: string[] = [];
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
    );
    dbNames = rows.map((r) => r.SCHEMA_NAME as string);
  } finally {
    await conn.end();
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

export async function getSoldiersFromBattalion(battalionName: string): Promise<SoldierRow[]> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT personal_number, first_name, last_name, mobile_phone, \`rank\`, company, department FROM soldiers`
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

export async function updateSoldier(
  battalionName: string,
  id: number,
  data: Partial<SoldierRow>
): Promise<void> {
  const dbName = getBattalionDbName(battalionName);
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  try {
    const READONLY_FIELDS = new Set(['id', 'created_at', 'updated_at']);
    const fields = Object.keys(data)
      .filter((k) => !READONLY_FIELDS.has(k))
      .map((k) => (k === 'rank' ? `\`rank\` = ?` : `${k} = ?`));
    const values = Object.keys(data)
      .filter((k) => !READONLY_FIELDS.has(k))
      .map((k) => (data as any)[k]);
    if (fields.length === 0) return;
    await conn.execute(
      `UPDATE soldiers SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );
  } finally {
    await conn.end();
  }
}
