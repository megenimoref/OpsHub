import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../hooks/useAuth';

interface InFileDuplicate {
  personalNumber: string;
  name: string;
  rowCount: number;
}

interface CrossBattalionDuplicate {
  personalNumber: string;
  foundInBattalion: string;
}

interface ImportResult {
  success: boolean;
  battalionName: string;
  totalRows: number;
  insertedRows: number;
  allocatedSoldiers: number;
  withoutContactBy: number;
  unmatchedContactNames: string[];
  message: string;
  unknownHeaders?: string[];
  skippedColumns?: string[];
  inFileDuplicates?: InFileDuplicate[];
  crossBattalionDuplicates?: CrossBattalionDuplicate[];
}

interface VerifyMismatch {
  personal_number: string;
  excel: { first_name: string; last_name: string; mobile_phone: string };
  db:    { first_name: string; last_name: string; mobile_phone: string };
  changedFields: string[];
}

interface VerifyResult {
  success: boolean;
  total: number;
  matched: number;
  mismatches: VerifyMismatch[];
}

export const BattalionImportPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [battalionName, setBattalionName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [battalions, setBattalions] = useState<string[]>([]);
  const [battalionsLoading, setBattalionsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState('');

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: number; unchanged: number } | null>(null);
  const [syncError, setSyncError] = useState('');

  // Delete state — two-step confirmation:
  //   step 1 = warning + first "האם אתה בטוח?"
  //   step 2 = password entry + final "מחק לצמיתות"
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Hardcoded confirmation password for destructive battalion deletion.
  // UI-level guardrail on top of the backend admin auth.
  const DELETE_PASSWORD = '2705azu';

  const openDeleteDialog = () => {
    if (!battalionName) return;
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteError('');
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!battalionName) return;
    if (deletePassword !== DELETE_PASSWORD) {
      setDeleteError('סיסמה שגויה');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/battalion/${encodeURIComponent(battalionName)}`);
      setBattalions((prev) => prev.filter((b) => b !== battalionName));
      setDeleteSuccess(`הגדוד "${battalionName}" נמחק בהצלחה`);
      setBattalionName('');
      setResult(null);
      setError('');
      setDeleteOpen(false);
      setDeletePassword('');
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || 'שגיאה במחיקת הגדוד');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setBattalionsLoading(true);
    api.get<{ battalions: string[] }>('/battalion/list')
      .then(({ data }) => setBattalions(data.battalions || []))
      .catch(() => {})
      .finally(() => setBattalionsLoading(false));
  }, []);

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const res = await api.get('/battalion/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'battalion_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleExport = async () => {
    if (!battalionName) return;
    setExportLoading(true);
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(battalionName)}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${battalionName}_export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setError('');
    setResult(null);
    setVerifyResult(null);
    setVerifyError('');
    setSyncResult(null);
    setSyncError('');
  };

  const handleVerify = async () => {
    setVerifyError('');
    setVerifyResult(null);
    if (!battalionName) { setVerifyError('יש לבחור גדוד'); return; }
    if (!file) { setVerifyError('יש לבחור קובץ Excel'); return; }
    setVerifyLoading(true);
    try {
      const formData = new FormData();
      formData.append('battalionName', battalionName);
      formData.append('file', file);
      const response = await api.post<VerifyResult>('/battalion/verify-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVerifyResult(response.data);
    } catch (err: any) {
      setVerifyError(err.response?.data?.error || err.message || 'שגיאה בבדיקת ההתאמה');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncError('');
    setSyncResult(null);
    if (!battalionName) { setSyncError('יש לבחור גדוד'); return; }
    if (!file) { setSyncError('יש לבחור קובץ Excel'); return; }
    setSyncLoading(true);
    try {
      const formData = new FormData();
      formData.append('battalionName', battalionName);
      formData.append('file', file);
      const response = await api.post<{ success: boolean; updated: number; unchanged: number }>(
        '/battalion/sync-excel-details', formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setSyncResult(response.data);
      // Re-run verify to reflect the updated state
      setVerifyResult(null);
    } catch (err: any) {
      setSyncError(err.response?.data?.error || err.message || 'שגיאה בסנכרון');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSubmit = async (importMode: 'new' | 'existing') => {
    setError('');
    setResult(null);

    if (!battalionName) { setError('יש לבחור גדוד'); return; }
    if (!file) { setError('יש לבחור קובץ Excel'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('battalionName', battalionName);
      formData.append('importMode', importMode);
      formData.append('file', file);
      const response = await api.post<ImportResult>('/battalion/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'שגיאה ביבוא הגדוד');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">יבוא/מחק גדוד</h1>
        <p className="text-gray-400 text-sm">ייבא נתוני חיילים מקובץ Excel{isAdmin && ' או מחק גדוד קיים'}</p>
      </div>

      {deleteSuccess && (
        <div className="mb-4 bg-green-900/40 border border-green-700 rounded-lg p-3">
          <p className="text-green-300 text-sm">✓ {deleteSuccess}</p>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-700 p-8">
        <div className="space-y-6">
          {/* Battalion dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">גדוד</label>

            {battalionsLoading ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                טוען גדודים...
              </div>
            ) : battalions.length === 0 ? (
              <div className="px-4 py-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300 text-sm mb-1">אין גדודים קיימים במערכת.</p>
                <Link
                  to="/battalion/create"
                  className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                >
                  צור גדוד חדש
                </Link>
              </div>
            ) : (
              <select
                value={battalionName}
                onChange={(e) => { setBattalionName(e.target.value); setError(''); setResult(null); }}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-gray-700 text-white disabled:opacity-50 cursor-pointer"
                disabled={loading}
              >
                <option value="">— בחר גדוד —</option>
                {battalions.map((bn) => (
                  <option key={bn} value={bn}>{bn}</option>
                ))}
              </select>
            )}
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">קובץ Excel</label>
            <div
              className="flex items-center gap-3 border-2 border-dashed border-gray-600 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 text-right">
                {file ? (
                  <span className="text-blue-400 font-medium">{file.name}</span>
                ) : (
                  <span className="text-gray-400">לחץ לבחירת קובץ .xlsx</span>
                )}
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={loading}
              >
                Browse
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
              <p className="font-bold text-red-300 mb-1">שגיאה:</p>
              <p className="text-red-300 text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Sync error */}
          {syncError && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
              <p className="font-bold text-red-300 mb-1">שגיאה בסנכרון:</p>
              <p className="text-red-300 text-sm">{syncError}</p>
            </div>
          )}

          {/* Sync result */}
          {syncResult && (
            <div className="bg-teal-900/40 border border-teal-700 rounded-lg p-4">
              <p className="font-bold text-teal-300 mb-2">✓ סנכרון הושלם</p>
              <div className="flex gap-5 text-sm">
                <span className="text-white">עודכנו: <span className="font-bold text-teal-300">{syncResult.updated}</span></span>
                <span className="text-gray-400">ללא שינוי: <span className="font-bold">{syncResult.unchanged}</span></span>
              </div>
            </div>
          )}

          {/* Verify error */}
          {verifyError && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
              <p className="font-bold text-red-300 mb-1">שגיאה בבדיקת התאמה:</p>
              <p className="text-red-300 text-sm">{verifyError}</p>
            </div>
          )}

          {/* Verify results */}
          {verifyResult && (
            <div className="space-y-3">
              {/* Summary bar */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                <p className="text-white font-semibold mb-2">תוצאות בדיקת התאמה — {battalionName}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-gray-300">חיילים שנבדקו (קיימים בשניהם): <span className="font-bold text-white">{verifyResult.total}</span></span>
                  <span className="text-green-400">תואמים: <span className="font-bold">{verifyResult.matched}</span></span>
                  {verifyResult.mismatches.length > 0 && (
                    <span className="text-amber-400">אי-התאמות: <span className="font-bold">{verifyResult.mismatches.length}</span></span>
                  )}
                </div>
              </div>

              {/* Perfect match */}
              {verifyResult.mismatches.length === 0 && (
                <div className="bg-green-900/40 border border-green-700 rounded-lg p-4 text-green-300 text-sm font-medium">
                  ✅ כל הפרטים תואמים בין הקובץ לדאטה בייס
                </div>
              )}

              {/* Mismatches table */}
              {verifyResult.mismatches.length > 0 && (
                <div className="border border-amber-700/50 rounded-lg overflow-hidden">
                  <div className="bg-amber-900/30 px-4 py-2 border-b border-amber-700/50">
                    <p className="text-amber-300 font-semibold text-sm">⚠️ חיילים עם פרטים שונים ({verifyResult.mismatches.length})</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800 text-gray-400 text-xs">
                        <tr>
                          <th className="px-3 py-2 text-right">מ.א.</th>
                          <th className="px-3 py-2 text-right">שדה</th>
                          <th className="px-3 py-2 text-right">באקסל</th>
                          <th className="px-3 py-2 text-right">בדאטה בייס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifyResult.mismatches.map((m, idx) => (
                          m.changedFields.map((field, fi) => (
                            <tr
                              key={`${m.personal_number}-${fi}`}
                              className={`border-t border-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/60'}`}
                            >
                              {fi === 0 && (
                                <td className="px-3 py-2 font-mono text-amber-300 font-semibold align-top" rowSpan={m.changedFields.length}>
                                  {m.personal_number}
                                </td>
                              )}
                              <td className="px-3 py-2 text-gray-300">{field}</td>
                              <td className="px-3 py-2 text-blue-300">
                                {field === 'שם פרטי'    ? m.excel.first_name   :
                                 field === 'שם משפחה'   ? m.excel.last_name    :
                                                          m.excel.mobile_phone}
                              </td>
                              <td className="px-3 py-2 text-emerald-300">
                                {field === 'שם פרטי'    ? m.db.first_name   :
                                 field === 'שם משפחה'   ? m.db.last_name    :
                                                          m.db.mobile_phone}
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="space-y-2">
              <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-4 rounded-lg">
                <p className="font-bold text-lg mb-2">✓ היבוא הצליח!</p>
                <p className="text-sm">{result.message}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>📋 סה"כ חיילים בקובץ: <span className="font-semibold">{result.totalRows}</span></p>
                  {result.allocatedSoldiers > 0 && (
                    <p>✅ הוקצו אוטומטית לפי "מי יצרה קשר": <span className="font-semibold">{result.allocatedSoldiers}</span></p>
                  )}
                  {result.withoutContactBy > 0 && (
                    <p>📌 ללא "מי יצרה קשר" — זמינים להקצאה ידנית: <span className="font-semibold text-yellow-300">{result.withoutContactBy}</span></p>
                  )}
                  {result.unmatchedContactNames?.length > 0 && (
                    <p className="text-yellow-300">⚠️ שמות שלא נמצאו במערכת: <span className="font-semibold">{result.unmatchedContactNames.join(', ')}</span></p>
                  )}
                  {result.skippedColumns?.length > 0 && (
                    <p className="text-yellow-300">🔒 עמודות שדולגו מטעמי אבטחת מידע: <span className="font-semibold">{result.skippedColumns.join(', ')}</span></p>
                  )}
                  {result.inFileDuplicates && result.inFileDuplicates.length > 0 && (
                    <div className="mt-2 border border-orange-600/40 rounded-lg p-2 bg-orange-900/20">
                      <p className="text-orange-300 font-semibold mb-1">⚠️ חיילים שהופיעו יותר מפעם אחת בקובץ ({result.inFileDuplicates.length}):</p>
                      <ul className="text-orange-200 text-xs space-y-0.5">
                        {result.inFileDuplicates.map((d) => (
                          <li key={d.personalNumber}>
                            מ.א. <span className="font-semibold">{d.personalNumber}</span>
                            {d.name && <span> — {d.name}</span>}
                            <span className="text-orange-400"> ({d.rowCount} שורות, נשמרה האחרונה)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.crossBattalionDuplicates && result.crossBattalionDuplicates.length > 0 && (
                    <div className="mt-2 border border-red-600/40 rounded-lg p-2 bg-red-900/20">
                      <p className="text-red-300 font-semibold mb-1">🔴 חיילים הקיימים גם בגדוד אחר ({result.crossBattalionDuplicates.length}):</p>
                      <ul className="text-red-200 text-xs space-y-0.5">
                        {result.crossBattalionDuplicates.map((d) => (
                          <li key={d.personalNumber + d.foundInBattalion}>
                            מ.א. <span className="font-semibold">{d.personalNumber}</span>
                            <span className="text-red-400"> — נמצא גם בגדוד "{d.foundInBattalion}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg bg-gray-700 hover:bg-gray-600"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifyLoading || loading || !file || !battalionName || battalionsLoading}
              className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
              title="בדוק אם הפרטים האישיים באקסל תואמים לנתונים בדאטה בייס"
            >
              {verifyLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              )}
              {verifyLoading ? 'בודק...' : 'בדיקת התאמה'}
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncLoading || loading || !file || !battalionName || battalionsLoading}
              className="px-5 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
              title="עדכן שם פרטי, שם משפחה וטלפון בדאטה בייס לפי ערכי האקסל"
            >
              {syncLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {syncLoading ? 'מסנכרן...' : 'סנכרון התאמה'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportLoading || !battalionName || battalionsLoading}
              className="px-5 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
            >
              {exportLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {exportLoading ? 'מייצא...' : 'ייצא גדוד'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('new')}
              disabled={loading || !file || !battalionName || battalionsLoading}
              className="px-5 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              title="מייבא הכל מהאקסל - מדרוס כל ערך קיים"
            >
              {loading ? 'מייבא...' : 'ייבא גדוד חדש'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('existing')}
              disabled={loading || !file || !battalionName || battalionsLoading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              title="מייבא רק שדות עם ערך - לא מדרוס ערכים קיימים"
            >
              {loading ? 'מייבא...' : 'ייבא גדוד קיים'}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={openDeleteDialog}
                disabled={loading || !battalionName || battalionsLoading}
                className="px-5 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
                title="מחיקת הגדוד וכל הנתונים שלו לצמיתות"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                </svg>
                מחק גדוד
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Template download */}
      <div className="mt-4 text-right">
        <button
          onClick={handleDownloadTemplate}
          disabled={templateLoading}
          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
        >
          {templateLoading ? (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          הורד קובץ Excel לדוגמה
        </button>
      </div>

      {/* Delete confirmation modal — two-step */}
      {deleteOpen && battalionName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="bg-gray-900 border border-red-700/60 rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {deleteStep === 1 ? 'האם אתה בטוח?' : 'אישור סופי — מחיקת גדוד'}
                </h3>
                {deleteStep === 1 ? (
                  <p className="text-gray-300 text-sm leading-relaxed">
                    אתה עומד למחוק את הגדוד{' '}
                    <span className="font-semibold text-red-300">{battalionName.replace(/_/g, ' ')}</span>{' '}
                    על כל החיילים, ההקצאות וההיסטוריה.
                    <br />
                    <strong className="text-red-300">פעולה זו אינה ניתנת לשחזור.</strong>
                  </p>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed">
                    זוהי הזדמנות אחרונה לעצור. כדי למחוק את{' '}
                    <span className="font-semibold text-red-300">{battalionName.replace(/_/g, ' ')}</span>{' '}
                    סופית, הזן את סיסמת האישור.
                  </p>
                )}
              </div>
            </div>

            {deleteStep === 2 && (
              <>
                <label className="block text-xs text-gray-400 mb-1">סיסמת אישור</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deletePassword && !deleting) handleDelete();
                  }}
                  disabled={deleting}
                  placeholder="סיסמה"
                  dir="ltr"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm text-left focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                  autoFocus
                />
                {deleteError && (
                  <p className="mt-2 text-red-300 text-sm">{deleteError}</p>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg border border-gray-600 transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
              {deleteStep === 1 ? (
                <button
                  onClick={() => setDeleteStep(2)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg border border-red-600 transition-colors"
                >
                  כן, המשך למחיקה
                </button>
              ) : (
                <button
                  onClick={handleDelete}
                  disabled={deleting || !deletePassword}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:text-red-300 disabled:cursor-not-allowed text-white text-sm rounded-lg border border-red-600 transition-colors"
                >
                  {deleting ? 'מוחק...' : 'מחק לצמיתות'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
