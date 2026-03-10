import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('קישור איפוס סיסמה אינו תקף');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('אנא מלא את כל השדות');
      return;
    }

    if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה אחת, ספרה אחת וסימן מיוחד אחד');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (!token) {
      setError('קישור איפוס סיסמה אינו תקף');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה באיפוס הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800" dir="rtl">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">אפס סיסמה</h1>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-900/40 border border-green-700 text-green-300 rounded-md text-sm text-center">
              הסיסמה אופסה בהצלחה! מעביר אותך להתחברות...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">סיסמה חדשה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="8+ תווים, אות גדולה, ספרה, סימן מיוחד"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">אישור סיסמה</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="אשר את הסיסמה"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'מאפס...' : 'אפס סיסמה'}
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
