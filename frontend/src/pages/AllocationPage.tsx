import React, { useEffect, useState } from 'react';
import api from '../services/api';

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

export const AllocationPage: React.FC = () => {
  // Data states
  const [battalions, setBattalions] = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserItem[]>([]);

  // Selection states
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  // Stats states
  const [stats, setStats] = useState<BattalionStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Allocation states
  const [allocationCount, setAllocationCount] = useState<string>('');
  const [allocating, setAllocating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load battalions and staff users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [battalionsRes, usersRes] = await Promise.all([
          api.get<{ battalions: string[] }>('/battalion/list'),
          api.get<UserItem[]>('/users'),
        ]);

        setBattalions(battalionsRes.data.battalions || []);
        // Filter only staff users
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
        setLoading(true);
        // Get total soldiers
        const soldiersRes = await api.get<{ soldiers: any[] }>(
          `/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`
        );
        const total = soldiersRes.data.soldiers?.length || 0;

        // Get allocated soldiers
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
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedBattalion]);

  const handleAllocate = async () => {
    if (!selectedBattalion || !selectedUser || !allocationCount) {
      setMessage({ type: 'error', text: 'בחר גדוד, משתמש וכמות חיילים' });
      return;
    }

    const count = parseInt(allocationCount, 10);
    if (isNaN(count) || count <= 0) {
      setMessage({ type: 'error', text: 'הכנס מספר חיקי של חיילים' });
      return;
    }

    if (stats && count > stats.unallocated) {
      setMessage({
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

      setMessage({
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
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setAllocating(false);
    }
  };

  const selectedUserName = selectedUser
    ? staffUsers.find((u) => u.id === selectedUser)
      ? `${staffUsers.find((u) => u.id === selectedUser)?.firstName} ${staffUsers.find((u) => u.id === selectedUser)?.lastName}`
      : ''
    : '';

  return (
    <div className="flex min-h-screen bg-gray-800" dir="rtl">
      {/* Left Sidebar - Staff Users */}
      <aside className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-white font-bold text-sm">משתמשי מערכת</h3>
        </div>
        <div className="p-2 space-y-1">
          {staffUsers.length === 0 ? (
            <p className="text-gray-400 text-xs p-2">אין משתמשים</p>
          ) : (
            staffUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u.id)}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">הקצאת חיילים</h1>
          <p className="text-gray-400 mb-6">בחר גדוד ומשתמש להקצאת חיילים</p>

          {/* Battalion Selection Grid */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">בחר גדוד:</h2>
            {battalions.length === 0 ? (
              <p className="text-gray-400">אין גדודים במערכת</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {battalions.map((bn) => (
                  <button
                    key={bn}
                    onClick={() => {
                      setSelectedBattalion(bn);
                      setMessage(null);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
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
            <div className="grid grid-cols-2 gap-4 mb-6">
              {loading ? (
                <div className="col-span-2 text-center py-8">
                  <div className="inline-block animate-spin">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                </div>
              ) : stats ? (
                <>
                  <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-6">
                    <p className="text-blue-300 text-sm mb-2">סה"כ חיילים בגדוד</p>
                    <p className="text-4xl font-bold text-blue-100">{stats.total}</p>
                  </div>
                  <div className={`${
                    stats.unallocated === 0
                      ? 'bg-red-900/40 border-red-700'
                      : 'bg-green-900/40 border-green-700'
                  } border rounded-lg p-6`}>
                    <p className={`${
                      stats.unallocated === 0 ? 'text-red-300' : 'text-green-300'
                    } text-sm mb-2`}>
                      נותרו לא מוקצים
                    </p>
                    <p className={`text-4xl font-bold ${
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
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">הקצה חיילים</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                  <span className="text-gray-300">משתמש נבחר:</span>
                  <span className="text-white font-semibold">{selectedUserName}</span>
                </div>

                <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                  <span className="text-gray-300">גדוד נבחר:</span>
                  <span className="text-white font-semibold">{selectedBattalion}</span>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    כמות חיילים להקצאה:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={stats.unallocated}
                    value={allocationCount}
                    onChange={(e) => {
                      setAllocationCount(e.target.value);
                      setMessage(null);
                    }}
                    placeholder="הכנס מספר"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    ניתן להקצות עד {stats.unallocated} חיילים
                  </p>
                </div>

                <button
                  onClick={handleAllocate}
                  disabled={allocating || !allocationCount || parseInt(allocationCount) > stats.unallocated}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {allocating ? 'מקצה...' : 'הקצה'}
                </button>

                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-900/40 border border-green-700 text-green-300'
                      : 'bg-red-900/40 border border-red-700 text-red-300'
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedBattalion && !selectedUser && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 text-center">
              <p className="text-blue-300">בחר משתמש מהסרגל הימני להמשך</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
