import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

interface SpouseRow {
  personal_number: string;
  first_name: string;
  last_name: string;
  spouse: string;
  spouse_phone: string;
}

interface ContactRecord {
  id?: number;
  battalion: string;
  personal_number: string;
  soldier_name: string;
  spouse_name: string;
  spouse_phone: string;
  contact_by: number | null;
  notes: string;
  call_summary: string;
}

interface SystemUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export const CommunityPage: React.FC = () => {
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [spouses, setSpouses] = useState<SpouseRow[]>([]);
  const [contacts, setContacts] = useState<Record<string, ContactRecord>>({});
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/battalion/list').then((r) => setBattalions(r.data)).catch(() => {});
    api.get('/community/users').then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBattalion) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/community/spouses/${encodeURIComponent(selectedBattalion)}`),
      api.get(`/community/contacts?battalion=${encodeURIComponent(selectedBattalion)}`),
    ])
      .then(([spousesRes, contactsRes]) => {
        setSpouses(spousesRes.data);
        const map: Record<string, ContactRecord> = {};
        for (const c of contactsRes.data) {
          map[c.personal_number] = c;
        }
        setContacts(map);
      })
      .catch(() => setError('שגיאה בטעינת הנתונים'))
      .finally(() => setLoading(false));
  }, [selectedBattalion]);

  const getContact = (row: SpouseRow): ContactRecord => ({
    battalion: selectedBattalion,
    personal_number: row.personal_number,
    soldier_name: `${row.last_name} ${row.first_name}`,
    spouse_name: row.spouse,
    spouse_phone: row.spouse_phone,
    contact_by: null,
    notes: '',
    call_summary: '',
    ...contacts[row.personal_number],
  });

  const handleChange = useCallback(
    async (row: SpouseRow, field: keyof ContactRecord, value: string | number | null) => {
      const current = getContact(row);
      const updated = { ...current, [field]: value };

      setContacts((prev) => ({ ...prev, [row.personal_number]: updated }));
      setSaving((prev) => ({ ...prev, [row.personal_number]: true }));

      try {
        const res = await api.put('/community/contacts', updated);
        setContacts((prev) => ({ ...prev, [row.personal_number]: res.data }));
      } catch {
        // keep local state on error
      } finally {
        setSaving((prev) => ({ ...prev, [row.personal_number]: false }));
      }
    },
    [contacts, selectedBattalion]
  );

  const userName = (id: number | null) => {
    if (!id) return '';
    const u = users.find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-cyan-300">קהילה — נשות המילואים</h1>
        <p className="text-sm text-gray-400 mt-1">מעקב קשר עם בנות/בני הזוג של לוחמי המילואים</p>
      </div>

      {/* Battalion selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-300 whitespace-nowrap">בחר גדוד:</label>
        <select
          value={selectedBattalion}
          onChange={(e) => setSelectedBattalion(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500 min-w-[180px]"
        >
          <option value="">-- בחר גדוד --</option>
          {battalions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {selectedBattalion && !loading && (
          <span className="text-xs text-gray-500">{spouses.length} בני/בנות זוג</span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          טוען נתונים...
        </div>
      )}

      {!loading && selectedBattalion && spouses.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>אין נתוני בני/בנות זוג בגדוד זה</p>
        </div>
      )}

      {!loading && spouses.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/80 border-b border-gray-700">
                <th className="text-right py-3 px-4 font-semibold text-gray-300 whitespace-nowrap">שם החייל</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300 whitespace-nowrap">שם בן/בת הזוג</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300 whitespace-nowrap">טלפון</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300 whitespace-nowrap">מי פנתה מהצוות</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300 whitespace-nowrap">הערות</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300 whitespace-nowrap">סיכום שיחה</th>
                <th className="py-3 px-4 w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/40">
              {spouses.map((row) => {
                const c = getContact(row);
                const isSaving = saving[row.personal_number];
                return (
                  <tr key={row.personal_number} className="hover:bg-gray-800/40 transition-colors group">
                    <td className="py-3 px-4 text-gray-200 whitespace-nowrap">
                      {row.last_name} {row.first_name}
                    </td>
                    <td className="py-3 px-4 text-gray-200 whitespace-nowrap">{row.spouse}</td>
                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap font-mono text-xs">{row.spouse_phone}</td>

                    {/* מי פנתה */}
                    <td className="py-2 px-3">
                      <select
                        value={c.contact_by ?? ''}
                        onChange={(e) => handleChange(row, 'contact_by', e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 min-w-[120px]"
                      >
                        <option value="">-- בחר --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* הערות */}
                    <td className="py-2 px-3">
                      <textarea
                        value={c.notes}
                        onChange={(e) => setContacts((prev) => ({
                          ...prev,
                          [row.personal_number]: { ...getContact(row), notes: e.target.value },
                        }))}
                        onBlur={(e) => handleChange(row, 'notes', e.target.value)}
                        rows={2}
                        placeholder="הערות..."
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 resize-none min-w-[150px]"
                      />
                    </td>

                    {/* סיכום שיחה */}
                    <td className="py-2 px-3">
                      <textarea
                        value={c.call_summary}
                        onChange={(e) => setContacts((prev) => ({
                          ...prev,
                          [row.personal_number]: { ...getContact(row), call_summary: e.target.value },
                        }))}
                        onBlur={(e) => handleChange(row, 'call_summary', e.target.value)}
                        rows={2}
                        placeholder="סיכום שיחה..."
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 resize-none min-w-[180px]"
                      />
                    </td>

                    {/* saving indicator */}
                    <td className="py-2 px-2 w-6 text-center">
                      {isSaving && (
                        <svg className="animate-spin w-3 h-3 text-cyan-400 mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
