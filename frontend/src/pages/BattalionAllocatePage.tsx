import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../hooks/useAuth';

interface SoldierRow {
  id?: number;
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

interface BattalionStats {
  total: number;
  unallocated: number;
}

interface UserAllocStat {
  userId: number;
  count: number;
}

const SVG_COLORS = [
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#059669', // emerald
  '#f59e0b', // amber
  '#dc2626', // rose
  '#7c3aed', // violet
  '#0d9488', // teal
  '#f97316', // orange
];

const computeUserCounts = (allocData: { user_id: number }[]): UserAllocStat[] => {
  const map: Record<number, number> = {};
  for (const a of allocData) {
    if (a.user_id) map[a.user_id] = (map[a.user_id] || 0) + 1;
  }
  return Object.entries(map).map(([uid, cnt]) => ({ userId: Number(uid), count: cnt as number }));
};

interface PieChartProps {
  data: UserAllocStat[];
  users: UserItem[];
  label: string;
  battalionForLinks?: string | null;
}

const PieChart: React.FC<PieChartProps> = ({ data, users, label, battalionForLinks }) => {
  const filtered = data.filter((d) => d.count > 0);
  const total = filtered.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
          <path strokeLinecap="round" strokeWidth={1.5} d="M12 8v4m0 4h.01" />
        </svg>
        <p className="text-gray-500 text-sm">אין הקצאות עדיין לגדוד זה</p>
      </div>
    );
  }

  const CX = 150, CY = 150, R = 130;
  let angle = -Math.PI / 2;

  const slices = filtered.map((d, idx) => {
    const sweep = (d.count / total) * 2 * Math.PI;
    const end = angle + sweep;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    const x2 = CX + R * Math.cos(end);
    const y2 = CY + R * Math.sin(end);
    const mid = angle + sweep / 2;
    const lR = R * 0.62;
    const lx = CX + lR * Math.cos(mid);
    const ly = CY + lR * Math.sin(mid);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const path = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const color = SVG_COLORS[idx % SVG_COLORS.length];
    const user = users.find((u) => u.id === d.userId);
    angle = end;
    return { path, lx, ly, color, d, user, pct: d.count / total };
  });

  return (
    <div className="flex flex-col items-center">
      {/* Battalion label above chart */}
      <div className="mb-3 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">גדוד</p>
        <p className="text-xl font-bold text-white">{label}</p>
      </div>

      {/* SVG pie */}
      <svg viewBox="0 0 300 300" className="w-96 h-96">
        {slices.length === 1 ? (
          /* Single user = full circle — SVG arc can't draw 360°, use <circle> instead */
          <circle cx={CX} cy={CY} r={R} fill={slices[0].color} stroke="#111827" strokeWidth="2.5" />
        ) : (
          slices.map(({ path, color }, i) => (
            <path key={i} d={path} fill={color} stroke="#111827" strokeWidth="2.5" />
          ))
        )}
        {/* Label numbers inside each slice (skip full-circle case — number shown in legend) */}
        {slices.length > 1 && slices.map(({ lx, ly, d, pct }, i) =>
          pct > 0.06 ? (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="17" fontWeight="bold" fill="white">
              {d.count}
            </text>
          ) : null
        )}
        {/* Centre hole */}
        <circle cx={CX} cy={CY} r={38} fill="#111827" />
        <text x={CX} y={CY - 7} textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="bold" fill="white">
          {total}
        </text>
        <text x={CX} y={CY + 13} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#9ca3af">
          סה״כ
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 w-full space-y-2">
        {slices.map(({ color, d, user }, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-base text-gray-200">
                {user ? `${user.firstName} ${user.lastName}` : `משתמש ${d.userId}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{Math.round((d.count / total) * 100)}%</span>
              <span className="text-base font-bold text-white w-10 text-left">{d.count}</span>
              {battalionForLinks !== null && battalionForLinks !== undefined && (
                <Link
                  to={`/battalion/user-soldiers?battalion=${encodeURIComponent(battalionForLinks)}&userId=${d.userId}`}
                  title="צפייה ברשימת החיילים המוקצים"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h2m-2 4h6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BattalionAllocatePage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const canAllocate = currentUser?.role === 'admin' || currentUser?.role === 'super' || currentUser?.role === 'manager';
  const [battalions, setBattalions] = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserItem[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [stats, setStats] = useState<BattalionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [allocationCount, setAllocationCount] = useState<string>('');
  const [allocating, setAllocating] = useState(false);
  const [allocMessage, setAllocMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userAllocStats, setUserAllocStats] = useState<UserAllocStat[]>([]);
  const [battalionUserCounts, setBattalionUserCounts] = useState<UserAllocStat[]>([]);
  const [deallocating, setDeallocating] = useState(false);
  const [deallocMessage, setDeallocMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deallocCount, setDeallocCount] = useState<string>('');
  const [assignInput, setAssignInput] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUserAllocStats = async () => {
    try {
      const { data } = await api.get<UserAllocStat[]>('/battalion/allocation-stats');
      setUserAllocStats(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [battalionsRes, usersRes] = await Promise.all([
          api.get<{ battalions: string[] }>('/battalion/list'),
          api.get<UserItem[]>('/users'),
        ]);
        setBattalions(battalionsRes.data.battalions || []);
        const allUsers = usersRes.data || [];
        // Super users can only allocate to non-admin users
        const allocatableUsers = currentUser?.role === 'super'
          ? allUsers.filter((u) => u.role !== 'admin')
          : allUsers;
        setStaffUsers(allocatableUsers);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    fetchData();
    fetchUserAllocStats();
  }, []);

  useEffect(() => {
    if (!selectedBattalion) {
      setStats(null);
      setBattalionUserCounts([]);
      return;
    }
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const [soldiersRes, allocatedRes] = await Promise.all([
          api.get<{ soldiers: SoldierRow[] }>(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`),
          api.get<AllocationRow[]>(`/battalion/allocations/${encodeURIComponent(selectedBattalion)}`),
        ]);
        const total = soldiersRes.data.soldiers?.length || 0;
        const allocated = allocatedRes.data?.length || 0;
        setStats({ total, unallocated: total - allocated });
        setBattalionUserCounts(computeUserCounts(allocatedRes.data || []));
      } catch {
        setStats(null);
        setBattalionUserCounts([]);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [selectedBattalion]);

  const refreshStats = async () => {
    if (!selectedBattalion) return;
    const [soldiersRes, allocatedRes] = await Promise.all([
      api.get<{ soldiers: SoldierRow[] }>(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`),
      api.get<AllocationRow[]>(`/battalion/allocations/${encodeURIComponent(selectedBattalion)}`),
    ]);
    const total = soldiersRes.data.soldiers?.length || 0;
    const allocated = allocatedRes.data?.length || 0;
    setStats({ total, unallocated: total - allocated });
    setBattalionUserCounts(computeUserCounts(allocatedRes.data || []));
  };

  const handleAllocate = async () => {
    if (!selectedBattalion || !selectedUser || !allocationCount) {
      setAllocMessage({ type: 'error', text: 'בחר גדוד, משתמש וכמות חיילים' });
      return;
    }
    const count = parseInt(allocationCount, 10);
    if (isNaN(count) || count <= 0) {
      setAllocMessage({ type: 'error', text: 'הכנס מספר חוקי של חיילים' });
      return;
    }
    if (stats && count > stats.unallocated) {
      setAllocMessage({ type: 'error', text: `לא ניתן להקצות יותר מ-${stats.unallocated} חיילים` });
      return;
    }
    setAllocating(true);
    try {
      await api.post('/battalion/allocate', {
        battalionName: selectedBattalion,
        allocations: [{ userId: selectedUser, count }],
      });
      setAllocMessage({ type: 'success', text: `${count} חיילים הוקצו בהצלחה` });
      setAllocationCount('');
      await Promise.all([refreshStats(), fetchUserAllocStats()]);
    } catch (err: any) {
      setAllocMessage({ type: 'error', text: err.response?.data?.error || 'שגיאה בהקצאת חיילים' });
    } finally {
      setAllocating(false);
    }
  };

  const handleRefreshAllocations = async () => {
    if (!selectedBattalion) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const { data } = await api.post<{ updated: number; unmatched: string[]; message: string }>(
        `/battalion/${encodeURIComponent(selectedBattalion)}/refresh-allocations`
      );
      const unmatchedNote = data.unmatched.length > 0
        ? ` (לא נמצאו: ${data.unmatched.join(', ')})`
        : '';
      setRefreshMessage({ type: 'success', text: `${data.message}${unmatchedNote}` });
      await Promise.all([refreshStats(), fetchUserAllocStats()]);
    } catch (err: any) {
      setRefreshMessage({ type: 'error', text: err.response?.data?.error || 'שגיאה ברענון הקצאות' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeallocate = async (forceAll = false) => {
    if (!selectedBattalion || !selectedUser) return;
    const count = deallocCount ? parseInt(deallocCount, 10) : undefined;
    if (deallocCount && (isNaN(count!) || count! <= 0)) {
      setDeallocMessage({ type: 'error', text: 'הכנס מספר חוקי' });
      return;
    }
    setDeallocating(true);
    setDeallocMessage(null);
    try {
      const { data } = await api.post<{ removed: number; kept: number; message: string }>('/battalion/deallocate', {
        battalionName: selectedBattalion,
        userId: selectedUser,
        ...(count !== undefined && { count }),
        ...(forceAll && { forceAll: true }),
      });
      if (forceAll) {
        setDeallocMessage({ type: 'success', text: `${data.removed} חיילים הוסרו (כולל טופל/טופלה)` });
      } else {
        setDeallocMessage({ type: 'success', text: `${data.removed} חיילים הוסרו, ${data.kept} נשארו (טופלה/טופל)` });
      }
      setDeallocCount('');
      await Promise.all([refreshStats(), fetchUserAllocStats()]);
    } catch (err: any) {
      setDeallocMessage({ type: 'error', text: err.response?.data?.error || 'שגיאה בהסרת חיילים' });
    } finally {
      setDeallocating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedBattalion || !selectedUser || !assignInput.trim()) return;
    const personalNumbers = assignInput
      .split(/[\n,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (personalNumbers.length === 0) {
      setAssignMessage({ type: 'error', text: 'הכנס לפחות מספר אישי אחד' });
      return;
    }
    setAssigning(true);
    setAssignMessage(null);
    try {
      const { data } = await api.post<{ assigned: number; notFound: string[]; message: string }>('/battalion/assign', {
        battalionName: selectedBattalion,
        userId: selectedUser,
        personalNumbers,
      });
      const notFoundNote = data.notFound?.length > 0
        ? ` (לא נמצאו: ${data.notFound.join(', ')})`
        : '';
      setAssignMessage({ type: 'success', text: `${data.assigned} חיילים הוצבו בהצלחה${notFoundNote}` });
      setAssignInput('');
      await Promise.all([refreshStats(), fetchUserAllocStats()]);
    } catch (err: any) {
      setAssignMessage({ type: 'error', text: err.response?.data?.error || 'שגיאה בהצבת חיילים' });
    } finally {
      setAssigning(false);
    }
  };

  // Pie chart data: per-battalion when battalion selected, global otherwise
  const pieData = selectedBattalion ? battalionUserCounts : userAllocStats;
  const pieLabel = selectedBattalion || 'כל הגדודים';

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">הקצאת חיילים</h1>
        <p className="text-gray-400 text-sm">הקצה חיילים ממגדוד למשתמשי המערכת</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-5">
        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">בחר גדוד</label>
            <select
              value={selectedBattalion ?? ''}
              onChange={(e) => { setSelectedBattalion(e.target.value || null); setAllocMessage(null); }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">-- בחר גדוד --</option>
              {battalions.map((bn) => (
                <option key={bn} value={bn}>{bn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">בחר משתמש</label>
            <select
              value={selectedUser ?? ''}
              onChange={(e) => { setSelectedUser(e.target.value ? Number(e.target.value) : null); setAllocMessage(null); }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">-- בחר משתמש --</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        {selectedBattalion && (
          <div className="grid grid-cols-2 gap-3">
            {statsLoading ? (
              <div className="col-span-2 flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : stats ? (
              <>
                <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-4">
                  <p className="text-blue-300 text-xs mb-1">סה"כ חיילים בגדוד</p>
                  <p className="text-2xl font-bold text-blue-100">{stats.total}</p>
                </div>
                <div className={`${stats.unallocated === 0 ? 'bg-red-900/40 border-red-700' : 'bg-green-900/40 border-green-700'} border rounded-lg p-4`}>
                  <p className={`${stats.unallocated === 0 ? 'text-red-300' : 'text-green-300'} text-xs mb-1`}>נותרו לא מוקצים</p>
                  <p className={`text-2xl font-bold ${stats.unallocated === 0 ? 'text-red-100' : 'text-green-100'}`}>{stats.unallocated}</p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Allocation form */}
        {selectedBattalion && selectedUser && stats && (
          canAllocate ? (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-gray-300 text-xs mb-2">כמות חיילים להקצאה:</label>
                <input
                  type="number"
                  min="0"
                  max={stats.unallocated}
                  value={allocationCount}
                  onChange={(e) => { setAllocationCount(e.target.value); setAllocMessage(null); }}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                />
                <p className="text-gray-400 text-xs mt-1">ניתן להקצות עד {stats.unallocated} חיילים</p>
              </div>
              <button
                onClick={handleAllocate}
                disabled={allocating || !allocationCount || parseInt(allocationCount) > stats.unallocated}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {allocating ? 'מקצה...' : 'הקצה'}
              </button>
              {allocMessage && (
                <div className={`p-3 rounded-lg text-xs ${allocMessage.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
                  {allocMessage.text}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-center">
              <p className="text-yellow-300 text-sm">אין לך הרשאות לביצוע הקצאות. נדרש תפקיד מנהל.</p>
            </div>
          )
        )}

        {/* Refresh allocations by contact_by */}
        {selectedBattalion && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-2 border border-cyan-800/50">
            <p className="text-cyan-300 text-xs font-semibold">רענון הקצאות לפי "מי יצרה קשר"</p>
            <p className="text-gray-400 text-xs">עובר על כל החיילים בגדוד ומשייך אותם למשתמש לפי שדה "מי יצרה קשר". חייל עם שם שמותאם ייוקצה בלעדית למשתמש הזה.</p>
            <button
              onClick={handleRefreshAllocations}
              disabled={refreshing}
              className="w-full px-3 py-2 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {refreshing ? 'מרענן...' : 'רענן משתמשים'}
            </button>
            {refreshMessage && (
              <div className={`p-3 rounded-lg text-xs ${refreshMessage.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
                {refreshMessage.text}
              </div>
            )}
          </div>
        )}

        {selectedBattalion && !selectedUser && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
            <p className="text-blue-300 text-sm">בחר משתמש להמשך</p>
          </div>
        )}

        {/* Assign specific soldiers section */}
        {selectedBattalion && selectedUser && canAllocate && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-indigo-800/50">
            <div>
              <p className="text-indigo-300 text-xs font-semibold mb-1">הצב חיילים למשתמש</p>
              <p className="text-gray-400 text-xs">הכנס מספרים אישיים (שורה אחת לכל חייל, או מופרדים בפסיק) — החיילים יוצבו למשתמש הנבחר.</p>
            </div>
            <textarea
              rows={4}
              value={assignInput}
              onChange={(e) => { setAssignInput(e.target.value); setAssignMessage(null); }}
              placeholder={'1234567\n2345678\n3456789'}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm resize-none font-mono"
            />
            <button
              onClick={handleAssign}
              disabled={assigning || !assignInput.trim()}
              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {assigning ? 'מצב...' : 'הצב חיילים'}
            </button>
            {assignMessage && (
              <div className={`p-3 rounded-lg text-xs ${assignMessage.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
                {assignMessage.text}
              </div>
            )}
          </div>
        )}

        {/* Deallocate section */}
        {selectedBattalion && selectedUser && (
          canAllocate ? (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-red-800/50">
              <div>
                <p className="text-red-300 text-xs font-semibold mb-1">הורדת חיילים מהמשתמש</p>
                <p className="text-gray-400 text-xs">מוריד חיילים שסטטוסם אינו "טופלה" / "טופל". השאר ריק להורדת כולם.</p>
              </div>
              <div>
                <label className="block text-gray-300 text-xs mb-2">כמות חיילים להורדה (אופציונלי):</label>
                <input
                  type="number"
                  min="1"
                  value={deallocCount}
                  onChange={(e) => { setDeallocCount(e.target.value); setDeallocMessage(null); }}
                  placeholder="השאר ריק להורדת הכל"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeallocate(false)}
                  disabled={deallocating}
                  className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  {deallocating ? 'מסיר...' : deallocCount ? `הורד ${deallocCount} חיילים` : 'ללא טופל'}
                </button>
                <button
                  onClick={() => handleDeallocate(true)}
                  disabled={deallocating}
                  title="מוריד את כל החיילים כולל אלו עם סטטוס טופל/טופלה"
                  className="flex-1 px-3 py-2 bg-red-900 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm border border-red-600"
                >
                  {deallocating ? 'מסיר...' : 'הורד הכל כולל טופל'}
                </button>
              </div>
              {deallocMessage && (
                <div className={`p-3 rounded-lg text-xs ${deallocMessage.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
                  {deallocMessage.text}
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      {/* Pie chart card */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mt-6">
        {statsLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <PieChart
            data={pieData}
            users={staffUsers}
            label={pieLabel}
            battalionForLinks={selectedBattalion || ''}
          />
        )}
      </div>

    </div>
  );
};
