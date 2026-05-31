import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

interface FieldStat {
  key: string;
  label: string;
  total: number;
  pct: number;
}

interface BattalionRow {
  battalion: string;
  total: number;
  fields: Record<string, number>;
}

interface BreakdownResponse {
  totalSoldiers: number;
  totalBattalions: number;
  fields: FieldStat[];
  battalions: BattalionRow[];
}

const BAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500',
  'bg-sky-500', 'bg-teal-500', 'bg-indigo-500', 'bg-lime-500',
];

export const AssistanceBreakdownPage: React.FC = () => {
  const [data, setData] = useState<BreakdownResponse | null>(null);
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedBattalion, setExpandedBattalion] = useState<string | null>(null);

  const fetchData = async (battalion?: string) => {
    setLoading(true);
    try {
      const params = battalion ? `?battalion=${encodeURIComponent(battalion)}` : '';
      const res = await api.get<BreakdownResponse>(`/battalion/assistance-breakdown${params}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<{ battalions: string[] }>('/battalion/list').then((r) => {
      setBattalions(r.data.battalions || []);
    });
    fetchData();
  }, []);

  const filteredFields = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.fields;
    return data.fields.filter((f) => f.label.includes(search.trim()));
  }, [data, search]);

  const maxCount = useMemo(() => {
    if (!filteredFields.length) return 1;
    return Math.max(...filteredFields.map((f) => f.total), 1);
  }, [filteredFields]);

  const handleBattalionChange = (val: string) => {
    setSelectedBattalion(val);
    fetchData(val || undefined);
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white" dir="rtl">
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">פילוח מענים מפורט</h1>
          <p className="text-gray-400 text-sm">ספירה מדויקת לפי שדות מובנים בלבד — ללא חיפוש טקסט חופשי</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <select
            value={selectedBattalion}
            onChange={(e) => handleBattalionChange(e.target.value)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">כל הגדודים</option>
            {battalions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="חפש מענה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-48"
          />

          <button
            onClick={() => fetchData(selectedBattalion || undefined)}
            disabled={loading}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {loading ? '⏳ טוען...' : '↻ רענן'}
          </button>

          {data && (
            <div className="mr-auto flex gap-4 text-sm">
              <span className="text-gray-400">סה"כ חיילים: <span className="text-white font-bold">{data.totalSoldiers.toLocaleString()}</span></span>
              <span className="text-gray-400">גדודים: <span className="text-white font-bold">{data.totalBattalions}</span></span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Bar chart of all fields */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-5">פילוח לפי סוג מענה</h2>
              <div className="space-y-3">
                {filteredFields.length === 0 && (
                  <p className="text-gray-400 text-sm">לא נמצאו תוצאות</p>
                )}
                {filteredFields.map((f, idx) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <div className="w-44 text-right text-sm text-gray-200 shrink-0 truncate" title={f.label}>
                      {f.label}
                    </div>
                    <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${BAR_COLORS[idx % BAR_COLORS.length]} h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                        style={{ width: `${Math.max((f.total / maxCount) * 100, f.total > 0 ? 2 : 0)}%` }}
                      >
                        {f.total > 0 && (
                          <span className="text-white text-xs font-bold">{f.total}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-14 text-left text-sm text-gray-400 shrink-0">
                      {f.pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-battalion breakdown table */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">פירוט לפי גדוד</h2>
              <div className="space-y-2">
                {data.battalions
                  .filter((bn) => !selectedBattalion || bn.battalion === selectedBattalion)
                  .sort((a, b) => b.total - a.total)
                  .map((bn) => (
                    <div key={bn.battalion} className="rounded-lg border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => setExpandedBattalion(expandedBattalion === bn.battalion ? null : bn.battalion)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors text-right"
                      >
                        <span className="font-semibold text-white">{bn.battalion}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm">סה"כ חיילים: <span className="text-white">{bn.total}</span></span>
                          <span className="text-gray-400 text-xs">{expandedBattalion === bn.battalion ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {expandedBattalion === bn.battalion && (
                        <div className="border-t border-gray-700 px-4 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {data.fields
                            .filter((f) => (bn.fields[f.key] || 0) > 0)
                            .sort((a, b) => (bn.fields[b.key] || 0) - (bn.fields[a.key] || 0))
                            .map((f) => (
                              <div key={f.key} className="flex justify-between items-center bg-gray-700 rounded px-3 py-2 text-sm">
                                <span className="text-gray-200 truncate text-xs" title={f.label}>{f.label}</span>
                                <span className="text-blue-300 font-bold ml-2 shrink-0">{bn.fields[f.key] || 0}</span>
                              </div>
                            ))}
                          {data.fields.every((f) => !(bn.fields[f.key] || 0)) && (
                            <p className="col-span-4 text-gray-400 text-sm">אין מענים רשומים לגדוד זה</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
