import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ── Duplicates types ──────────────────────────────────────────────────────────
interface DuplicateBattalionEntry {
  personal_number: string;
  battalionName: string;
  last_updated?: string;
}

interface DuplicateSoldier {
  personal_number: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  request_status: string;
  battalions: DuplicateBattalionEntry[];
}

interface DuplicatesData {
  byPersonalNumber: DuplicateSoldier[];
  byPhone: DuplicateSoldier[];
}

interface DupDeleteModal {
  soldier: DuplicateSoldier;
  selectedBattalion: string;
  deleting: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  'טופלה': 'bg-green-900/50 text-green-300 border-green-700',
  'חייל לא זמין': 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  'חייל ממתין לתשובה': 'bg-red-900/50 text-red-300 border-red-700',
  'חייל ביקש שיחזרו אליו': 'bg-sky-900/50 text-sky-300 border-sky-700',
  'ממתין לטיפול': 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
};

interface BackupConfig {
  enabled: boolean;
  hour: number;
  days: number[];
  backupPath: string;
}

interface BackupFile {
  filename: string;
  battalionName: string;
  slot: number;
  slotLabel: string;
  date: string;
  size: number;
}

interface RestoreModal {
  file: BackupFile;
  targetBattalion: string;
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export const BackupPage: React.FC = () => {
  const [mainTab, setMainTab] = useState<'backup' | 'duplicates'>('backup');

  // ── Duplicates state ─────────────────────────────────────────────────────
  const [dupData, setDupData] = useState<DuplicatesData | null>(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupType, setDupType] = useState<'byPersonalNumber' | 'byPhone'>('byPersonalNumber');
  const [dupDeleteModal, setDupDeleteModal] = useState<DupDeleteModal | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ deleted: number; skipped: number } | null>(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkSelectedBattalion, setBulkSelectedBattalion] = useState<string>('');

  const runDuplicateCheck = useCallback(async () => {
    setDupLoading(true);
    setBulkResult(null);
    try {
      const { data } = await api.get('/battalion/duplicate-soldiers');
      setDupData(data);
    } catch {
      setDupData({ byPersonalNumber: [], byPhone: [] });
    } finally {
      setDupLoading(false);
    }
  }, []);

  const confirmDupDelete = async () => {
    if (!dupDeleteModal) return;
    setDupDeleteModal({ ...dupDeleteModal, deleting: true });
    try {
      // Use the personal_number stored per-battalion entry (phone duplicates can have different personal numbers)
      const entry = dupDeleteModal.soldier.battalions.find((b) => b.battalionName === dupDeleteModal.selectedBattalion);
      const pnToDelete = entry?.personal_number || dupDeleteModal.soldier.personal_number;
      await api.delete(`/battalion/${encodeURIComponent(dupDeleteModal.selectedBattalion)}/soldiers/${encodeURIComponent(pnToDelete)}`);
      setDupData((prev) => {
        if (!prev) return prev;
        const filter = (list: DuplicateSoldier[]) =>
          list.map((d) =>
            d.personal_number === dupDeleteModal.soldier.personal_number
              ? { ...d, battalions: d.battalions.filter((b) => b.battalionName !== dupDeleteModal.selectedBattalion) }
              : d
          ).filter((d) => d.battalions.length > 1);
        return { byPersonalNumber: filter(prev.byPersonalNumber), byPhone: filter(prev.byPhone) };
      });
      setDupDeleteModal(null);
    } catch {
      alert('שגיאה במחיקה, נסה שוב');
      setDupDeleteModal((m) => m ? { ...m, deleting: false } : null);
    }
  };

  // All distinct battalion names that appear in current duplicates
  const dupBattalionOptions = (dups: DuplicateSoldier[]) => {
    const s = new Set<string>();
    for (const d of dups) for (const e of d.battalions) s.add(e.battalionName);
    return Array.from(s).sort();
  };

  const openBulkModal = () => {
    if (!dupData) return;
    const opts = dupBattalionOptions(dupData[dupType]);
    setBulkSelectedBattalion(opts[0] || '');
    setBulkModal(true);
  };

  const removeAllFromBattalion = async () => {
    if (!dupData || !bulkSelectedBattalion) return;
    const dups = dupData[dupType];
    // Only delete soldiers that actually appear in the selected battalion AND at least one other battalion
    const toDelete = dups
      .filter((d) => d.battalions.some((e) => e.battalionName === bulkSelectedBattalion) && d.battalions.length > 1)
      .map((d) => {
        const entry = d.battalions.find((e) => e.battalionName === bulkSelectedBattalion);
        return { battalionName: bulkSelectedBattalion, personal_number: entry?.personal_number || d.personal_number };
      });
    if (toDelete.length === 0) { setBulkModal(false); return; }
    setBulkModal(false);
    setBulkDeleting(true);
    setBulkResult(null);
    let deleted = 0, skipped = 0;
    for (const item of toDelete) {
      try {
        await api.delete(`/battalion/${encodeURIComponent(item.battalionName)}/soldiers/${encodeURIComponent(item.personal_number)}`);
        deleted++;
      } catch {
        skipped++;
      }
    }
    setBulkDeleting(false);
    setBulkResult({ deleted, skipped });
    runDuplicateCheck();
  };

  const currentDups = dupData ? dupData[dupType] : [];
  const deletableCount = currentDups.filter((d) => d.battalions.length > 1).length;

  // ── Backup state ─────────────────────────────────────────────────────────
  const [config, setConfig] = useState<BackupConfig>({
    enabled: false,
    hour: 2,
    days: [0, 1, 2, 3, 4, 5, 6],
    backupPath: '',
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [files, setFiles] = useState<BackupFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [battalions, setBattalions] = useState<string[]>([]);

  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [restoreModal, setRestoreModal] = useState<RestoreModal | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get<{ config: BackupConfig }>('/backup/config');
      setConfig(data.config);
    } catch { /* keep defaults */ }
    finally { setConfigLoading(false); }
  }, []);

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const { data } = await api.get<{ files: BackupFile[] }>('/backup/list');
      setFiles(data.files || []);
    } catch { setFiles([]); }
    finally { setFilesLoading(false); }
  }, []);

  useEffect(() => {
    loadConfig();
    loadFiles();
    api.get<{ battalions: string[] }>('/battalion').then(({ data }) =>
      setBattalions(data.battalions || [])
    ).catch(() => {});
  }, [loadConfig, loadFiles]);

  const toggleDay = (day: number) => {
    setConfig((c) => ({
      ...c,
      days: c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day].sort(),
    }));
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      await api.post('/backup/config', config);
      setConfigMsg({ type: 'ok', text: 'ההגדרות נשמרו בהצלחה' });
    } catch (err: any) {
      setConfigMsg({ type: 'err', text: err.response?.data?.error || 'שגיאה בשמירה' });
    } finally {
      setConfigSaving(false);
    }
  };

  const triggerBackup = async () => {
    setBackingUp(true);
    setBackupMsg(null);
    try {
      const { data } = await api.post<{ message: string }>('/backup/trigger');
      setBackupMsg({ type: 'ok', text: data.message });
      await loadFiles();
    } catch (err: any) {
      setBackupMsg({ type: 'err', text: err.response?.data?.error || 'שגיאה בגיבוי' });
    } finally {
      setBackingUp(false);
    }
  };

  const doRestore = async () => {
    if (!restoreModal) return;
    setRestoring(true);
    setRestoreMsg('');
    try {
      const { data } = await api.post<{ message: string }>('/backup/restore', {
        filename: restoreModal.file.filename,
        battalionName: restoreModal.targetBattalion,
      });
      setRestoreMsg(data.message);
    } catch (err: any) {
      setRestoreMsg(`שגיאה: ${err.response?.data?.error || 'שחזור נכשל'}`);
    } finally {
      setRestoring(false);
    }
  };

  const closeRestoreModal = () => {
    setRestoreModal(null);
    setRestoreMsg('');
  };

  // Group files by battalion for display
  const grouped = files.reduce<Record<string, BackupFile[]>>((acc, f) => {
    (acc[f.battalionName] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-1">גיבוי DB</h1>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-xl p-1 max-w-sm">
        <button
          onClick={() => setMainTab('backup')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${mainTab === 'backup' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          גיבוי ושחזור
        </button>
        <button
          onClick={() => setMainTab('duplicates')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${mainTab === 'duplicates' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          מצא כפולים
        </button>
      </div>

      {/* ── Duplicates tab ── */}
      {mainTab === 'duplicates' && (
        <div className="max-w-2xl">
          {!dupData && !dupLoading && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔁</div>
              <p className="text-gray-400 text-sm mb-6">הפעל בדיקה כדי למצוא חיילים שמופיעים ביותר מגדוד אחד</p>
              <button
                onClick={runDuplicateCheck}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
              >
                הפעל בדיקת כפילויות
              </button>
            </div>
          )}

          {dupLoading && (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">סורק את כל הגדודים...</p>
            </div>
          )}

          {dupData && !dupLoading && (
            <>
              {/* Sub-tabs + actions */}
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <button
                  onClick={() => setDupType('byPersonalNumber')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all border ${dupType === 'byPersonalNumber' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                >
                  לפי מספר אישי
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${dupType === 'byPersonalNumber' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                    {dupData.byPersonalNumber.length}
                  </span>
                </button>
                <button
                  onClick={() => setDupType('byPhone')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all border ${dupType === 'byPhone' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                >
                  לפי טלפון
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${dupType === 'byPhone' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                    {dupData.byPhone.length}
                  </span>
                </button>
                <div className="mr-auto flex gap-2">
                  {deletableCount > 0 && (
                    <button
                      onClick={openBulkModal}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-900/50 border border-red-700 text-red-300 hover:bg-red-800/60 hover:text-red-200 disabled:opacity-50 transition-all"
                    >
                      {bulkDeleting ? (
                        <><div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />מסיר...</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>הסר כפולים מגדוד ({deletableCount})</>
                      )}
                    </button>
                  )}
                  <button
                    onClick={runDuplicateCheck}
                    className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 border border-gray-700 transition-all"
                  >
                    רענן
                  </button>
                </div>
              </div>

              {bulkResult && (
                <div className="mb-4 p-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300">
                  ✅ הוסרו <span className="text-white font-semibold">{bulkResult.deleted}</span> כפולים
                  {bulkResult.skipped > 0 && <>, <span className="text-red-400">{bulkResult.skipped}</span> נכשלו</>}
                </div>
              )}

              {currentDups.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-3">✅</div>
                  <p>לא נמצאו כפילויות</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">{currentDups.length} חיילים כפולים</p>
                  {currentDups.map((d, i) => {
                    const getTs = (e: DuplicateBattalionEntry) => new Date(e.last_updated || 0).getTime();
                    const maxTs = Math.max(...d.battalions.map(getTs));
                    return (
                      <div key={i} className="bg-gray-800 border border-orange-800/50 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <span className="text-white font-semibold">{d.first_name} {d.last_name}</span>
                            {d.mobile_phone && <span dir="ltr" className="text-gray-400 text-sm mr-3">{d.mobile_phone}</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {d.request_status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[d.request_status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                {d.request_status}
                              </span>
                            )}
                            <button
                              onClick={() => setDupDeleteModal({ soldier: d, selectedBattalion: d.battalions[0].battalionName, deleting: false })}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 hover:border-red-600 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              הורד כפול
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {d.battalions.map((entry) => {
                            const ts = getTs(entry);
                            const isLatest = ts === maxTs && ts > 0;
                            const dateStr = entry.last_updated ? new Date(entry.last_updated).toLocaleDateString('he-IL') : null;
                            return (
                              <div
                                key={entry.battalionName}
                                className={`flex flex-col items-start px-3 py-1.5 rounded-lg text-xs border ${isLatest ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
                              >
                                <span className="font-medium">גדוד {entry.battalionName}</span>
                                {dateStr && (
                                  <span className={`mt-0.5 ${isLatest ? 'text-green-400' : 'text-gray-500'}`}>
                                    {isLatest ? '✓ ' : ''}{dateStr}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Backup tab ── */}
      {mainTab === 'backup' && <>

      {/* ── Settings card ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          הגדרות גיבוי
        </h2>

        {configLoading ? (
          <div className="text-gray-400 text-sm">טוען הגדרות...</div>
        ) : (
          <div className="space-y-5">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <div
                onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-cyan-600' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${config.enabled ? '-translate-x-6' : '-translate-x-1'}`} />
              </div>
              <span className="text-gray-200 text-sm font-medium">
                {config.enabled ? 'גיבוי אוטומטי פעיל' : 'גיבוי אוטומטי מושבת'}
              </span>
            </label>

            {/* Days */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ימי גיבוי</label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      config.days.includes(i)
                        ? 'bg-cyan-700 border-cyan-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Hour */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">שעת גיבוי</label>
              <select
                value={config.hour}
                onChange={(e) => setConfig((c) => ({ ...c, hour: parseInt(e.target.value) }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>

            {/* Backup path */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">תיקיית גיבוי (נתיב בשרת)</label>
              <input
                type="text"
                value={config.backupPath}
                onChange={(e) => setConfig((c) => ({ ...c, backupPath: e.target.value }))}
                placeholder="/app/backups"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 font-mono"
                dir="ltr"
              />
            </div>

            {configMsg && (
              <div className={`px-4 py-2 rounded-lg text-sm ${configMsg.type === 'ok' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
                {configMsg.text}
              </div>
            )}

            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {configSaving ? 'שומר...' : 'שמור הגדרות'}
            </button>
          </div>
        )}
      </div>

      {/* ── Manual backup ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          גיבוי ידני
        </h2>
        <p className="text-gray-400 text-sm mb-4">גבה כעת את כל הגדודים (יחליף את ה-slot של היום הנוכחי)</p>

        {backupMsg && (
          <div className={`mb-3 px-4 py-2 rounded-lg text-sm ${backupMsg.type === 'ok' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
            {backupMsg.text}
          </div>
        )}

        <button
          onClick={triggerBackup}
          disabled={backingUp}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          {backingUp ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />מגבה...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>גבה עכשיו</>
          )}
        </button>
      </div>

      {/* ── Backup files list ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            קבצי גיבוי קיימים
          </h2>
          <button
            onClick={loadFiles}
            disabled={filesLoading}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            title="רענן"
          >
            <svg className={`w-5 h-5 ${filesLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {filesLoading ? (
          <div className="text-gray-400 text-sm text-center py-8">טוען גיבויים...</div>
        ) : files.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">אין קבצי גיבוי עדיין</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([battalionName, bFiles]) => (
              <div key={battalionName} className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-800 px-4 py-2.5">
                  <span className="text-white font-semibold text-sm">גדוד {battalionName}</span>
                  <span className="text-gray-400 text-xs mr-2">({bFiles.length} קבצים)</span>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {bFiles.map((f) => (
                    <div key={f.filename} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-xs bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded font-medium flex-shrink-0">
                          יום {f.slotLabel}
                        </span>
                        <div className="min-w-0">
                          <p className="text-gray-300 text-sm font-mono truncate">{f.filename}</p>
                          <p className="text-gray-500 text-xs">{formatDate(f.date)} · {formatSize(f.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setRestoreModal({ file: f, targetBattalion: f.battalionName }); setRestoreMsg(''); }}
                        className="flex-shrink-0 mr-3 px-3 py-1.5 text-xs bg-blue-700/60 hover:bg-blue-600 text-blue-200 rounded-lg border border-blue-600/50 transition-colors font-medium"
                      >
                        שחזר
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Restore confirm modal ── */}
      {restoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" dir="rtl">
          <div className="bg-gray-900 border border-red-700/60 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 text-center">אישור שחזור גיבוי</h2>
            <p className="text-gray-400 text-sm text-center mb-4">
              ⚠️ פעולה זו תחליף את נתוני הגדוד הנוכחיים
            </p>

            <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">גדוד מקור:</span>
                <span className="text-white font-medium">{restoreModal.file.battalionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">קובץ:</span>
                <span className="text-gray-300 font-mono text-xs">{restoreModal.file.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">תאריך גיבוי:</span>
                <span className="text-gray-300">{formatDate(restoreModal.file.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">גודל:</span>
                <span className="text-gray-300">{formatSize(restoreModal.file.size)}</span>
              </div>
            </div>

            {/* Restore target selector */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1.5">שחזר אל גדוד:</label>
              <select
                value={restoreModal.targetBattalion}
                onChange={(e) => setRestoreModal((m) => m ? { ...m, targetBattalion: e.target.value } : m)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm mb-2"
                disabled={restoring}
              >
                {battalions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
                {!battalions.includes(restoreModal.targetBattalion) && restoreModal.targetBattalion && (
                  <option value={restoreModal.targetBattalion}>{restoreModal.targetBattalion} (חדש)</option>
                )}
              </select>
              <input
                type="text"
                placeholder="או הקלד שם גדוד חדש..."
                value={restoreModal.targetBattalion}
                onChange={(e) => setRestoreModal((m) => m ? { ...m, targetBattalion: e.target.value } : m)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500"
                disabled={restoring}
                dir="rtl"
              />
            </div>

            {restoreMsg && (
              <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${restoreMsg.startsWith('שגיאה') ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-green-900/40 border border-green-700 text-green-300'}`}>
                {restoreMsg}
              </div>
            )}

            {restoreMsg && !restoreMsg.startsWith('שגיאה') ? (
              <button
                onClick={closeRestoreModal}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                סגור
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={closeRestoreModal}
                  disabled={restoring}
                  className="flex-1 py-2 border border-gray-600 text-gray-200 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={doRestore}
                  disabled={restoring}
                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {restoring ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />משחזר...</>
                  ) : 'אשר שחזור'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </> /* end backup tab */}

      {/* ── Bulk remove modal ── */}
      {bulkModal && dupData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-1">הסר כפולים מגדוד</h3>
            <p className="text-gray-400 text-sm mb-5">
              בחר מאיזה גדוד להסיר את כל החיילים הכפולים
            </p>
            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
              {dupBattalionOptions(dupData[dupType]).map((bn) => {
                const count = dupData[dupType].filter(
                  (d) => d.battalions.some((e) => e.battalionName === bn) && d.battalions.length > 1
                ).length;
                return (
                  <button
                    key={bn}
                    onClick={() => setBulkSelectedBattalion(bn)}
                    className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${
                      bulkSelectedBattalion === bn
                        ? 'bg-red-900/50 border-red-600 text-red-300'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">גדוד {bn}</span>
                      <span className="text-xs text-gray-400">{count} כפולים</span>
                    </div>
                    {bulkSelectedBattalion === bn && (
                      <span className="text-xs text-red-400">← יוסר מכאן</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={removeAllFromBattalion}
                disabled={!bulkSelectedBattalion}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                הסר מגדוד {bulkSelectedBattalion}
              </button>
              <button
                onClick={() => setBulkModal(false)}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate delete modal ── */}
      {dupDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-1">הורדת כפול</h3>
            <p className="text-gray-400 text-sm mb-5">
              בחר מאיזה גדוד להסיר את <span className="text-white">{dupDeleteModal.soldier.first_name} {dupDeleteModal.soldier.last_name}</span>
            </p>
            <div className="space-y-2 mb-5">
              {dupDeleteModal.soldier.battalions.map((entry) => (
                <button
                  key={entry.battalionName}
                  onClick={() => setDupDeleteModal({ ...dupDeleteModal, selectedBattalion: entry.battalionName })}
                  className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${dupDeleteModal.selectedBattalion === entry.battalionName ? 'bg-red-900/50 border-red-600 text-red-300' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">גדוד {entry.battalionName}</span>
                    <span className="text-xs text-gray-400">
                      {entry.last_updated ? new Date(entry.last_updated).toLocaleDateString('he-IL') : ''}
                    </span>
                  </div>
                  {dupDeleteModal.selectedBattalion === entry.battalionName && (
                    <span className="text-xs text-red-400">← יימחק מכאן</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmDupDelete}
                disabled={dupDeleteModal.deleting}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {dupDeleteModal.deleting ? 'מוחק...' : 'מחק מגדוד ' + dupDeleteModal.selectedBattalion}
              </button>
              <button
                onClick={() => setDupDeleteModal(null)}
                disabled={dupDeleteModal.deleting}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
