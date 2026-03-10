import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
        battalionName: restoreModal.file.battalionName,
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">גיבוי בסיס הנתונים</h1>
        <p className="text-gray-400 text-sm">גיבוי אוטומטי לכל גדוד — רוטציה של 7 ימים</p>
      </div>

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
                        onClick={() => { setRestoreModal({ file: f }); setRestoreMsg(''); }}
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

            <div className="bg-gray-800 rounded-lg p-4 mb-5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">גדוד:</span>
                <span className="text-white font-medium">גדוד {restoreModal.file.battalionName}</span>
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
    </div>
  );
};
