import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/authService';

interface UserRecord {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  mobilePhone?: string | null;
  role: 'admin' | 'staff' | 'super' | 'manager';
}

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [role, setRole] = useState<'staff' | 'admin' | 'super' | 'manager'>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState<UserRecord[]>([]);
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
      await api.post('/users', { email, password, role, firstName, lastName, mobilePhone: mobilePhone.trim() || undefined });
      setSuccess(`המשתמש ${firstName} ${lastName} (${email}) נוצר בהצלחה`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setMobilePhone('');
      setRole('staff');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  const [resetMessages, setResetMessages] = useState<{ [key: number]: { text: string; isError: boolean } }>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const ROLE_LABELS: Record<UserRecord['role'], string> = {
    admin: 'אדמין',
    staff: 'עובד/ת',
    super: 'סופר',
    manager: 'מנהל/ת',
  };

  const exportUsersToExcel = () => {
    if (users.length === 0) return;
    const headers = ['מזהה', 'שם פרטי', 'שם משפחה', 'דוא"ל', 'טלפון נייד', 'תפקיד'];
    const escape = (v: string | number | undefined | null) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = users.map((u) =>
      [u.id, u.firstName || '', u.lastName || '', u.email, u.mobilePhone || '', ROLE_LABELS[u.role] || u.role]
        .map(escape)
        .join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ts = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `users-${ts}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  const setUserMsg = (userId: number, text: string, isError: boolean) => {
    setResetMessages((prev) => ({ ...prev, [userId]: { text, isError } }));
  };

  const clearUserMsg = (userId: number) => {
    setResetMessages((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleResetPassword = async (userId: number, userEmail: string) => {
    const password = newPasswordInput[userId];
    if (!password) {
      setUserMsg(userId, 'אנא הכנס סיסמה חדשה', true);
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setUserMsg(userId, 'הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, ספרה וסימן מיוחד', true);
      return;
    }
    if (!window.confirm(`אפס את הסיסמה של ${userEmail}?`)) return;
    setResettingPasswordId(userId);
    clearUserMsg(userId);
    try {
      await authService.resetUserPassword(userId, password);
      setUserMsg(userId, `הסיסמה אופסה בהצלחה`, false);
      setNewPasswordInput({ ...newPasswordInput, [userId]: '' });
      fetchUsers();
    } catch (err: any) {
      setUserMsg(userId, err.response?.data?.error || 'שגיאה באיפוס הסיסמה', true);
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
        mobilePhone: user.mobilePhone || '',
      },
    });
    setResetMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleRoleChange = async (user: UserRecord, newRole: 'staff' | 'admin' | 'super' | 'manager') => {
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
        data.email,
        data.mobilePhone ?? null
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
              טלפון נייד <span className="text-gray-500 text-xs">(לשליחת SMS)</span>
            </label>
            <input
              type="tel"
              value={mobilePhone}
              onChange={(e) => setMobilePhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="05X-XXXXXXX"
              dir="ltr"
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
              minLength={8}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="8+ תווים, אות גדולה, ספרה, סימן מיוחד"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              תפקיד
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'staff' | 'admin' | 'super' | 'manager')}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="super">Super</option>
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
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-white">ניהול משתמשים קיימים</h2>
          <button
            type="button"
            onClick={exportUsersToExcel}
            disabled={users.length === 0}
            title="ייצא את רשימת המשתמשים לקובץ CSV הנפתח ב-Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-lg border border-emerald-500 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            ייצוא לאקסל
          </button>
        </div>
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
                      <label className="block text-xs text-gray-400 mb-1">טלפון נייד</label>
                      <input
                        type="tel"
                        value={editData[u.id]?.mobilePhone || ''}
                        onChange={(e) => setEditData({ ...editData, [u.id]: { ...editData[u.id], mobilePhone: e.target.value } })}
                        placeholder="05X-XXXXXXX"
                        dir="ltr"
                        className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">תפקיד</label>
                      <select
                        value={editData[u.id]?.role || 'staff'}
                        onChange={(e) => setEditData({ ...editData, [u.id]: { ...editData[u.id], role: e.target.value as 'staff' | 'admin' | 'super' | 'manager' } })}
                        className="w-full px-2 py-1 text-xs border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="super">Super</option>
                        <option value="admin">Admin</option>
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
                        {u.mobilePhone && (
                          <span className="text-xs text-gray-400 font-mono" dir="ltr">{u.mobilePhone}</span>
                        )}
                        {/* Inline role-change select */}
                        <div className="relative">
                          <select
                            value={u.role}
                            disabled={changingRoleId === u.id}
                            onChange={(e) => handleRoleChange(u, e.target.value as 'staff' | 'admin' | 'super' | 'manager')}
                            className={`text-xs px-2 py-0.5 rounded-full border font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-wait appearance-none pr-5
                              ${u.role === 'admin' ? 'bg-red-900/60 border-red-700 text-red-300 focus:ring-red-500' :
                                u.role === 'super' ? 'bg-purple-900/60 border-purple-700 text-purple-300 focus:ring-purple-500' :
                                u.role === 'manager' ? 'bg-green-900/60 border-green-700 text-green-300 focus:ring-green-500' :
                                'bg-blue-900/60 border-blue-700 text-blue-300 focus:ring-blue-500'}`}
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="super">Super</option>
                            <option value="admin">Admin</option>
                          </select>
                          {changingRoleId === u.id && (
                            <span className="absolute left-1 top-0.5 text-xs animate-spin">⟳</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-md"
                        >
                          ערוך
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
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <input
                            type="password"
                            placeholder="סיסמה חדשה (8+ תווים, אות גדולה, ספרה, סימן)"
                            value={newPasswordInput[u.id] || ''}
                            onChange={(e) => {
                              setNewPasswordInput({ ...newPasswordInput, [u.id]: e.target.value });
                              clearUserMsg(u.id);
                            }}
                            className={`w-full px-2 py-1 text-xs border rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              resetMessages[u.id]?.isError ? 'border-red-500' : 'border-gray-600'
                            }`}
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
                      {resetMessages[u.id] && (
                        <p className={`text-xs font-medium px-1 ${resetMessages[u.id].isError ? 'text-red-400' : 'text-green-400'}`}>
                          {resetMessages[u.id].isError ? '✗ ' : '✓ '}{resetMessages[u.id].text}
                        </p>
                      )}
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
