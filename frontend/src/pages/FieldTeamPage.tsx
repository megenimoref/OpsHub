import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface SearchResult {
  soldier: {
    personal_number: string;
    first_name: string;
    last_name: string;
    mobile_phone: string;
    request_status: string;
  };
  battalionName: string;
}

interface DuplicateSoldier {
  personal_number: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  request_status: string;
  contact_date?: string;
  updated_at?: string;
  battalions: string[];
}

interface DuplicatesData {
  byPersonalNumber: DuplicateSoldier[];
  byPhone: DuplicateSoldier[];
}

const STATUS_COLOR: Record<string, string> = {
  'טופלה': 'bg-green-900/50 text-green-300 border-green-700',
  'חייל לא זמין': 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  'חייל ממתין לתשובה': 'bg-red-900/50 text-red-300 border-red-700',
  'חייל ביקש שיחזרו אליו': 'bg-sky-900/50 text-sky-300 border-sky-700',
  'ממתין לטיפול': 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
};

interface DeleteModal {
  soldier: DuplicateSoldier;
  selectedBattalion: string;
  deleting: boolean;
}

export const FieldTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'search' | 'duplicates'>('search');

  // Search tab state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duplicates tab state
  const [dupData, setDupData] = useState<DuplicatesData | null>(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupType, setDupType] = useState<'byPersonalNumber' | 'byPhone'>('byPersonalNumber');
  const [deleteModal, setDeleteModal] = useState<DeleteModal | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/battalion/field-team-search', { params: { q: q.trim() } });
      setResults(data.results || []);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const openSoldier = (r: SearchResult) => {
    navigate(`/battalion/soldier?battalion=${encodeURIComponent(r.battalionName)}&personal_number=${encodeURIComponent(r.soldier.personal_number)}`);
  };

  const openDuplicateSoldier = (d: DuplicateSoldier, battalionName: string) => {
    navigate(`/battalion/soldier?battalion=${encodeURIComponent(battalionName)}&personal_number=${encodeURIComponent(d.personal_number)}`);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleteModal({ ...deleteModal, deleting: true });
    try {
      await api.delete(`/battalion/${encodeURIComponent(deleteModal.selectedBattalion)}/soldiers/${encodeURIComponent(deleteModal.soldier.personal_number)}`);
      // Remove from results
      setDupData((prev) => {
        if (!prev) return prev;
        const filter = (list: DuplicateSoldier[]) =>
          list.map((d) =>
            d.personal_number === deleteModal.soldier.personal_number
              ? { ...d, battalions: d.battalions.filter((b) => b !== deleteModal.selectedBattalion) }
              : d
          ).filter((d) => d.battalions.length > 1);
        return { byPersonalNumber: filter(prev.byPersonalNumber), byPhone: filter(prev.byPhone) };
      });
      setDeleteModal(null);
    } catch {
      alert('שגיאה במחיקה, נסה שוב');
      setDeleteModal((m) => m ? { ...m, deleting: false } : null);
    }
  };

  const runDuplicateCheck = async () => {
    setDupLoading(true);
    try {
      const { data } = await api.get('/battalion/duplicate-soldiers');
      setDupData(data);
    } catch {
      setDupData({ byPersonalNumber: [], byPhone: [] });
    } finally {
      setDupLoading(false);
    }
  };

  const currentDups = dupData ? dupData[dupType] : [];

  return (
    <div className="min-h-screen bg-gray-950 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">צוות שטח</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === 'search' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            חיפוש חייל
          </button>
          <button
            onClick={() => setTab('duplicates')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === 'duplicates' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            מצא חיילים כפולים
          </button>
        </div>

        {/* ── Search Tab ── */}
        {tab === 'search' && (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="חפש לפי שם פרטי, שם משפחה או מספר טלפון..."
                autoFocus
                className="w-full pr-12 pl-4 py-3.5 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {searched && results.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-16">
                <div className="text-4xl mb-3">🔍</div>
                <p>לא נמצאו תוצאות עבור "{query}"</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">{results.length} תוצאות</p>
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => openSoldier(r)}
                    className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-600 rounded-xl p-4 text-right transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-base">
                            {r.soldier.first_name} {r.soldier.last_name}
                          </span>
                          {r.soldier.request_status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.soldier.request_status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                              {r.soldier.request_status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {r.soldier.mobile_phone && <span dir="ltr">{r.soldier.mobile_phone}</span>}
                          <span className="text-gray-500">גדוד {r.battalionName}</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searched && !loading && (
              <div className="text-center text-gray-600 py-16">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-sm">הקלד לפחות 2 תווים לחיפוש</p>
              </div>
            )}
          </>
        )}

        {/* ── Duplicates Tab ── */}
        {tab === 'duplicates' && (
          <>
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
                {/* Sub-tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setDupType('byPersonalNumber')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all border ${
                      dupType === 'byPersonalNumber'
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    לפי מספר אישי
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${dupType === 'byPersonalNumber' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                      {dupData.byPersonalNumber.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setDupType('byPhone')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all border ${
                      dupType === 'byPhone'
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    לפי טלפון
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${dupType === 'byPhone' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                      {dupData.byPhone.length}
                    </span>
                  </button>
                  <button
                    onClick={runDuplicateCheck}
                    className="mr-auto px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 border border-gray-700 transition-all"
                  >
                    רענן
                  </button>
                </div>

                {currentDups.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="text-4xl mb-3">✅</div>
                    <p>לא נמצאו כפילויות</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-3">{currentDups.length} חיילים כפולים</p>
                    {currentDups.map((d, i) => (
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
                              onClick={() => setDeleteModal({ soldier: d, selectedBattalion: d.battalions[0], deleting: false })}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 hover:border-red-600 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              הורד כפול
                            </button>
                          </div>
                        </div>
                        {(d.contact_date || d.updated_at) && (
                          <p className="text-xs text-gray-500 mb-2">
                            עודכן אחרון:{' '}
                            {new Date(d.contact_date || d.updated_at!).toLocaleDateString('he-IL')}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {d.battalions.map((bn) => (
                            <button
                              key={bn}
                              onClick={() => openDuplicateSoldier(d, bn)}
                              className="px-3 py-1 bg-gray-700 hover:bg-blue-700 border border-gray-600 hover:border-blue-500 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                            >
                              גדוד {bn}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-1">הורדת כפול</h3>
            <p className="text-gray-400 text-sm mb-5">
              בחר מאיזה גדוד להסיר את <span className="text-white">{deleteModal.soldier.first_name} {deleteModal.soldier.last_name}</span>
            </p>

            <div className="space-y-2 mb-5">
              {deleteModal.soldier.battalions.map((bn) => (
                <button
                  key={bn}
                  onClick={() => setDeleteModal({ ...deleteModal, selectedBattalion: bn })}
                  className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${
                    deleteModal.selectedBattalion === bn
                      ? 'bg-red-900/50 border-red-600 text-red-300'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="font-medium">גדוד {bn}</span>
                  {deleteModal.selectedBattalion === bn && (
                    <span className="mr-2 text-xs text-red-400">← יימחק מכאן</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleteModal.deleting}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {deleteModal.deleting ? 'מוחק...' : 'מחק מגדוד ' + deleteModal.selectedBattalion}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleteModal.deleting}
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
