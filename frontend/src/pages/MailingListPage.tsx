import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

interface Soldier {
  personal_number?: string;
  first_name?: string;
  last_name?: string;
  mobile_phone?: string;
}

interface TeamMember {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  mobilePhone?: string | null;
  role: string;
}

type RecipientSource = 'battalion' | 'team';

interface WhatsAppResult { phone: string; success: boolean; error?: string; }
interface WhatsAppBulkResponse { succeeded: number; failed: number; results: WhatsAppResult[]; }
interface SmsBulkResponse { succeeded: number; failed: number; total: number; statusDescription: string; }

interface CampaignRecord {
  id: number;
  channel: 'whatsapp' | 'sms';
  battalion: string | null;
  message_preview: string;
  recipient_count: number;
  succeeded: number;
  failed: number;
  sent_by: string;
  createdAt: string;
}

interface ChannelTotals { campaigns: number; recipients: number; succeeded: number; failed: number; }
interface StatsResponse {
  totals: { whatsapp: ChannelTotals; sms: ChannelTotals };
  recent: CampaignRecord[];
  byDay: { date: string; whatsapp: number; sms: number }[];
}

type Channel = 'whatsapp' | 'sms';

const MAX_SMS_CHARS = 268;
const INFORU_DASHBOARD = 'https://cloud.inforu.co.il/';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const MailingListPage: React.FC = () => {
  const [source, setSource] = useState<RecipientSource>('battalion');
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [loadingBattalions, setLoadingBattalions] = useState(true);
  const [loadingSoldiers, setLoadingSoldiers] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [whatsappResults, setWhatsappResults] = useState<WhatsAppBulkResponse | null>(null);
  const [smsResults, setSmsResults] = useState<SmsBulkResponse | null>(null);
  const [sendError, setSendError] = useState('');

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(() => {
    setLoadingStats(true);
    api.get<StatsResponse>('/sms/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    api.get<{ battalions: string[] }>('/battalion/list')
      .then((r) => setBattalions(r.data.battalions || []))
      .catch((err) => {
        setBattalions([]);
        setLoadError(err?.response?.data?.error || 'שגיאה בטעינת רשימת הגדודים');
      })
      .finally(() => setLoadingBattalions(false));
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (source !== 'battalion') return;
    setLoadError('');
    if (!selectedBattalion) { setSoldiers([]); setSelectedIds(new Set()); return; }
    setLoadingSoldiers(true);
    api.get<{ soldiers: Soldier[] }>(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`)
      .then((r) => {
        const list = r.data.soldiers || [];
        setSoldiers(list);
        setSelectedIds(new Set(list.map((_, i) => i)));
      })
      .catch((err) => {
        setSoldiers([]);
        setSelectedIds(new Set());
        setLoadError(err?.response?.data?.error || 'שגיאה בטעינת חיילי הגדוד');
      })
      .finally(() => setLoadingSoldiers(false));
  }, [selectedBattalion, source]);

  useEffect(() => {
    if (source !== 'team') return;
    setLoadingTeam(true);
    api.get<TeamMember[]>('/users')
      .then((r) => {
        setTeam(r.data);
        // Pre-select all team members that have phone numbers
        setSelectedIds(new Set(r.data.map((_, i) => i).filter((i) => !!r.data[i].mobilePhone)));
      })
      .catch(() => setTeam([]))
      .finally(() => setLoadingTeam(false));
  }, [source]);

  // Pick active recipient list based on source
  const items: { name: string; phone: string | null | undefined }[] =
    source === 'battalion'
      ? soldiers.map((s) => ({ name: `${s.first_name || ''} ${s.last_name || ''}`.trim(), phone: s.mobile_phone }))
      : team.map((t) => ({ name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email, phone: t.mobilePhone }));

  const toggleAll = () => setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((_, i) => i)));
  const toggleOne = (i: number) => { const n = new Set(selectedIds); n.has(i) ? n.delete(i) : n.add(i); setSelectedIds(n); };

  const selectedRecipients = items.filter((_, i) => selectedIds.has(i) && !!items[i].phone);
  const noPhone = items.filter((_, i) => selectedIds.has(i) && !items[i].phone);
  // Back-compat alias for the send-button label
  const selectedSoldiers = selectedRecipients;
  const overLimit = channel === 'sms' && message.length > MAX_SMS_CHARS;
  const clearResults = () => { setWhatsappResults(null); setSmsResults(null); setSendError(''); };

  const handleSend = async () => {
    if (!message.trim() || selectedRecipients.length === 0 || overLimit) return;
    setSending(true);
    clearResults();
    const phones = selectedRecipients.map((r) => r.phone!);
    const battalionTag = source === 'battalion' ? (selectedBattalion || undefined) : 'team';
    try {
      if (channel === 'whatsapp') {
        const { data } = await api.post<WhatsAppBulkResponse>('/whatsapp/send-bulk', { phones, message: message.trim(), battalion: battalionTag });
        setWhatsappResults(data);
      } else {
        const { data } = await api.post<SmsBulkResponse>('/sms/send-bulk', { phones, message: message.trim(), battalion: battalionTag });
        setSmsResults(data);
      }
      fetchStats();
    } catch (err: any) {
      setSendError(err.response?.data?.error || 'שגיאה בשליחת הודעות');
    } finally {
      setSending(false);
    }
  };

  const succeeded = whatsappResults?.succeeded ?? smsResults?.succeeded ?? 0;
  const failed = whatsappResults?.failed ?? smsResults?.failed ?? 0;
  const hasResults = !!(whatsappResults || smsResults);

  const totalCampaigns = (stats?.totals.whatsapp.campaigns ?? 0) + (stats?.totals.sms.campaigns ?? 0);
  const totalSucceeded = (stats?.totals.whatsapp.succeeded ?? 0) + (stats?.totals.sms.succeeded ?? 0);
  const totalRecipients = (stats?.totals.whatsapp.recipients ?? 0) + (stats?.totals.sms.recipients ?? 0);
  const successRate = totalRecipients > 0 ? Math.round((totalSucceeded / totalRecipients) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-white">שליחה לרשימת תפוצה</h1>

      {/* ── Send form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recipients */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <h2 className="font-semibold text-gray-300 mb-3">בחר נמענים</h2>

          {/* Source toggle: Battalion / Team */}
          <div className="flex gap-2 mb-4">
            {(['battalion', 'team'] as RecipientSource[]).map((s) => (
              <button
                key={s}
                onClick={() => { setSource(s); setSelectedIds(new Set()); clearResults(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  source === s
                    ? 'bg-indigo-700 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {s === 'battalion' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  )}
                </svg>
                {s === 'battalion' ? 'גדוד' : 'חברי צוות'}
              </button>
            ))}
          </div>

          {source === 'battalion' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">גדוד</label>
              {loadingBattalions ? (
                <p className="text-sm text-gray-400">טוען גדודים...</p>
              ) : (
                <select
                  value={selectedBattalion}
                  onChange={(e) => setSelectedBattalion(e.target.value)}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                >
                  <option value="">-- בחר גדוד --</option>
                  {battalions.map((b) => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
                </select>
              )}
            </div>
          )}

          {source === 'battalion' && loadingSoldiers && <p className="text-sm text-gray-400">טוען חיילים...</p>}
          {source === 'team' && loadingTeam && <p className="text-sm text-gray-400">טוען חברי צוות...</p>}
          {loadError && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 mb-2">{loadError}</div>
          )}
          {source === 'battalion' && !loadingSoldiers && !loadError && selectedBattalion && soldiers.length === 0 && (
            <p className="text-sm text-gray-500">אין חיילים בגדוד זה</p>
          )}

          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{selectedIds.size} נבחרו מתוך {items.length}</span>
                <button onClick={toggleAll} className="text-xs text-blue-400 hover:underline">
                  {selectedIds.size === items.length ? 'בטל הכל' : 'בחר הכל'}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg divide-y divide-gray-700">
                {items.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.has(i)} onChange={() => toggleOne(i)} className="accent-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.name || '—'}</p>
                      {item.phone
                        ? <p className="text-xs text-gray-500 font-mono" dir="ltr">{item.phone}</p>
                        : <p className="text-xs text-red-400">אין מספר טלפון</p>}
                    </div>
                  </label>
                ))}
              </div>
              {noPhone.length > 0 && (
                <p className="text-xs text-orange-500 mt-2">{noPhone.length} נמענים ללא מספר טלפון יוחרגו</p>
              )}
            </>
          )}

          {source === 'team' && !loadingTeam && team.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">אין חברי צוות להצגה</p>
          )}
        </div>

        {/* Right: Message + channel */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 flex flex-col">
          <h2 className="font-semibold text-gray-300 mb-3">הודעה</h2>

          {/* Channel toggle */}
          <div className="flex gap-2 mb-4">
            {(['whatsapp', 'sms'] as Channel[]).map((ch) => (
              <button
                key={ch}
                onClick={() => { setChannel(ch); clearResults(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  channel === ch
                    ? ch === 'whatsapp' ? 'bg-green-700 border-green-500 text-white' : 'bg-blue-700 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                {ch === 'whatsapp' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                )}
                {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב את ההודעה כאן..."
            rows={7}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none mb-3 bg-gray-700 text-white placeholder-gray-400 ${
              overLimit ? 'border-red-500 focus:ring-red-500'
              : channel === 'sms' ? 'border-blue-600 focus:ring-blue-500'
              : 'border-gray-600 focus:ring-green-500'
            }`}
          />

          <div className="text-sm text-gray-400 mb-4 bg-gray-800 rounded-lg px-3 py-2 space-y-1">
            <p>נמענים עם טלפון: <strong className="text-white">{selectedSoldiers.length}</strong></p>
            <div className="flex items-center justify-between">
              <p>
                תווים: <strong className={overLimit ? 'text-red-400' : 'text-white'}>{message.length}</strong>
                {channel === 'sms' && <span className={`text-xs mr-1 ${overLimit ? 'text-red-400' : 'text-gray-500'}`}>/ {MAX_SMS_CHARS}</span>}
              </p>
              {overLimit && <span className="text-xs text-red-400 font-medium">חריגה מגבול SMS</span>}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={selectedSoldiers.length === 0 || !message.trim() || sending || overLimit}
            className={`w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl transition-colors text-base text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              channel === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {channel === 'whatsapp' ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
            )}
            {sending ? 'שולח...' : `שלח ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} (${selectedSoldiers.length})`}
          </button>

          {sendError && (
            <div className="mt-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">{sendError}</div>
          )}
          <p className="text-xs text-gray-500 mt-3 text-center">
            {channel === 'whatsapp' ? 'ההודעות נשלחות דרך WhatsApp API' : 'ההודעות נשלחות דרך Inforu SMS'}
          </p>
        </div>
      </div>

      {/* ── Send results ── */}
      {hasResults && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-semibold text-white">תוצאות שליחה</h2>
            {channel === 'sms' && (
              <a href={INFORU_DASHBOARD} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                פתח קמפיין ב-Inforu
              </a>
            )}
          </div>

          <div className="flex gap-4 mb-4">
            {[
              { label: 'נשלחו בהצלחה', value: succeeded, color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/50' },
              { label: 'נכשלו', value: failed, color: failed > 0 ? 'text-red-400' : 'text-gray-400', bg: failed > 0 ? 'bg-red-900/30 border-red-700/50' : 'bg-gray-800 border-gray-700' },
              { label: 'סה"כ', value: succeeded + failed, color: 'text-gray-300', bg: 'bg-gray-800 border-gray-700' },
            ].map((c) => (
              <div key={c.label} className={`flex-1 rounded-lg p-3 text-center border ${c.bg}`}>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {whatsappResults && whatsappResults.results.length > 0 && (
            <div className="border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-56 overflow-y-auto">
              {whatsappResults.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-300 font-mono">{r.phone}</span>
                  {r.success ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                      נשלח
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400" title={r.error}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      נכשל
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {smsResults && (
            <p className="text-xs text-gray-400 text-center mt-2">
              {smsResults.statusDescription ? `סטטוס Inforu: ${smsResults.statusDescription}` : 'SMS נשלחו — לפירוט נוסף פתח את לוח הבקרה של Inforu'}
            </p>
          )}
        </div>
      )}

      {/* ── Statistics ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">סטטיסטיקות שליחות</h2>
          {loadingStats && <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"/>}
        </div>

        {stats && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'קמפיינים', value: totalCampaigns, color: 'text-cyan-400' },
                { label: 'הודעות שנשלחו', value: totalSucceeded.toLocaleString(), color: 'text-green-400' },
                { label: 'נמענים כולל', value: totalRecipients.toLocaleString(), color: 'text-blue-400' },
                { label: 'שיעור הצלחה', value: `${successRate}%`, color: successRate >= 80 ? 'text-green-400' : successRate >= 50 ? 'text-yellow-400' : 'text-red-400' },
              ].map((k) => (
                <div key={k.label} className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            {/* WhatsApp vs SMS breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {(['whatsapp', 'sms'] as Channel[]).map((ch) => {
                const t = stats.totals[ch];
                const rate = t.recipients > 0 ? Math.round((t.succeeded / t.recipients) * 100) : 0;
                return (
                  <div key={ch} className={`rounded-lg p-4 border ${ch === 'whatsapp' ? 'bg-green-900/20 border-green-800/50' : 'bg-blue-900/20 border-blue-800/50'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {ch === 'whatsapp' ? (
                        <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                        </svg>
                      )}
                      <span className={`text-sm font-semibold ${ch === 'whatsapp' ? 'text-green-300' : 'text-blue-300'}`}>
                        {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div><p className="text-lg font-bold text-white">{t.campaigns}</p><p className="text-xs text-gray-400">קמפיינים</p></div>
                      <div><p className="text-lg font-bold text-white">{t.succeeded}</p><p className="text-xs text-gray-400">נשלחו</p></div>
                      <div><p className="text-lg font-bold text-white">{t.recipients}</p><p className="text-xs text-gray-400">נמענים</p></div>
                      <div>
                        <p className={`text-lg font-bold ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}%</p>
                        <p className="text-xs text-gray-400">הצלחה</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By-day chart */}
            {stats.byDay.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-3">שליחות מוצלחות לפי יום (30 יום אחרונים)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byDay} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => v.slice(5)}/>
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#d1d5db' }}/>
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}/>
                    <Bar dataKey="whatsapp" name="WhatsApp" fill="#22c55e" radius={[3,3,0,0]}/>
                    <Bar dataKey="sms" name="SMS" fill="#3b82f6" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent campaigns table */}
            {stats.recent.length > 0 && (
              <>
                <p className="text-sm text-gray-400 mb-3">קמפיינים אחרונים</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="border-b border-gray-700 text-xs text-gray-400">
                        <th className="py-2 px-3">תאריך</th>
                        <th className="py-2 px-3">ערוץ</th>
                        <th className="py-2 px-3">גדוד</th>
                        <th className="py-2 px-3">הודעה</th>
                        <th className="py-2 px-3">נמענים</th>
                        <th className="py-2 px-3">נשלחו</th>
                        <th className="py-2 px-3">נכשלו</th>
                        <th className="py-2 px-3">שלח</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent.map((c) => (
                        <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                          <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.channel === 'whatsapp' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                              {c.channel === 'whatsapp' ? 'WA' : 'SMS'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-300 text-xs">{c.battalion || '—'}</td>
                          <td className="py-2 px-3 text-gray-300 text-xs max-w-[180px] truncate" title={c.message_preview}>{c.message_preview}</td>
                          <td className="py-2 px-3 text-gray-300 text-center">{c.recipient_count}</td>
                          <td className="py-2 px-3 text-green-400 text-center font-medium">{c.succeeded}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={c.failed > 0 ? 'text-red-400 font-medium' : 'text-gray-500'}>{c.failed}</span>
                          </td>
                          <td className="py-2 px-3 text-gray-400 text-xs truncate max-w-[100px]">{c.sent_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {stats.recent.length === 0 && !loadingStats && (
              <p className="text-gray-500 text-sm text-center py-6">אין קמפיינים עדיין — שלח את הראשון!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
