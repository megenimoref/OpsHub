import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

// Mirrors backend/src/services/sheagatHaariService.ts. Kept as a duplicate type
// rather than imported across the workspace boundary because the build doesn't
// share a tsconfig — and the contract is small + stable.
interface SubcategoryStat { key: string; label: string; count: number; pct: number }
interface CategoryStat {
  key: string; label: string; color: string;
  count: number; pct: number;
  subcategories: SubcategoryStat[];
}
interface BattalionStats {
  battalion: string;
  total: number;
  treated: number; treatedPct: number;
  untreated: number; untreatedPct: number;
  categories: CategoryStat[];
  unmatched: number; unmatchedPct: number;
  unmatchedSamples: string[];
}
interface ApiResponse {
  generatedAt: string;
  battalions: BattalionStats[];
  total: BattalionStats;
}

// Tailwind class lookup for category accent colour. Built statically because
// JIT only sees classes that appear as literal strings in the source.
const COLOR_CLASSES: Record<string, { bg: string; bar: string; text: string; ring: string }> = {
  emerald:  { bg: 'bg-emerald-900/30',  bar: 'bg-emerald-500',  text: 'text-emerald-300',  ring: 'ring-emerald-700/50' },
  sky:      { bg: 'bg-sky-900/30',      bar: 'bg-sky-500',      text: 'text-sky-300',      ring: 'ring-sky-700/50' },
  amber:    { bg: 'bg-amber-900/30',    bar: 'bg-amber-500',    text: 'text-amber-300',    ring: 'ring-amber-700/50' },
  rose:     { bg: 'bg-rose-900/30',     bar: 'bg-rose-500',     text: 'text-rose-300',     ring: 'ring-rose-700/50' },
  violet:   { bg: 'bg-violet-900/30',   bar: 'bg-violet-500',   text: 'text-violet-300',   ring: 'ring-violet-700/50' },
  slate:    { bg: 'bg-slate-900/30',    bar: 'bg-slate-500',    text: 'text-slate-300',    ring: 'ring-slate-700/50' },
  cyan:     { bg: 'bg-cyan-900/30',     bar: 'bg-cyan-500',     text: 'text-cyan-300',     ring: 'ring-cyan-700/50' },
  fuchsia:  { bg: 'bg-fuchsia-900/30',  bar: 'bg-fuchsia-500',  text: 'text-fuchsia-300',  ring: 'ring-fuchsia-700/50' },
  orange:   { bg: 'bg-orange-900/30',   bar: 'bg-orange-500',   text: 'text-orange-300',   ring: 'ring-orange-700/50' },
};

function pickColor(c: string) {
  return COLOR_CLASSES[c] || COLOR_CLASSES.slate;
}

const KpiCard: React.FC<{ label: string; value: number | string; sub?: string; tone?: 'emerald' | 'rose' | 'cyan' | 'amber' }> = ({ label, value, sub, tone = 'cyan' }) => {
  const map = { emerald: 'border-emerald-800/60 text-emerald-300', rose: 'border-rose-800/60 text-rose-300', cyan: 'border-cyan-800/60 text-cyan-300', amber: 'border-amber-800/60 text-amber-300' };
  return (
    <div className={`bg-gray-900 rounded-xl border ${map[tone]} p-4`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
};

const CategoryRow: React.FC<{ cat: CategoryStat; total: number }> = ({ cat, total }) => {
  const c = pickColor(cat.color);
  return (
    <div className={`rounded-lg border ${c.ring} ring-1 ${c.bg} p-3`}>
      <div className="flex justify-between items-baseline mb-2">
        <span className={`text-sm font-medium ${c.text}`}>{cat.label}</span>
        <span className="text-xs text-gray-300">{cat.count} ({cat.pct}%)</span>
      </div>
      <div className="w-full bg-gray-700/60 rounded-full h-1.5 mb-3">
        <div className={`${c.bar} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(cat.pct, 100)}%` }} />
      </div>
      <div className="space-y-1">
        {cat.subcategories.filter((s) => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 6).map((s) => (
          <div key={s.key} className="flex justify-between text-xs">
            <span className="text-gray-400 truncate max-w-[70%]">{s.label}</span>
            <span className="text-gray-300">{s.count} ({s.pct}%)</span>
          </div>
        ))}
        {cat.subcategories.filter((s) => s.count > 0).length === 0 && (
          <div className="text-xs text-gray-600 italic">— ללא תיוגים —</div>
        )}
      </div>
    </div>
  );
};

const BattalionDetailModal: React.FC<{ b: BattalionStats; onClose: () => void }> = ({ b, onClose }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl border border-gray-700 max-w-5xl w-full my-8 p-6" onClick={(e) => e.stopPropagation()} dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">גדוד {b.battalion}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="סך הכל חיילים" value={b.total} tone="cyan" />
        <KpiCard label="טופלו" value={b.treated} sub={`${b.treatedPct}%`} tone="emerald" />
        <KpiCard label="ממתינים לטיפול" value={b.untreated} sub={`${b.untreatedPct}%`} tone="rose" />
        <KpiCard label="לא סווגו" value={b.unmatched} sub={`${b.unmatchedPct}%`} tone="amber" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {b.categories.map((cat) => <CategoryRow key={cat.key} cat={cat} total={b.total} />)}
      </div>
      {b.unmatchedSamples.length > 0 && (
        <details className="bg-gray-900 rounded-lg border border-amber-800/40 p-3">
          <summary className="cursor-pointer text-sm text-amber-300 font-medium">דוגמאות מחיילים שלא סווגו ({b.unmatchedSamples.length}) — שימושי לעדכון מילות מפתח</summary>
          <ul className="mt-3 space-y-1 text-xs text-gray-400">
            {b.unmatchedSamples.map((s, i) => (
              <li key={i} className="border-r-2 border-amber-700/40 pr-2 leading-relaxed">{s}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  </div>
);

const BattalionCard: React.FC<{ b: BattalionStats; onOpen: () => void }> = ({ b, onOpen }) => (
  <button
    onClick={onOpen}
    className="bg-gray-900 rounded-xl border border-gray-700 p-4 text-right hover:border-cyan-600 hover:bg-gray-800/80 transition-all"
  >
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-base font-semibold text-white">גדוד {b.battalion}</h3>
      <span className="text-xs text-gray-500">לחץ לפירוט</span>
    </div>
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="text-center">
        <div className="text-xs text-gray-400">סה"כ</div>
        <div className="text-lg font-bold text-cyan-300">{b.total}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-gray-400">טופלו</div>
        <div className="text-lg font-bold text-emerald-300">{b.treatedPct}%</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-gray-400">ממתינים</div>
        <div className="text-lg font-bold text-rose-300">{b.untreatedPct}%</div>
      </div>
    </div>
    {/* Top 3 categories preview */}
    <div className="space-y-1.5">
      {b.categories.filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 3).map((c) => {
        const cls = pickColor(c.color);
        return (
          <div key={c.key} className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700/60 rounded-full h-1.5 overflow-hidden">
              <div className={`${cls.bar} h-full`} style={{ width: `${Math.min(c.pct, 100)}%` }} />
            </div>
            <span className={`${cls.text} text-xs whitespace-nowrap`}>{c.label} {c.pct}%</span>
          </div>
        );
      })}
      {b.categories.every((c) => c.count === 0) && b.total > 0 && (
        <div className="text-xs text-gray-600 italic">אין תיוגי קטגוריות</div>
      )}
      {b.total === 0 && (
        <div className="text-xs text-gray-600 italic">אין חיילים — מחכה לייבוא</div>
      )}
    </div>
  </button>
);

export const SheagatHaariPage: React.FC = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [drill, setDrill] = useState<BattalionStats | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ApiResponse>('/battalion/sheagat-haari');
      setData(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim();
    if (!q) return data.battalions;
    return data.battalions.filter((b) => b.battalion.includes(q));
  }, [data, filter]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">שאגת הארי — סטטיסטיקת גדודים</h1>
            {data?.generatedAt && (
              <p className="text-xs text-gray-500 mt-1">
                עודכן: {new Date(data.generatedAt).toLocaleString('he-IL')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="חיפוש גדוד..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg text-sm"
            />
            <button onClick={load} disabled={loading} className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 rounded-lg text-sm">
              {loading ? 'מרענן...' : 'רענן'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-900/40 border border-rose-700 rounded-lg p-3 mb-4 text-rose-200 text-sm">{error}</div>
        )}

        {loading && !data && (
          <div className="text-gray-400 text-sm">טוען נתונים מכל הגדודים...</div>
        )}

        {data && (
          <>
            {/* Overall KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KpiCard label="סך הכל חיילים (כל הגדודים)" value={data.total.total} tone="cyan" />
              <KpiCard label="טופלו" value={data.total.treated} sub={`${data.total.treatedPct}%`} tone="emerald" />
              <KpiCard label="ממתינים לטיפול" value={data.total.untreated} sub={`${data.total.untreatedPct}%`} tone="rose" />
              <KpiCard label="לא סווגו לקטגוריה" value={data.total.unmatched} sub={`${data.total.unmatchedPct}%`} tone="amber" />
            </div>

            {/* Battalion grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((b) => (
                <BattalionCard key={b.battalion} b={b} onOpen={() => setDrill(b)} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-12">לא נמצאו גדודים תואמים</div>
            )}
          </>
        )}

        {drill && <BattalionDetailModal b={drill} onClose={() => setDrill(null)} />}
      </div>
    </div>
  );
};
