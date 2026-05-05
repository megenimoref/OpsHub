import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface SearchResult {
  soldier: {
    personal_number: string;
    first_name: string;
    last_name: string;
    mobile_phone: string;
    request_status: string;
  };
  battalionName: string;
}

const STATUS_COLOR: Record<string, string> = {
  'טופלה': 'bg-green-900/50 text-green-300 border-green-700',
  'חייל לא זמין': 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  'חייל ממתין לתשובה': 'bg-red-900/50 text-red-300 border-red-700',
  'חייל ביקש שיחזרו אליו': 'bg-sky-900/50 text-sky-300 border-sky-700',
  'ממתין לטיפול': 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
};

export const FieldTeamPage: React.FC = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/battalion/field-team-search', { params: { q: q.trim() } });
      setResults(data.results || []);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const openSoldier = (r: SearchResult) => {
    navigate(`/battalion/soldier?battalion=${encodeURIComponent(r.battalionName)}&personal_number=${encodeURIComponent(r.soldier.personal_number)}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">צוות שטח</h1>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            {loading ? (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="חפש לפי שם פרטי, שם משפחה או מספר טלפון..."
            autoFocus
            className="w-full pr-12 pl-4 py-3.5 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {searched && results.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p>לא נמצאו תוצאות עבור "{query}"</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">{results.length} תוצאות</p>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => openSoldier(r)}
                className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-600 rounded-xl p-4 text-right transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-base">
                        {r.soldier.first_name} {r.soldier.last_name}
                      </span>
                      {r.soldier.request_status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.soldier.request_status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                          {r.soldier.request_status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {r.soldier.mobile_phone && <span dir="ltr">{r.soldier.mobile_phone}</span>}
                      <span className="text-gray-500">גדוד {r.battalionName}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center text-gray-600 py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-sm">הקלד לפחות 2 תווים לחיפוש</p>
          </div>
        )}
      </div>
    </div>
  );
};
