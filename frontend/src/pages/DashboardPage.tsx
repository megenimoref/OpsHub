import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface PersonDashboard {
  name: string;
  total: number;
  todayCount: number;
  byBattalion: { battalion: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

const PERSON_COLORS: Record<string, string> = {
  'שלומי אזולאי': 'cyan',
  'כוכב אבשלום': 'purple',
  'נמרוד סער': 'green',
  'לילך': 'pink',
};

const COLOR_CLASSES: Record<string, { border: string; title: string; badge: string; bar: string }> = {
  cyan:   { border: 'border-cyan-700',   title: 'text-cyan-300',   badge: 'bg-cyan-900 text-cyan-200',   bar: 'bg-cyan-500' },
  purple: { border: 'border-purple-700', title: 'text-purple-300', badge: 'bg-purple-900 text-purple-200', bar: 'bg-purple-500' },
  green:  { border: 'border-green-700',  title: 'text-green-300',  badge: 'bg-green-900 text-green-200',  bar: 'bg-green-500' },
  pink:   { border: 'border-pink-700',   title: 'text-pink-300',   badge: 'bg-pink-900 text-pink-200',    bar: 'bg-pink-500' },
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<PersonDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/battalion/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('שגיאה בטעינת הדשבורד'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400 text-center">{error}</div>
    );
  }

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">לוח נתונים</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.map((person) => {
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
    </div>
  );
};
