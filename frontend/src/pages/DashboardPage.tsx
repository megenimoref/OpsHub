import React, { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

interface DashboardResponse {
  people: PersonDashboard[];
  globalStats: GlobalStats;
  battalions: string[];
  battalionPieStats: BattalionPieStat[];
  assistanceStats: AssistanceStat[];
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
  const [expandedBar, setExpandedBar] = useState<{ battalion: string; type: string } | null>(null);
  const [expandedSoldiers, setExpandedSoldiers] = useState<AssistanceSoldier[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'battalionStatus'>('general');
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
  ] as const;

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
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expandedSoldiers.map((s, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                              <td className="py-1.5 px-2">{s.firstName} {s.lastName}</td>
                                              <td className="py-1.5 px-2">{s.personalNumber}</td>
                                              <td className="py-1.5 px-2 truncate max-w-[200px]">{s.value}</td>
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
