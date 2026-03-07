import React, { useEffect, useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../services/api';

interface PersonDashboard {
  name: string;
  total: number;
  todayCount: number;
  byBattalion: { battalion: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

interface GlobalStats {
  totalSoldiers: number;
  totalStudents: number;
  byStatus: { status: string; count: number }[];
}

interface BattalionPieStat {
  battalion: string;
  totalSoldiers: number;
  contactedSoldiers: number;
}

interface AssistanceStat {
  battalion: string;
  nationalInsurance: number;
  welfareFund: number;
  otherAssistance: number;
}

interface AssistanceSoldier {
  firstName: string;
  lastName: string;
  personalNumber: string;
  value: string;
}

interface BattalionStatusBreakdown {
  battalion: string;
  byStatus: { status: string; count: number }[];
}

interface DashboardResponse {
  people: PersonDashboard[];
  globalStats: GlobalStats;
  battalions: string[];
  battalionPieStats: BattalionPieStat[];
  assistanceStats: AssistanceStat[];
  battalionStatusBreakdown: BattalionStatusBreakdown[];
}

const PERSON_COLORS: Record<string, string> = {
  'כוכב': 'purple',
  'נימרוד': 'green',
  'לילך': 'pink',
  'יקי': 'cyan',
};

const COLOR_CLASSES: Record<string, { border: string; title: string; badge: string; bar: string }> = {
  cyan:   { border: 'border-cyan-700',   title: 'text-cyan-300',   badge: 'bg-cyan-900 text-cyan-200',   bar: 'bg-cyan-500' },
  purple: { border: 'border-purple-700', title: 'text-purple-300', badge: 'bg-purple-900 text-purple-200', bar: 'bg-purple-500' },
  green:  { border: 'border-green-700',  title: 'text-green-300',  badge: 'bg-green-900 text-green-200',  bar: 'bg-green-500' },
  pink:   { border: 'border-pink-700',   title: 'text-pink-300',   badge: 'bg-pink-900 text-pink-200',    bar: 'bg-pink-500' },
};

export const DashboardPage: React.FC = () => {
  const [people, setPeople] = useState<PersonDashboard[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [battalions, setBattalions] = useState<string[]>([]);
  const [battalionPieStats, setBattalionPieStats] = useState<BattalionPieStat[]>([]);
  const [assistanceStats, setAssistanceStats] = useState<AssistanceStat[]>([]);
  const [battalionStatusBreakdown, setBattalionStatusBreakdown] = useState<BattalionStatusBreakdown[]>([]);
  const [expandedBar, setExpandedBar] = useState<{ battalion: string; type: string } | null>(null);
  const [expandedSoldiers, setExpandedSoldiers] = useState<AssistanceSoldier[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'battalionStatus' | 'comparison'>('general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback((battalion?: string) => {
    setLoading(true);
    setError('');
    const params = battalion ? { battalion } : {};
    api.get<DashboardResponse>('/battalion/dashboard', { params })
      .then((res) => {
        setPeople(res.data.people);
        setGlobalStats(res.data.globalStats);
        if (res.data.battalions) {
          setBattalions(res.data.battalions);
        }
        if (res.data.battalionPieStats) {
          setBattalionPieStats(res.data.battalionPieStats);
        }
        if (res.data.assistanceStats) {
          setAssistanceStats(res.data.assistanceStats);
        }
        if (res.data.battalionStatusBreakdown) {
          setBattalionStatusBreakdown(res.data.battalionStatusBreakdown);
        }
      })
      .catch(() => setError('שגיאה בטעינת הדשבורד'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleBarClick = async (battalion: string, type: string) => {
    const key = `${battalion}:${type}`;
    const currentKey = expandedBar ? `${expandedBar.battalion}:${expandedBar.type}` : null;

    if (currentKey === key) {
      setExpandedBar(null);
      setExpandedSoldiers([]);
      return;
    }

    setExpandedBar({ battalion, type });
    setExpandedLoading(true);
    try {
      const res = await api.get<{ soldiers: AssistanceSoldier[] }>(
        `/battalion/${encodeURIComponent(battalion)}/assistance-soldiers`,
        { params: { type } }
      );
      setExpandedSoldiers(res.data.soldiers);
    } catch {
      setExpandedSoldiers([]);
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleBattalionChange = (value: string) => {
    setSelectedBattalion(value);
    fetchDashboard(value || undefined);
  };

  if (loading && battalions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && battalions.length === 0) {
    return (
      <div className="p-6 text-red-400 text-center">{error}</div>
    );
  }

  const maxStatusCount = globalStats ? Math.max(...globalStats.byStatus.map((s) => s.count), 1) : 1;

  const TABS = [
    { key: 'general', label: 'כללי' },
    { key: 'battalionStatus', label: 'סטטוס פניות לפי גדוד' },
    { key: 'comparison', label: 'השוואה בין גדודים' },
  ] as const;

  // --- Comparison tab derived data ---
  const coverageChartData = battalionPieStats.map((s) => ({
    name: s.battalion,
    'נענו': s.contactedSoldiers,
    'לא נענו': s.totalSoldiers - s.contactedSoldiers,
    'סה"כ': s.totalSoldiers,
  }));

  const assistanceChartData = assistanceStats.map((s) => ({
    name: s.battalion,
    'ביטוח לאומי': s.nationalInsurance,
    'קרן סיוע': s.welfareFund,
    'סיוע אחר': s.otherAssistance,
  }));

  // All unique statuses across all battalions (top 6 most common overall)
  const statusTotals: Record<string, number> = {};
  battalionStatusBreakdown.forEach((b) =>
    b.byStatus.forEach(({ status, count }) => {
      statusTotals[status] = (statusTotals[status] || 0) + count;
    })
  );
  const topStatuses = Object.entries(statusTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([s]) => s);

  const STATUS_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const COVERAGE_COLORS = { 'נענו': '#10b981', 'לא נענו': '#4b5563' };
  const ASSISTANCE_COLORS = { 'ביטוח לאומי': '#3b82f6', 'קרן סיוע': '#f59e0b', 'סיוע אחר': '#a855f7' };

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">לוח נתונים</h1>

        {/* Battalion selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">גדוד:</label>
          <select
            value={selectedBattalion}
            onChange={(e) => handleBattalionChange(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[160px]"
          >
            <option value="">כל הגדודים</option>
            {battalions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {loading && (
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-800 text-white border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <>
          {/* Global Stats Summary */}
          {globalStats && (
            <div className="mb-6 space-y-4">
              {/* Top cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-xl border border-blue-800/60 p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{globalStats.totalSoldiers}</p>
                  <p className="text-xs text-gray-400 mt-1">סה"כ חיילים</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-amber-800/60 p-4 text-center">
                  <p className="text-3xl font-bold text-amber-400">{globalStats.totalStudents}</p>
                  <p className="text-xs text-gray-400 mt-1">סטודנטים</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-emerald-800/60 p-4 text-center sm:col-span-1 col-span-2">
                  <p className="text-3xl font-bold text-emerald-400">{globalStats.byStatus.length}</p>
                  <p className="text-xs text-gray-400 mt-1">סוגי סטטוס</p>
                </div>
              </div>

              {/* Status breakdown panel */}
              <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-white mb-4">פילוח לפי סטטוס פנייה</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {globalStats.byStatus.map(({ status, count }) => (
                    <div key={status}>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span className="truncate max-w-[70%]">{status}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxStatusCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Per-person cards */}
          <h2 className="text-lg font-semibold text-white mb-4">לפי מטפל</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {people.map((person) => {
              const color = PERSON_COLORS[person.name] || 'cyan';
              const cls = COLOR_CLASSES[color];
              const maxCount = Math.max(...person.byStatus.map((s) => s.count), 1);

              return (
                <div
                  key={person.name}
                  className={`bg-gray-900 rounded-xl border ${cls.border} p-5 flex flex-col gap-4`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${cls.title}`}>{person.name}</h2>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${cls.badge}`}>
                        סה"כ: {person.total}
                      </span>
                      {person.todayCount > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-900 text-yellow-200">
                          היום: {person.todayCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {person.total === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">אין נתונים עדיין</p>
                  ) : (
                    <>
                      {/* By Status */}
                      {person.byStatus.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-medium">לפי סטטוס פנייה</p>
                          <div className="space-y-2">
                            {person.byStatus.map(({ status, count }) => (
                              <div key={status}>
                                <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span className="truncate max-w-[70%]">{status}</span>
                                  <span>{count}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className={`${cls.bar} h-1.5 rounded-full`}
                                    style={{ width: `${(count / maxCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* By Battalion */}
                      {person.byBattalion.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-medium">לפי גדוד</p>
                          <div className="flex flex-wrap gap-2">
                            {person.byBattalion.map(({ battalion, count }) => (
                              <span
                                key={battalion}
                                className="text-xs bg-gray-800 border border-gray-600 text-gray-300 px-2 py-1 rounded-lg"
                              >
                                גדוד {battalion}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Tab: Comparison */}
      {activeTab === 'comparison' && (
        <div className="space-y-8">

          {/* Section 1: Coverage comparison */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
            <h2 className="text-base font-semibold text-white mb-1">כיסוי חיילים לפי גדוד</h2>
            <p className="text-xs text-gray-400 mb-4">מספר חיילים שנוצר עמם קשר מול לא נוצר קשר</p>
            {coverageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={coverageChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#d1d5db' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="נענו" fill={COVERAGE_COLORS['נענו']} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="לא נענו" fill={COVERAGE_COLORS['לא נענו']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">אין נתונים</p>
            )}
          </div>

          {/* Section 2: Assistance comparison */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
            <h2 className="text-base font-semibold text-white mb-1">צורכי סיוע לפי גדוד</h2>
            <p className="text-xs text-gray-400 mb-4">השוואת סוגי הסיוע הנדרש בין הגדודים</p>
            {assistanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={assistanceChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#d1d5db' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="ביטוח לאומי" fill={ASSISTANCE_COLORS['ביטוח לאומי']} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="קרן סיוע" fill={ASSISTANCE_COLORS['קרן סיוע']} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="סיוע אחר" fill={ASSISTANCE_COLORS['סיוע אחר']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">אין נתונים</p>
            )}
          </div>

          {/* Section 3: Status breakdown — stacked bar comparison */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
            <h2 className="text-base font-semibold text-white mb-1">סטטוס התקדמות טיפול לפי גדוד</h2>
            <p className="text-xs text-gray-400 mb-4">פילוח סטטוסי פנייה — השוואה בין גדודים (stacked)</p>
            {battalionStatusBreakdown.length > 0 && topStatuses.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={battalionStatusBreakdown.map((bat) => {
                      const entry: Record<string, string | number> = { name: bat.battalion };
                      topStatuses.forEach((s) => {
                        entry[s] = bat.byStatus.find((b) => b.status === s)?.count ?? 0;
                      });
                      return entry;
                    })}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#d1d5db' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    {topStatuses.map((status, idx) => (
                      <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                {/* Legend colors */}
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {topStatuses.map((s, idx) => (
                    <span key={s} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">אין נתונים</p>
            )}
          </div>

          {/* Section 4: Summary table */}
          {battalionPieStats.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
              <h2 className="text-base font-semibold text-white mb-4">טבלת סיכום השוואתית</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-xs">
                      <th className="py-2 px-3">גדוד</th>
                      <th className="py-2 px-3">סה"כ חיילים</th>
                      <th className="py-2 px-3">נוצר קשר</th>
                      <th className="py-2 px-3">% כיסוי</th>
                      <th className="py-2 px-3">ביטוח לאומי</th>
                      <th className="py-2 px-3">קרן סיוע</th>
                      <th className="py-2 px-3">סיוע אחר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battalionPieStats.map((stat) => {
                      const assistance = assistanceStats.find((a) => a.battalion === stat.battalion);
                      const coveragePct = stat.totalSoldiers > 0
                        ? Math.round((stat.contactedSoldiers / stat.totalSoldiers) * 100)
                        : 0;
                      const coverageColor = coveragePct >= 80 ? 'text-green-400' : coveragePct >= 50 ? 'text-yellow-400' : 'text-red-400';
                      return (
                        <tr key={stat.battalion} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">גדוד {stat.battalion}</td>
                          <td className="py-2.5 px-3 text-gray-300">{stat.totalSoldiers}</td>
                          <td className="py-2.5 px-3 text-green-400">{stat.contactedSoldiers}</td>
                          <td className={`py-2.5 px-3 font-bold ${coverageColor}`}>{coveragePct}%</td>
                          <td className="py-2.5 px-3 text-blue-400">{assistance?.nationalInsurance ?? '—'}</td>
                          <td className="py-2.5 px-3 text-amber-400">{assistance?.welfareFund ?? '—'}</td>
                          <td className="py-2.5 px-3 text-purple-400">{assistance?.otherAssistance ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Battalion Pie Charts */}
      {activeTab === 'battalionStatus' && (
        <>
          {battalionPieStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {battalionPieStats.map((stat) => {
                const notContacted = stat.totalSoldiers - stat.contactedSoldiers;
                const data = [
                  { name: 'נענו', value: stat.contactedSoldiers },
                  { name: 'לא נענו', value: notContacted },
                ];
                const PIE_COLORS = ['#10b981', '#4b5563'];
                return (
                  <div
                    key={stat.battalion}
                    className="bg-gray-900 rounded-xl border border-gray-700 p-5 flex flex-col items-center"
                  >
                    <h3 className="text-sm font-semibold text-white mb-1">גדוד {stat.battalion}</h3>
                    <p className="text-xs text-gray-400 mb-3">סה"כ {stat.totalSoldiers} חיילים</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {data.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#d1d5db' }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">אין נתונים להצגה</p>
          )}

          {/* Assistance Bars */}
          {assistanceStats.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-4">נדרש סיוע לפי גדוד</h2>
              <div className="space-y-5">
                {assistanceStats.map((stat) => {
                  const maxVal = Math.max(stat.nationalInsurance, stat.welfareFund, stat.otherAssistance, 1);
                  const bars = [
                    { key: 'national_insurance', label: 'ביטוח לאומי', count: stat.nationalInsurance, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-400' },
                    { key: 'welfare_fund', label: 'קרן סיוע', count: stat.welfareFund, color: 'bg-amber-500', hoverColor: 'hover:bg-amber-400' },
                    { key: 'other_assistance', label: 'סיוע אחר', count: stat.otherAssistance, color: 'bg-purple-500', hoverColor: 'hover:bg-purple-400' },
                  ];

                  return (
                    <div key={stat.battalion} className="bg-gray-900 rounded-xl border border-gray-700 p-5">
                      <h3 className="text-sm font-semibold text-white mb-3">גדוד {stat.battalion}</h3>
                      <div className="space-y-3">
                        {bars.map((bar) => {
                          const isExpanded = expandedBar?.battalion === stat.battalion && expandedBar?.type === bar.key;
                          return (
                            <div key={bar.key}>
                              <button
                                onClick={() => handleBarClick(stat.battalion, bar.key)}
                                className="w-full text-right"
                              >
                                <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>{bar.label}</span>
                                  <span className="font-semibold">{bar.count}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-3 cursor-pointer">
                                  <div
                                    className={`${bar.color} ${bar.hoverColor} h-3 rounded-full transition-all duration-300`}
                                    style={{ width: `${(bar.count / maxVal) * 100}%`, minWidth: bar.count > 0 ? '8px' : '0' }}
                                  />
                                </div>
                              </button>

                              {/* Expanded soldiers list */}
                              {isExpanded && (
                                <div className="mt-2 bg-gray-800 rounded-lg border border-gray-600 p-3">
                                  {expandedLoading ? (
                                    <div className="flex items-center justify-center py-3">
                                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  ) : expandedSoldiers.length === 0 ? (
                                    <p className="text-gray-500 text-xs text-center py-2">אין חיילים</p>
                                  ) : (
                                    <div className="max-h-48 overflow-y-auto">
                                      <table className="w-full text-xs text-gray-300">
                                        <thead>
                                          <tr className="border-b border-gray-600">
                                            <th className="text-right py-1 px-2 font-medium text-gray-400">שם</th>
                                            <th className="text-right py-1 px-2 font-medium text-gray-400">מ.א</th>
                                            <th className="text-right py-1 px-2 font-medium text-gray-400">פירוט</th>
                                            <th className="py-1 px-2"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expandedSoldiers.map((s, i) => (
                                            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                              <td className="py-1.5 px-2">{s.firstName} {s.lastName}</td>
                                              <td className="py-1.5 px-2">{s.personalNumber}</td>
                                              <td className="py-1.5 px-2 truncate max-w-[200px]">{s.value}</td>
                                              <td className="py-1.5 px-2">
                                                <button
                                                  title="פתח כרטיס חייל"
                                                  onClick={() => {
                                                    const params = new URLSearchParams({
                                                      battalion: expandedBar!.battalion,
                                                      personal_number: s.personalNumber,
                                                    });
                                                    window.open(`/battalion/soldier?${params.toString()}`, '_blank');
                                                  }}
                                                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                  </svg>
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
