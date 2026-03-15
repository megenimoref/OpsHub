import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const BattalionCreatePage: React.FC = () => {
  const [battalionNumber, setBattalionNumber] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [battalions, setBattalions] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBattalions = async () => {
    try {
      const res = await api.get<{ battalions: string[] }>('/battalion/list');
      setBattalions(res.data.battalions);
    } catch {}
  };

  useEffect(() => { fetchBattalions(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/battalion/${encodeURIComponent(deleteTarget)}`);
      setSuccess(`גדוד "${deleteTarget}" נמחק בהצלחה`);
      setDeleteTarget(null);
      fetchBattalions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה במחיקת הגדוד');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setBattalionNumber(val);
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!battalionNumber) {
      setError('יש להזין מספר גדוד');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post<{ success: boolean; message: string }>('/battalion/create', {
        battalionName: battalionNumber,
      });
      setSuccess(res.data.message);
      setBattalionNumber('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת הגדוד');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">הוספת גדוד</h1>
        <p className="text-gray-400 text-sm">יצירת בסיס נתונים חדש לגדוד</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-700 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">מספר הגדוד</label>
            <input
              type="text"
              inputMode="numeric"
              value={battalionNumber}
              onChange={handleInputChange}
              placeholder="לדוגמה: 101"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-right bg-gray-700 text-white placeholder-gray-400 text-lg"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">ספרות בלבד</p>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 font-medium">✓ {success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !battalionNumber}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'יוצר...' : 'צור גדוד'}
          </button>
        </form>
      </div>

      {/* Battalions list */}
      {battalions.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">גדודים קיימים</h2>
          <div className="space-y-2">
            {battalions.map((b) => (
              <div key={b} className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <span className="text-white font-medium">גדוד {b}</span>
                <button
                  onClick={() => { setDeleteTarget(b); setError(''); setSuccess(''); }}
                  className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-200 text-xs rounded-md"
                >
                  מחק
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" dir="rtl">
          <div className="bg-gray-900 border border-red-700 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 text-center">אישור מחיקת גדוד</h2>
            <p className="text-gray-300 text-center mb-2">
              האם אתה בטוח שאתה רוצה למחוק את גדוד{' '}
              <span className="font-bold text-red-400">{deleteTarget}</span>?
            </p>
            <p className="text-red-400 text-xs text-center mb-6">פעולה זו תמחק את כל נתוני הגדוד ולא ניתן לשחזר!</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 border border-gray-600 text-gray-200 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'מוחק...' : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" dir="rtl">
          <div className="bg-gray-900 border border-cyan-700 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 text-center">אישור יצירת גדוד</h2>
            <p className="text-gray-300 text-center mb-6">
              האם אתה בטוח שאתה רוצה ליצור גדוד{' '}
              <span className="font-bold text-cyan-300">{battalionNumber}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-gray-600 text-gray-200 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors"
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
