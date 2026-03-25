import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

interface NotificationItem {
  id: number;
  message: string;
  is_read: boolean;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      try {
        await api.put('/notifications/read-all');
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch {
        // ignore
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div ref={ref} className="relative" dir="rtl">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        title="התראות"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-semibold text-white">התראות</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">אין התראות</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-700">
              {notifications.map((n) => (
                <li key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? 'text-gray-400' : 'text-white bg-gray-700/40'}`}>
                  <p className="leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
