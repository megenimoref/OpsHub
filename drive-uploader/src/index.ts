/**
 * CRM Drive Uploader
 *
 * Periodically scans the /app/backups directory (mounted from the host) and
 * uploads every .sql backup file to a Google Drive folder using a service
 * account. Files inside Drive are organised under a per-day subfolder so the
 * weekly snapshots are easy to browse and so old ones aren't overwritten on
 * Drive when the local rotating-slot scheme overwrites them on the host.
 *
 * Schedule:
 *   - Configured via the CRON_SCHEDULE env var (node-cron format)
 *   - Default: every Sunday at 03:00 ("0 3 * * 0")
 *   - On startup we also run once immediately if RUN_ON_START=1, and we always
 *     run once when invoked with `--once` (used for manual one-off uploads).
 *
 * Required env vars:
 *   - GOOGLE_DRIVE_FOLDER_ID            — id of the parent Drive folder shared with the service account
 *   - GOOGLE_SERVICE_ACCOUNT_KEY        — path to the service-account JSON key (mounted as a secret)
 *
 * Optional env vars:
 *   - BACKUP_DIR                        — default /app/backups
 *   - CRON_SCHEDULE                     — default "0 3 * * 0" (Sun 03:00)
 *   - MAX_AGE_HOURS                     — only upload files modified in the last N hours (default 192 = 8 days)
 *   - RUN_ON_START                      — "1" to run an upload immediately on boot
 *   - TZ                                — timezone for cron (default Asia/Jerusalem)
 */

import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { google, drive_v3 } from 'googleapis';

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 3 * * 0';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '/run/secrets/gdrive-key.json';
const MAX_AGE_HOURS = Number(process.env.MAX_AGE_HOURS || 192);
const RUN_ON_START = process.env.RUN_ON_START === '1';
const TZ = process.env.TZ || 'Asia/Jerusalem';

function log(level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (extra !== undefined) {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}`, extra);
  } else {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}`);
  }
}

function buildDriveClient(): drive_v3.Drive {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`service-account key not found at ${KEY_PATH}`);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Find or create a sub-folder named `name` inside `parentId`. Returns the new
 * folder's id. We isolate each run inside a date-stamped subfolder so the
 * uploader is idempotent and historic uploads accumulate on Drive instead of
 * overwriting each other (the local /app/backups uses 7 rotating slots).
 */
async function getOrCreateSubfolder(drive: drive_v3.Drive, parentId: string, name: string): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const query =
    `mimeType = 'application/vnd.google-apps.folder' and ` +
    `'${parentId}' in parents and ` +
    `name = '${escapedName}' and trashed = false`;

  const search = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = search.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!created.data.id) {
    throw new Error(`failed to create subfolder ${name}`);
  }
  return created.data.id;
}

interface FileToUpload {
  fullPath: string;
  filename: string;
  size: number;
  mtime: Date;
}

function listBackupFiles(): FileToUpload[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    log('warn', `backup dir does not exist: ${BACKUP_DIR}`);
    return [];
  }
  const cutoff = MAX_AGE_HOURS > 0 ? Date.now() - MAX_AGE_HOURS * 3600 * 1000 : 0;
  const out: FileToUpload[] = [];
  for (const entry of fs.readdirSync(BACKUP_DIR)) {
    if (!entry.endsWith('.sql')) continue;
    const fullPath = path.join(BACKUP_DIR, entry);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch (err) {
      log('warn', `cannot stat ${fullPath}`, err);
      continue;
    }
    if (!stat.isFile()) continue;
    if (cutoff > 0 && stat.mtimeMs < cutoff) continue;
    out.push({ fullPath, filename: entry, size: stat.size, mtime: stat.mtime });
  }
  return out.sort((a, b) => a.filename.localeCompare(b.filename));
}

async function uploadFile(
  drive: drive_v3.Drive,
  parentId: string,
  file: FileToUpload
): Promise<void> {
  const result = await drive.files.create({
    requestBody: {
      name: file.filename,
      parents: [parentId],
    },
    media: {
      mimeType: 'application/sql',
      body: fs.createReadStream(file.fullPath),
    },
    fields: 'id, name, size',
    supportsAllDrives: true,
  });
  log('info', `uploaded ${file.filename} (${file.size} bytes) → drive id ${result.data.id}`);
}

async function runOnce(): Promise<{ uploaded: number; skipped: number; failed: number }> {
  if (!FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID env var is required');
  }
  log('info', `starting upload run; backup_dir=${BACKUP_DIR}, max_age_hours=${MAX_AGE_HOURS}`);

  const files = listBackupFiles();
  if (files.length === 0) {
    log('warn', 'no eligible backup files found');
    return { uploaded: 0, skipped: 0, failed: 0 };
  }

  const drive = buildDriveClient();
  const subfolderName = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const subfolderId = await getOrCreateSubfolder(drive, FOLDER_ID, subfolderName);
  log('info', `target drive folder: ${FOLDER_ID}/${subfolderName} (id=${subfolderId})`);

  let uploaded = 0;
  let failed = 0;
  for (const file of files) {
    try {
      await uploadFile(drive, subfolderId, file);
      uploaded++;
    } catch (err: any) {
      failed++;
      log('error', `upload failed for ${file.filename}`, err?.message || err);
    }
  }
  log('info', `run finished: uploaded=${uploaded}, failed=${failed}, total_eligible=${files.length}`);
  return { uploaded, skipped: 0, failed };
}

async function main() {
  const oneShot = process.argv.includes('--once');
  if (oneShot) {
    try {
      await runOnce();
      process.exit(0);
    } catch (err: any) {
      log('error', 'one-shot run failed', err?.message || err);
      process.exit(1);
    }
  }

  if (!cron.validate(CRON_SCHEDULE)) {
    log('error', `invalid CRON_SCHEDULE: ${CRON_SCHEDULE}`);
    process.exit(1);
  }
  log('info', `scheduled with cron "${CRON_SCHEDULE}" (TZ=${TZ})`);

  cron.schedule(
    CRON_SCHEDULE,
    () => {
      runOnce().catch((err) => log('error', 'scheduled run failed', err?.message || err));
    },
    { timezone: TZ }
  );

  if (RUN_ON_START) {
    log('info', 'RUN_ON_START=1, kicking off an immediate run');
    runOnce().catch((err) => log('error', 'startup run failed', err?.message || err));
  }
}

main().catch((err) => {
  log('error', 'fatal startup error', err?.message || err);
  process.exit(1);
});
