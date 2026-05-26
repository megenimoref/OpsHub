import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  type: 'payslip' | 'insurance';
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

const TYPE_LABELS = { payslip: 'תלוש שכר', insurance: 'תלוש ביטוח לאומי' };
const TYPE_COLORS = { payslip: 'bg-blue-900/60 text-blue-300', insurance: 'bg-purple-900/60 text-purple-300' };

export const FinancialPage: React.FC = () => {
  // Soldier search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSoldierResults] = useState<Soldier[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Documents
  const [docs, setDocs] = useState<FinancialDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeTab, setActiveTab] = useState<'payslip' | 'insurance'>('payslip');

  // Upload — multi-file
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<'payslip' | 'insurance'>('payslip');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reserve compensation calculator
  const [reserveDays, setReserveDays] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadDocs = useCallback(async (soldier: Soldier, tab: 'payslip' | 'insurance') => {
    setLoadingDocs(true);
    try {
      const { data } = await api.get<{ documents: FinancialDoc[] }>('/financial', {
        params: { type: tab, soldierPersonalNumber: soldier.personal_number },
      });
      setDocs(data.documents);
    } catch {
      setError('שגיאה בטעינת המסמכים');
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const handleSelectSoldier = (soldier: Soldier) => {
    setSelectedSoldier(soldier);
    setSearchQuery(`${soldier.first_name} ${soldier.last_name}`);
    setShowDropdown(false);
    setDocs([]);
    setShowUpload(false);
    setCalcResult(null);
    loadDocs(soldier, activeTab);
  };

  const handleTabChange = (tab: 'payslip' | 'insurance') => {
    setActiveTab(tab);
    if (selectedSoldier) loadDocs(selectedSoldier, tab);
  };

  // Multi-file upload — uploads files one by one with progress
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
        fd.append('type', uploadType);
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
    setShowUpload(false);
    if (failed === 0) {
      setSuccess(`${done} מסמכים הועלו בהצלחה`);
    } else {
      setSuccess(`הועלו ${done} מסמכים, ${failed} נכשלו`);
    }
    setTimeout(() => setSuccess(null), 4000);
    loadDocs(selectedSoldier, uploadType);
    setActiveTab(uploadType);
  };

  const handleDownload = async (doc: FinancialDoc) => {
    try {
      const res = await api.get(`/financial/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('שגיאה בהורדת המסמך');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('למחוק מסמך זה?')) return;
    try {
      await api.delete(`/financial/${id}`);
      if (selectedSoldier) loadDocs(selectedSoldier, activeTab);
    } catch {
      setError('שגיאה במחיקת המסמך');
    }
  };

  const handleCalculate = async () => {
    const payslips = docs.filter((d) => d.type === 'payslip');
    if (payslips.length < 3) return;
    const days = parseInt(reserveDays, 10);
    if (!days || days <= 0) {
      setCalcError('נא להזין מספר ימי מילואים');
      return;
    }
    setCalculating(true);
    setCalcResult(null);
    setCalcError(null);
    try {
      const { data } = await api.post('/financial/calculate-reserve', {
        documentIds: payslips.map((d) => d.id),
        reserveDays: days,
      });
      setCalcResult(data);
    } catch (err: any) {
      setCalcError(err.response?.data?.error || 'שגיאה בחישוב');
    } finally {
      setCalculating(false);
    }
  };

  const payslipDocs = docs.filter((d) => d.type === 'payslip');

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">אזור פיננסי</h1>
        <p className="text-gray-400 text-sm">ניהול תלושי שכר וביטוח לאומי לפי חייל</p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-900/40 border border-green-700 text-green-300 rounded-lg text-sm">{success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Step 1: Soldier Search */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
        <h2 className="text-white font-semibold mb-3 text-sm">שלב 1 — בחר חייל</h2>
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

        {selectedSoldier && (
          <div className="mt-3 flex items-center gap-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {selectedSoldier.first_name[0]}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{selectedSoldier.first_name} {selectedSoldier.last_name}</p>
              <p className="text-gray-400 text-xs">{selectedSoldier.battalionName}</p>
            </div>
            <button
              onClick={() => { setSelectedSoldier(null); setSearchQuery(''); setDocs([]); setShowUpload(false); setCalcResult(null); }}
              className="mr-auto text-gray-500 hover:text-white text-xs transition-colors"
            >
              ✕ החלף
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Documents */}
      {selectedSoldier && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">שלב 2 — מסמכים</h2>
            <button
              onClick={() => { setShowUpload((v) => !v); setFiles([]); }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {showUpload ? 'ביטול' : '+ העלאת מסמכים'}
            </button>
          </div>

          {/* Multi-file Upload form */}
          {showUpload && (
            <div className="mb-4 bg-gray-800 border border-gray-700 rounded-xl p-4">
              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">סוג מסמך</label>
                  <div className="flex gap-2">
                    {(['payslip', 'insurance'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setUploadType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${uploadType === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    קבצים (PDF / תמונה) — ניתן לבחור כמה ביחד *
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
                    <p className="text-indigo-300 text-xs mt-1">
                      {files.length} קבצים נבחרו: {files.map((f) => f.name).join(', ')}
                    </p>
                  )}
                </div>

                {/* Upload progress */}
                {uploadProgress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>מעלה {uploadProgress.done}/{uploadProgress.total}...</span>
                      <span>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowUpload(false); setFiles([]); }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={!!uploadProgress || !files.length}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {uploadProgress ? `מעלה ${uploadProgress.done}/${uploadProgress.total}...` : `העלה ${files.length > 0 ? `(${files.length})` : ''}`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(['payslip', 'insurance'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {TYPE_LABELS[t]}
                {t === 'payslip' && payslipDocs.length > 0 && (
                  <span className="mr-1.5 bg-indigo-800 text-indigo-200 rounded-full px-1.5 py-0.5 text-xs">{payslipDocs.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Documents list */}
          {loadingDocs ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">אין מסמכים עבור חייל זה</div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${TYPE_COLORS[d.type]}`}>
                      {TYPE_LABELS[d.type]}
                    </span>
                    <span className="text-gray-200 text-sm truncate" title={d.originalName}>{d.originalName}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 mr-4">
                    <span className="text-gray-500 text-xs hidden sm:block">{new Date(d.createdAt).toLocaleDateString('he-IL')}</span>
                    <button onClick={() => handleDownload(d)} className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs transition-colors">הורד</button>
                    <button onClick={() => handleDelete(d.id)} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors">מחק</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Reserve Compensation Calculator */}
      {selectedSoldier && activeTab === 'payslip' && !loadingDocs && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🧮</span>
            <h2 className="text-white font-semibold text-sm">שלב 3 — חישוב תגמולי מילואים</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            סורק את התלושים ומחפש "שכר חייב בביטוח לאומי" / "ברוטו לביטוח לאומי" — מחשב ממוצע 3 חודשים ÷ 90 × ימי מילואים
          </p>

          {payslipDocs.length < 3 ? (
            <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-4 py-3 text-yellow-400 text-sm">
              <span>⚠️</span>
              <span>נדרשים לפחות 3 תלושי שכר — כרגע יש {payslipDocs.length}</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reserve days input + calculate button */}
              <div className="flex items-end gap-3">
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
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      מחשב...
                    </>
                  ) : (
                    <>🔢 חשב</>
                  )}
                </button>
              </div>

              {calcError && (
                <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">{calcError}</div>
              )}

              {/* Calculation results */}
              {calcResult && (
                <div className="bg-gray-800 border border-emerald-700/40 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-emerald-400 font-semibold text-sm">תוצאות חישוב</h3>
                    <button onClick={() => setCalcResult(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                  </div>

                  {/* Monthly amounts */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2">שכר חייב בביטוח לאומי לפי חודש:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {calcResult.months.map((m, i) => (
                        <div key={i} className="bg-gray-700/60 rounded-lg px-3 py-2 text-center">
                          <p className="text-gray-400 text-xs">{m.label}</p>
                          <p className="text-white font-semibold text-sm mt-0.5">
                            {m.amount > 0 ? `₪${m.amount.toLocaleString('he-IL')}` : <span className="text-yellow-400 text-xs">לא נמצא</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calculation steps */}
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">סה"כ 3 חודשים:</span>
                      <span className="text-white font-medium">₪{calcResult.total.toLocaleString('he-IL')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">÷ 90 = שכר יומי ממוצע:</span>
                      <span className="text-white font-medium">₪{calcResult.dailyAverage.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">× {calcResult.reserveDays} ימי מילואים:</span>
                      <span className="text-emerald-400 font-bold text-base">₪{calcResult.estimatedCompensation.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* Estimated compensation highlight */}
                  <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-4 py-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">תגמול מילואים משוער</p>
                    <p className="text-emerald-300 font-bold text-2xl">₪{calcResult.estimatedCompensation.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</p>
                  </div>

                  {/* Notes from GPT */}
                  {calcResult.notes && (
                    <div className="bg-gray-700/40 rounded-lg px-4 py-3">
                      <p className="text-gray-400 text-xs mb-1">הערות GPT:</p>
                      <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{calcResult.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
