import mysql from 'mysql2/promise';
import { CATEGORIES, SCANNED_FIELDS, classifyBlob } from './sheagatHaariCategories';
import { logger } from './logger';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || '1qaz!QAZ',
};

/** A single soldier counts as "treated" if request_status === 'טופלה' (the
 *  user confirmed this — "ממתין לתשובה", "חייל לא זמין", NULL etc. all mean
 *  someone still owes them a call). */
const TREATED_STATUS = 'טופלה';

export interface SubcategoryStat {
  key: string;
  label: string;
  count: number;
  pct: number;
}

export interface CategoryStat {
  key: string;
  label: string;
  color: string;
  count: number;     // distinct soldiers matching at least one subcategory
  pct: number;       // count / total
  subcategories: SubcategoryStat[];
}

export interface BattalionStats {
  battalion: string;
  total: number;
  treated: number;
  treatedPct: number;
  untreated: number;
  untreatedPct: number;
  categories: CategoryStat[];
  /** Soldiers who have ANY non-empty content in the scanned fields but
   *  matched zero subcategories — useful for tuning keywords. */
  unmatched: number;
  unmatchedPct: number;
  /** Up to 20 short snippets from unmatched soldiers, lightly redacted, so
   *  the team can see WHAT failed to classify and add keywords. */
  unmatchedSamples: string[];
}

export interface SheagatHaariResponse {
  generatedAt: string;
  battalions: BattalionStats[];
  /** Aggregated across all battalions — same shape as one battalion. */
  total: BattalionStats;
}

/** Discover every battalion DB on the server (`battalion_*` schemas).
 *  Static seeds (כיבוי, קשר עורף) are ensured to be present even if their
 *  DBs don't exist yet — they show as 0/0 in the dashboard until imported. */
async function listBattalionDbs(): Promise<string[]> {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'battalion_%'`
    );
    return rows.map((r) => r.SCHEMA_NAME as string);
  } finally {
    await conn.end();
  }
}

/** Defensive column selection: not every battalion DB has every column from
 *  SCANNED_FIELDS (older schemas predate columns like `complex_problems`).
 *  We probe once per DB and SELECT only what exists, defaulting the rest
 *  to '' in JS so the classifier sees a consistent blob. */
async function existingColumns(conn: mysql.Connection, dbName: string): Promise<Set<string>> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soldiers'`,
    [dbName]
  );
  return new Set(rows.map((r) => (r.COLUMN_NAME as string).toLowerCase()));
}

function makeEmptyStats(battalion: string): BattalionStats {
  return {
    battalion,
    total: 0,
    treated: 0,
    treatedPct: 0,
    untreated: 0,
    untreatedPct: 0,
    categories: CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      color: c.color,
      count: 0,
      pct: 0,
      subcategories: c.subcategories.map((s) => ({ key: s.key, label: s.label, count: 0, pct: 0 })),
    })),
    unmatched: 0,
    unmatchedPct: 0,
    unmatchedSamples: [],
  };
}

function pct(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.round((num / denom) * 1000) / 10; // 1 decimal place
}

function finalisePcts(s: BattalionStats): void {
  s.treatedPct = pct(s.treated, s.total);
  s.untreatedPct = pct(s.untreated, s.total);
  s.unmatchedPct = pct(s.unmatched, s.total);
  for (const cat of s.categories) {
    cat.pct = pct(cat.count, s.total);
    for (const sub of cat.subcategories) sub.pct = pct(sub.count, s.total);
  }
}

export async function getSheagatHaariStats(): Promise<SheagatHaariResponse> {
  const dbNames = await listBattalionDbs();

  // Static seeds — show in dashboard even with 0 soldiers so the user can
  // see they exist and start importing into them.
  const staticSeeds = ['כיבוי', 'קשר עורף'];
  const seenNames = new Set(dbNames.map((d) => d.replace(/^battalion_/, '')));
  for (const seed of staticSeeds) {
    if (!seenNames.has(seed)) dbNames.push(`battalion_${seed}`);
  }

  const battalions: BattalionStats[] = [];
  const overall = makeEmptyStats('סך הכל');

  for (const dbName of dbNames) {
    const battalionLabel = dbName.replace(/^battalion_/, '');
    const stats = makeEmptyStats(battalionLabel);

    let conn: mysql.Connection | null = null;
    try {
      conn = await mysql.createConnection({ ...dbConfig, database: dbName });

      const cols = await existingColumns(conn, dbName);
      // Always need request_status for treated/untreated split; fall back to
      // empty selection if the DB doesn't even have the soldiers table yet
      // (the static seeds case).
      if (!cols.has('request_status')) {
        battalions.push(stats);
        continue;
      }

      const selectCols = ['request_status', ...SCANNED_FIELDS.filter((f) => cols.has(f) && f !== 'request_status')];
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT ${selectCols.map((c) => `\`${c}\``).join(', ')} FROM soldiers`
      );

      stats.total = rows.length;

      for (const row of rows) {
        const status = String(row.request_status || '').trim();
        if (status === TREATED_STATUS) stats.treated++;
        else stats.untreated++;

        // Build the search blob from every non-null field. Numbers/booleans
        // from TEXT columns coerce fine; null becomes '' so includes() is safe.
        const parts: string[] = [];
        for (const f of selectCols) {
          const v = row[f];
          if (v != null && String(v).trim()) parts.push(String(v));
        }
        const blob = parts.join(' \n ');

        const matched = classifyBlob(blob);
        if (matched.length === 0) {
          if (blob.trim()) {
            stats.unmatched++;
            if (stats.unmatchedSamples.length < 20) {
              // Trim long blobs — we just want a hint of what failed.
              stats.unmatchedSamples.push(blob.length > 140 ? blob.slice(0, 140) + '…' : blob);
            }
          }
          continue;
        }

        // Distinct categories matched by THIS soldier — soldier counts once
        // per category they touch.
        const catSeen = new Set<string>();
        const subSeen = new Set<string>();
        for (const m of matched) {
          catSeen.add(m.categoryKey);
          subSeen.add(`${m.categoryKey}::${m.subKey}`);
        }
        for (const cat of stats.categories) {
          if (catSeen.has(cat.key)) cat.count++;
          for (const sub of cat.subcategories) {
            if (subSeen.has(`${cat.key}::${sub.key}`)) sub.count++;
          }
        }
      }
    } catch (err: any) {
      logger.error('sheagatHaari: battalion scan failed', {
        dbName,
        errorMessage: err.message,
      });
    } finally {
      if (conn) await conn.end();
    }

    finalisePcts(stats);
    battalions.push(stats);

    // Aggregate into overall
    overall.total += stats.total;
    overall.treated += stats.treated;
    overall.untreated += stats.untreated;
    overall.unmatched += stats.unmatched;
    for (let i = 0; i < overall.categories.length; i++) {
      overall.categories[i].count += stats.categories[i].count;
      for (let j = 0; j < overall.categories[i].subcategories.length; j++) {
        overall.categories[i].subcategories[j].count += stats.categories[i].subcategories[j].count;
      }
    }
  }

  finalisePcts(overall);

  // Sort battalions by total desc so the busy ones land first.
  battalions.sort((a, b) => b.total - a.total);

  return {
    generatedAt: new Date().toISOString(),
    battalions,
    total: overall,
  };
}
