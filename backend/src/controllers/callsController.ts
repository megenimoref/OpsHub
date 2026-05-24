import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import { User } from '../models/user';

const CALLS_BASE_DIR = path.join(__dirname, '../../uploads/calls');
const TRANSKRIPTOR_TOKEN = 'a80167078ae74e80d0f9f35fe8e9e583b117455fafe1d9cc3e07d922a4a4e5d0613501ba89bc722ae7a181e3e83b301780fedebf03a4238c58e0d85ecfe62526';

// ── Ensure call_summaries table exists ──────────────────────────────────────
const CALL_SUMMARIES_DDL = `
CREATE TABLE IF NOT EXISTS call_summaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  soldier_personal_number VARCHAR(50) NOT NULL,
  battalion_name VARCHAR(200),
  uploaded_by INT NOT NULL,
  uploaded_by_name VARCHAR(200),
  audio_filename VARCHAR(500),
  summary TEXT,
  raw_transcript TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_soldier (soldier_personal_number),
  INDEX idx_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureCallSummariesTable(): Promise<void> {
  await sequelize.query(CALL_SUMMARIES_DDL);
}

// ── Create folder for a single user ─────────────────────────────────────────
function createUserFolder(userId: number): void {
  const userDir = path.join(CALLS_BASE_DIR, String(userId));
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
}

// ── Init folders for ALL existing users ─────────────────────────────────────
export async function ensureAllUsersFolders(_req: Request, res: Response): Promise<void> {
  try {
    const users = await User.findAll({ attributes: ['id'], raw: true });
    for (const u of users) createUserFolder((u as any).id);
    res.json({ created: users.length });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת תיקיות' });
  }
}

// ── Upload audio file ────────────────────────────────────────────────────────
export async function uploadCallFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'לא נבחר קובץ' });
      return;
    }
    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בהעלאת הקובץ' });
  }
}

// ── Transcribe & Summarize via Transkriptor ───────────────────────────────────
export async function transcribeAndSummarize(req: Request, res: Response): Promise<void> {
  const { filename } = req.body;
  const userId = (req as any).userId;

  if (!filename) {
    res.status(400).json({ error: 'חסר שם קובץ' });
    return;
  }

  const filePath = path.join(CALLS_BASE_DIR, String(userId), filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'קובץ לא נמצא' });
    return;
  }

  try {
    // Step 1: Upload file to Transkriptor
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const uploadRes = await axios.post(
      'https://api.transkriptor.com/v1/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${TRANSKRIPTOR_TOKEN}`,
        },
        timeout: 60000,
      }
    );

    const transcriptionId = uploadRes.data?.id || uploadRes.data?.transcription_id;

    if (!transcriptionId) {
      res.status(500).json({ error: 'לא התקבל מזהה תמלול', raw: uploadRes.data });
      return;
    }

    // Step 2: Poll for completion
    let transcript = '';
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await axios.get(
        `https://api.transkriptor.com/v1/transcriptions/${transcriptionId}`,
        { headers: { 'Authorization': `Bearer ${TRANSKRIPTOR_TOKEN}` } }
      );
      const status = statusRes.data?.status;
      if (status === 'completed' || status === 'done') {
        transcript = statusRes.data?.text || statusRes.data?.transcript || '';
        break;
      }
      if (status === 'failed' || status === 'error') {
        res.status(500).json({ error: 'התמלול נכשל' });
        return;
      }
      attempts++;
    }

    if (!transcript) {
      res.status(408).json({ error: 'התמלול לקח יותר מדי זמן, נסה שוב' });
      return;
    }

    // Step 3: Request summary
    let summary = transcript;
    try {
      const summaryRes = await axios.post(
        `https://api.transkriptor.com/v1/transcriptions/${transcriptionId}/summary`,
        {},
        { headers: { 'Authorization': `Bearer ${TRANSKRIPTOR_TOKEN}` } }
      );
      summary = summaryRes.data?.summary || transcript;
    } catch {
      // If summary endpoint doesn't exist, return the raw transcript
      summary = transcript;
    }

    res.json({ transcript, summary, transcriptionId });
  } catch (err: any) {
    // If Transkriptor API details are wrong, return clear error
    const status = err?.response?.status;
    const data = err?.response?.data;
    res.status(500).json({
      error: `שגיאה בתמלול (${status || 'network'})`,
      details: data,
    });
  }
}

// ── Get call summaries for a soldier ────────────────────────────────────────
export async function getCallSummaries(req: Request, res: Response): Promise<void> {
  const { soldierPersonalNumber } = req.params;
  try {
    await ensureCallSummariesTable();
    const rows = await sequelize.query(
      `SELECT * FROM call_summaries WHERE soldier_personal_number = ? ORDER BY created_at DESC`,
      { replacements: [soldierPersonalNumber], type: QueryTypes.SELECT }
    );
    res.json({ summaries: rows });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת סיכומי שיחות' });
  }
}

// ── Save call summary ────────────────────────────────────────────────────────
export async function saveCallSummary(req: Request, res: Response): Promise<void> {
  const { soldierPersonalNumber, battalionName, summary, rawTranscript, audioFilename } = req.body;
  const userId = (req as any).userId;

  if (!soldierPersonalNumber || !summary) {
    res.status(400).json({ error: 'חסרים נתונים' });
    return;
  }

  try {
    await ensureCallSummariesTable();

    // Get user name
    const user = await User.findByPk(userId, { attributes: ['firstName', 'lastName'], raw: true }) as any;
    const uploadedByName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

    await sequelize.query(
      `INSERT INTO call_summaries (soldier_personal_number, battalion_name, uploaded_by, uploaded_by_name, audio_filename, summary, raw_transcript)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [soldierPersonalNumber, battalionName || '', userId, uploadedByName, audioFilename || '', summary, rawTranscript || ''] }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשמירת הסיכום' });
  }
}

// ── Delete call summary ───────────────────────────────────────────────────────
export async function deleteCallSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await sequelize.query(`DELETE FROM call_summaries WHERE id = ?`, { replacements: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת הסיכום' });
  }
}
