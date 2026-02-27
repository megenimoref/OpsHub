import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../hooks/useAuth';
import { ServiceCall } from '../types';

export const OpenCallsPage: React.FC = () => {
  const { user } = useAuthStore();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [personName, setPersonName] = useState('');
  const [battalion, setBattalion] = useState('');

  const [battalions, setBattalions] = useState<string[]>([]);
  const [openCalls, setOpenCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [selectedCall, setSelectedCall] = useState<ServiceCall | null>(null);
  const [callNotes, setCallNotes] = useState('');
  const [updatingCall, setUpdatingCall] = useState(false);

  // Load battalions and open calls on mount
  useEffect(() => {
    api.get('/battalion/list').then((res) => setBattalions(res.data.battalions || [])).catch(() => {});
    loadOpenCalls();
  }, []);

  // Set notes when call is selected
  useEffect(() => {
    if (selectedCall) {
      setCallNotes(selectedCall.notes || '');
    }
  }, [selectedCall]);

  const loadOpenCalls = async () => {
    try {
      const res = await api.get('/service-calls?status=open');
      setOpenCalls(res.data || []);
    } catch {
      setOpenCalls([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/service-calls', {
        subject,
        description,
        priority,
        personName: personName || null,
        battalion: battalion || null,
      });
      setSuccess('הקריאה נוצרה בהצלחה!');
      setSubject('');
      setDescription('');
      setPriority('medium');
      setPersonName('');
      setBattalion('');
      await loadOpenCalls();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בפתיחת הקריאה');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCall = async () => {
    if (!selectedCall) return;
    setUpdatingCall(true);
    try {
      const updated = await api.put(`/service-calls/${selectedCall.id}`, {
        notes: callNotes,
      });
      setSelectedCall(updated.data);
      setOpenCalls(openCalls.map(c => c.id === selectedCall.id ? updated.data : c));
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בעדכון הקריאה');
    } finally {
      setUpdatingCall(false);
    }
  };

  const handleCloseCall = async () => {
    if (!selectedCall) return;
    if (!window.confirm('אתה בטוח שברצונך לסגור את הקריאה?')) return;

    setUpdatingCall(true);
    try {
      const updated = await api.put(`/service-calls/${selectedCall.id}`, {
        status: 'closed',
      });
      setOpenCalls(openCalls.filter(c => c.id !== selectedCall.id));
      setSelectedCall(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בסגירת הקריאה');
    } finally {
      setUpdatingCall(false);
    }
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">קריאות שירות פתוחות</h1>

      {/* Create Call Form */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">קריאה חדשה</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">גדוד</label>
              <select
                value={battalion}
                onChange={(e) => setBattalion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              >
                <option value="">-- בחר גדוד --</option>
                {battalions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">שם החייל</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="שם החייל"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              נושא <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="תאר בקצרה את הקריאה"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              תיאור <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="פרט את הקריאה..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">עדיפות</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
            >
              <option value="low">נמוכה</option>
              <option value="medium">בינונית</option>
              <option value="high">גבוהה</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'יוצר...' : 'יצור קריאה'}
            </button>
          </div>
        </form>
      </div>

      {/* Open Calls List */}
      {openCalls.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">קריאות פתוחות ({openCalls.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openCalls.map((call) => {
              const isCallToday = isToday(call.createdAt);
              return (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`bg-gray-900 border rounded-xl p-4 hover:border-blue-500 transition-colors cursor-pointer ${
                    isCallToday ? 'border-l-4 border-l-red-500 border-gray-700' : 'border-gray-700'
                  }`}
                >
                  {isCallToday && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-red-400">קריאה של היום</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-semibold text-sm flex-1">{call.subject}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap mr-2 ${
                      call.priority === 'high' ? 'bg-red-900/40 text-red-300' :
                      call.priority === 'medium' ? 'bg-yellow-900/40 text-yellow-300' :
                      'bg-green-900/40 text-green-300'
                    }`}>
                      {call.priority === 'high' ? 'גבוהה' : call.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mb-3 line-clamp-2">{call.description}</p>
                  {call.battalion && (
                    <p className="text-gray-500 text-xs mb-1">גדוד: {call.battalion}</p>
                  )}
                  {call.personName && (
                    <p className="text-gray-500 text-xs mb-1">חייל: {call.personName}</p>
                  )}
                  <p className="text-gray-600 text-xs">
                    {new Date(call.createdAt).toLocaleDateString('he-IL')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openCalls.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">אין קריאות פתוחות כרגע</p>
        </div>
      )}

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">פרטי הקריאה</h2>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">נושא</label>
                <p className="text-white text-lg font-semibold">{selectedCall.subject}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">תיאור</label>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedCall.description}</p>
              </div>

              {selectedCall.personName && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">שם החייל</label>
                  <p className="text-gray-300">{selectedCall.personName}</p>
                </div>
              )}

              {selectedCall.battalion && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">גדוד</label>
                  <p className="text-gray-300">{selectedCall.battalion}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">עדיפות</label>
                <span className={`text-xs px-3 py-1 rounded-full ${
                  selectedCall.priority === 'high' ? 'bg-red-900/40 text-red-300' :
                  selectedCall.priority === 'medium' ? 'bg-yellow-900/40 text-yellow-300' :
                  'bg-green-900/40 text-green-300'
                }`}>
                  {selectedCall.priority === 'high' ? 'גבוהה' : selectedCall.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">תאריך יצירה</label>
                <p className="text-gray-400 text-sm">{new Date(selectedCall.createdAt).toLocaleString('he-IL')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">הערות / עדכונים</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                  placeholder="הוסף הערות או עדכונים לקריאה..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={handleUpdateCall}
                  disabled={updatingCall}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {updatingCall ? 'משדכן...' : 'עדכן קריאה'}
                </button>

                {selectedCall.createdBy === user?.id && (
                  <button
                    onClick={handleCloseCall}
                    disabled={updatingCall}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {updatingCall ? 'סוגר...' : 'סגור קריאה'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedCall(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 rounded-md text-sm font-medium"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
