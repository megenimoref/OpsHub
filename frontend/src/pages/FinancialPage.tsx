import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';

interface Soldier {
  personal_number: string;
  first_name: string;
  last_name: string;
  mobile_phone?: string;
  battalionName: string;
}

interface FinancialDoc {
  id: number;
  type: 'payslip' | 'payslip_after' | 'insurance';
  originalName: string;
  soldierPersonalNumber: string;
  soldierName: string | null;
  battalion: string;
  uploadedBy: string;
  createdAt: string;
}

interface CalcResult {
  months: { label: string; amount: number }[];
  total: number;
  dailyAverage: number;
  estimatedCompensation: number;
  reserveDays: number;
  notes: string;
  rawText: string;
}

interface CalcHistory {
  id: number;
  soldierPersonalNumber: string;
  soldierName: string | null;
  battalion: string;
  reserveDays: number;
  estimatedCompensation: number;
  dailyAverage: number;
  monthsJson: string;
  notes: string | null;
  calculatedByName: string;
  createdAt: string;
}

export const FinancialPage: React.FC = () => {
  // Step tracking
  const [step, setStep] = useState<'select' | 'upload' | 'calc' | 'result'>('select');

  // Soldier search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSoldierResults] = useState<Soldier[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Documents for selected soldier (before reserve)
  const [docs, setDocs] = useState<FinancialDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Documents after reserve
  const [docsAfter, setDocsAfter] = useState<FinancialDoc[]>([]);
  const [loadingDocsAfter, setLoadingDocsAfter] = useState(false);

  // Upload (before reserve)
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload (after reserve)
  const [filesAfter, setFilesAfter] = useState<File[]>([]);
  const [uploadProgressAfter, setUploadProgressAfter] = useState<{ done: number; total: number } | null>(null);
  const fileAfterRef = useRef<HTMLInputElement>(null);

  // Reserve compensation calculator
  const [reserveDays, setReserveDays] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<CalcHistory[]>([]);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search soldiers with debounce
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSoldierResults([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/battalion/field-team-search', { params: { q: searchQuery } });
        setSoldierResults((data.results || []).map((r: any) => ({ ...r.soldier, battalionName: r.battalionName })));
        setShowDropdown(true);
      } catch {
        setSoldierResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load calculation history on mount
  useEffect(() => {
    api.get<{ history: CalcHistory[] }>('/financial/history')
      .then(({ data }) => setHistory(data.history))
      .catch(() => {});
  }, []);

  const reloadHistory = () => {
    api.get<{ history: CalcHistory[] }>('/financial/history')
      .then(({ data }) => setHistory(data.history))
      .catch(() => {});
  };

  const loadDocs = async (soldier: Soldier) => {
    setLoadingDocs(true);
    try {
      const { data } = await api.get<{ documents: FinancialDoc[] }>('/financial', {
        params: { type: 'payslip', soldierPersonalNumber: soldier.personal_number },
      });
      setDocs(data.documents);
    } catch {
      setError('שגיאה בטעינת המסמכים');
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadDocsAfter = async (soldier: Soldier) => {
    setLoadingDocsAfter(true);
    try {
      const { data } = await api.get<{ documents: FinancialDoc[] }>('/financial', {
        params: { type: 'payslip_after', soldierPersonalNumber: soldier.personal_number },
      });
      setDocsAfter(data.documents);
    } catch {
      /* non-fatal */
    } finally {
      setLoadingDocsAfter(false);
    }
  };

  const handleReopenFromHistory = (h: CalcHistory) => {
    const nameParts = (h.soldierName || '').trim().split(' ');
    const soldier: Soldier = {
      personal_number: h.soldierPersonalNumber,
      first_name: nameParts[0] || h.soldierPersonalNumber,
      last_name: nameParts.slice(1).join(' ') || '',
      mobile_phone: '',
      battalionName: h.battalion,
    };
    setSelectedSoldier(soldier);
    setSearchQuery(h.soldierName || h.soldierPersonalNumber);
    setShowDropdown(false);
    setDocs([]);
    setDocsAfter([]);
    setFiles([]);
    setFilesAfter([]);
    setCalcResult(null);
    setCalcError(null);
    setReserveDays(h.reserveDays.toString());
    setStep('upload');
    loadDocs(soldier);
    loadDocsAfter(soldier);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSoldier = (soldier: Soldier) => {
    setSelectedSoldier(soldier);
    setSearchQuery(`${soldier.first_name} ${soldier.last_name}`);
    setShowDropdown(false);
    setDocs([]);
    setDocsAfter([]);
    setFiles([]);
    setFilesAfter([]);
    setCalcResult(null);
    setCalcError(null);
    setReserveDays('');
    setStep('upload');
    loadDocs(soldier);
    loadDocsAfter(soldier);
  };

  const handleReset = () => {
    setStep('select');
    setSelectedSoldier(null);
    setSearchQuery('');
    setDocs([]);
    setDocsAfter([]);
    setFiles([]);
    setFilesAfter([]);
    setCalcResult(null);
    setCalcError(null);
    setReserveDays('');
    setError(null);
    setSuccess(null);
    if (fileRef.current) fileRef.current.value = '';
    if (fileAfterRef.current) fileAfterRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !selectedSoldier) return;
    setUploadProgress({ done: 0, total: files.length });
    let done = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'payslip');
        fd.append('soldierPersonalNumber', selectedSoldier.personal_number);
        fd.append('soldierName', `${selectedSoldier.first_name} ${selectedSoldier.last_name}`);
        fd.append('battalion', selectedSoldier.battalionName);
        await api.post('/financial/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        done++;
        setUploadProgress({ done, total: files.length });
      } catch {
        failed++;
      }
    }
    setFiles([]);
    if (fileRef.current) fileRef.current.value = '';
    setUploadProgress(null);
    if (failed > 0) setError(`${failed} קבצים נכשלו בהעלאה`);
    else { setSuccess(`${done} תלושים הועלו בהצלחה`); setTimeout(() => setSuccess(null), 3000); }
    await loadDocs(selectedSoldier);
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm('למחוק תלוש זה?')) return;
    try {
      await api.delete(`/financial/${id}`);
      if (selectedSoldier) await loadDocs(selectedSoldier);
    } catch {
      setError('שגיאה במחיקת המסמך');
    }
  };

  const handleUploadAfter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filesAfter.length || !selectedSoldier) return;
    setUploadProgressAfter({ done: 0, total: filesAfter.length });
    let done = 0;
    let failed = 0;
    for (const file of filesAfter) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'payslip_after');
        fd.append('soldierPersonalNumber', selectedSoldier.personal_number);
        fd.append('soldierName', `${selectedSoldier.first_name} ${selectedSoldier.last_name}`);
        fd.append('battalion', selectedSoldier.battalionName);
        await api.post('/financial/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        done++;
        setUploadProgressAfter({ done, total: filesAfter.length });
      } catch {
        failed++;
      }
    }
    setFilesAfter([]);
    if (fileAfterRef.current) fileAfterRef.current.value = '';
    setUploadProgressAfter(null);
    if (failed > 0) setError(`${failed} קבצים נכשלו בהעלאה`);
    else { setSuccess(`${done} תלושים הועלו בהצלחה`); setTimeout(() => setSuccess(null), 3000); }
    await loadDocsAfter(selectedSoldier);
  };

  const handleDeleteDocAfter = async (id: number) => {
    if (!window.confirm('למחוק תלוש זה?')) return;
    try {
      await api.delete(`/financial/${id}`);
      if (selectedSoldier) await loadDocsAfter(selectedSoldier);
    } catch {
      setError('שגיאה במחיקת המסמך');
    }
  };

  const handleCalculate = async () => {
    const payslips = docs.filter((d) => d.type === 'payslip');
    if (payslips.length < 3) return;
    const days = parseInt(reserveDays, 10);
    if (!days || days <= 0) { setCalcError('נא להזין מספר ימי מילואים'); return; }
    setCalculating(true);
    setCalcResult(null);
    setCalcError(null);
    try {
      const { data } = await api.post('/financial/calculate-reserve', {
        documentIds: payslips.map((d) => d.id),
        reserveDays: days,
      });
      setCalcResult(data);
      setStep('result');
      reloadHistory();
    } catch (err: any) {
      setCalcError(err.response?.data?.error || 'שגיאה בחישוב');
    } finally {
      setCalculating(false);
    }
  };

  const payslipDocs = docs.filter((d) => d.type === 'payslip');

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">אזור פיננסי</h1>
          <p className="text-gray-400 text-sm">חישוב תגמולי מילואים לפי תלושי שכר</p>
        </div>
        {step !== 'select' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            ✕ סיים
          </button>
        )}
      </div>

      {success && <div className="mb-4 p-3 bg-green-900/40 border border-green-700 text-green-300 rounded-lg text-sm">{success}</div>}
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── STEP 1: בחר חייל ── */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
        <h2 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step !== 'select' ? 'bg-emerald-700 text-white' : 'bg-indigo-600 text-white'}`}>
            {step !== 'select' ? '✓' : '1'}
          </span>
          בחר חייל
        </h2>

        {step === 'select' ? (
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedSoldier(null); }}
              placeholder="חפש לפי שם או מספר אישי..."
              className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
            {searching && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 right-0 left-0 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-20 py-1 max-h-60 overflow-y-auto">
                {searchResults.map((s) => (
                  <button
                    key={s.personal_number}
                    onClick={() => handleSelectSoldier(s)}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span className="text-white text-sm">{s.first_name} {s.last_name}</span>
                    <span className="text-gray-400 text-xs">{s.battalionName}</span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
              <div className="absolute top-full mt-1 right-0 left-0 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-20 py-3 text-center text-gray-500 text-sm">
                לא נמצאו חיילים
              </div>
            )}
          </div>
        ) : (
          /* Selected soldier chip */
          <div className="flex items-center gap-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {selectedSoldier?.first_name[0]}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{selectedSoldier?.first_name} {selectedSoldier?.last_name}</p>
              <p className="text-gray-400 text-xs">{selectedSoldier?.battalionName} · מ.א. {selectedSoldier?.personal_number}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-white text-xs transition-colors"
            >
              החלף
            </button>
          </div>
        )}
      </div>

      {/* ── STEP 2: תלושים ── */}
      {(step === 'upload' || step === 'calc' || step === 'result') && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'calc' || step === 'result' ? 'bg-emerald-700 text-white' : 'bg-indigo-600 text-white'}`}>
              {step === 'calc' || step === 'result' ? '✓' : '2'}
            </span>
            תלושי שכר לפני המילואים
          </h2>

          {/* Upload form */}
          <form onSubmit={handleUpload} className="mb-4 bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <label className="block text-gray-400 text-xs mb-1">
              בחר 3 תלושי שכר (PDF / תמונה) מהחודשים <span className="text-indigo-400 font-medium">לפני המילואים</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm file:mr-3 file:bg-indigo-700 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
            />
            {files.length > 0 && (
              <p className="text-indigo-300 text-xs">{files.length} קבצים נבחרו: {files.map((f) => f.name).join(', ')}</p>
            )}
            {uploadProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>מעלה {uploadProgress.done}/{uploadProgress.total}...</span>
                  <span>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!!uploadProgress || !files.length}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {uploadProgress ? `מעלה ${uploadProgress.done}/${uploadProgress.total}...` : `העלה${files.length > 0 ? ` (${files.length})` : ''}`}
              </button>
            </div>
          </form>

          {/* Uploaded docs list */}
          {loadingDocs ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payslipDocs.length > 0 ? (
            <div className="space-y-2">
              {payslipDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-indigo-400 text-xs">📄</span>
                    <span className="text-gray-200 text-sm truncate">{d.originalName}</span>
                    <span className="text-gray-500 text-xs hidden sm:block">{new Date(d.createdAt).toLocaleDateString('he-IL')}</span>
                  </div>
                  <button onClick={() => handleDeleteDoc(d.id)} className="mr-3 px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-300 rounded text-xs transition-colors flex-shrink-0">מחק</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-3">אין תלושים עדיין — העלה לפחות 3</p>
          )}
        </div>
      )}

      {/* ── AFTER-RESERVE PAYSLIPS (no step gate, future use) ── */}
      {(step === 'upload' || step === 'calc' || step === 'result') && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="text-white font-semibold mb-1 text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-300">📂</span>
            תלושי שכר אחרי המילואים
          </h2>
          <p className="text-gray-500 text-xs mb-4">לשימוש עתידי — תלושים אלו אינם נכנסים לחישוב כרגע</p>

          {/* Upload form */}
          <form onSubmit={handleUploadAfter} className="mb-4 bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <label className="block text-gray-400 text-xs mb-1">
              בחר תלושי שכר (PDF / תמונה) מהחודשים <span className="text-amber-400 font-medium">אחרי המילואים</span>
            </label>
            <input
              ref={fileAfterRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFilesAfter(Array.from(e.target.files || []))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm file:mr-3 file:bg-amber-700 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
            />
            {filesAfter.length > 0 && (
              <p className="text-amber-300 text-xs">{filesAfter.length} קבצים נבחרו: {filesAfter.map((f) => f.name).join(', ')}</p>
            )}
            {uploadProgressAfter && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>מעלה {uploadProgressAfter.done}/{uploadProgressAfter.total}...</span>
                  <span>{Math.round((uploadProgressAfter.done / uploadProgressAfter.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${(uploadProgressAfter.done / uploadProgressAfter.total) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!!uploadProgressAfter || !filesAfter.length}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {uploadProgressAfter ? `מעלה ${uploadProgressAfter.done}/${uploadProgressAfter.total}...` : `העלה${filesAfter.length > 0 ? ` (${filesAfter.length})` : ''}`}
              </button>
            </div>
          </form>

          {/* Uploaded after-reserve docs list */}
          {loadingDocsAfter ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docsAfter.length > 0 ? (
            <div className="space-y-2">
              {docsAfter.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-amber-400 text-xs">📄</span>
                    <span className="text-gray-200 text-sm truncate">{d.originalName}</span>
                    <span className="text-gray-500 text-xs hidden sm:block">{new Date(d.createdAt).toLocaleDateString('he-IL')}</span>
                  </div>
                  <button onClick={() => handleDeleteDocAfter(d.id)} className="mr-3 px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-300 rounded text-xs transition-colors flex-shrink-0">מחק</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-3">אין תלושים אחרי מילואים עדיין</p>
          )}
        </div>
      )}

      {/* ── המשך לחישוב — מופיע אחרי שני סקשני התלושים ── */}
      {step === 'upload' && payslipDocs.length >= 3 && (
        <button
          onClick={() => setStep('calc')}
          className="w-full mb-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          המשך לחישוב ←
        </button>
      )}

      {/* ── STEP 3: חישוב ── */}
      {(step === 'calc' || step === 'result') && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'result' ? 'bg-emerald-700 text-white' : 'bg-indigo-600 text-white'}`}>
              {step === 'result' ? '✓' : '3'}
            </span>
            חישוב תגמולי מילואים
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            סכום 3 חודשים ÷ 90 = שכר יומי × ימי מילואים
          </p>

          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-gray-400 text-xs mb-1">מספר ימי מילואים *</label>
              <input
                type="number"
                min="1"
                max="365"
                value={reserveDays}
                onChange={(e) => setReserveDays(e.target.value)}
                placeholder="לדוגמה: 45"
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleCalculate}
              disabled={calculating || !reserveDays || parseInt(reserveDays) <= 0}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {calculating ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />מחשב...</>
              ) : '🔢 חשב'}
            </button>
          </div>

          {calcError && (
            <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">{calcError}</div>
          )}
        </div>
      )}

      {/* ── RESULT ── */}
      {step === 'result' && calcResult && (
        <div className="bg-gray-900 border border-emerald-700/50 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-emerald-400 font-semibold text-sm flex items-center gap-2">
              <span>✅</span> תוצאות חישוב
            </h3>
          </div>

          {/* Monthly amounts */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {calcResult.months.map((m, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-400 text-xs mb-1">{m.label}</p>
                <p className="font-semibold text-sm">
                  {m.amount > 0
                    ? <span className="text-white">₪{m.amount.toLocaleString('he-IL')}</span>
                    : <span className="text-yellow-400 text-xs">לא נמצא</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Calculation steps */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-2.5 mb-4">
            <div className="flex justify-between text-sm border-b border-gray-700 pb-2">
              <span className="text-gray-400">סה"כ 3 חודשים:</span>
              <span className="text-white font-medium">₪{calcResult.total.toLocaleString('he-IL')}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-700 pb-2">
              <span className="text-gray-400">÷ 90 = שכר יומי:</span>
              <span className="text-white font-medium">₪{calcResult.dailyAverage.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">× {calcResult.reserveDays} ימי מילואים:</span>
              <span className="text-emerald-400 font-bold text-base">₪{calcResult.estimatedCompensation.toLocaleString('he-IL')}</span>
            </div>
          </div>

          {/* Total box */}
          <div className="bg-emerald-900/30 border border-emerald-700/60 rounded-xl px-4 py-4 text-center mb-4">
            <p className="text-gray-400 text-xs mb-1">תגמול מילואים משוער</p>
            <p className="text-emerald-300 font-bold text-3xl">₪{calcResult.estimatedCompensation.toLocaleString('he-IL')}</p>
            <p className="text-gray-500 text-xs mt-1">{selectedSoldier?.first_name} {selectedSoldier?.last_name} · {calcResult.reserveDays} ימים</p>
          </div>

          {calcResult.notes && (
            <div className="bg-gray-800/60 rounded-lg px-4 py-3 mb-4">
              <p className="text-gray-400 text-xs mb-1 font-medium">הערות Claude:</p>
              <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{calcResult.notes}</p>
            </div>
          )}

          {/* Finish button */}
          <button
            onClick={handleReset}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ✓ סיים וחזור לתחילה
          </button>
        </div>
      )}

      {/* ── HISTORY ── */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mt-4">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <span>📋</span> היסטוריית חישובים ({history.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-right py-2 pr-2">חייל</th>
                  <th className="text-right py-2">גדוד</th>
                  <th className="text-right py-2">ימי מילואים</th>
                  <th className="text-right py-2">תגמול משוער</th>
                  <th className="text-right py-2">חישב</th>
                  <th className="text-right py-2">תאריך</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="py-2 pr-2 text-white font-medium">{h.soldierName || h.soldierPersonalNumber}</td>
                    <td className="py-2 text-gray-400 text-xs">{h.battalion}</td>
                    <td className="py-2 text-gray-300">{h.reserveDays} ימים</td>
                    <td className="py-2 text-emerald-400 font-semibold">₪{h.estimatedCompensation.toLocaleString('he-IL')}</td>
                    <td className="py-2 text-gray-400 text-xs">{h.calculatedByName}</td>
                    <td className="py-2 text-gray-500 text-xs">{new Date(h.createdAt).toLocaleDateString('he-IL')}</td>
                    <td className="py-2 pl-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleReopenFromHistory(h)}
                          className="px-2 py-1 bg-indigo-900/60 hover:bg-indigo-700 text-indigo-300 rounded text-xs transition-colors whitespace-nowrap"
                          title="טען מחדש לעריכה"
                        >
                          ✏️ פתח
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('למחוק רשומה זו מההיסטוריה?')) return;
                            try {
                              await api.delete(`/financial/history/${h.id}`);
                              setHistory((prev) => prev.filter((r) => r.id !== h.id));
                            } catch {
                              setError('שגיאה במחיקת הרשומה');
                            }
                          }}
                          className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-300 rounded text-xs transition-colors whitespace-nowrap"
                        >
                          הסר
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
