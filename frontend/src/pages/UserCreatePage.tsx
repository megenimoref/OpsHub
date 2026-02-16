import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/authService';

interface UserRecord {
  id: number;
  email: string;
  role: 'admin' | 'staff';
  totpEnabled: boolean;
}

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [resetMsg, setResetMsg] = useState('');

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/users', { email, password, role });
      setSuccess(`המשתמש ${email} נוצר בהצלחה`);
      setEmail('');
      setPassword('');
      setRole('staff');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTotp = async (userId: number, userEmail: string) => {
    if (!window.confirm(`אפס את ה-2FA של ${userEmail}?`)) return;
    setResettingId(userId);
    setResetMsg('');
    try {
      await authService.resetUserTotp(userId);
      setResetMsg(`ה-2FA של ${userEmail} אופס בהצלחה`);
      fetchUsers();
    } catch (err: any) {
      setResetMsg(err.response?.data?.error || 'שגיאה באיפוס');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">הכנס משתמש חדש</h1>
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/40 border border-green-700 text-green-300 rounded-md text-sm">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              אימייל <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              סיסמה <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="לפחות 6 תווים"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              תפקיד
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'שומר...' : 'הכנס משתמש'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 rounded-md text-sm font-medium"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>

      {/* Users list with Reset 2FA */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">ניהול משתמשים קיימים</h2>
        {resetMsg && (
          <div className="mb-3 p-3 bg-blue-900/40 border border-blue-700 text-blue-300 rounded-md text-sm">
            {resetMsg}
          </div>
        )}
        {users.length === 0 ? (
          <p className="text-gray-500 text-sm">אין משתמשים</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div>
                  <span className="text-white text-sm">{u.email}</span>
                  <span className="mr-2 text-xs text-gray-400">({u.role})</span>
                  <span className={`mr-2 text-xs px-2 py-0.5 rounded-full ${u.totpEnabled ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                    {u.totpEnabled ? '2FA פעיל' : '2FA לא מוגדר'}
                  </span>
                </div>
                <button
                  onClick={() => handleResetTotp(u.id, u.email)}
                  disabled={resettingId === u.id}
                  className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded-md disabled:opacity-50"
                >
                  {resettingId === u.id ? 'מאפס...' : 'אפס 2FA'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
