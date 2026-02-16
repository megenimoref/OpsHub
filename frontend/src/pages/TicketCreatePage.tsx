import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Person {
  id: number;
  firstName: string;
  lastName: string;
}

export const TicketCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');

  const [soldiers, setSoldiers] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load battalions on mount
  useEffect(() => {
    api.get('/people/battalions').then((res) => setBattalions(res.data)).catch(() => {});
  }, []);

  // Load soldiers when battalion changes
  useEffect(() => {
    if (!selectedBattalion) {
      setSoldiers([]);
      setSelectedPersonId('');
      return;
    }
    api
      .get('/people', { params: { battalion: selectedBattalion, limit: 200 } })
      .then((res) => setSoldiers(res.data.data))
      .catch(() => {});
    setSelectedPersonId('');
  }, [selectedBattalion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const person = soldiers.find((p) => String(p.id) === selectedPersonId);
      await api.post('/tickets', {
        subject,
        description,
        priority,
        battalion: selectedBattalion || null,
        personId: selectedPersonId ? Number(selectedPersonId) : null,
        personName: person ? `${person.firstName} ${person.lastName}` : null,
      });
      navigate('/people');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בפתיחת הקריאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">פתח קריאת שירות</h1>
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">גדוד</label>
            <select
              value={selectedBattalion}
              onChange={(e) => setSelectedBattalion(e.target.value)}
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
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              disabled={!selectedBattalion}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white disabled:bg-gray-800 disabled:text-gray-500"
            >
              <option value="">-- בחר חייל --</option>
              {soldiers.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            {selectedBattalion && soldiers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">אין חיילים בגדוד זה</p>
            )}
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
              placeholder="תאר בקצרה את הבעיה"
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
              rows={5}
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder="פרט את הבעיה..."
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
              {loading ? 'שולח...' : 'פתח קריאה'}
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
    </div>
  );
};
