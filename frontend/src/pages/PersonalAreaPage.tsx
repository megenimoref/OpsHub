import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Soldier {
  personal_number: string;
  first_name: string;
  last_name: string;
  request_status: string;
  battalion_name: string;
}

const STATUS_OPTIONS: { value: string; color: string }[] = [
  { value: 'טופלה', color: '#22c55e' },
  { value: 'חייל לא זמין', color: '#eab308' },
  { value: 'חייל ממתין לתשובה', color: '#ef4444' },
  { value: 'ממתין לטיפול', color: '#67e8f9' },
  { value: 'נדרש סיוע של ביטוח לאומי', color: '#f97316' },
  { value: 'נדרש סיוע של עורך דין', color: '#f472b6' },
  { value: 'אין מספר טלפון', color: '#6366f1' },
];

const getStatusColor = (status: string): string => {
  if (!status) return 'transparent';
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || '#9ca3af';
};

export const PersonalAreaPage: React.FC = () => {
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSoldiers = async () => {
      try {
        setLoading(true);
        const response = await api.get<Soldier[]>('/battalion/my-soldiers');
        setSoldiers(response.data || []);
        setError('');
      } catch (err: any) {
        const msg = err.response?.data?.error || err.message || 'שגיאה בטעינת הנתונים';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchSoldiers();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-gray-400 mt-4">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
          <p className="font-bold text-red-300 mb-1">שגיאה:</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">אזור אישי</h1>
        <p className="text-gray-400">חיילים המוקצים לך</p>
      </div>

      {soldiers.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">אין חיילים משויכים לחשבונך</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-gray-300">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-4 py-3 font-semibold text-gray-200">גדוד</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">סטטוס פנייה</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">שם משפחה</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">שם פרטי</th>
                  <th className="px-4 py-3 font-semibold text-gray-200">מספר אישי</th>
                </tr>
              </thead>
              <tbody>
                {soldiers.map((soldier, idx) => (
                  <tr
                    key={`${soldier.battalion_name}-${soldier.personal_number}`}
                    className={`border-b border-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-700/30 transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-300">{soldier.battalion_name}</td>
                    <td className="px-4 py-3">
                      {soldier.request_status ? (
                        <span
                          className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                          style={{ backgroundColor: getStatusColor(soldier.request_status) }}
                        >
                          {soldier.request_status}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{soldier.last_name}</td>
                    <td className="px-4 py-3 text-gray-300">{soldier.first_name}</td>
                    <td className="px-4 py-3 font-medium text-gray-200">{soldier.personal_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with count */}
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
            סה"כ: <span className="font-semibold text-gray-200">{soldiers.length}</span> חיילים
          </div>
        </div>
      )}
    </div>
  );
};
