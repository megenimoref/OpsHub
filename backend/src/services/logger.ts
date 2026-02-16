import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.resolve(__dirname, '../../logs');

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function getLogFile(type: 'error' | 'info'): string {
  const date = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  return path.join(LOGS_DIR, `${type}-${date}.log`);
}

function write(type: 'error' | 'info', message: string, meta?: Record<string, any>) {
  ensureLogsDir();
  const metaStr = meta ? '\n  ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ') : '';
  const line = `[${timestamp()}] [${type.toUpperCase()}] ${message}${metaStr}\n${'─'.repeat(80)}\n`;

  fs.appendFileSync(getLogFile(type), line, 'utf8');

  if (type === 'error') {
    console.error(`[${timestamp()}] ERROR: ${message}`, meta || '');
  } else {
    console.log(`[${timestamp()}] INFO:  ${message}`, meta || '');
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, any>) => write('info', message, meta),
  error: (message: string, meta?: Record<string, any>) => write('error', message, meta),
};
