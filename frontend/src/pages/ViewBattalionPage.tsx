import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';

interface SoldierRow {
  personal_number?: string;
  first_name?: string;
  last_name?: string;
  mobile_phone?: string;
  platoon?: string;
  request_status?: string;
  contact_date?: string;
  contact_by?: string;
  marital_status?: string;
  children_count?: string;
  student_indicator?: string;
  employment_status?: string;
}

const STATUS_OPTIONS: { value: string; color: string }[] = [
  { value: 'טופלה', color: '#22c55e' },
  { value: 'חייל לא זמין', color: '#eab308' },
  { value: 'חייל ממתין לתשובה', color: '#ef4444' },
  { value: 'חייל ביקש שיחזרו אליו', color: '#0ea5e9' },
  { value: 'ממתין לטיפול', color: '#67e8f9' },
  { value: 'נדרש סיוע של ביטוח לאומי', color: '#f97316' },
  { value: 'נדרש סיוע של עורך דין', color: '#f472b6' },
  { value: 'אין מספר טלפון', color: '#6366f1' },
];

const FILTER_TABS: { label: string; key: string; color: string }[] = [
  { label: 'הכל', key: 'all', color: '#6b7280' },
  { label: 'לא טופלה', key: 'not_done', color: '#ef4444' },
  { label: 'ממתין לטיפול', key: 'ממתין לטיפול', color: '#67e8f9' },
  { label: 'טופלה', key: 'טופלה', color: '#22c55e' },
  { label: 'חייל לא זמין', key: 'חייל לא זמין', color: '#eab308' },
  { label: 'חייל ממתין לתשובה', key: 'חייל ממתין לתשובה', color: '#ef4444' },
  { label: 'חייל ביקש שיחזרו אליו', key: 'חייל ביקש שיחזרו אליו', color: '#0ea5e9' },
  { label: 'נדרש סיוע של ביטוח לאומי', key: 'נדרש סיוע של ביטוח לאומי', color: '#f97316' },
  { label: 'נדרש סיוע של עורך דין', key: 'נדרש סיוע של עורך דין', color: '#f472b6' },
  { label: 'אין מספר טלפון', key: 'אין מספר טלפון', color: '#6366f1' },
  { label: 'לא נוצרה פניה', key: 'no_request', color: '#64748b' },
];

const getStatusColor = (status: string): string => {
  if (!status) return 'transparent';
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || '#9ca3af';
};

const PAGE_SIZE = 20;

// Maps filter option → list of substrings that match it (handles masc/fem Hebrew forms)
const CATEGORY_MATCH: Partial<Record<keyof SoldierRow, Record<string, string[]>>> = {
  marital_status: {
    'נשוי': ['נשוי', 'נשואה'],
    'רווק': ['רווק', 'רווקה'],
    'גרוש': ['גרוש', 'גרושה'],
    'אלמן': ['אלמן', 'אלמנה'],
    'פרוד': ['פרוד', 'פרודה'],
  },
};

const CATEGORY_FILTERS: { key: keyof SoldierRow; label: string; options: string[] }[] = [
  {
    key: 'marital_status',
    label: 'מצב משפחתי',
    options: ['נשוי', 'רווק', 'גרוש', 'אלמן', 'פרוד'],
  },
  {
    key: 'children_count',
    label: 'מספר ילדים',
    options: ['0', '1', '2', '3', '4', '5+'],
  },
  {
    key: 'student_indicator',
    label: 'אינדיקציית סטודנט',
    options: ['כן', 'לא'],
  },
  {
    key: 'employment_status',
    label: 'סטטוס תעסוקתי',
    options: ['שכיר', 'עצמאי', 'מובטל'],
  },
];

export const ViewBattalionPage: React.FC = () => {
  const [battalions, setBattalions] = useState<string[]>([]);
  const [loadingBattalions, setLoadingBattalions] = useState(true);
  const [selectedBattalion, setSelectedBattalion] = useState<string>('');
  const [soldiers, setSoldiers] = useState<SoldierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [pnSearch, setPnSearch] = useState<string>('');
  const [categoryFilters, setCategoryFilters] = useState<Partial<Record<keyof SoldierRow, string>>>({});
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Load battalion list once
  useEffect(() => {
    setLoadingBattalions(true);
    api.get<{ battalions: string[] }>('/battalion/list')
      .then((r) => setBattalions(r.data.battalions || []))
      .catch((err) => setError(err?.response?.data?.error || 'שגיאה בטעינת רשימת הגדודים'))
      .finally(() => setLoadingBattalions(false));
  }, []);

  const fetchSoldiers = useCallback(async (battalion: string, isRefresh = false) => {
    if (!battalion) { setSoldiers([]); return; }
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await api.get<{ soldiers: SoldierRow[] }>(
        `/battalion/${encodeURIComponent(battalion)}/soldiers`
      );
      setSoldiers(res.data.soldiers || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת חיילי הגדוד');
      setSoldiers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setActiveFilter('all');
    setDateFrom('');
    setDateTo('');
    setPnSearch('');
    setCategoryFilters({});
    setOpenCategory(null);
    fetchSoldiers(selectedBattalion);
  }, [selectedBattalion, fetchSoldiers]);

  const handleExport = async () => {
    if (!selectedBattalion) return;
    setExporting(true);
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(selectedBattalion)}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedBattalion}_export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed', err);
      alert('יצוא לאקסל נכשל: ' + (err?.response?.data?.error || err?.message || 'שגיאה לא ידועה'));
    } finally {
      setExporting(false);
    }
  };

  const handleRowClick = (soldier: SoldierRow) => {
    if (!selectedBattalion || !soldier.personal_number) return;
    const params = new URLSearchParams({
      battalion: selectedBattalion,
      personal_number: soldier.personal_number,
    });
    window.open(`/battalion/soldier?${params.toString()}`, '_blank');
  };

  const filteredSoldiers = useMemo(() => {
    let list = soldiers;
    if (pnSearch.trim()) {
      const q = pnSearch.trim();
      list = list.filter((s) => (s.personal_number || '').includes(q));
    }
    // contact_date may include a time component — compare YYYY-MM-DD prefix only.
    if (dateFrom) list = list.filter((s) => s.contact_date && s.contact_date.slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((s) => s.contact_date && s.contact_date.slice(0, 10) <= dateTo);

    // Category filters
    for (const [key, value] of Object.entries(categoryFilters)) {
      if (!value) continue;
      const k = key as keyof SoldierRow;
      if (k === 'children_count' && value === '5+') {
        list = list.filter((s) => parseInt(s.children_count || '0', 10) >= 5);
      } else {
        const matchers = CATEGORY_MATCH[k]?.[value];
        if (matchers) {
          list = list.filter((s) => matchers.some((m) => (s[k] || '').includes(m)));
        } else {
          list = list.filter((s) => (s[k] || '').includes(value));
        }
      }
    }

    if (activeFilter === 'all') return list;
    if (activeFilter === 'not_done') return list.filter((s) => s.request_status !== 'טופלה');
    if (activeFilter === 'no_request') return list.filter((s) => !s.request_status?.trim());
    return list.filter((s) => s.request_status === activeFilter);
  }, [soldiers, activeFilter, dateFrom, dateTo, pnSearch, categoryFilters]);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setCurrentPage(1);
  };

  const countForTab = (key: string): number => {
    if (key === 'all') return soldiers.length;
    if (key === 'not_done') return soldiers.filter((s) => s.request_status !== 'טופלה').length;
    if (key === 'no_request') return soldiers.filter((s) => !s.request_status?.trim()).length;
    return soldiers.filter((s) => s.request_status === key).length;
  };

  const totalPages = Math.max(1, Math.ceil(filteredSoldiers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSoldiers = filteredSoldiers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (safePage > 3) pages.push('...');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">צפה בגדוד</h1>
            {selectedBattalion && (
              <button
                onClick={() => fetchSoldiers(selectedBattalion, true)}
                disabled={refreshing}
                title="רענן נתונים"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-xs rounded-lg border border-gray-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'מרענן...' : 'רענן'}
              </button>
            )}
            {selectedBattalion && (
              <button
                onClick={handleExport}
                disabled={exporting}
                title="הורד את כל החיילים של הגדוד לאקסל"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs rounded-lg border border-emerald-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                {exporting ? 'מייצא...' : 'הוצא לאקסל'}
              </button>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            בחר גדוד להצגת כל החיילים הרשומים במסד הנתונים
            {lastUpdated && selectedBattalion && (
              <span className="mr-2 text-gray-500 text-xs">
                · עודכן {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Battalion select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">בחר גדוד</label>
            {loadingBattalions ? (
              <div className="px-3 py-2 bg-gray-800 border border-gray-600 text-gray-400 rounded-lg text-sm min-w-[180px]">
                טוען גדודים...
              </div>
            ) : (
              <select
                value={selectedBattalion}
                onChange={(e) => setSelectedBattalion(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
              >
                <option value="">-- בחר גדוד --</option>
                {battalions.map((b) => (
                  <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">מתאריך קשר</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">עד תאריך קשר</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                className="pb-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                title="נקה פילטר תאריך"
              >
                ✕ נקה
              </button>
            )}
          </div>

          {/* Personal number search within battalion */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">חיפוש לפי מספר אישי</label>
            <input
              type="text"
              value={pnSearch}
              onChange={(e) => { setPnSearch(e.target.value); setCurrentPage(1); }}
              placeholder="הקלד מספר אישי..."
              className="px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* No battalion selected */}
      {!selectedBattalion && !loading && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">בחר גדוד מהרשימה למעלה כדי לראות את החיילים</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-4">
          <p className="font-bold text-red-300 mb-1">שגיאה:</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {loading && selectedBattalion && (
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-gray-400 mt-4">טוען חיילים...</p>
        </div>
      )}

      {/* Filter tabs */}
      {selectedBattalion && !loading && soldiers.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              {(() => {
                const active = FILTER_TABS.find((t) => t.key === activeFilter);
                return (
                  <>
                    {active && active.key !== 'all' && active.key !== 'not_done' && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active?.color }} />
                    )}
                    <span className="font-medium">{active?.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                      {countForTab(activeFilter)}
                    </span>
                  </>
                );
              })()}
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              filterOpen ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {FILTER_TABS.map((tab) => {
                const count = countForTab(tab.key);
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { handleFilterChange(tab.key); setFilterOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-right transition-all duration-150
                      ${isActive
                        ? 'text-white border-transparent'
                        : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    style={isActive ? { backgroundColor: tab.color, borderColor: tab.color } : {}}
                  >
                    {tab.key !== 'all' && tab.key !== 'not_done' && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : tab.color }} />
                    )}
                    <span className="text-xs font-medium flex-1 leading-tight">{tab.label}</span>
                    <span className={`text-xs font-bold flex-shrink-0 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Category filters — always visible when battalion is selected */}
      {selectedBattalion && !loading && soldiers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400">סינון קטגוריה:</span>
          {CATEGORY_FILTERS.map((cat) => {
            const active = categoryFilters[cat.key];
            return (
              <div key={cat.key} className="relative">
                <button
                  onClick={() => setOpenCategory(openCategory === cat.key ? null : cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    active
                      ? 'bg-indigo-700 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                  {active && <span className="bg-white/20 px-1.5 py-0.5 rounded-full">{active}</span>}
                  <svg className={`w-3 h-3 transition-transform ${openCategory === cat.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openCategory === cat.key && (
                  <div className="absolute top-full mt-1 right-0 bg-gray-800 border border-gray-600 rounded-xl shadow-lg z-20 min-w-[140px] py-1">
                    <button
                      onClick={() => { setCategoryFilters((f) => { const n = { ...f }; delete n[cat.key]; return n; }); setOpenCategory(null); setCurrentPage(1); }}
                      className="w-full text-right px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      הכל
                    </button>
                    {cat.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setCategoryFilters((f) => ({ ...f, [cat.key]: opt })); setOpenCategory(null); setCurrentPage(1); }}
                        className={`w-full text-right px-3 py-2 text-sm transition-colors ${active === opt ? 'bg-indigo-700 text-white' : 'text-gray-200 hover:bg-gray-700'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(categoryFilters).length > 0 && (
            <button
              onClick={() => { setCategoryFilters({}); setCurrentPage(1); }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              ✕ נקה
            </button>
          )}
        </div>
      )}

      {/* Soldiers table */}
      {selectedBattalion && !loading && soldiers.length > 0 && (
        filteredSoldiers.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400">אין חיילים התואמים לסינון</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800">
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-4 py-3 font-semibold text-gray-200">מספר אישי</th>
                    <th className="px-4 py-3 font-semibold text-gray-200">שם פרטי</th>
                    <th className="px-4 py-3 font-semibold text-gray-200">שם משפחה</th>
                    <th className="px-4 py-3 font-semibold text-gray-200">טלפון</th>
                    <th className="px-4 py-3 font-semibold text-gray-200">פלוגה</th>
                    <th className="px-4 py-3 font-semibold text-gray-200">סטטוס פנייה</th>
                    <th className="px-4 py-3 font-semibold text-gray-200">תאריך קשר</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSoldiers.map((soldier, idx) => (
                    <tr
                      key={`${soldier.personal_number}-${idx}`}
                      className={`border-b border-gray-700 transition-colors
                        ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'}
                        hover:bg-gray-700/30`}
                    >
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleRowClick(soldier)}
                          title="פתח כרטיס חייל"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-200">{soldier.personal_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{soldier.first_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{soldier.last_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs" dir="ltr">
                        {soldier.mobile_phone || <span className="text-gray-600">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{soldier.platoon || <span className="text-gray-600">-</span>}</td>
                      <td className="px-4 py-3">
                        {soldier.request_status ? (
                          <span
                            className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                            style={{ backgroundColor: getStatusColor(soldier.request_status) }}
                          >
                            {soldier.request_status}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {soldier.contact_date
                          ? new Date(soldier.contact_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : <span className="text-gray-600">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer with count and pagination */}
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-400">
                מציג{' '}
                <span className="font-semibold text-gray-200">
                  {filteredSoldiers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSoldiers.length)}
                </span>{' '}
                מתוך{' '}
                <span className="font-semibold text-gray-200">{filteredSoldiers.length}</span> חיילים
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    הקודם
                  </button>

                  {getPageNumbers().map((page, i) =>
                    page === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-500">…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page as number)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          safePage === page
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    הבא
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {selectedBattalion && !loading && soldiers.length === 0 && !error && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">אין חיילים בגדוד זה</p>
        </div>
      )}
    </div>
  );
};
