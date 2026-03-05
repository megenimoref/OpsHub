import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/authService';

interface UserRecord {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'staff' | 'super';
  totpEnabled: boolean;
}

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'admin' | 'super'>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<number | null>(null);
  const [resetMsg, setResetMsg] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState<{ [key: number]: string }>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ [key: number]: Partial<UserRecord> }>({});
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

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
      await api.post('/users', { email, password, role, firstName, lastName });
      setSuccess(`המשתמש ${firstName} ${lastName} (${email}) נוצר בהצלחה`);
      setFirstName('');
      setLastName('');
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

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`האם למחוק את המשתמש ${userName}?`)) return;
    setDeletingId(userId);
    setResetMsg('');
    try {
      await api.delete(`/users/${userId}`);
      setResetMsg(`המשתמש ${userName} נמחק בהצלחה`);
      fetchUsers();
    } catch (err: any) {
      setResetMsg(err.response?.data?.error || 'שגיאה במחיקה');
    } finally {
      setDeletingId(null);
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

  const handleResetPassword = async (userId: number, userEmail: string) => {
    const password = newPasswordInput[userId];
    if (!password) {
      setResetMsg('אנא הכנס סיסמה חדשה');
      return;
    }
    if (password.length < 6) {
      setResetMsg('הסיסמה חייבת להיות לפחות 6 תווים');
      return;
    }
    if (!window.confirm(`אפס את הסיסמה של ${userEmail}?`)) return;
    setResettingPasswordId(userId);
    setResetMsg('');
    try {
      await authService.resetUserPassword(userId, password);
      setResetMsg(`הסיסמה של ${userEmail} אופסה בהצלחה`);
      setNewPasswordInput({ ...newPasswordInput, [userId]: '' });
      fetchUsers();
    } catch (err: any) {
      setResetMsg(err.response?.data?.error || 'שגיאה באיפוס הסיסמה');
    } finally {
      setResettingPasswordId(null);
    }
  };

  const handleStartEdit = (user: UserRecord) => {
    setEditingId(user.id);
    setEditData({
      ...editData,
      [user.id]: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
    setResetMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleRoleChange = async (user: UserRecord, newRole: 'staff' | 'admin' | 'super') => {
    setChangingRoleId(user.id);
    setResetMsg('');
    try {
      await authService.updateUser(user.id, user.firstName || '', user.lastName || '', newRole, user.email);
      setResetMsg(`הרשאת ${user.firstName} ${user.lastName} שונתה ל-${newRole}`);
      fetchUsers();
    } catch (err: any) {
      setResetMsg(err.response?.data?.error || 'שגיאה בשינוי הרשאה');
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleSaveEdit = async (userId: number, userName: string) => {
    const data = editData[userId];
    if (!data || !data.firstName || !data.lastName || !data.email) {
      setResetMsg('אנא מלא את כל השדות');
      return;
    }
    setEditingId(null);
    setResetMsg('');
    try {
      await authService.updateUser(
        userId,
        data.firstName,
        data.lastName,
        data.role,
        data.email
      );
      setResetMsg(`${userName} עודכן בהצלחה`);
      setEditData({});
      fetchUsers();
    } catch (err: any) {
      setResetMsg(err.response?.data?.error || 'שגיאה בעדכון המשתמש');
      setEditingId(userId);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                שם פרטי <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="שם פרטי"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                שם משפחה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="שם משפחה"
              />
            </div>
          </div>
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
              onChange={(e) => setRole(e.target.value as 'staff' | 'admin' | 'super')}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="super">Super</option>
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
              <div key={u.id} className="flex flex-col gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                {editingId === u.id ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">שם פרטי</label>
                        <input
                          type="text"
                          value={editData[u.id]?.firstName || ''}
                          onChange={(e) => setEditData({ ...editData, [u.id]: { ...editData[u.id], firstName: e.target.value } })}
                          className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">שם משפחה</label>
                        <input
                          type="text"
                          value={editData[u.id]?.lastName || ''}
                          onChange={(e) => setEditData({ ...editData, [u.id]: { ...editData[u.id], lastName: e.target.value } })}
                          className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">אימייל</label>
                      <input
                        type="email"
                        value={editData[u.id]?.email || ''}
                        onChange={(e) => setEditData({ ...editData, [u.id]: { ...editData[u.id], email: e.target.value } })}
                        className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">תפקיד</label>
                      <select
                        value={editData[u.id]?.role || 'staff'}
                        onChange={(e) => setEditData({ ...editData, [u.id]: { ...editData[u.id], role: e.target.value as 'staff' | 'admin' | 'super' } })}
                        className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="super">Super</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(u.id, `${u.firstName} ${u.lastName}`)}
                        className="flex-1 px-2 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded-md"
                      >
                        שמור
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-md"
                      >
                        ביטול
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-gray-400">({u.email})</span>
                        {/* Inline role-change select */}
                        <div className="relative">
                          <select
                            value={u.role}
                            disabled={changingRoleId === u.id}
                            onChange={(e) => handleRoleChange(u, e.target.value as 'staff' | 'admin' | 'super')}
                            className={`text-xs px-2 py-0.5 rounded-full border font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-wait appearance-none pr-5
                              ${u.role === 'admin' ? 'bg-red-900/60 border-red-700 text-red-300 focus:ring-red-500' :
                                u.role === 'super' ? 'bg-purple-900/60 border-purple-700 text-purple-300 focus:ring-purple-500' :
                                'bg-blue-900/60 border-blue-700 text-blue-300 focus:ring-blue-500'}`}
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                            <option value="super">Super</option>
                          </select>
                          {changingRoleId === u.id && (
                            <span className="absolute left-1 top-0.5 text-xs animate-spin">⟳</span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.totpEnabled ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                          {u.totpEnabled ? '2FA פעיל' : '2FA לא מוגדר'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-md"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleResetTotp(u.id, u.email)}
                          disabled={resettingId === u.id}
                          className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded-md disabled:opacity-50"
                        >
                          {resettingId === u.id ? 'מאפס...' : 'אפס 2FA'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                          disabled={deletingId === u.id}
                          className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs rounded-md disabled:opacity-50"
                        >
                          {deletingId === u.id ? 'מוחק...' : 'מחק'}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="password"
                          placeholder="סיסמה חדשה (לפחות 6 תווים)"
                          value={newPasswordInput[u.id] || ''}
                          onChange={(e) => setNewPasswordInput({ ...newPasswordInput, [u.id]: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        disabled={resettingPasswordId === u.id}
                        className="px-3 py-1 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded-md disabled:opacity-50 whitespace-nowrap"
                      >
                        {resettingPasswordId === u.id ? 'מאפס...' : 'אפס סיסמה'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
