import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { Op } from 'sequelize';
import CommunityContact from '../models/communityContact';
import User from '../models/user';
import { getBattalionDbName } from '../services/battalionService';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

// GET /community/spouses/:battalion
// Fetches soldiers with a spouse from the given battalion DB
export const getSpousesByBattalion = async (req: Request, res: Response): Promise<void> => {
  const { battalion } = req.params;
  if (!battalion) {
    res.status(400).json({ error: 'Missing battalion' });
    return;
  }

  const dbName = getBattalionDbName(battalion);
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT personal_number, first_name, last_name, spouse, spouse_phone
       FROM soldiers
       WHERE spouse IS NOT NULL AND TRIM(spouse) != ''
       ORDER BY last_name, first_name`
    );
    res.json(rows);
  } catch (err: any) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      res.status(404).json({ error: 'גדוד לא נמצא' });
    } else {
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  } finally {
    await conn?.end();
  }
};

// GET /community/contacts?battalion=...
export const getCommunityContacts = async (req: Request, res: Response): Promise<void> => {
  const { battalion } = req.query as { battalion?: string };
  const where: any = {};
  if (battalion) where.battalion = battalion;

  try {
    const contacts = await CommunityContact.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json(contacts);
  } catch {
    res.status(500).json({ error: 'שגיאת שרת' });
  }
};

// PUT /community/contacts — upsert by battalion + personal_number
export const upsertCommunityContact = async (req: Request, res: Response): Promise<void> => {
  const { battalion, personal_number, soldier_name, spouse_name, spouse_phone, contact_by, notes, call_summary } = req.body;

  if (!battalion || !personal_number) {
    res.status(400).json({ error: 'חסרים שדות חובה' });
    return;
  }

  try {
    const [contact] = await CommunityContact.findOrCreate({
      where: { battalion, personal_number },
      defaults: { battalion, personal_number, soldier_name, spouse_name, spouse_phone, contact_by, notes, call_summary },
    });
    await contact.update({ soldier_name, spouse_name, spouse_phone, contact_by, notes, call_summary });
    res.json(contact);
  } catch {
    res.status(500).json({ error: 'שגיאת שרת' });
  }
};

// GET /community/users — list system users for the dropdown
export const getCommunityUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email'],
      order: [['firstName', 'ASC']],
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'שגיאת שרת' });
  }
};
