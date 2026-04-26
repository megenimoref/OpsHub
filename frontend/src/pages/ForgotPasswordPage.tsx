import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשליחת אימייל איפוס הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800" dir="rtl">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">שכחתי סיסמה</h1>
        <p className="text-gray-400 text-sm text-center mb-6">הכנס את כתובת האימייל שלך ויישלח לך קישור לאיפוס הסיסמה</p>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-900/40 border border-green-700 text-green-300 rounded-md text-sm">
              אימייל עם קישור לאיפוס סיסמה נשלח בהצלחה. בדוק את תיבת הדוא"ל שלך (כולל spam).
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md font-medium transition-colors"
            >
              חזור להתחברות
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="w-full px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-white placeholder-gray-400 text-left"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'שולח...' : 'שלח קישור איפוס'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-medium transition-colors"
            >
              חזור להתחברות
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
