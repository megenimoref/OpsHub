import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export const ConfirmTotpResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('קישור לא תקין');
      return;
    }

    api.post('/auth/confirm-totp-reset', { token })
      .then((res) => {
        setMessage(res.data.message || 'Google Authenticator אופס בהצלחה');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err.response?.data?.error || 'הקישור אינו תקף או שפג תוקפו');
        setStatus('error');
      });
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundImage: 'url(/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="max-w-md w-full bg-black bg-opacity-60 p-8 rounded-xl backdrop-blur-md border border-cyan-800 space-y-6 text-center">
        <img src="/logo.jpeg" alt="Logo" className="w-24 h-24 rounded-2xl shadow-2xl mx-auto mb-2" />

        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto mb-3"></div>
            <p className="text-gray-300">מאמת...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4" dir="rtl">
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 font-bold text-lg">✓ {message}</p>
              <p className="text-green-400 text-sm mt-2">
                כעת תוכל להתחבר עם הקוד החדש מה-Google Authenticator שסרקת.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2 px-4 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-lg text-sm"
            >
              התחבר עכשיו
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4" dir="rtl">
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 font-bold">✗ {message}</p>
            </div>
            <button
              onClick={() => navigate('/forgot-totp')}
              className="w-full py-2 px-4 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-lg text-sm"
            >
              נסה שוב
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
