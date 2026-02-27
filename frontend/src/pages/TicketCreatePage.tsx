import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Person {
  id: number;
  firstName: string;
  lastName: string;
}

interface Ticket {
  id: number;
  subject: string;
  description: string;
  priority: string;
  battalion?: string;
  personName?: string;
  createdAt: string;
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
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [ticketSuccess, setTicketSuccess] = useState('');

  // Load battalions and user's tickets on mount
  useEffect(() => {
    api.get('/battalion/list').then((res) => setBattalions(res.data.battalions || [])).catch(() => {});
    loadMyTickets();
  }, []);

  const loadMyTickets = async () => {
    try {
      const res = await api.get('/tickets?myTickets=true');
      setMyTickets(res.data || []);
    } catch {
      setMyTickets([]);
    }
  };

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
    setTicketSuccess('');
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
      setTicketSuccess('הקריאה נפתחה בהצלחה!');
      setSubject('');
      setDescription('');
      setPriority('medium');
      setSelectedBattalion('');
      setSelectedPersonId('');
      setSoldiers([]);
      await loadMyTickets();
      setTimeout(() => setTicketSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בפתיחת הקריאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">פתח קריאת שירות</h1>
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        {ticketSuccess && (
          <div className="mb-4 p-3 bg-green-900/40 border border-green-700 text-green-300 rounded-md text-sm">
            {ticketSuccess}
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

      {/* My Tickets */}
      {myTickets.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">קריאותיי</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTickets.map((ticket) => (
              <div key={ticket.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-blue-500 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold text-sm flex-1">{ticket.subject}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap mr-2 ${
                    ticket.priority === 'high' ? 'bg-red-900/40 text-red-300' :
                    ticket.priority === 'medium' ? 'bg-yellow-900/40 text-yellow-300' :
                    'bg-green-900/40 text-green-300'
                  }`}>
                    {ticket.priority === 'high' ? 'גבוהה' : ticket.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">{ticket.description}</p>
                {ticket.battalion && (
                  <p className="text-gray-500 text-xs mb-1">גדוד: {ticket.battalion}</p>
                )}
                {ticket.personName && (
                  <p className="text-gray-500 text-xs mb-1">חייל: {ticket.personName}</p>
                )}
                <p className="text-gray-600 text-xs">
                  {new Date(ticket.createdAt).toLocaleDateString('he-IL')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
