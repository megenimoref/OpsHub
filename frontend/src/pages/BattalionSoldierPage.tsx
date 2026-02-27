import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { authService } from '../services/authService';

interface SoldierChange {
  id: number;
  soldier_id: number;
  soldier_name: string;
  field_name: string;
  field_label: string;
  old_value: string;
  new_value: string;
  changed_by: string | null;
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

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'טופלה', label: 'טופלה', color: '#22c55e' },
  { value: 'חייל לא זמין', label: 'חייל לא זמין', color: '#eab308' },
  { value: 'חייל ממתין לתשובה', label: 'חייל ממתין לתשובה', color: '#ef4444' },
  { value: 'ממתין לטיפול', label: 'ממתין לטיפול', color: '#67e8f9' },
  { value: 'נדרש סיוע של ביטוח לאומי', label: 'נדרש סיוע של ביטוח לאומי', color: '#f97316' },
  { value: 'נדרש סיוע של עורך דין', label: 'נדרש סיוע של עורך דין', color: '#f472b6' },
  { value: 'אין מספר טלפון', label: 'אין מספר טלפון', color: '#6366f1' },
];

const getStatusColor = (status: string): string => {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || '#9ca3af';
};

interface FieldDef {
  key: keyof Soldier;
  label: string;
  multiline?: boolean;
  options?: string[];
  datePicker?: boolean;
  statusSelect?: boolean;
  userSelect?: boolean;
  selectWithDetail?: { options: string[]; detailOn: string[] };
}

const FIELD_LABELS: FieldDef[] = [
  { key: 'personal_number', label: 'מספר אישי' },
  { key: 'last_name', label: 'שם משפחה' },
  { key: 'first_name', label: 'שם פרטי' },
  { key: 'mobile_phone', label: 'טלפון נייד' },
  { key: 'request_status', label: 'סטטוס פנייה', statusSelect: true },
  { key: 'marital_status', label: 'מצב משפחתי', options: ['רווק', 'נשוי', 'גרוש'] },
  { key: 'children_count', label: 'מספר ילדים', options: ['0','1','2','3','4','5','6','7','8','9','10','11','12'] },
  { key: 'student_indicator', label: 'אינדיקציית סטודנט', options: ['כן', 'לא'] },
  { key: 'spouse', label: 'בן/בת זוג' },
  { key: 'spouse_phone', label: 'טלפון בן/בת זוג' },
  { key: 'data_indicators', label: 'אינדיקציות מהנתונים', multiline: true },
  { key: 'contact_by', label: 'מי יצרה קשר', userSelect: true },
  { key: 'contact_date', label: 'תאריך קשר', datePicker: true },
  { key: 'contact_with', label: 'מול מי נוצר קשר', selectWithDetail: { options: ['החייל', 'קרוב'], detailOn: ['קרוב'] } },
  { key: 'employment_status', label: 'סטטוס תעסוקתי', selectWithDetail: { options: ['עצמאי', 'שכיר', 'אחר'], detailOn: ['אחר'] } },
  { key: 'welfare_fund', label: 'קרן סיוע', multiline: true },
  { key: 'national_insurance', label: 'ביטוח לאומי', selectWithDetail: { options: ['לא נדרש', 'נדרש'], detailOn: ['נדרש'] } },
  { key: 'other_assistance', label: 'סיוע אחר', multiline: true },
  { key: 'applications_needed', label: 'בקשות להגשה', multiline: true },
  { key: 'notes', label: 'פירוט/הערות', multiline: true },
];

function parseSelectWithDetail(value: string, options: string[]): { selected: string; detail: string } {
  if (!value) return { selected: '', detail: '' };
  for (const opt of options) {
    if (value === opt) return { selected: opt, detail: '' };
    if (value.startsWith(opt + ' - ')) return { selected: opt, detail: value.slice(opt.length + 3) };
  }
  return { selected: '', detail: value };
}

function buildSelectWithDetail(selected: string, detail: string): string {
  if (!selected) return '';
  if (!detail.trim()) return selected;
  return `${selected} - ${detail.trim()}`;
}

interface SystemUser {
  id: number;
  firstName: string;
  lastName: string;
}

interface SoldierOption {
  id: number;
  name: string;
  personal_number: string;
}

export const BattalionSoldierPage: React.FC = () => {
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [searchName, setSearchName] = useState('');
  const [soldierSuggestions, setSoldierSuggestions] = useState<SoldierOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [formData, setFormData] = useState<Partial<Soldier>>({});
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [changes, setChanges] = useState<SoldierChange[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    api.get('/battalion/list').then((res) => {
      setBattalions(res.data.battalions || []);
    });
    api.get('/users').then((res) => {
      setSystemUsers(res.data || []);
    }).catch(() => {});
  }, []);

  const fetchChanges = async (battalion: string, soldierId: number) => {
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(battalion)}/soldiers/${soldierId}/changes`);
      setChanges(res.data.changes || []);
    } catch {
      setChanges([]);
    }
  };

  const handleSearchNameChange = async (value: string) => {
    setSearchName(value);
    if (!selectedBattalion || !value.trim()) {
      setSoldierSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await api.get(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers/search`, {
        params: { name: value.trim() },
      });
      const soldier = res.data.soldier;
      if (soldier) {
        setSoldierSuggestions([
          {
            id: soldier.id,
            name: `${soldier.first_name} ${soldier.last_name}`,
            personal_number: soldier.personal_number,
          },
        ]);
        setShowSuggestions(true);
      } else {
        setSoldierSuggestions([]);
      }
    } catch {
      setSoldierSuggestions([]);
    }
  };

  const selectSoldier = async (selectedSoldier: SoldierOption) => {
    setSearching(true);
    setSearchError('');
    setSoldier(null);
    setChanges([]);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers/search`, {
        params: { name: selectedSoldier.name },
      });
      const user = authService.getStoredUser();
      const userName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : '';
      setSoldier(res.data.soldier);
      setFormData({
        ...res.data.soldier,
        contact_date: res.data.soldier.contact_date || TODAY,
        contact_by: res.data.soldier.contact_by || userName,
      });
      setSearchName(selectedSoldier.name);
      setShowSuggestions(false);
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
      setSaveSuccess(true);
      fetchChanges(selectedBattalion, soldier.id);
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
        <div className="flex flex-col gap-3">
          {/* Battalion select */}
          <div className="w-full">
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

          {/* Name input with autocomplete */}
          <div className="w-full relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">שם החייל</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => handleSearchNameChange(e.target.value)}
              onFocus={() => searchName && showSuggestions && setSoldierSuggestions(soldierSuggestions)}
              placeholder="הקלד שם פרטי או משפחה..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={!selectedBattalion}
            />

            {/* Autocomplete suggestions */}
            {showSuggestions && soldierSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
                {soldierSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    onClick={() => selectSoldier(suggestion)}
                    className="px-3 py-2 text-white cursor-pointer hover:bg-gray-600 border-b border-gray-600 last:border-b-0 text-sm"
                  >
                    <div className="font-semibold">{suggestion.name}</div>
                    <div className="text-xs text-gray-400">מספר אישי: {suggestion.personal_number}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            {FIELD_LABELS.map(({ key, label, multiline, options, datePicker, statusSelect, userSelect, selectWithDetail }) => {
              const fieldChanges = changes.filter((c) => c.field_name === key);
              const parsed = selectWithDetail ? parseSelectWithDetail((formData[key] as string) || '', selectWithDetail.options) : null;
              return (
                <div key={key} className={multiline ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                  {statusSelect ? (
                    <div className="relative">
                      <span
                        className="absolute top-1/2 -translate-y-1/2 right-3 w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStatusColor((formData[key] as string) || '') }}
                      />
                      <select
                        value={(formData[key] as string) || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full px-3 pr-8 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">-- בחר סטטוס --</option>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : userSelect ? (
                    <select
                      value={(formData[key] as string) || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- בחר משתמש --</option>
                      {systemUsers.map((u) => {
                        const fullName = `${u.firstName} ${u.lastName}`.trim();
                        return (
                          <option key={u.id} value={fullName}>
                            {fullName}
                          </option>
                        );
                      })}
                    </select>
                  ) : datePicker ? (
                    <input
                      type="date"
                      value={(formData[key] as string) || TODAY}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  ) : selectWithDetail && parsed ? (
                    <div className="space-y-2">
                      <select
                        value={parsed.selected}
                        onChange={(e) => {
                          const newSelected = e.target.value;
                          handleChange(key, buildSelectWithDetail(newSelected, selectWithDetail.detailOn.includes(newSelected) ? parsed.detail : ''));
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">-- בחר --</option>
                        {selectWithDetail.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {parsed.selected && selectWithDetail.detailOn.includes(parsed.selected) && (
                        <input
                          type="text"
                          value={parsed.detail}
                          onChange={(e) => handleChange(key, buildSelectWithDetail(parsed.selected, e.target.value))}
                          placeholder="פרט..."
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      )}
                    </div>
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
                  {fieldChanges.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {fieldChanges.map((change) => (
                        <div key={change.id} className="flex items-center justify-between bg-gray-800/60 rounded px-2 py-1 border border-gray-700/50 text-xs">
                          <div className="flex items-center gap-2">
                            {change.changed_by && (
                              <span className="text-cyan-400 font-medium">{change.changed_by}</span>
                            )}
                            <span className="text-red-400 line-through">{change.old_value || '(ריק)'}</span>
                            <span className="text-gray-500">←</span>
                            <span className="text-green-400">{change.new_value || '(ריק)'}</span>
                          </div>
                          <span className="text-gray-500 whitespace-nowrap mr-2">
                            {new Date(change.changed_at).toLocaleDateString('he-IL')}{' '}
                            {new Date(change.changed_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
    </div>
  );
};
