import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../hooks/useAuth';

interface LogFile {
  name: string;
  size: number;
  modified: string;
}

export const LogsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'info'>('all');

  useEffect(() => {
    api.get<{ files: LogFile[] }>('/logs/list')
      .then((r) => {
        setFiles(r.data.files);
        if (r.data.files.length > 0) setSelectedFile(r.data.files[0].name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    setLoading(true);
    api.get<{ content: string }>(`/logs/${selectedFile}`)
      .then((r) => setContent(r.data.content))
      .catch(() => setContent('שגיאה בטעינת הלוג'))
      .finally(() => setLoading(false));
  }, [selectedFile]);

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">אין הרשאה לצפות בלוגים</div>;
  }

  const lines = content.split('\n');
  const filteredLines = filter === 'all'
    ? lines
    : lines.filter((l) => l.includes(`[${filter.toUpperCase()}]`));

  const displayContent = filteredLines.join('\n');

  // Download the currently displayed content (respects active filter) as a
  // .log file. Uses a Blob so we don't need a separate backend endpoint —
  // the file is already in memory from the existing /logs/:filename call.
  const handleDownload = () => {
    if (!selectedFile || !displayContent) return;
    const suffix = filter === 'all' ? '' : `.${filter}-only`;
    const downloadName = selectedFile.replace(/\.log$/, `${suffix}.log`);
    const blob = new Blob([displayContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">לוגי מערכת</h1>

      <div className="flex gap-4 mb-4 flex-wrap">
        {/* File selector */}
        <select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          className="border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
        >
          {files.length === 0 && <option value="">אין קבצי לוג</option>}
          {files.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name} ({(f.size / 1024).toFixed(1)} KB)
            </option>
          ))}
        </select>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'error', 'info'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === t
                  ? t === 'error' ? 'bg-red-600 text-white'
                    : t === 'info' ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t === 'all' ? 'הכל' : t === 'error' ? 'שגיאות' : 'מידע'}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setLoading(true);
            api.get<{ content: string }>(`/logs/${selectedFile}`)
              .then((r) => setContent(r.data.content))
              .finally(() => setLoading(false));
          }}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 rounded-lg text-sm"
        >
          רענן
        </button>

        <button
          onClick={handleDownload}
          disabled={!selectedFile || !displayContent || loading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="הורד את התוכן המוצג (כולל הסינון הנוכחי)"
        >
          ⬇ יצוא לוג
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">טוען לוגים...</div>
      ) : (
        <pre
          className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono overflow-auto max-h-[70vh] whitespace-pre-wrap leading-relaxed"
          dir="ltr"
        >
          {displayContent || 'אין תוצאות'}
        </pre>
      )}
    </div>
  );
};