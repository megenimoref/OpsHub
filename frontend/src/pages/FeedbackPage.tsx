import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../hooks/useAuth';

interface FeedbackItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  category: 'bug' | 'improvement' | 'feature' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'reviewed' | 'in_progress' | 'done' | 'rejected';
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 באג',
  improvement: '⚡ שיפור',
  feature: '✨ פיצ\'ר חדש',
  other: '💬 אחר',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'חדש',
  reviewed: 'נסקר',
  in_progress: 'בטיפול',
  done: 'טופל',
  rejected: 'נדחה',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300',
  medium: 'bg-yellow-900/60 text-yellow-300',
  high: 'bg-red-900/60 text-red-300',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-900/60 text-blue-300',
  reviewed: 'bg-indigo-900/60 text-indigo-300',
  in_progress: 'bg-yellow-900/60 text-yellow-300',
  done: 'bg-green-900/60 text-green-300',
  rejected: 'bg-red-900/60 text-red-300',
};

const emptyForm = { title: '', description: '', category: 'improvement' as const, priority: 'medium' as const };

export const FeedbackPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super';

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  // Admin note editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ feedbacks: FeedbackItem[] }>('/feedback');
      setFeedbacks(data.feedbacks);
    } catch {
      setError('שגיאה בטעינת המשובים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/feedback', form);
      setForm(emptyForm);
      setShowForm(false);
      setSuccess('המשוב נשלח בהצלחה!');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch {
      setError('שגיאה בשליחת המשוב');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSave = async (id: number) => {
    try {
      await api.put(`/feedback/${id}`, { status: editStatus, adminNote: editNote });
      setEditingId(null);
      load();
    } catch {
      setError('שגיאה בעדכון');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('למחוק משוב זה?')) return;
    try {
      await api.delete(`/feedback/${id}`);
      load();
    } catch {
      setError('שגיאה במחיקה');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">משוב ושיפורים</h1>
          <p className="text-gray-400 text-sm">
            {isAdmin ? 'צפייה בכל המשובים מהצוות' : 'שתף הצעות לשיפור המערכת'}
          </p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? 'ביטול' : '+ משוב חדש'}
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-900/40 border border-green-700 text-green-300 rounded-lg text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* New feedback form */}
      {showForm && !isAdmin && (
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">משוב חדש</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">כותרת *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="תאר בקצרה את הבקשה..."
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">תיאור מפורט *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="פרט את הבעיה או ההצעה..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">קטגוריה</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="improvement">⚡ שיפור</option>
                  <option value="feature">✨ פיצ׳ר חדש</option>
                  <option value="bug">🐛 באג</option>
                  <option value="other">💬 אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">עדיפות</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={submitting || !form.title.trim() || !form.description.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'שולח...' : 'שלח משוב'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback table */}
      <div className="bg-gray-900 rounded-xl border border-gray-700">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">אין משובים עדיין</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-gray-400 text-xs border-b border-gray-700">
                  {isAdmin && <th className="py-3 px-3 font-medium">שם</th>}
                  <th className="py-3 px-3 font-medium">כותרת</th>
                  <th className="py-3 px-3 font-medium">קטגוריה</th>
                  <th className="py-3 px-3 font-medium">עדיפות</th>
                  <th className="py-3 px-3 font-medium">סטטוס</th>
                  <th className="py-3 px-3 font-medium">תאריך</th>
                  <th className="py-3 px-3 font-medium">הערת מנהל</th>
                  {isAdmin && <th className="py-3 px-3 font-medium text-center">פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((f) => (
                  <React.Fragment key={f.id}>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      {isAdmin && (
                        <td className="py-3 px-3 text-gray-200 whitespace-nowrap">{f.userName}</td>
                      )}
                      <td className="py-3 px-3">
                        <div className="text-gray-200 font-medium">{f.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5 max-w-xs truncate">{f.description}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-300 whitespace-nowrap">{CATEGORY_LABELS[f.category]}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[f.priority]}`}>
                          {PRIORITY_LABELS[f.priority]}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>
                          {STATUS_LABELS[f.status]}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(f.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs max-w-xs">
                        {f.adminNote || '—'}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => {
                                setEditingId(editingId === f.id ? null : f.id);
                                setEditStatus(f.status);
                                setEditNote(f.adminNote || '');
                              }}
                              className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs transition-colors"
                            >
                              עדכן
                            </button>
                            <button
                              onClick={() => handleDelete(f.id)}
                              className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors"
                            >
                              מחק
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Admin edit row */}
                    {isAdmin && editingId === f.id && (
                      <tr className="bg-gray-800/60 border-b border-gray-700">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex items-start gap-4">
                            <div>
                              <label className="block text-gray-400 text-xs mb-1">סטטוס</label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="new">חדש</option>
                                <option value="reviewed">נסקר</option>
                                <option value="in_progress">בטיפול</option>
                                <option value="done">טופל</option>
                                <option value="rejected">נדחה</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-gray-400 text-xs mb-1">הערת מנהל</label>
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="הוסף הערה..."
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex gap-2 pt-4">
                              <button
                                onClick={() => handleAdminSave(f.id)}
                                className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs transition-colors"
                              >
                                שמור
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                              >
                                ביטול
                              </button>
                            </div>
                          </div>
                          {/* Full description */}
                          <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                            <p className="text-gray-400 text-xs mb-1">תיאור מלא:</p>
                            <p className="text-gray-200 text-xs whitespace-pre-wrap">{f.description}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
