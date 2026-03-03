import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ImportResult {
  success: boolean;
  battalionName: string;
  totalRows: number;
  insertedRows: number;
  message: string;
  unknownHeaders?: string[];
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

export const BattalionImportPage: React.FC = () => {
  // Import states
  const [battalionName, setBattalionName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Allocation states
  const [battalions, setBattalions] = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserItem[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [stats, setStats] = useState<BattalionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [allocationCount, setAllocationCount] = useState<string>('');
  const [allocating, setAllocating] = useState(false);
  const [allocMessage, setAllocMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load battalions and staff users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [battalionsRes, usersRes] = await Promise.all([
          api.get<{ battalions: string[] }>('/battalion/list'),
          api.get<UserItem[]>('/users'),
        ]);

        setBattalions(battalionsRes.data.battalions || []);
        const staff = usersRes.data.filter((u) => u.role === 'staff') || [];
        setStaffUsers(staff);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    fetchData();
  }, []);

  // Load battalion stats when a battalion is selected
  useEffect(() => {
    if (!selectedBattalion) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const soldiersRes = await api.get<{ soldiers: any[] }>(
          `/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`
        );
        const total = soldiersRes.data.soldiers?.length || 0;

        const allocatedRes = await api.get<any[]>(
          `/battalion/allocations/${encodeURIComponent(selectedBattalion)}`
        );
        const allocated = allocatedRes.data?.length || 0;

        setStats({
          total,
          unallocated: total - allocated,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [selectedBattalion]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setError('');
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!battalionName.trim()) {
      setError('יש להזין שם גדוד');
      return;
    }
    if (!file) {
      setError('יש לבחור קובץ Excel');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('battalionName', battalionName.trim());
      formData.append('file', file);

      const response = await api.post<ImportResult>('/battalion/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'שגיאה ביבוא הגדוד';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedBattalion || !selectedUser || !allocationCount) {
      setAllocMessage({ type: 'error', text: 'בחר גדוד, משתמש וכמות חיילים' });
      return;
    }

    const count = parseInt(allocationCount, 10);
    if (isNaN(count) || count <= 0) {
      setAllocMessage({ type: 'error', text: 'הכנס מספר חיקי של חיילים' });
      return;
    }

    if (stats && count > stats.unallocated) {
      setAllocMessage({
        type: 'error',
        text: `לא ניתן להקצות יותר מ-${stats.unallocated} חיילים`
      });
      return;
    }

    setAllocating(true);
    try {
      await api.post('/battalion/allocate', {
        battalionName: selectedBattalion,
        allocations: [{ userId: selectedUser, count }],
      });

      setAllocMessage({
        type: 'success',
        text: `${count} חיילים הוקצו בהצלחה`
      });
      setAllocationCount('');

      // Refresh stats
      if (selectedBattalion) {
        const soldiersRes = await api.get<{ soldiers: any[] }>(
          `/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`
        );
        const total = soldiersRes.data.soldiers?.length || 0;
        const allocatedRes = await api.get<any[]>(
          `/battalion/allocations/${encodeURIComponent(selectedBattalion)}`
        );
        const allocated = allocatedRes.data?.length || 0;
        setStats({
          total,
          unallocated: total - allocated,
        });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'שגיאה בהקצאת חיילים';
      setAllocMessage({ type: 'error', text: errorMsg });
    } finally {
      setAllocating(false);
    }
  };

  const selectedUserName = selectedUser
    ? staffUsers.find((u) => u.id === selectedUser)
      ? `${staffUsers.find((u) => u.id === selectedUser)?.firstName} ${staffUsers.find((u) => u.id === selectedUser)?.lastName}`
      : ''
    : '';

  const KNOWN_COLUMNS = [
    'מספר אישי','שם משפחה','שם פרטי','טלפון נייד',
    'סטוס פנייה','מצב משפחתי','מספר ילדים',
    'אינדיקציית סטודנט','בן/בת זוג','מספר טלפון בן/בת זוג',
    'אינדיקציות שעלו מהנתונים','מי יצרה קשר','תאריך','מול מי נוצר הקשר',
    'סטטוס תעסוקתי','מיצוי זכויות קרן סיוע פרוט','ביטוח לאומי',
    'סיוע אחר','אילו בקשות צריך להגיש','פירוט/ הערות',
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* SECTION 1: IMPORT */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 mb-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">יבוא גדוד</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Battalion name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">שם הגדוד</label>
            <input
              type="text"
              value={battalionName}
              onChange={(e) => setBattalionName(e.target.value)}
              placeholder="לדוגמה: גדוד 101"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-gray-700 text-white placeholder-gray-400"
              disabled={loading}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">קובץ Excel</label>
            <div
              className="flex items-center gap-3 border-2 border-dashed border-gray-600 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 text-right">
                {file ? (
                  <span className="text-blue-600 font-medium">{file.name}</span>
                ) : (
                  <span className="text-gray-400">לחץ לבחירת קובץ .xlsx</span>
                )}
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={loading}
              >
                Browse
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4" dir="rtl">
              <p className="font-bold text-red-300 mb-1">שגיאה:</p>
              <p className="text-red-300 text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="space-y-3">
              <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-4 rounded-lg">
                <p className="font-bold text-lg mb-1">✓ היבוא הצליח!</p>
                <p>{result.message}</p>
                <p className="text-sm text-green-300 mt-1">
                  סה"כ שורות בקובץ: {result.totalRows} | יובאו: {result.insertedRows}
                </p>
              </div>

              {/* Unknown columns shown in red */}
              {result.unknownHeaders && result.unknownHeaders.length > 0 && (
                <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
                  <p className="font-bold text-red-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    עמודות שלא קיימות ב-DB ({result.unknownHeaders.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.unknownHeaders.map((h) => (
                      <span key={h} className="bg-red-900/40 text-red-300 border border-red-700 px-2 py-1 rounded text-xs font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-red-300 mt-2">עמודות אלו לא יובאו. הן אינן קיימות בסכמת ה-DB.</p>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('/people')}
              className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg bg-gray-700 hover:bg-gray-600"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading || !file || !battalionName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'מייבא...' : 'יבא גדוד'}
            </button>
          </div>
        </form>
      </div>

      {/* Known columns info */}
      <div className="mt-6 bg-blue-900/40 border border-blue-700 rounded-lg p-4 text-sm text-blue-300 mb-8" dir="rtl">
        <p className="font-bold mb-2">עמודות מוכרות ({KNOWN_COLUMNS.length}):</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {KNOWN_COLUMNS.map((col) => (
            <span key={col} className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-xs">{col}</span>
          ))}
        </div>
      </div>

      {/* SECTION 2: ALLOCATION */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">הקצאת חיילים</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Staff Users Sidebar */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-fit">
            <h3 className="text-white font-bold text-sm mb-3 pb-3 border-b border-gray-700">משתמשי מערכת</h3>
            <div className="space-y-1">
              {staffUsers.length === 0 ? (
                <p className="text-gray-400 text-xs p-2">אין משתמשים</p>
              ) : (
                staffUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u.id)}
                    className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors text-xs ${
                      selectedUser === u.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {u.firstName} {u.lastName}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Middle & Right: Battalion & Allocation */}
          <div className="col-span-2 space-y-4">
            {/* Battalion Selection Grid */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3">בחר גדוד:</h3>
              {battalions.length === 0 ? (
                <p className="text-gray-400 text-sm">אין גדודים במערכת</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {battalions.map((bn) => (
                    <button
                      key={bn}
                      onClick={() => {
                        setSelectedBattalion(bn);
                        setAllocMessage(null);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-xs font-medium ${
                        selectedBattalion === bn
                          ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                          : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {bn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Section */}
            {selectedBattalion && (
              <div className="grid grid-cols-2 gap-3">
                {statsLoading ? (
                  <div className="col-span-2 text-center py-6">
                    <div className="inline-block animate-spin">
                      <div className="w-4 h-4 border border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                ) : stats ? (
                  <>
                    <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-4">
                      <p className="text-blue-300 text-xs mb-1">סה"כ חיילים בגדוד</p>
                      <p className="text-2xl font-bold text-blue-100">{stats.total}</p>
                    </div>
                    <div className={`${
                      stats.unallocated === 0
                        ? 'bg-red-900/40 border-red-700'
                        : 'bg-green-900/40 border-green-700'
                    } border rounded-lg p-4`}>
                      <p className={`${
                        stats.unallocated === 0 ? 'text-red-300' : 'text-green-300'
                      } text-xs mb-1`}>
                        נותרו לא מוקצים
                      </p>
                      <p className={`text-2xl font-bold ${
                        stats.unallocated === 0 ? 'text-red-100' : 'text-green-100'
                      }`}>
                        {stats.unallocated}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Allocation Form */}
            {selectedBattalion && selectedUser && stats && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">משתמש:</span>
                  <span className="text-white font-semibold">{selectedUserName}</span>
                </div>

                <div>
                  <label className="block text-gray-300 text-xs mb-2">כמות חיילים להקצאה:</label>
                  <input
                    type="number"
                    min="0"
                    max={stats.unallocated}
                    value={allocationCount}
                    onChange={(e) => {
                      setAllocationCount(e.target.value);
                      setAllocMessage(null);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    ניתן להקצות עד {stats.unallocated} חיילים
                  </p>
                </div>

                <button
                  onClick={handleAllocate}
                  disabled={allocating || !allocationCount || parseInt(allocationCount) > stats.unallocated}
                  className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  {allocating ? 'מקצה...' : 'הקצה'}
                </button>

                {allocMessage && (
                  <div className={`p-3 rounded-lg text-xs ${
                    allocMessage.type === 'success'
                      ? 'bg-green-900/40 border border-green-700 text-green-300'
                      : 'bg-red-900/40 border border-red-700 text-red-300'
                  }`}>
                    {allocMessage.text}
                  </div>
                )}
              </div>
            )}

            {selectedBattalion && !selectedUser && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
                <p className="text-blue-300 text-sm">בחר משתמש מהעמודה הימנית להמשך</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
