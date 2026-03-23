import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';

interface SoldierBasic {
  personal_number: string;
  first_name: string;
  last_name: string;
  request_status: string;
  battalion_name: string;
  contact_date: string;
}

const STATUS_OPTIONS: { value: string; color: string }[] = [
  { value: 'טופלה', color: '#22c55e' },
  { value: 'חייל לא זמין', color: '#eab308' },
  { value: 'חייל ממתין לתשובה', color: '#ef4444' },
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

export const PersonalAreaPage: React.FC = () => {
  const [soldiers, setSoldiers] = useState<SoldierBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [battalionFilter, setBattalionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchingKey, setSearchingKey] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const fetchSoldiers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const response = await api.get<SoldierBasic[]>('/battalion/my-soldiers');
      setSoldiers(response.data || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'שגיאה בטעינת הנתונים';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSoldiers(); }, [fetchSoldiers]);

  const openSearch = (key: string) => {
    setSearchingKey(key);
    setSearchInput('');
    setSearchError('');
  };

  const closeSearch = () => {
    setSearchingKey(null);
    setSearchInput('');
    setSearchError('');
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const pn = searchInput.trim();
    if (!pn) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await api.get(`/battalion/search-global?personal_number=${encodeURIComponent(pn)}`);
      const { battalionName, soldier } = res.data;
      const params = new URLSearchParams({ battalion: battalionName, personal_number: soldier.personal_number });
      window.open(`/battalion/soldier?${params.toString()}`, '_blank');
      closeSearch();
    } catch (err: any) {
      setSearchError(err.response?.data?.error || 'חייל לא נמצא');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRowClick = (soldier: SoldierBasic) => {
    const params = new URLSearchParams({
      battalion: soldier.battalion_name,
      personal_number: soldier.personal_number,
    });
    window.open(`/battalion/soldier?${params.toString()}`, '_blank');
  };

  const battalionNames = useMemo(
    () => Array.from(new Set(soldiers.map((s) => s.battalion_name))).sort(),
    [soldiers]
  );

  const filteredSoldiers = useMemo(() => {
    let list = soldiers;
    if (battalionFilter !== 'all') list = list.filter((s) => s.battalion_name === battalionFilter);
    if (dateFrom) list = list.filter((s) => s.contact_date && s.contact_date >= dateFrom);
    if (dateTo) list = list.filter((s) => s.contact_date && s.contact_date <= dateTo);
    if (activeFilter === 'all') return list;
    if (activeFilter === 'not_done') return list.filter((s) => s.request_status !== 'טופלה');
    if (activeFilter === 'no_request') return list.filter((s) => !s.request_status?.trim());
    return list.filter((s) => s.request_status === activeFilter);
  }, [soldiers, activeFilter, battalionFilter, dateFrom, dateTo]);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setCurrentPage(1);
  };

  const countForTab = (key: string): number => {
    const base = battalionFilter === 'all' ? soldiers : soldiers.filter((s) => s.battalion_name === battalionFilter);
    if (key === 'all') return base.length;
    if (key === 'not_done') return base.filter((s) => s.request_status !== 'טופלה').length;
    if (key === 'no_request') return base.filter((s) => !s.request_status?.trim()).length;
    return base.filter((s) => s.request_status === key).length;
  };

  const totalPages = Math.ceil(filteredSoldiers.length / PAGE_SIZE);
  const paginatedSoldiers = filteredSoldiers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-gray-400 mt-4">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
          <p className="font-bold text-red-300 mb-1">שגיאה:</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">אזור אישי 360</h1>
            <button
              onClick={() => fetchSoldiers(true)}
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
          </div>
          <p className="text-gray-400 text-sm">
            חיילים המוקצים לך — לחץ על העין לטעינת כרטיס החייל
            {lastUpdated && (
              <span className="mr-2 text-gray-500 text-xs">
                · עודכן {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        {/* Filters: battalion + date range */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Date range filter */}
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

          {battalionNames.length >= 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">סנן לפי גדוד</label>
              <select
                value={battalionFilter}
                onChange={(e) => { setBattalionFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
              >
                <option value="all">כל הגדודים</option>
                {battalionNames.map((bn) => (
                  <option key={bn} value={bn}>{bn}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filter — slide-down dropdown */}
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
            filterOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
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

      {filteredSoldiers.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            {soldiers.length === 0 ? 'אין חיילים משויכים לחשבונך' : 'אין חיילים בסטטוס זה'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-gray-300">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-3 py-3 w-10"></th>
                  <th className="px-4 py-3 font-semibold text-gray-200">גדוד</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">סטטוס פנייה</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">תאריך קשר</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">שם משפחה</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">שם פרטי</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">מספר אישי</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSoldiers.map((soldier, idx) => {
                  const rowKey = `${soldier.battalion_name}-${soldier.personal_number}`;
                  const isSearching = searchingKey === rowKey;
                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        className={`border-b border-gray-700 transition-colors
                          ${isSearching ? 'bg-blue-900/20' : idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'}
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
                        <td className="px-4 py-3 text-gray-300">{soldier.battalion_name}</td>
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
                        {/* Clickable name/number cells */}
                        <td
                          className="px-4 py-3 text-gray-300 cursor-pointer hover:text-blue-400 hover:bg-blue-900/10 rounded transition-colors select-none"
                          title="לחץ לחיפוש חייל אחר"
                          onClick={() => isSearching ? closeSearch() : openSearch(rowKey)}
                        >
                          {soldier.last_name}
                        </td>
                        <td
                          className="px-4 py-3 text-gray-300 cursor-pointer hover:text-blue-400 hover:bg-blue-900/10 rounded transition-colors select-none"
                          title="לחץ לחיפוש חייל אחר"
                          onClick={() => isSearching ? closeSearch() : openSearch(rowKey)}
                        >
                          {soldier.first_name}
                        </td>
                        <td
                          className="px-4 py-3 font-medium text-gray-200 cursor-pointer hover:text-blue-400 hover:bg-blue-900/10 rounded transition-colors select-none"
                          title="לחץ לחיפוש חייל אחר"
                          onClick={() => isSearching ? closeSearch() : openSearch(rowKey)}
                        >
                          {soldier.personal_number}
                        </td>
                      </tr>
                      {/* Inline search row */}
                      {isSearching && (
                        <tr className="border-b border-blue-800 bg-blue-950/40">
                          <td colSpan={7} className="px-4 py-3">
                            <form onSubmit={handleGlobalSearch} className="flex items-center gap-2">
                              <span className="text-blue-300 text-xs font-medium whitespace-nowrap">חיפוש חייל לפי מספר אישי:</span>
                              <input
                                autoFocus
                                type="text"
                                value={searchInput}
                                onChange={(e) => { setSearchInput(e.target.value); setSearchError(''); }}
                                onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                                placeholder="הכנס מספר אישי..."
                                className="flex-1 max-w-xs px-3 py-1.5 text-sm bg-gray-800 border border-blue-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="submit"
                                disabled={searchLoading || !searchInput.trim()}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {searchLoading ? '...' : 'חפש'}
                              </button>
                              <button
                                type="button"
                                onClick={closeSearch}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                              >
                                ביטול
                              </button>
                              {searchError && (
                                <span className="text-red-400 text-xs">{searchError}</span>
                              )}
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer with count and pagination */}
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-gray-400">
              מציג{' '}
              <span className="font-semibold text-gray-200">
                {filteredSoldiers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSoldiers.length)}
              </span>{' '}
              מתוך{' '}
              <span className="font-semibold text-gray-200">{filteredSoldiers.length}</span> חיילים
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
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
                        currentPage === page
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  הבא
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
