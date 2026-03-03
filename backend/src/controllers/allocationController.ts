import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import SoldierAllocation from '../models/soldierAllocation';
import { getBattalionDbName } from '../services/battalionService';
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

    logger.info('Allocate soldiers started', { battalionName, allocations });

    const dbName = getBattalionDbName(battalionName);

    // Step 1: Query battalion DB for all soldiers ordered by id
    const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
    let allSoldiers: { personal_number: string }[] = [];
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT personal_number FROM soldiers ORDER BY id ASC'
      );
      allSoldiers = rows.map((r) => ({ personal_number: r.personal_number as string }));
    } finally {
      await conn.end();
    }

    // Step 2: Query main DB for already-allocated soldiers in this battalion
    const allocated = await SoldierAllocation.findAll({
      attributes: ['soldier_personal_number'],
      where: { battalion_name: battalionName },
    });
    const allocatedSet = new Set(allocated.map((a) => a.soldier_personal_number));

    // Step 3: Filter out already-allocated soldiers
    const unallocated = allSoldiers.filter((s) => !allocatedSet.has(s.personal_number));

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
  personal_number: string;
  first_name: string;
  last_name: string;
  request_status: string;
  battalion_name: string;
}

export const getMySoldiers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('Get my soldiers started', { userId: req.userId });

    // Step 1: Query allocations for current user
    const allocations = await SoldierAllocation.findAll({
      where: { user_id: req.userId },
      attributes: ['battalion_name', 'soldier_personal_number'],
    });

    if (allocations.length === 0) {
      res.json([]);
      return;
    }

    // Step 2: Group by battalion_name
    const byBattalion: Record<string, string[]> = {};
    for (const alloc of allocations) {
      if (!byBattalion[alloc.battalion_name]) {
        byBattalion[alloc.battalion_name] = [];
      }
      byBattalion[alloc.battalion_name].push(alloc.soldier_personal_number);
    }

    // Step 3: Query each battalion DB for soldier details
    const results: SoldierData[] = [];

    for (const [battalionName, personalNumbers] of Object.entries(byBattalion)) {
      const dbName = getBattalionDbName(battalionName);
      const conn = await mysql.createConnection({ ...dbConfig, database: dbName });

      try {
        const placeholders = personalNumbers.map(() => '?').join(',');
        const [rows] = await conn.execute<SoldierAllocationRow[]>(
          `SELECT personal_number, first_name, last_name, request_status FROM soldiers WHERE personal_number IN (${placeholders})`,
          personalNumbers
        );

        for (const row of rows) {
          results.push({
            personal_number: row.personal_number,
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            request_status: row.request_status || '',
            battalion_name: battalionName,
          });
        }
      } finally {
        await conn.end();
      }
    }

    logger.info('Get my soldiers completed', { userId: req.userId, count: results.length });

    res.json(results);
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
