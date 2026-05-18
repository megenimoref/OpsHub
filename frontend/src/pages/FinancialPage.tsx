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

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    loadDocs(soldier, activeTab);
  };

  const handleTabChange = (tab: 'payslip' | 'insurance') => {
    setActiveTab(tab);
    if (selectedSoldier) loadDocs(selectedSoldier, tab);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedSoldier) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', activeTab);
      fd.append('soldierPersonalNumber', selectedSoldier.personal_number);
      fd.append('soldierName', `${selectedSoldier.first_name} ${selectedSoldier.last_name}`);
      fd.append('battalion', selectedSoldier.battalionName);
      await api.post('/financial/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setShowUpload(false);
      setSuccess('המסמך הועלה בהצלחה');
      setTimeout(() => setSuccess(null), 3000);
      loadDocs(selectedSoldier, activeTab);
    } catch {
      setError('שגיאה בהעלאת המסמך');
    } finally {
      setUploading(false);
    }
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
              onClick={() => { setSelectedSoldier(null); setSearchQuery(''); setDocs([]); setShowUpload(false); }}
              className="mr-auto text-gray-500 hover:text-white text-xs transition-colors"
            >
              ✕ החלף
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Documents */}
      {selectedSoldier && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">שלב 2 — מסמכים</h2>
            <button
              onClick={() => setShowUpload((v) => !v)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {showUpload ? 'ביטול' : '+ העלאת מסמך'}
            </button>
          </div>

          {/* Upload form */}
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
                        onClick={() => setActiveTab(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">קובץ (PDF / תמונה) *</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm file:mr-3 file:bg-indigo-700 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {uploading ? 'מעלה...' : 'העלה'}
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
                    <button
                      onClick={() => handleDownload(d)}
                      className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs transition-colors"
                    >
                      הורד
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
