import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

interface SoldierRow {
  personal_number: string;
  first_name?: string;
  last_name?: string;
  mobile_phone?: string;
  platoon?: string;
  request_status?: string;
}

interface AllocationRow {
  soldier_personal_number: string;
  user_id: number;
}

interface UserItem {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const PAGE_SIZE = 20;

export const UserSoldiersPage: React.FC = () => {
  const [params] = useSearchParams();
  const battalion = params.get('battalion') || '';
  const userId = Number(params.get('userId') || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soldiers, setSoldiers] = useState<SoldierRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [user, setUser] = useState<UserItem | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!battalion || !userId) {
      setError('חסרים נתוני גדוד או משתמש');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [soldiersRes, allocRes, usersRes] = await Promise.all([
          api.get<{ soldiers: SoldierRow[] }>(`/battalion/${encodeURIComponent(battalion)}/soldiers`),
          api.get<AllocationRow[]>(`/battalion/allocations/${encodeURIComponent(battalion)}`),
          api.get<UserItem[]>('/users'),
        ]);
        setSoldiers(soldiersRes.data.soldiers || []);
        setAllocations(allocRes.data || []);
        const u = (usersRes.data || []).find((x) => x.id === userId) || null;
        setUser(u);
      } catch (err: any) {
        setError(err.response?.data?.error || 'שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [battalion, userId]);

  const assignedRows = useMemo(() => {
    const pns = new Set(allocations.filter((a) => a.user_id === userId).map((a) => a.soldier_personal_number));
    return soldiers.filter((s) => pns.has(s.personal_number));
  }, [soldiers, allocations, userId]);

  const totalPages = Math.max(1, Math.ceil(assignedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = assignedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            חיילים מוקצים ל{user ? `${user.firstName} ${user.lastName}` : `משתמש ${userId}`}
          </h1>
          <p className="text-gray-400 text-sm">גדוד: {battalion} &middot; סה״כ: {assignedRows.length}</p>
        </div>
        <Link
          to="/battalion/allocate"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          חזור להקצאה
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-center py-6 text-sm">{error}</div>
        ) : assignedRows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">אין חיילים מוקצים למשתמש זה בגדוד</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-gray-400 text-xs border-b border-gray-700">
                    <th className="py-2 px-2 font-medium">#</th>
                    <th className="py-2 px-2 font-medium">שם פרטי</th>
                    <th className="py-2 px-2 font-medium">שם משפחה</th>
                    <th className="py-2 px-2 font-medium">טלפון</th>
                    <th className="py-2 px-2 font-medium">פלוגה</th>
                    <th className="py-2 px-2 font-medium">גדוד</th>
                    <th className="py-2 px-2 font-medium">סטטוס</th>
                    <th className="py-2 px-2 font-medium text-center">פתיחה</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s, i) => (
                    <tr key={s.personal_number} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                      <td className="py-2 px-2 text-gray-500">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="py-2 px-2 text-gray-200">{s.first_name || '—'}</td>
                      <td className="py-2 px-2 text-gray-200">{s.last_name || '—'}</td>
                      <td className="py-2 px-2 text-gray-300 font-mono">{s.mobile_phone || '—'}</td>
                      <td className="py-2 px-2 text-gray-300">{s.platoon || '—'}</td>
                      <td className="py-2 px-2 text-gray-300">{battalion}</td>
                      <td className="py-2 px-2 text-gray-300">{s.request_status || '—'}</td>
                      <td className="py-2 px-2 text-center">
                        <Link
                          to={`/battalion/soldier?battalion=${encodeURIComponent(battalion)}&personal_number=${encodeURIComponent(s.personal_number)}`}
                          title="פתח כרטיס חייל"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition-colors"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <div className="text-xs text-gray-400">
                  מציג {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, assignedRows.length)} מתוך {assignedRows.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs transition-colors"
                  >
                    הקודם
                  </button>
                  <span className="text-gray-300 text-xs px-2">
                    עמוד {currentPage} מתוך {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs transition-colors"
                  >
                    הבא
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
