import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface SoldierChange {
  id: number;
  soldier_id: number;
  soldier_name: string;
  field_name: string;
  field_label: string;
  old_value: string;
  new_value: string;
  changed_at: string;
}

interface Soldier {
  id: number;
  personal_number: string;
  last_name: string;
  first_name: string;
  mobile_phone: string;
  request_status: string;
  marital_status: string;
  children_count: string;
  student_indicator: string;
  spouse: string;
  spouse_phone: string;
  data_indicators: string;
  contact_by: string;
  contact_date: string;
  contact_with: string;
  employment_status: string;
  welfare_fund: string;
  national_insurance: string;
  other_assistance: string;
  applications_needed: string;
  notes: string;
}

const TODAY = new Date().toISOString().split('T')[0];

const FIELD_LABELS: { key: keyof Soldier; label: string; multiline?: boolean; options?: string[]; datePicker?: boolean }[] = [
  { key: 'personal_number', label: 'מספר אישי' },
  { key: 'last_name', label: 'שם משפחה' },
  { key: 'first_name', label: 'שם פרטי' },
  { key: 'mobile_phone', label: 'טלפון נייד' },
  { key: 'request_status', label: 'סטטוס פנייה' },
  { key: 'marital_status', label: 'מצב משפחתי' },
  { key: 'children_count', label: 'מספר ילדים' },
  { key: 'student_indicator', label: 'אינדיקציית סטודנט' },
  { key: 'spouse', label: 'בן/בת זוג' },
  { key: 'spouse_phone', label: 'טלפון בן/בת זוג' },
  { key: 'data_indicators', label: 'אינדיקציות מהנתונים', multiline: true },
  { key: 'contact_by', label: 'מי יצרה קשר' },
  { key: 'contact_date', label: 'תאריך קשר', datePicker: true },
  { key: 'contact_with', label: 'מול מי נוצר קשר' },
  { key: 'employment_status', label: 'סטטוס תעסוקתי' },
  { key: 'welfare_fund', label: 'קרן סיוע', multiline: true },
  { key: 'national_insurance', label: 'ביטוח לאומי' },
  { key: 'other_assistance', label: 'סיוע אחר', multiline: true },
  { key: 'applications_needed', label: 'בקשות להגשה', multiline: true },
  { key: 'notes', label: 'פירוט/הערות', multiline: true },
];

export const BattalionSoldierPage: React.FC = () => {
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [formData, setFormData] = useState<Partial<Soldier>>({});
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [changes, setChanges] = useState<SoldierChange[]>([]);

  useEffect(() => {
    api.get('/battalion/list').then((res) => {
      setBattalions(res.data.battalions || []);
    });
  }, []);

  const fetchChanges = async (battalion: string, soldierId: number) => {
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(battalion)}/soldiers/${soldierId}/changes`);
      setChanges(res.data.changes || []);
    } catch {
      setChanges([]);
    }
  };

  const handleSearch = async () => {
    if (!selectedBattalion || !personalNumber.trim()) return;
    setSearching(true);
    setSearchError('');
    setSoldier(null);
    setChanges([]);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers/search`, {
        params: { personal_number: personalNumber.trim() },
      });
      setSoldier(res.data.soldier);
      setFormData({
        ...res.data.soldier,
        contact_date: res.data.soldier.contact_date || TODAY,
      });
      fetchChanges(selectedBattalion, res.data.soldier.id);
    } catch (err: any) {
      setSearchError(err.response?.data?.error || 'חייל לא נמצא');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!soldier || !selectedBattalion) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      await api.put(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers/${soldier.id}`, formData);
      setSoldier(null);
      setFormData({});
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof Soldier, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">חיפוש ועריכת חייל</h1>

      {/* Search bar */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          {/* Battalion select */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">גדוד</label>
            <select
              value={selectedBattalion}
              onChange={(e) => { setSelectedBattalion(e.target.value); setSoldier(null); setSearchError(''); }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">-- בחר גדוד --</option>
              {battalions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Personal number input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">מספר אישי</label>
            <input
              type="text"
              value={personalNumber}
              onChange={(e) => setPersonalNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="הקלד מספר אישי..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={searching || !selectedBattalion || !personalNumber.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {searching ? 'מחפש...' : 'חפש'}
          </button>
        </div>

        {searchError && (
          <div className="mt-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">
            {searchError}
          </div>
        )}
      </div>

      {/* Soldier form */}
      {soldier && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-white">
              {soldier.first_name} {soldier.last_name}
              <span className="text-sm font-normal text-gray-400 mr-2">({soldier.personal_number})</span>
            </h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-900/40 border border-green-700 rounded-lg text-sm text-green-300">
              הנתונים נשמרו בהצלחה
            </div>
          )}
          {saveError && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELD_LABELS.map(({ key, label, multiline, options, datePicker }) => (
              <div key={key} className={multiline ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                {datePicker ? (
                  <input
                    type="date"
                    value={(formData[key] as string) || TODAY}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                ) : options ? (
                  <select
                    value={(formData[key] as string) || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">-- בחר --</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : multiline ? (
                  <textarea
                    value={(formData[key] as string) || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={(formData[key] as string) || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      )}

      {/* Change history */}
      {soldier && changes.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">היסטוריית שינויים</h3>
          <div className="space-y-3">
            {changes.map((change) => (
              <div key={change.id} className="flex items-start justify-between bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex-1">
                  <span className="text-sm font-medium text-cyan-300">{change.soldier_name}</span>
                  <span className="text-gray-400 text-sm mx-2">—</span>
                  <span className="text-sm text-yellow-300">{change.field_label}</span>
                  <div className="mt-1 text-xs text-gray-400">
                    <span className="text-red-400 line-through">{change.old_value || '(ריק)'}</span>
                    <span className="mx-2">←</span>
                    <span className="text-green-400">{change.new_value || '(ריק)'}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap mr-4">
                  {new Date(change.changed_at).toLocaleDateString('he-IL')}
                  {' '}
                  {new Date(change.changed_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
