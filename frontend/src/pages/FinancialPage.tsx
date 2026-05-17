import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';

interface FinancialDoc {
  id: number;
  type: 'payslip' | 'insurance';
  originalName: string;
  soldierPersonalNumber: string;
  soldierName: string | null;
  battalion: string;
  uploadedBy: string;
  createdAt: string;
}

const TYPE_LABELS = { payslip: 'תלוש שכר', insurance: 'תלוש ביטוח לאומי' };
const TYPE_COLORS = { payslip: 'bg-blue-900/60 text-blue-300', insurance: 'bg-purple-900/60 text-purple-300' };

export const FinancialPage: React.FC = () => {
  const [tab, setTab] = useState<'payslip' | 'insurance'>('payslip');
  const [docs, setDocs] = useState<FinancialDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ soldierPersonalNumber: '', soldierName: '', battalion: '' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Search
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ documents: FinancialDoc[] }>('/financial', { params: { type: tab } });
      setDocs(data.documents);
    } catch {
      setError('שגיאה בטעינת המסמכים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !form.soldierPersonalNumber.trim() || !form.battalion.trim()) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', tab);
      fd.append('soldierPersonalNumber', form.soldierPersonalNumber.trim());
      fd.append('soldierName', form.soldierName.trim());
      fd.append('battalion', form.battalion.trim());
      await api.post('/financial/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ soldierPersonalNumber: '', soldierName: '', battalion: '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setShowUpload(false);
      setSuccess('המסמך הועלה בהצלחה');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch {
      setError('שגיאה בהעלאת המסמך');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: FinancialDoc) => {
    try {
      const res = await api.get(`/financial/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('שגיאה בהורדת המסמך');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('למחוק מסמך זה?')) return;
    try {
      await api.delete(`/financial/${id}`);
      load();
    } catch {
      setError('שגיאה במחיקת המסמך');
    }
  };

  const filtered = docs.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.soldierPersonalNumber.includes(q) ||
      (d.soldierName || '').toLowerCase().includes(q) ||
      d.battalion.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">אזור פיננסי</h1>
          <p className="text-gray-400 text-sm">ניהול תלושי שכר וביטוח לאומי לפי חייל</p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showUpload ? 'ביטול' : '+ העלאת מסמך'}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-900/40 border border-green-700 text-green-300 rounded-lg text-sm">{success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">העלאת {TYPE_LABELS[tab]}</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">מספר אישי *</label>
                <input
                  type="text"
                  value={form.soldierPersonalNumber}
                  onChange={(e) => setForm((f) => ({ ...f, soldierPersonalNumber: e.target.value }))}
                  placeholder="מספר אישי..."
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">שם החייל</label>
                <input
                  type="text"
                  value={form.soldierName}
                  onChange={(e) => setForm((f) => ({ ...f, soldierName: e.target.value }))}
                  placeholder="שם פרטי ומשפחה..."
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">גדוד *</label>
                <input
                  type="text"
                  value={form.battalion}
                  onChange={(e) => setForm((f) => ({ ...f, battalion: e.target.value }))}
                  placeholder="שם הגדוד..."
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">קובץ (PDF / תמונה) *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm file:mr-3 file:bg-indigo-700 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={uploading || !file || !form.soldierPersonalNumber.trim() || !form.battalion.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {uploading ? 'מעלה...' : 'העלה מסמך'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['payslip', 'insurance'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי מספר אישי / שם / גדוד..."
          className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-700">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">אין מסמכים</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-gray-400 text-xs border-b border-gray-700">
                  <th className="py-3 px-3 font-medium">סוג</th>
                  <th className="py-3 px-3 font-medium">מספר אישי</th>
                  <th className="py-3 px-3 font-medium">שם חייל</th>
                  <th className="py-3 px-3 font-medium">גדוד</th>
                  <th className="py-3 px-3 font-medium">שם קובץ</th>
                  <th className="py-3 px-3 font-medium">הועלה על ידי</th>
                  <th className="py-3 px-3 font-medium">תאריך</th>
                  <th className="py-3 px-3 font-medium text-center">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[d.type]}`}>
                        {TYPE_LABELS[d.type]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-200 font-mono">{d.soldierPersonalNumber}</td>
                    <td className="py-3 px-3 text-gray-200">{d.soldierName || '—'}</td>
                    <td className="py-3 px-3 text-gray-300">{d.battalion}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs max-w-[160px] truncate" title={d.originalName}>{d.originalName}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{d.uploadedBy}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{new Date(d.createdAt).toLocaleDateString('he-IL')}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => handleDownload(d)}
                          className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs transition-colors"
                        >
                          הורד
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors"
                        >
                          מחק
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
