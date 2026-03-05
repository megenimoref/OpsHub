import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const ForgotTotpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-totp', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשליחת הבקשה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundImage: 'url(/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="max-w-md w-full bg-black bg-opacity-60 p-8 rounded-xl backdrop-blur-md border border-cyan-800 space-y-6">
        <div className="flex flex-col items-center">
          <img src="/logo.jpeg" alt="Logo" className="w-32 h-32 rounded-2xl shadow-2xl mb-4" />
          <h2 className="text-2xl font-extrabold text-cyan-300">איפוס Google Authenticator</h2>
          <p className="mt-2 text-sm text-gray-400 text-center">
            נשלח אליך מייל עם ברקוד חדש לסריקה
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center" dir="rtl">
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 font-medium">המייל נשלח!</p>
              <p className="text-green-400 text-sm mt-1">בדוק את תיבת הדואר שלך וסרוק את הברקוד.</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-cyan-400 hover:text-cyan-300 underline"
            >
              חזרה להתחברות
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-300 mb-1">כתובת אימייל</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-lg disabled:opacity-50 text-sm"
            >
              {loading ? 'שולח...' : 'שלח ברקוד למייל'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-400 hover:text-gray-300 underline"
              >
                חזרה להתחברות
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
