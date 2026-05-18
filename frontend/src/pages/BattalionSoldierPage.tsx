import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/authService';
import { useAuthStore } from '../hooks/useAuth';
import RightsCalculatorPanel from '../components/RightsCalculatorPanel';

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
  // Family
  marital_status: string;
  spouse: string;
  spouse_phone: string;
  has_children: string;
  children_count: string;
  children_ages: string;
  summer_camp: string;
  household_assistance: string;
  birth_grant: string;
  birth_assistance: string;
  divorced_assistance: string;
  special_family_status: string;
  spouse_call_doc: string;
  whatsapp_battalion: string;
  whatsapp_family: string;
  // Education
  student_indicator: string;
  spouse_student: string;
  private_lessons: string;
  study_grants: string;
  // Employment
  employment_status: string;
  spouse_employment_status: string;
  income_loss: string;
  // Welfare fund / needs
  welfare_fund: string;
  pet: string;
  route_6: string;
  resilience_couples: string;
  resilience_treatment: string;
  repairs: string;
  moving_assistance: string;
  personal_equipment: string;
  complex_problems: string;
  fighter: string;
  vacation_break: string;
  vacation_compensation: string;
  flight_compensation: string;
  // Reserve duty
  reserve_days_2025: string;
  reserve_days_2026: string;
  mobilization_dates: string;
  current_rotation: string;
  // Rights
  national_insurance: string;
  income_tax: string;
  legal_advice: string;
  nonprofit_assistance: string;
  aid_fund_submission: string;
  other_assistance: string;
  applications_needed: string;
  // Contact & follow-up
  data_indicators: string;
  contact_by: string;
  contact_date: string;
  contact_with: string;
  notes: string;
  followup_1: string;
  followup_2: string;
  // Misc
  age: string;
  platoon: string;
  command_role: string;
  professional: string;
}

const TODAY = new Date().toISOString().split('T')[0];

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'טופלה', label: 'טופלה', color: '#22c55e' },
  { value: 'חייל לא זמין', label: 'חייל לא זמין', color: '#eab308' },
  { value: 'חייל ממתין לתשובה', label: 'חייל ממתין לתשובה', color: '#ef4444' },
  { value: 'חייל ביקש שיחזרו אליו', label: 'חייל ביקש שיחזרו אליו', color: '#0ea5e9' },
  { value: 'ממתין לטיפול', label: 'ממתין לטיפול', color: '#67e8f9' },
  { value: 'נדרש סיוע של ביטוח לאומי', label: 'נדרש סיוע של ביטוח לאומי', color: '#f97316' },
  { value: 'נדרש סיוע של עורך דין', label: 'נדרש סיוע של עורך דין', color: '#f472b6' },
  { value: 'אין מספר טלפון', label: 'אין מספר טלפון', color: '#6366f1' },
  { value: 'נדרש סיוע חוסן', label: 'נדרש סיוע חוסן', color: '#83579a' },
];

const getStatusColor = (status: string): string =>
  STATUS_OPTIONS.find((s) => s.value === status)?.color || '#9ca3af';

interface FieldDef {
  key: keyof Soldier;
  label: string;
  required?: boolean;
  multiline?: boolean;
  options?: string[];
  datePicker?: boolean;
  statusSelect?: boolean;
  userSelect?: boolean;
  selectWithDetail?: { options: string[]; detailOn: string[] };
  yesNo?: boolean; // renders כן/לא select
  placeholder?: string;
  showIf?: (fd: Partial<Soldier>) => boolean;
}

interface SectionDef {
  key: string;
  title: string;
  emoji: string;
  color: string; // tailwind border-left color class
  fields: FieldDef[];
  defaultOpen?: boolean;
}

const MARITAL_OPTIONS = ['נשוי/נשואה', 'רווק/רווקה', 'אלמן/אלמנה', 'גרוש/גרושה', 'בזוגיות', 'אחר'];
const isMarried = (v: string) => v === 'נשוי/נשואה' || v === 'בזוגיות';
const isDivorced = (v: string) => v === 'גרוש/גרושה';

const SECTIONS: SectionDef[] = [
  {
    key: 'personal',
    title: 'פרטים אישיים',
    emoji: '🪪',
    color: 'border-indigo-500',
    defaultOpen: true,
    fields: [
      { key: 'personal_number', label: 'מספר אישי' },
      { key: 'last_name', label: 'שם משפחה' },
      { key: 'first_name', label: 'שם פרטי' },
      { key: 'mobile_phone', label: 'טלפון נייד' },
      { key: 'marital_status', label: 'מצב משפחתי', required: true, options: MARITAL_OPTIONS },
      { key: 'spouse', label: 'שם בן/בת זוג', showIf: (fd) => isMarried(fd.marital_status || ''), selectWithDetail: { options: ['כן', 'לא'], detailOn: ['כן'] } },
      { key: 'spouse_phone', label: 'טלפון בן/בת זוג', showIf: (fd) => isMarried(fd.marital_status || ''), selectWithDetail: { options: ['כן', 'לא'], detailOn: ['כן'] } },
      { key: 'children_count', label: 'מספר ילדים', options: ['0','1','2','3','4','5','6','7','8','9','10','11','12'] },
    ],
  },
  {
    key: 'family',
    title: 'משפחה',
    emoji: '👨‍👩‍👧',
    color: 'border-orange-500',
    fields: [
      { key: 'has_children', label: 'ילדים', yesNo: true },
      { key: 'children_ages', label: 'גילאי ילדים', showIf: (fd) => fd.has_children === 'כן', placeholder: 'לדוגמה: 3, 4, 5' },
      { key: 'birth_assistance', label: 'לידה (לפני/אחרי/צריכים)', multiline: true },
      { key: 'special_family_status', label: 'סטטוס מיוחד משפחתי' },
      { key: 'spouse_call_doc', label: 'תיעוד שיחה בת זוג/אמא', multiline: true },
      { key: 'whatsapp_battalion', label: 'WhatsApp גדודי ופלוגתי' },
      { key: 'whatsapp_family', label: 'WhatsApp משפחה גדודי' },
    ],
  },
  {
    key: 'employment',
    title: 'מצב תעסוקתי',
    emoji: '💼',
    color: 'border-blue-500',
    fields: [
      { key: 'employment_status', label: 'סטטוס תעסוקתי של החייל', selectWithDetail: { options: ['עצמאי', 'שכיר', 'מובטל', 'אחר'], detailOn: ['אחר'] } },
      { key: 'student_indicator', label: 'סטודנט', yesNo: true },
      { key: 'spouse_student', label: 'האם בת הזוג סטודנטית', yesNo: true },
      { key: 'private_lessons', label: 'שיעורים פרטיים', multiline: true },
      { key: 'study_grants', label: 'מענקים / החזר שכר לימוד', multiline: true },
      { key: 'income_loss', label: 'אובדן הכנסה', multiline: true },
    ],
  },
  {
    key: 'welfare',
    title: 'קרן הסיוע',
    emoji: '🤝',
    color: 'border-yellow-500',
    fields: [
      { key: 'welfare_fund', label: 'קרן הסיוע', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'summer_camp', label: 'קייטנות', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'household_assistance', label: 'בייביסיטר', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'birth_grant', label: 'מענק לידה', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'pet', label: 'כלב / בעל חיים', selectWithDetail: { options: ['יש', 'אין'], detailOn: ['יש'] } },
      { key: 'route_6', label: 'כביש 6', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'resilience_couples', label: 'חוסן רגשי זוגי / עמית', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'repairs', label: 'תיקונים', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'moving_assistance', label: 'מעבר דירה', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'personal_equipment', label: 'ציוד אישי', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'fighter', label: 'פייטר', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'vacation_break', label: 'שובר חופשה', options: ['נדרש', 'לא נדרש', 'הגיש כבר'] },
      { key: 'vacation_compensation', label: 'פיצוי חופשות', options: ['פיצוי חופשות', 'מרכז חייהם בחו"ל'] },
    ],
  },
  {
    key: 'reserve',
    title: 'מילואים',
    emoji: '🪖',
    color: 'border-green-500',
    fields: [
      { key: 'reserve_days_2025', label: 'ימי מילואים 2025' },
      { key: 'reserve_days_2026', label: 'ימי מילואים 2026' },
      { key: 'mobilization_dates', label: 'תאריכי גיוס/סבבים', multiline: true },
      { key: 'current_rotation', label: 'סבב נוכחי' },
    ],
  },
  {
    key: 'professional_advice',
    title: 'ייעוץ מקצועי',
    emoji: '⚖️',
    color: 'border-red-500',
    fields: [
      { key: 'national_insurance', label: 'ביטוח לאומי', selectWithDetail: { options: ['לא נדרש', 'נדרש', 'אחר'], detailOn: ['נדרש', 'אחר'] } },
      { key: 'income_tax', label: 'מס הכנסה', multiline: true },
      { key: 'legal_advice', label: 'ייעוץ משפטי', multiline: true },
    ],
  },
  {
    key: 'other',
    title: 'אחר',
    emoji: '📎',
    color: 'border-gray-400',
    fields: [
      { key: 'nonprofit_assistance', label: 'סיוע מעמותות', multiline: true },
      { key: 'aid_fund_submission', label: 'מה החייל הגיש לקרן הסיוע', multiline: true },
      { key: 'other_assistance', label: 'סיוע אחר', multiline: true },
      { key: 'applications_needed', label: 'בקשות להגשה', multiline: true },
      { key: 'notes', label: 'פירוט / הערות', multiline: true },
    ],
  },
  {
    key: 'contact',
    title: 'טיפול ומעקב',
    emoji: '📋',
    color: 'border-cyan-500',
    defaultOpen: true,
    fields: [
      { key: 'request_status', label: 'סטטוס פנייה', required: true, statusSelect: true },
      { key: 'contact_by', label: 'מי יצרה קשר', userSelect: true },
      { key: 'contact_date', label: 'תאריך קשר', datePicker: true },
      { key: 'contact_with', label: 'מול מי נוצר קשר', selectWithDetail: { options: ['החייל', 'קרוב'], detailOn: ['קרוב'] } },
      { key: 'data_indicators', label: 'אינדיקציות מהנתונים', multiline: true },
      { key: 'followup_1', label: 'מעקב 1', multiline: true },
      { key: 'followup_2', label: 'מעקב 2', multiline: true },
    ],
  },
  {
    key: 'general',
    title: 'כללי',
    emoji: '📌',
    color: 'border-gray-500',
    fields: [
      { key: 'age', label: 'גיל' },
      { key: 'platoon', label: 'מחלקה' },
      { key: 'command_role', label: 'תפקיד פיקודי', options: ['ללא', 'מג"ד', 'סמג"ד', 'מ"פ', 'סמ"פ', 'מ"מ'] },
      { key: 'professional', label: 'איש מקצוע' },
    ],
  },
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

interface SystemUser { id: number; firstName: string; lastName: string; }
interface SoldierOption { id: number; name: string; personal_number: string; battalionName?: string; }

interface BattalionSoldierPageProps {
  embedded?: boolean;
  initialBattalion?: string;
  initialPersonalNumber?: string;
  onSave?: (personalNumber: string, requestStatus: string) => void;
}

export const BattalionSoldierPage: React.FC<BattalionSoldierPageProps> = ({
  embedded = false,
  initialBattalion,
  initialPersonalNumber,
  onSave,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const readOnly = user?.role === 'manager';
  const hidePN = user?.hidePersonalNumber === true;
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [searchPersonalNumber, setSearchPersonalNumber] = useState('');
  const [soldierSuggestions, setSoldierSuggestions] = useState<SoldierOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [formData, setFormData] = useState<Partial<Soldier>>({});
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof Soldier, string>>>({});
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [changes, setChanges] = useState<SoldierChange[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [pendingDraft, setPendingDraft] = useState<{ data: Partial<Soldier>; savedAt: string } | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(SECTIONS.filter((s) => s.defaultOpen).map((s) => s.key))
  );
  const draftKeyRef = useRef<string | null>(null);
  const isDraftPendingRef = useRef(false);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getDraftKey = (battalion: string, personalNumber: string) =>
    `opshub_draft_${battalion}_${personalNumber}`;

  useEffect(() => {
    if (!soldier || !draftKeyRef.current || isDraftPendingRef.current) return;
    const hasChanges = Object.keys(formData).some(
      (k) => String((formData as any)[k] ?? '') !== String((soldier as any)[k] ?? '')
    );
    if (hasChanges) {
      localStorage.setItem(draftKeyRef.current, JSON.stringify({ data: formData, savedAt: new Date().toISOString() }));
    }
  }, [formData]);

  const afterSoldierLoad = (battalion: string, soldierData: Soldier, fd: Partial<Soldier>) => {
    setSoldier(soldierData);
    setFormData(fd);
    const key = getDraftKey(battalion, soldierData.personal_number);
    draftKeyRef.current = key;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const { data, savedAt } = JSON.parse(raw);
        setPendingDraft({ data, savedAt });
        isDraftPendingRef.current = true;
      } catch {
        localStorage.removeItem(key);
        setPendingDraft(null);
        isDraftPendingRef.current = false;
      }
    } else {
      setPendingDraft(null);
      isDraftPendingRef.current = false;
    }
  };

  const restoreDraft = () => { if (!pendingDraft) return; setFormData(pendingDraft.data); setPendingDraft(null); isDraftPendingRef.current = false; };
  const discardDraft = () => { if (draftKeyRef.current) localStorage.removeItem(draftKeyRef.current); setPendingDraft(null); isDraftPendingRef.current = false; };

  useEffect(() => {
    api.get('/battalion/list').then((res) => setBattalions(res.data.battalions || []));
    api.get('/users').then((res) => setSystemUsers(res.data || [])).catch(() => {});
    const urlParams = new URLSearchParams(window.location.search);
    const battalionParam = urlParams.get('battalion');
    const personalNumberParam = urlParams.get('personal_number');
    if (battalionParam && personalNumberParam) {
      setSelectedBattalion(battalionParam);
      setSearchPersonalNumber(personalNumberParam);
      setSearching(true);
      setSearchError('');
      api.get(`/battalion/${encodeURIComponent(battalionParam)}/soldiers/search`, { params: { personal_number: personalNumberParam } })
        .then((res) => {
          const u = authService.getStoredUser();
          const userName = u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : '';
          const fd = { ...res.data.soldier, contact_date: res.data.soldier.contact_date || TODAY, contact_by: res.data.soldier.contact_by || userName };
          afterSoldierLoad(battalionParam, res.data.soldier, fd);
          fetchChanges(battalionParam, res.data.soldier.id);
        }).catch((err: any) => setSearchError(err.response?.data?.error || 'חייל לא נמצא'))
        .finally(() => setSearching(false));
    }
  }, []);

  useEffect(() => {
    if (!initialBattalion || !initialPersonalNumber) return;
    setSelectedBattalion(initialBattalion);
    setSearchPersonalNumber(initialPersonalNumber);
    setSoldier(null); setSearchError(''); setSaveSuccess(false); setSaveError(''); setSearching(true);
    api.get(`/battalion/${encodeURIComponent(initialBattalion)}/soldiers/search`, { params: { personal_number: initialPersonalNumber } })
      .then((res) => {
        const u = authService.getStoredUser();
        const userName = u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : '';
        const fd = { ...res.data.soldier, contact_date: res.data.soldier.contact_date || TODAY, contact_by: res.data.soldier.contact_by || userName };
        afterSoldierLoad(initialBattalion, res.data.soldier, fd);
        fetchChanges(initialBattalion, res.data.soldier.id);
      }).catch((err: any) => setSearchError(err.response?.data?.error || 'חייל לא נמצא'))
      .finally(() => setSearching(false));
  }, [initialBattalion, initialPersonalNumber]);

  const fetchChanges = async (battalion: string, soldierId: number) => {
    try {
      const res = await api.get(`/battalion/${encodeURIComponent(battalion)}/soldiers/${soldierId}/changes`);
      setChanges(res.data.changes || []);
    } catch { setChanges([]); }
  };

  const handleSearchPersonalNumberChange = async (value: string) => {
    setSearchPersonalNumber(value);
    if (!value.trim()) { setSoldierSuggestions([]); setShowSuggestions(false); return; }
    try {
      if (selectedBattalion) {
        const res = await api.get(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers/search`, { params: { personal_number: value.trim() } });
        if (res.data.soldier) {
          const s = res.data.soldier;
          setSoldierSuggestions([{ id: s.id, name: `${s.first_name} ${s.last_name}`, personal_number: s.personal_number }]);
          setShowSuggestions(true);
        } else { setSoldierSuggestions([]); }
      } else {
        const res = await api.get('/battalion/search-global', { params: { personal_number: value.trim() } });
        if (res.data.soldier) {
          const s = res.data.soldier;
          setSoldierSuggestions([{ id: s.id, name: `${s.first_name} ${s.last_name}`, personal_number: s.personal_number, battalionName: res.data.battalionName }]);
          setShowSuggestions(true);
        } else { setSoldierSuggestions([]); }
      }
    } catch { setSoldierSuggestions([]); }
  };

  const selectSoldier = async (selectedSoldier: SoldierOption) => {
    setSearching(true); setSearchError(''); setSoldier(null); setChanges([]); setSaveSuccess(false); setSaveError('');
    try {
      const battalion = selectedSoldier.battalionName || selectedBattalion;
      if (selectedSoldier.battalionName) setSelectedBattalion(selectedSoldier.battalionName);
      const res = await api.get(`/battalion/${encodeURIComponent(battalion)}/soldiers/search`, { params: { personal_number: selectedSoldier.personal_number } });
      const u = authService.getStoredUser();
      const userName = u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : '';
      const fd = { ...res.data.soldier, contact_date: res.data.soldier.contact_date || TODAY, contact_by: res.data.soldier.contact_by || userName };
      afterSoldierLoad(battalion, res.data.soldier, fd);
      setSearchPersonalNumber(selectedSoldier.personal_number);
      setShowSuggestions(false);
      fetchChanges(battalion, res.data.soldier.id);
    } catch (err: any) {
      setSearchError(err.response?.data?.error || 'חייל לא נמצא');
    } finally { setSearching(false); }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof Soldier, string>> = {};
    // Required fields
    if (!formData.marital_status) errors.marital_status = 'שדה חובה';
    if (!formData.request_status) errors.request_status = 'שדה חובה';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      // Open sections that contain errors
      const sectionsToOpen = new Set(openSections);
      for (const section of SECTIONS) {
        if (section.fields.some((f) => errors[f.key])) sectionsToOpen.add(section.key);
      }
      setOpenSections(sectionsToOpen);
    }
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!soldier || !selectedBattalion) return;
    if (!validate()) return;
    setSaving(true); setSaveSuccess(false); setSaveError('');
    try {
      await api.put(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers/${soldier.id}`, formData);
      if (draftKeyRef.current) localStorage.removeItem(draftKeyRef.current);
      setPendingDraft(null); isDraftPendingRef.current = false;
      setSaveSuccess(true);
      onSave?.(soldier.personal_number, (formData.request_status as string) || '');
      localStorage.setItem('soldier_status_update', JSON.stringify({ personalNumber: soldier.personal_number, status: (formData.request_status as string) || '', ts: Date.now() }));
      fetchChanges(selectedBattalion, soldier.id);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'שגיאה בשמירה');
    } finally { setSaving(false); }
  };

  const handleChange = (key: keyof Soldier, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    if (validationErrors[key]) setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleOpenCall = () => {
    if (!soldier) return;
    sessionStorage.setItem('newCallData', JSON.stringify({ personName: `${soldier.first_name} ${soldier.last_name}`, battalion: selectedBattalion }));
    navigate('/open-calls');
  };

  // Reminder logic
  const maritalVal = (formData.marital_status || '').trim();
  const showSpousePhoneReminder = isMarried(maritalVal) && !!(formData.spouse) && !(formData.spouse_phone || '').trim();
  const showDivorcedReminder = isDivorced(maritalVal);

  const renderField = (field: FieldDef) => {
    const { key, label, required, multiline, options, datePicker, statusSelect, userSelect, selectWithDetail, yesNo, placeholder, showIf } = field;
    if (showIf && !showIf(formData as Partial<Soldier>)) return null;
    const fieldChanges = changes.filter((c) => c.field_name === key);
    const parsed = selectWithDetail ? parseSelectWithDetail((formData[key] as string) || '', selectWithDetail.options) : null;
    const hasError = !!validationErrors[key];

    return (
      <div key={key} className={multiline ? 'sm:col-span-2' : ''}>
        <label className={`block text-xs font-medium mb-1 ${hasError ? 'text-red-400' : 'text-gray-400'}`}>
          {label}{required && <span className="text-red-400 mr-1">*</span>}
        </label>
        {statusSelect ? (
          <div className="relative">
            <span className="absolute top-1/2 -translate-y-1/2 right-3 w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor((formData[key] as string) || '') }} />
            <select value={(formData[key] as string) || ''} onChange={(e) => handleChange(key, e.target.value)} disabled={readOnly}
              className={`w-full px-3 pr-8 py-2 bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-600'} text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed`}>
              <option value="">-- בחר סטטוס --</option>
              {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        ) : userSelect ? (
          <select value={(formData[key] as string) || ''} onChange={(e) => handleChange(key, e.target.value)} disabled={readOnly}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed">
            <option value="">-- בחר משתמש --</option>
            {(() => { const cur = (formData[key] as string) || ''; const all = systemUsers.map((u) => `${u.firstName} ${u.lastName}`.trim()); return cur && !all.includes(cur) ? <option key="_imported" value={cur}>{cur}</option> : null; })()}
            {systemUsers.map((u) => { const fn = `${u.firstName} ${u.lastName}`.trim(); return <option key={u.id} value={fn}>{fn}</option>; })}
          </select>
        ) : datePicker ? (
          <input type="date" value={(formData[key] as string) || TODAY} onChange={(e) => handleChange(key, e.target.value)} disabled={readOnly}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed" />
        ) : yesNo ? (
          <select value={(formData[key] as string) || ''} onChange={(e) => handleChange(key, e.target.value)} disabled={readOnly}
            className={`w-full px-3 py-2 bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-600'} text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed`}>
            <option value="">-- בחר --</option>
            <option value="כן">כן</option>
            <option value="לא">לא</option>
          </select>
        ) : selectWithDetail && parsed ? (
          <div className="space-y-2">
            <select value={parsed.selected} onChange={(e) => { const s = e.target.value; handleChange(key, buildSelectWithDetail(s, selectWithDetail.detailOn.includes(s) ? parsed.detail : '')); }} disabled={readOnly}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              <option value="">-- בחר --</option>
              {selectWithDetail.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {parsed.selected && selectWithDetail.detailOn.includes(parsed.selected) && (
              <input type="text" value={parsed.detail} onChange={(e) => handleChange(key, buildSelectWithDetail(parsed.selected, e.target.value))} placeholder="פרט..." disabled={readOnly}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed" />
            )}
          </div>
        ) : options ? (
          <select value={(formData[key] as string) || ''} onChange={(e) => handleChange(key, e.target.value)} disabled={readOnly}
            className={`w-full px-3 py-2 bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-600'} text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed`}>
            <option value="">-- בחר --</option>
            {(() => { const cur = (formData[key] as string) || ''; return cur && !options.includes(cur) ? <option key="_imported" value={cur}>{cur}</option> : null; })()}
            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : multiline ? (
          <textarea value={(formData[key] as string) || ''} onChange={(e) => handleChange(key, e.target.value)} rows={3} disabled={readOnly}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:opacity-60 disabled:cursor-not-allowed" />
        ) : (
          <input type="text" value={(formData[key] as string) || ''} onChange={(e) => handleChange(key, e.target.value)} disabled={readOnly} placeholder={placeholder}
            className={`w-full px-3 py-2 bg-gray-700 border ${hasError ? 'border-red-500' : 'border-gray-600'} text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60 disabled:cursor-not-allowed`} />
        )}
        {hasError && <p className="mt-1 text-xs text-red-400">{validationErrors[key]}</p>}
        {fieldChanges.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {fieldChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between bg-gray-800/60 rounded px-2 py-1 border border-gray-700/50 text-xs">
                <div className="flex items-center gap-2">
                  {change.changed_by && <span className="text-cyan-400 font-medium">{change.changed_by}</span>}
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
  };

  return (
    <div className={embedded ? 'w-full' : 'p-6 max-w-4xl mx-auto'} dir="rtl">
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white">{readOnly ? 'צפייה בכרטיס חייל' : 'חיפוש ועריכת חייל'}</h1>
          {readOnly && <span className="text-xs px-2 py-1 bg-blue-900/60 border border-blue-700 text-blue-300 rounded-full">מצב צפייה בלבד</span>}
        </div>
      )}

      {/* Search bar */}
      {!readOnly && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 mb-6">
          <div className="flex flex-col gap-3">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-300 mb-1">גדוד</label>
              <select value={selectedBattalion} onChange={(e) => { setSelectedBattalion(e.target.value); setSoldier(null); setSearchError(''); }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                <option value="">-- בחר גדוד --</option>
                {battalions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className={`w-full relative${hidePN ? ' hidden' : ''}`}>
              <label className="block text-sm font-medium text-gray-300 mb-1">מספר אישי</label>
              <input type="text" value={searchPersonalNumber} onChange={(e) => handleSearchPersonalNumberChange(e.target.value)}
                onFocus={() => searchPersonalNumber && showSuggestions && setSoldierSuggestions(soldierSuggestions)}
                placeholder={selectedBattalion ? 'הקלד מספר אישי...' : 'הקלד מספר אישי (יחפש בכל הגדודים)...'}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
              {showSuggestions && soldierSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
                  {soldierSuggestions.map((s) => (
                    <div key={s.id} onClick={() => selectSoldier(s)} className="px-3 py-2 text-white cursor-pointer hover:bg-gray-600 border-b border-gray-600 last:border-b-0 text-sm">
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-gray-400">מספר אישי: {s.personal_number}</div>
                      {s.battalionName && <div className="text-xs text-indigo-400">גדוד: {s.battalionName}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {searchError && <div className="mt-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">{searchError}</div>}
        </div>
      )}

      {/* WhatsApp modal */}
      {whatsappOpen && soldier && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setWhatsappOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">שלח WhatsApp</h3>
                <p className="text-gray-400 text-xs">{soldier.first_name} {soldier.last_name} — {soldier.mobile_phone || 'אין טלפון'}</p>
              </div>
              <button onClick={() => setWhatsappOpen(false)} className="mr-auto text-gray-500 hover:text-white transition-colors">✕</button>
            </div>
            <textarea value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} placeholder="כתוב את ההודעה כאן..." rows={4}
              className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none mb-3" />
            {user?.phone && <p className="text-xs text-gray-500 mb-3">יתווסף אוטומטית: <span className="text-gray-400">לפרטים נוספים או לעזרה נא לפנות למספר {user.phone}</span></p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setWhatsappOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">ביטול</button>
              <button disabled={!soldier.mobile_phone || !whatsappMessage.trim()}
                onClick={() => {
                  const suffix = user?.phone ? `\n\nלפרטים נוספים או לעזרה נא לפנות למספר ${user.phone}` : '';
                  const phone = soldier.mobile_phone.replace(/\D/g, '').replace(/^0/, '972');
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage.trim() + suffix)}`, '_blank');
                  setWhatsappOpen(false); setWhatsappMessage('');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                שלח
              </button>
            </div>
          </div>
        </div>
      )}

      {soldier && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main card */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {soldier.first_name} {soldier.last_name}
                    {!hidePN && <span className="text-sm font-normal text-gray-400 mr-2">({soldier.personal_number})</span>}
                  </h2>
                  {soldier.platoon && <p className="text-xs text-gray-500 mt-0.5">מחלקה {soldier.platoon}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setWhatsappMessage(''); setWhatsappOpen(true); }} title="שלח WhatsApp"
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                  {!readOnly && (
                    <button onClick={handleSave} disabled={saving}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                      {saving ? 'שומר...' : 'שמור שינויים'}
                    </button>
                  )}
                </div>
              </div>

              {/* Reminder banners */}
              {showDivorcedReminder && (
                <div className="mt-3 p-3 bg-amber-900/40 border border-amber-600 rounded-lg text-sm text-amber-300 flex items-start gap-2">
                  <span className="text-lg leading-none">⚠️</span>
                  <span>החייל גרוש — יש לקבל שם ומספר טלפון של גרושתו כדי להסביר לה על <strong>הזכויות המגיעות לה</strong>.</span>
                </div>
              )}
              {showSpousePhoneReminder && (
                <div className="mt-3 p-3 bg-blue-900/40 border border-blue-600 rounded-lg text-sm text-blue-300 flex items-start gap-2">
                  <span className="text-lg leading-none">📲</span>
                  <span>חסר מספר טלפון של בת הזוג — יש לשלוח לחייל <strong>לינק לקבוצת נשות המילואים</strong> להעביר לבת הזוג.</span>
                </div>
              )}

              {/* Draft / save banners */}
              {pendingDraft && (
                <div className="mt-3 p-3 bg-amber-900/40 border border-amber-600 rounded-lg flex items-center justify-between gap-3 text-sm">
                  <span className="text-amber-300">⚠️ נמצאו שינויים שלא נשמרו מ-{new Date(pendingDraft.savedAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} — האם לשחזר?</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={restoreDraft} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors">שחזר שינויים</button>
                    <button onClick={discardDraft} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs font-medium transition-colors">התעלם</button>
                  </div>
                </div>
              )}
              {saveSuccess && <div className="mt-3 p-3 bg-green-900/40 border border-green-700 rounded-lg text-sm text-green-300">הנתונים נשמרו בהצלחה</div>}
              {saveError && <div className="mt-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">{saveError}</div>}
              {Object.keys(validationErrors).length > 0 && (
                <div className="mt-3 p-3 bg-red-900/40 border border-red-600 rounded-lg text-sm text-red-300">
                  יש למלא את כל שדות החובה המסומנים ב-<span className="text-red-400 font-bold">*</span> לפני השמירה.
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {SECTIONS.map((section) => {
                const isOpen = openSections.has(section.key);
                const sectionFields = section.fields.filter((f) => !(hidePN && f.key === 'personal_number') && (!f.showIf || f.showIf(formData as Partial<Soldier>)));
                const filledCount = sectionFields.filter((f) => !!(formData[f.key] as string || '').trim()).length;
                const hasRequired = sectionFields.some((f) => f.required);
                const hasSectionErrors = sectionFields.some((f) => validationErrors[f.key]);

                return (
                  <div key={section.key} className={`bg-gray-900 rounded-xl border ${hasSectionErrors ? 'border-red-700' : 'border-gray-700'} overflow-hidden`}>
                    <button onClick={() => toggleSection(section.key)} className="w-full flex items-center justify-between px-5 py-3.5 text-right hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-1 h-6 rounded-full ${section.color.replace('border-', 'bg-')}`} />
                        <span className="text-base">{section.emoji}</span>
                        <span className="font-semibold text-white text-sm">{section.title}</span>
                        {hasRequired && !isOpen && <span className="text-red-400 text-xs">*</span>}
                        {hasSectionErrors && <span className="text-xs px-2 py-0.5 bg-red-900/60 border border-red-700 text-red-300 rounded-full">יש שדות חובה</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {filledCount > 0 && !isOpen && (
                          <span className="text-xs text-gray-500">{filledCount} שדות מלאים</span>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-gray-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          {section.fields
                            .filter((f) => !(hidePN && f.key === 'personal_number'))
                            .map((f) => renderField(f))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <div className="mt-5 flex justify-end">
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                  {saving ? 'שומר...' : 'שמור שינויים'}
                </button>
              </div>
            )}
          </div>

          {/* Rights calculator sidebar */}
          <div className="w-full lg:w-72 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-4 rounded-xl p-4" style={{ background: '#0a0a0c', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 2px 20px rgba(0,0,0,0.4)' }}>
              <RightsCalculatorPanel soldier={formData as any} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
