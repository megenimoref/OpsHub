import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Soldier {
  personal_number?: string;
  first_name?: string;
  last_name?: string;
  mobile_phone?: string;
  rank?: string;
  company?: string;
}

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '972' + digits.slice(1);
  }
  return digits;
}

function buildWhatsAppLink(phone: string, message: string): string {
  const number = toWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const MailingListPage: React.FC = () => {
  const [battalions, setBattalions] = useState<string[]>([]);
  const [selectedBattalion, setSelectedBattalion] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const [loadingBattalions, setLoadingBattalions] = useState(true);
  const [loadingSoldiers, setLoadingSoldiers] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    api.get<{ battalions: string[] }>('/battalion/list')
      .then((r) => setBattalions(r.data.battalions))
      .catch(() => setBattalions([]))
      .finally(() => setLoadingBattalions(false));
  }, []);

  useEffect(() => {
    if (!selectedBattalion) {
      setSoldiers([]);
      setSelectedIds(new Set());
      return;
    }
    setLoadingSoldiers(true);
    api.get<{ soldiers: Soldier[] }>(`/battalion/${encodeURIComponent(selectedBattalion)}/soldiers`)
      .then((r) => {
        setSoldiers(r.data.soldiers);
        // Select all by default
        setSelectedIds(new Set(r.data.soldiers.map((_, i) => i)));
      })
      .catch(() => setSoldiers([]))
      .finally(() => setLoadingSoldiers(false));
  }, [selectedBattalion]);

  const toggleAll = () => {
    if (selectedIds.size === soldiers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(soldiers.map((_, i) => i)));
    }
  };

  const toggleOne = (i: number) => {
    const next = new Set(selectedIds);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelectedIds(next);
  };

  const selectedSoldiers = soldiers.filter((_, i) => selectedIds.has(i) && !!soldiers[i].mobile_phone);

  const handleSendAll = () => {
    if (!message.trim()) return;
    setSentCount(0);
    selectedSoldiers.forEach((soldier, idx) => {
      setTimeout(() => {
        window.open(buildWhatsAppLink(soldier.mobile_phone!, message), '_blank');
        setSentCount((c) => c + 1);
      }, idx * 600);
    });
  };

  const noPhone = soldiers.filter((_, i) => selectedIds.has(i) && !soldiers[i].mobile_phone);

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">שליחה לרשימת תפוצה</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recipients */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <h2 className="font-semibold text-gray-300 mb-4">בחר נמענים</h2>

          {/* Battalion select */}
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
                {battalions.map((b) => (
                  <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>
                ))}
              </select>
            )}
          </div>

          {/* Soldiers list */}
          {loadingSoldiers && <p className="text-sm text-gray-400">טוען חיילים...</p>}

          {soldiers.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{selectedIds.size} נבחרו מתוך {soldiers.length}</span>
                <button
                  onClick={toggleAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selectedIds.size === soldiers.length ? 'בטל הכל' : 'בחר הכל'}
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto border border-gray-700 rounded-lg divide-y divide-gray-700">
                {soldiers.map((soldier, i) => (
                  <label key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(i)}
                      onChange={() => toggleOne(i)}
                      className="accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {soldier.rank && <span className="text-gray-400 ml-1">{soldier.rank}</span>}
                        {soldier.first_name} {soldier.last_name}
                      </p>
                      {soldier.mobile_phone ? (
                        <p className="text-xs text-gray-500">{soldier.mobile_phone}</p>
                      ) : (
                        <p className="text-xs text-red-400">אין מספר טלפון</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {noPhone.length > 0 && (
                <p className="text-xs text-orange-500 mt-2">
                  ⚠ {noPhone.length} נמענים ללא מספר טלפון יוחרגו מהשליחה
                </p>
              )}
            </>
          )}
        </div>

        {/* Right: Message */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 flex flex-col">
          <h2 className="font-semibold text-gray-300 mb-4">הודעה</h2>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב את ההודעה כאן..."
            rows={8}
            className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none flex-1 mb-4 bg-gray-700 text-white placeholder-gray-400"
          />

          {/* Summary */}
          <div className="text-sm text-gray-400 mb-4 bg-gray-800 rounded-lg px-3 py-2">
            <p>נמענים עם טלפון: <strong className="text-white">{selectedSoldiers.length}</strong></p>
            <p>תווים בהודעה: <strong className="text-white">{message.length}</strong></p>
          </div>

          {/* Send button */}
          <button
            onClick={handleSendAll}
            disabled={selectedSoldiers.length === 0 || !message.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            שלח WhatsApp ({selectedSoldiers.length})
          </button>

          {sentCount > 0 && sentCount < selectedSoldiers.length && (
            <p className="text-xs text-center text-green-600 mt-2">
              פותח חלונות... {sentCount}/{selectedSoldiers.length}
            </p>
          )}
          {sentCount > 0 && sentCount === selectedSoldiers.length && (
            <p className="text-xs text-center text-green-700 mt-2 font-medium">
              ✓ נשלחו {sentCount} הודעות WhatsApp
            </p>
          )}

          <p className="text-xs text-gray-400 mt-3 text-center">
            הלחיצה תפתח WhatsApp Web עבור כל נמען בנפרד
          </p>
        </div>
      </div>
    </div>
  );
};
