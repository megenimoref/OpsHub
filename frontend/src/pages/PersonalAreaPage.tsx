import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

interface Soldier {
  personal_number: string;
  first_name: string;
  last_name: string;
  request_status: string;
  battalion_name: string;
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

// Filter bar tabs — order: הכל → לא טופלה → יציב (ממתין לטיפול) → טופלה → שאר הסטטוסים
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
];

const getStatusColor = (status: string): string => {
  if (!status) return 'transparent';
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || '#9ca3af';
};

const PAGE_SIZE = 25;

export const PersonalAreaPage: React.FC = () => {
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const fetchSoldiers = async () => {
      try {
        setLoading(true);
        const response = await api.get<Soldier[]>('/battalion/my-soldiers');
        setSoldiers(response.data || []);
        setError('');
      } catch (err: any) {
        const msg = err.response?.data?.error || err.message || 'שגיאה בטעינת הנתונים';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchSoldiers();
  }, []);

  // Filter soldiers based on active tab
  const filteredSoldiers = useMemo(() => {
    if (activeFilter === 'all') return soldiers;
    if (activeFilter === 'not_done') return soldiers.filter((s) => s.request_status !== 'טופלה');
    return soldiers.filter((s) => s.request_status === activeFilter);
  }, [soldiers, activeFilter]);

  // Reset to page 1 when filter changes
  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setCurrentPage(1);
  };

  // Count per filter tab
  const countForTab = (key: string): number => {
    if (key === 'all') return soldiers.length;
    if (key === 'not_done') return soldiers.filter((s) => s.request_status !== 'טופלה').length;
    return soldiers.filter((s) => s.request_status === key).length;
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
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-white mb-1">אזור אישי</h1>
        <p className="text-gray-400">חיילים המוקצים לך</p>
      </div>

      {/* Filter — slide-down dropdown */}
      <div className="mb-5">
        {/* Trigger button */}
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

        {/* Slide-down grid */}
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
                  <th className="px-4 py-3 font-semibold text-gray-200">גדוד</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">סטטוס פנייה</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">שם משפחה</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">שם פרטי</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">מספר אישי</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSoldiers.map((soldier, idx) => (
                  <tr
                    key={`${soldier.battalion_name}-${soldier.personal_number}`}
                    className={`border-b border-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-700/30 transition-colors`}
                  >
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
                    <td className="px-4 py-3 text-gray-300">{soldier.last_name}</td>
                    <td className="px-4 py-3 text-gray-300">{soldier.first_name}</td>
                    <td className="px-4 py-3 font-medium text-gray-200">{soldier.personal_number}</td>
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
