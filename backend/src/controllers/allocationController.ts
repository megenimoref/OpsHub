import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { fn, col } from 'sequelize';
import SoldierAllocation from '../models/soldierAllocation';
import User from '../models/user';
import { getBattalionDbName, listBattalions } from '../services/battalionService';
import { logger } from '../services/logger';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

export const allocateSoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { battalionName, allocations } = req.body;

    if (!battalionName || !Array.isArray(allocations) || allocations.length === 0) {
      res.status(400).json({ error: 'Invalid request: battalionName and allocations array required' });
      return;
    }

    // Validate allocation items
    for (const alloc of allocations) {
      if (!alloc.userId || typeof alloc.count !== 'number' || alloc.count < 0) {
        res.status(400).json({ error: 'Invalid allocation item: userId and count (>= 0) required' });
        return;
      }
    }

    // Super users can only allocate to non-admin users
    if (req.userRole === 'super') {
      const targetUserIds = allocations.map((a: any) => a.userId).filter(Boolean);
      if (targetUserIds.length > 0) {
        const targetUsers = await User.findAll({ where: { id: targetUserIds }, attributes: ['id', 'role'] });
        const hasAdminTarget = targetUsers.some((u) => u.role === 'admin');
        if (hasAdminTarget) {
          res.status(403).json({ error: 'משתמש super לא יכול להקצות חיילים למשתמשי admin' });
          return;
        }
      }
    }

    logger.info('Allocate soldiers started', { battalionName, allocations });

    const dbName = getBattalionDbName(battalionName);

    // Step 1: Query battalion DB for all soldiers ordered by id
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    let allSoldiers: { personal_number: string; contact_by: string }[] = [];
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT personal_number, contact_by FROM soldiers ORDER BY id ASC'
      );
      allSoldiers = rows
        .filter((r) => r.personal_number != null && r.personal_number !== '')
        .map((r) => ({ personal_number: r.personal_number as string, contact_by: (r.contact_by as string) || '' }));
    } finally {
      await conn.end();
    }

    // Step 2: Query main DB for already-allocated soldiers in this battalion
    const allocated = await SoldierAllocation.findAll({
      attributes: ['soldier_personal_number'],
      where: { battalion_name: battalionName },
    });
    const allocatedSet = new Set(allocated.map((a) => a.soldier_personal_number));

    // Step 3: Filter out already-allocated soldiers and soldiers with contact_by set
    const unallocated = allSoldiers.filter((s) => !allocatedSet.has(s.personal_number) && !s.contact_by?.trim());

    logger.info('Allocation calculation', {
      battalionName,
      totalSoldiers: allSoldiers.length,
      alreadyAllocated: allocatedSet.size,
      unallocatedCount: unallocated.length,
    });

    // Step 4: Walk allocations in order, slice unallocated soldiers
    let totalAllocated = 0;
    const records: Array<{ user_id: number | null; battalion_name: string; soldier_personal_number: string }> = [];

    let startIdx = 0;
    for (const { userId, count } of allocations) {
      if (count <= 0) continue;

      const endIdx = Math.min(startIdx + count, unallocated.length);
      const allocated = unallocated.slice(startIdx, endIdx);

      for (const soldier of allocated) {
        records.push({
          user_id: userId,
          battalion_name: battalionName,
          soldier_personal_number: soldier.personal_number,
        });
        totalAllocated++;
      }

      startIdx = endIdx;

      if (startIdx >= unallocated.length) break;
    }

    // Step 5: Bulk insert allocations
    if (records.length > 0) {
      await SoldierAllocation.bulkCreate(records, { ignoreDuplicates: true });
    }

    const remaining = unallocated.length - totalAllocated;

    logger.info('Allocate soldiers completed', { battalionName, totalAllocated, remaining });

    res.json({
      success: true,
      totalAllocated,
      remaining,
      message: `${totalAllocated} חיילים הוקצו בהצלחה`,
    });
  } catch (error: any) {
    logger.error('Allocate soldiers failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בהקצאת חיילים' });
  }
};

interface SoldierAllocationRow extends mysql.RowDataPacket {
  personal_number: string;
  first_name: string;
  last_name: string;
  request_status: string;
}

interface SoldierData {
  id: number;
  personal_number: string;
  first_name: string;
  last_name: string;
  request_status: string;
  battalion_name: string;
  contact_date: string;
  mobile_phone: string;
}

async function getSoldiersByAllocation(userId: number): Promise<SoldierData[]> {
  const allocations = await SoldierAllocation.findAll({
    where: { user_id: userId },
    attributes: ['battalion_name', 'soldier_personal_number'],
  });

  const byBattalion: Record<string, string[]> = {};
  for (const alloc of allocations) {
    if (!byBattalion[alloc.battalion_name]) byBattalion[alloc.battalion_name] = [];
    byBattalion[alloc.battalion_name].push(alloc.soldier_personal_number);
  }

  const results: SoldierData[] = [];
  for (const [battalionName, personalNumbers] of Object.entries(byBattalion)) {
    const dbName = getBattalionDbName(battalionName);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    try {
      const placeholders = personalNumbers.map(() => '?').join(',');
      const [rows] = await conn.execute<SoldierAllocationRow[]>(
        `SELECT id, personal_number, first_name, last_name, request_status, contact_date, mobile_phone FROM soldiers WHERE personal_number IN (${placeholders})`,
        personalNumbers
      );
      for (const row of rows) {
        results.push({
          id: (row as any).id,
          personal_number: row.personal_number,
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          request_status: row.request_status || '',
          battalion_name: battalionName,
          contact_date: (row as any).contact_date || '',
          mobile_phone: (row as any).mobile_phone || '',
        });
      }
    } finally {
      await conn.end();
    }
  }
  return results;
}

async function getSoldiersByContactBy(contactName: string): Promise<SoldierData[]> {
  const battalions = await listBattalions();
  const results: SoldierData[] = [];

  await Promise.all(
    battalions.map(async (battalionName) => {
      const dbName = getBattalionDbName(battalionName);
      try {
        const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
        try {
          const [rows] = await conn.execute<SoldierAllocationRow[]>(
            `SELECT id, personal_number, first_name, last_name, request_status, contact_date, mobile_phone
             FROM soldiers
             WHERE contact_by = ? AND personal_number IS NOT NULL AND personal_number != ''`,
            [contactName]
          );
          for (const row of rows) {
            results.push({
              id: (row as any).id,
              personal_number: row.personal_number,
              first_name: row.first_name || '',
              last_name: row.last_name || '',
              request_status: row.request_status || '',
              battalion_name: battalionName,
              contact_date: (row as any).contact_date || '',
              mobile_phone: (row as any).mobile_phone || '',
            });
          }
        } finally {
          await conn.end();
        }
      } catch {
        // Battalion DB might be inaccessible — skip silently
      }
    })
  );

  return results;
}

export const getMySoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('Get my soldiers started', { userId: req.userId });

    const contactName = req.userFirstName || '';

    const [allocationSoldiers, contactBySoldiers] = await Promise.all([
      getSoldiersByAllocation(req.userId),
      contactName ? getSoldiersByContactBy(contactName) : Promise.resolve([]),
    ]);

    // Merge and deduplicate (allocation takes priority)
    const seen = new Set<string>();
    const merged: SoldierData[] = [];
    for (const s of [...allocationSoldiers, ...contactBySoldiers]) {
      const key = `${s.battalion_name}:${s.personal_number}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(s);
      }
    }

    logger.info('Get my soldiers completed', {
      userId: req.userId,
      fromAllocation: allocationSoldiers.length,
      fromContactBy: contactBySoldiers.length,
      total: merged.length,
    });

    res.json(merged);
  } catch (error: any) {
    logger.error('Get my soldiers failed', { userId: req.userId, errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בשליפת החיילים שלך' });
  }
};

export const getAllocationsByBattalion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;

    if (!name) {
      res.status(400).json({ error: 'Missing battalion name' });
      return;
    }

    logger.info('Get allocations by battalion started', { battalionName: name });

    // Query all allocations for this battalion
    const allocations = await SoldierAllocation.findAll({
      where: { battalion_name: name },
      attributes: ['soldier_personal_number', 'user_id'],
    });

    const result = allocations.map((a) => ({
      soldier_personal_number: a.soldier_personal_number,
      user_id: a.user_id,
    }));

    logger.info('Get allocations by battalion completed', { battalionName: name, count: result.length });

    res.json(result);
  } catch (error: any) {
    logger.error('Get allocations by battalion failed', {
      battalionName: req.params?.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: error.message || 'שגיאה בשליפת הקצאות' });
  }
};

export const deallocateSoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { battalionName, userId, count } = req.body;

    if (!battalionName || !userId) {
      res.status(400).json({ error: 'נדרשים battalionName ו-userId' });
      return;
    }

    if (count !== undefined && (isNaN(Number(count)) || Number(count) <= 0)) {
      res.status(400).json({ error: 'count חייב להיות מספר חיובי' });
      return;
    }

    logger.info('Deallocate soldiers started', { battalionName, userId });

    // Step 1: Find all allocations for this user + battalion
    const allocations = await SoldierAllocation.findAll({
      where: { battalion_name: battalionName, user_id: userId },
      attributes: ['soldier_personal_number'],
    });

    if (allocations.length === 0) {
      res.json({ removed: 0, kept: 0, message: 'אין חיילים מוקצים למשתמש זה בגדוד' });
      return;
    }

    const personalNumbers = allocations.map((a) => a.soldier_personal_number);

    // Step 2: Fetch target user's full name (for contact_by comparison)
    const targetUser = await User.findOne({ where: { id: userId }, attributes: ['firstName', 'lastName'] });
    const userFullName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}`.trim() : '';

    // Step 3: Query battalion DB for request_status and contact_by
    const dbName = getBattalionDbName(battalionName);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    const statusMap: Record<string, string> = {};
    const contactByMap: Record<string, string> = {};
    try {
      const placeholders = personalNumbers.map(() => '?').join(',');
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT personal_number, request_status, contact_by FROM soldiers WHERE personal_number IN (${placeholders})`,
        personalNumbers
      );
      for (const row of rows) {
        statusMap[row.personal_number] = row.request_status || '';
        contactByMap[row.personal_number] = row.contact_by || '';
      }
    } finally {
      await conn.end();
    }

    // Step 4: Decide which soldiers to remove
    const forceAll = req.body.forceAll === true || req.body.forceAll === 'true';
    const HANDLED = ['טופלה', 'טופל'];
    let toRemove = personalNumbers.filter((pn) => {
      if (forceAll) return true; // force-remove everyone regardless of status
      if (HANDLED.includes(statusMap[pn])) return false; // keep טופל/טופלה
      return true;
    });
    if (count !== undefined) {
      toRemove = toRemove.slice(0, Number(count));
    }
    const kept = personalNumbers.length - toRemove.length;

    if (toRemove.length > 0) {
      await SoldierAllocation.destroy({
        where: {
          battalion_name: battalionName,
          user_id: userId,
          soldier_personal_number: toRemove,
        },
      });

      // Clear contact_by in the battalion DB for soldiers whose contact_by matches this user
      if (userFullName) {
        const soldiersToUnassign = toRemove.filter(
          (pn) => (contactByMap[pn] || '').trim() === userFullName
        );
        if (soldiersToUnassign.length > 0) {
          const conn2 = await mysql.createConnection({ ...dbConfig, database: dbName });
          try {
            const placeholders2 = soldiersToUnassign.map(() => '?').join(',');
            await conn2.execute(
              `UPDATE soldiers SET contact_by = NULL WHERE personal_number IN (${placeholders2})`,
              soldiersToUnassign
            );
          } finally {
            await conn2.end();
          }
        }
      }
    }

    logger.info('Deallocate soldiers completed', { battalionName, userId, removed: toRemove.length, kept });

    res.json({
      success: true,
      removed: toRemove.length,
      kept,
      message: `${toRemove.length} חיילים הוסרו מהקצאת המשתמש`,
    });
  } catch (error: any) {
    logger.error('Deallocate soldiers failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בהסרת חיילים' });
  }
};

// Assign a specific list of soldiers (by personal number) to a user
export const assignSoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { battalionName, userId, personalNumbers } = req.body;

    if (!battalionName || !userId || !Array.isArray(personalNumbers) || personalNumbers.length === 0) {
      res.status(400).json({ error: 'נדרשים battalionName, userId ורשימת מספרים אישיים' });
      return;
    }

    const cleaned: string[] = personalNumbers
      .map((p: any) => String(p).trim())
      .filter(Boolean);

    if (cleaned.length === 0) {
      res.status(400).json({ error: 'לא נמצאו מספרים אישיים תקינים' });
      return;
    }

    // Verify soldiers exist in the battalion DB
    const dbName = getBattalionDbName(battalionName);
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    let foundNumbers: string[] = [];
    try {
      const placeholders = cleaned.map(() => '?').join(',');
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT personal_number FROM soldiers WHERE personal_number IN (${placeholders})`,
        cleaned
      );
      foundNumbers = rows.map((r) => r.personal_number);
    } finally {
      await conn.end();
    }

    const notFound = cleaned.filter((pn) => !foundNumbers.includes(pn));

    if (foundNumbers.length === 0) {
      res.status(400).json({ error: 'לא נמצא אף חייל מהרשימה בגדוד זה' });
      return;
    }

    const allocationsToInsert = foundNumbers.map((pn) => ({
      user_id: Number(userId),
      battalion_name: battalionName,
      soldier_personal_number: pn,
    }));

    // Upsert — if already allocated to someone else, reassign to new user
    await SoldierAllocation.bulkCreate(allocationsToInsert, {
      updateOnDuplicate: ['user_id', 'updatedAt'],
    });

    logger.info('Assign soldiers completed', { battalionName, userId, assigned: foundNumbers.length, notFound });

    res.json({
      success: true,
      assigned: foundNumbers.length,
      notFound,
      message: `${foundNumbers.length} חיילים הוצבו למשתמש`,
    });
  } catch (error: any) {
    logger.error('Assign soldiers failed', { errorMessage: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'שגיאה בהצבת חיילים' });
  }
};

// Returns total allocated soldiers per user (global, across all battalions)
export const getUserAllocationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await SoldierAllocation.findAll({
      attributes: [
        'user_id',
        [fn('COUNT', col('soldier_personal_number')), 'count'],
      ],
      group: ['user_id'],
      raw: true,
    });

    res.json(
      stats.map((s: any) => ({
        userId: s.user_id,
        count: parseInt(s.count, 10) || 0,
      }))
    );
  } catch (error: any) {
    logger.error('Get user allocation stats failed', { errorMessage: error.message });
    res.status(500).json({ error: error.message || 'שגיאה בשליפת סטטיסטיקות הקצאות' });
  }
};
