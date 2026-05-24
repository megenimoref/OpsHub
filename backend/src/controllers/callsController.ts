import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import User from '../models/user';

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

  const AUTH_HEADER = { 'Authorization': `Bearer ${TRANSKRIPTOR_TOKEN}`, 'Accept': 'application/json' };

  try {
    // Step 1: Get a pre-signed upload URL
    const getUrlRes = await axios.post(
      'https://api.tor.app/developer/transcription/local_file/get_upload_url',
      { file_name: path.basename(filePath) },
      { headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    const uploadUrl: string = getUrlRes.data?.upload_url;
    const publicUrl: string = getUrlRes.data?.public_url || getUrlRes.data?.url;

    if (!uploadUrl) {
      res.status(500).json({ error: 'לא התקבל URL להעלאה', raw: getUrlRes.data });
      return;
    }

    // Step 2: PUT the file to the pre-signed URL (no auth header needed for S3)
    const fileBuffer = fs.readFileSync(filePath);
    await axios.put(uploadUrl, fileBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Step 3: Initiate transcription
    const initiateRes = await axios.post(
      'https://api.tor.app/developer/transcription/local_file/initiate_transcription',
      { url: publicUrl, language: 'he-IL', service: 'Standard' },
      { headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    const orderId: string = initiateRes.data?.order_id || initiateRes.data?.id;

    if (!orderId) {
      res.status(500).json({ error: 'לא התקבל מזהה תמלול', raw: initiateRes.data });
      return;
    }

    // Step 4: Poll for completion
    let transcript = '';
    let attempts = 0;
    while (attempts < 40) {
      await new Promise((r) => setTimeout(r, 5000));
      const contentRes = await axios.get(
        `https://api.tor.app/developer/files/${orderId}/content`,
        { headers: AUTH_HEADER }
      );
      const status = contentRes.data?.status;
      if (status === 'Completed') {
        // Build transcript from content array
        const segments: any[] = contentRes.data?.content || [];
        transcript = segments.map((s: any) => s.text || '').join(' ').trim();
        if (!transcript) transcript = contentRes.data?.text || '';
        break;
      }
      if (status === 'Failed' || status === 'Error') {
        res.status(500).json({ error: 'התמלול נכשל' });
        return;
      }
      attempts++;
    }

    if (!transcript) {
      res.status(408).json({ error: 'התמלול לקח יותר מדי זמן, נסה שוב' });
      return;
    }

    // Step 5: Summarize via OpenAI GPT
    let summary = transcript;
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && transcript.length > 0) {
        const gptRes = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'אתה עוזר לצוות רווחה צבאי. סכם שיחות עם חיילים בעברית בצורה ברורה ותמציתית. כלול: נושאי השיחה העיקריים, מצב החייל, פעולות נדרשות אם יש, והמלצות המשך. כתוב בנקודות.',
              },
              {
                role: 'user',
                content: `סכם את השיחה הבאה:\n\n${transcript}`,
              },
            ],
            max_tokens: 500,
            temperature: 0.3,
          },
          {
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            timeout: 30000,
          }
        );
        summary = gptRes.data?.choices?.[0]?.message?.content || transcript;
      }
    } catch {
      summary = transcript;
    }

    res.json({ transcript, summary, transcriptionId: orderId });
  } catch (err: any) {
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
