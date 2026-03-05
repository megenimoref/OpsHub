import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ImportResult {
  success: boolean;
  battalionName: string;
  totalRows: number;
  insertedRows: number;
  message: string;
  unknownHeaders?: string[];
}

export const BattalionImportPage: React.FC = () => {
  const [battalionName, setBattalionName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setError('');
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!battalionName.trim()) { setError('יש להזין שם גדוד'); return; }
    if (!file) { setError('יש לבחור קובץ Excel'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('battalionName', battalionName.trim());
      formData.append('file', file);
      const response = await api.post<ImportResult>('/battalion/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'שגיאה ביבוא הגדוד');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">יבוא גדוד</h1>
        <p className="text-gray-400 text-sm">ייבא נתוני חיילים מקובץ Excel</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-700 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Battalion name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">שם הגדוד</label>
            <input
              type="text"
              value={battalionName}
              onChange={(e) => setBattalionName(e.target.value)}
              placeholder="לדוגמה: גדוד 101"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-gray-700 text-white placeholder-gray-400"
              disabled={loading}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">קובץ Excel</label>
            <div
              className="flex items-center gap-3 border-2 border-dashed border-gray-600 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 text-right">
                {file ? (
                  <span className="text-blue-400 font-medium">{file.name}</span>
                ) : (
                  <span className="text-gray-400">לחץ לבחירת קובץ .xlsx</span>
                )}
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={loading}
              >
                Browse
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
              <p className="font-bold text-red-300 mb-1">שגיאה:</p>
              <p className="text-red-300 text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="space-y-3">
              <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-4 rounded-lg">
                <p className="font-bold text-lg mb-1">✓ היבוא הצליח!</p>
                <p>{result.message}</p>
                <p className="text-sm mt-1">סה"כ שורות בקובץ: {result.totalRows} | יובאו: {result.insertedRows}</p>
              </div>
              {result.unknownHeaders && result.unknownHeaders.length > 0 && (
                <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
                  <p className="font-bold text-red-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    עמודות שלא קיימות ב-DB ({result.unknownHeaders.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.unknownHeaders.map((h) => (
                      <span key={h} className="bg-red-900/40 text-red-300 border border-red-700 px-2 py-1 rounded text-xs font-medium">{h}</span>
                    ))}
                  </div>
                  <p className="text-xs text-red-300 mt-2">עמודות אלו לא יובאו. הן אינן קיימות בסכמת ה-DB.</p>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('/people')}
              className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg bg-gray-700 hover:bg-gray-600"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading || !file || !battalionName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'מייבא...' : 'יבא גדוד'}
            </button>
          </div>
        </form>
      </div>

      {/* Template download */}
      <div className="mt-4 text-right">
        <a
          href="/api/battalion/template"
          download="battalion_template.xlsx"
          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          הורד קובץ Excel לדוגמה
        </a>
      </div>
    </div>
  );
};
