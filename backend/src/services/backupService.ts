import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import { listBattalions, getBattalionDbName } from './battalionService';
import { logger } from './logger';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

const CONFIG_FILE = path.join(process.cwd(), 'backup-config.json');
export const DEFAULT_BACKUP_PATH = path.join(process.cwd(), 'backups');

export interface BackupConfig {
  enabled: boolean;
  hour: number;       // 0-23
  days: number[];     // 0-6 (0=Sunday, 6=Saturday)
  backupPath: string;
}

export interface BackupFileInfo {
  filename: string;
  battalionName: string;
  slot: number;       // 0-6
  slotLabel: string;  // "ראשון" ... "שבת"
  date: string;       // ISO mtime
  size: number;       // bytes
}

const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// ────────────────────────────────── Config ──────────────────────────────────

export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      enabled: false,
      hour: 2,
      days: [0, 1, 2, 3, 4, 5, 6],
      backupPath: DEFAULT_BACKUP_PATH,
    };
  }
}

export async function saveBackupConfig(config: BackupConfig): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// ─────────────────────────────── SQL Dump / Restore ─────────────────────────

export async function dumpDatabase(dbName: string): Promise<string> {
  const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
  const lines: string[] = [
    `-- Backup: ${dbName}`,
    `-- Date: ${new Date().toISOString()}`,
    '',
    'SET FOREIGN_KEY_CHECKS=0;',
    'SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";',
    '',
  ];

  try {
    const [tables] = await conn.query<any[]>('SHOW TABLES');
    if (tables.length === 0) {
      lines.push('-- No tables found');
      lines.push('SET FOREIGN_KEY_CHECKS=1;');
      return lines.join('\n');
    }

    const tableKey = `Tables_in_${dbName}`;

    for (const row of tables) {
      const tableName: string = row[tableKey] ?? Object.values(row)[0];

      // DROP + CREATE
      lines.push(`-- Table: ${tableName}`);
      lines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      const [[createRow]] = await conn.query<any[]>(`SHOW CREATE TABLE \`${tableName}\``);
      lines.push(createRow['Create Table'] + ';');
      lines.push('');

      // Rows
      const [rows] = await conn.query<any[]>(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');
        for (const rowData of rows) {
          const vals = Object.values(rowData).map((v) => {
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? '1' : '0';
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            const s = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `'${s}'`;
          }).join(', ');
          lines.push(`INSERT INTO \`${tableName}\` (${cols}) VALUES (${vals});`);
        }
        lines.push('');
      }
    }

    lines.push('SET FOREIGN_KEY_CHECKS=1;');
    return lines.join('\n');
  } finally {
    await conn.end();
  }
}

export async function restoreDatabase(dbName: string, sql: string): Promise<void> {
  // Execute with multipleStatements
  const conn = await mysql.createConnection({
    ...dbConfig,
    database: dbName,
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

// ─────────────────────────────── File Management ────────────────────────────

function slotFilename(battalionName: string, slot: number): string {
  return `${battalionName}_slot${slot}.sql`;
}

export async function backupAllBattalions(): Promise<{ success: string[]; failed: string[] }> {
  const config = await getBackupConfig();
  await fs.mkdir(config.backupPath, { recursive: true });

  const battalions = await listBattalions();
  const slot = new Date().getDay(); // 0=Sunday … 6=Saturday

  const success: string[] = [];
  const failed: string[] = [];

  for (const battalionName of battalions) {
    try {
      const dbName = getBattalionDbName(battalionName);
      const sql = await dumpDatabase(dbName);
      const filename = slotFilename(battalionName, slot);
      await fs.writeFile(path.join(config.backupPath, filename), sql, 'utf8');
      success.push(battalionName);
      logger.info('Backup created', { battalionName, filename, slot });
    } catch (err: any) {
      failed.push(battalionName);
      logger.error('Backup failed for battalion', { battalionName, error: err.message });
    }
  }

  return { success, failed };
}

export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  const config = await getBackupConfig();
  try {
    await fs.mkdir(config.backupPath, { recursive: true });
    const files = await fs.readdir(config.backupPath);
    const results: BackupFileInfo[] = [];

    for (const filename of files) {
      if (!filename.endsWith('.sql')) continue;
      // Format: {battalionName}_slot{0-6}.sql
      const match = filename.match(/^(.+)_slot([0-6])\.sql$/);
      if (!match) continue;

      const [, battalionName, slotStr] = match;
      const slot = parseInt(slotStr);
      const stat = await fs.stat(path.join(config.backupPath, filename));

      results.push({
        filename,
        battalionName,
        slot,
        slotLabel: DAY_LABELS[slot],
        date: stat.mtime.toISOString(),
        size: stat.size,
      });
    }

    // Sort: newest first
    return results.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function restoreFromFile(filename: string, battalionName: string): Promise<void> {
  const config = await getBackupConfig();
  // Sanitize filename to prevent path traversal — allow Hebrew letters too
  // (battalion names like "גדוד_5722" must survive the sanitization).
  const safeName = filename.replace(/[^a-zA-Z0-9._\-\u05D0-\u05EA\u05F0-\u05F4]/g, '');
  const filePath = path.join(config.backupPath, safeName);

  const sql = await fs.readFile(filePath, 'utf8');
  const dbName = getBattalionDbName(battalionName);
  await restoreDatabase(dbName, sql);
  logger.info('Restore completed', { filename: safeName, battalionName, dbName });
}

// ─────────────────────────────── Scheduler ──────────────────────────────────

let activeTask: ScheduledTask | null = null;

export function stopScheduler(): void {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }
}

export async function startScheduler(): Promise<void> {
  stopScheduler();

  const config = await getBackupConfig();
  if (!config.enabled || config.days.length === 0) {
    logger.info('Backup scheduler disabled');
    return;
  }

  // node-cron day-of-week: 0=Sunday … 6=Saturday (same as JS)
  const daysStr = config.days.join(',');
  const expression = `0 ${config.hour} * * ${daysStr}`;

  if (!cron.validate(expression)) {
    logger.error('Invalid cron expression for backup', { expression });
    return;
  }

  activeTask = cron.schedule(expression, async () => {
    logger.info('Scheduled backup starting', { expression });
    const result = await backupAllBattalions();
    logger.info('Scheduled backup done', result);
  });

  logger.info('Backup scheduler started', { expression });
}
