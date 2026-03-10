import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../hooks/useAuth';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      setAuth(response.token, response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setForgotMsg({ type: 'error', text: 'הכנס כתובת אימייל בשדה למעלה תחילה' });
      return;
    }
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      await authService.forgotPassword(email);
      setForgotMsg({ type: 'success', text: `קישור איפוס סיסמה נשלח אל ${email}` });
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err.response?.data?.error || 'שגיאה בשליחת המייל' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-md w-full space-y-8 bg-black bg-opacity-60 p-8 rounded-xl backdrop-blur-md border border-cyan-800">
        <div className="flex flex-col items-center">
          <img
            src="/logo.jpeg"
            alt="Logo"
            className="w-80 h-80 rounded-2xl shadow-2xl mb-4"
          />
          <h2 className="text-center text-3xl font-extrabold text-cyan-300">
            CRM Login
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleCredentialsSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 font-bold"
            >
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </div>

          {forgotMsg && (
            <div className={`p-3 rounded-md text-sm text-center ${
              forgotMsg.type === 'success'
                ? 'bg-green-900/40 border border-green-700 text-green-300'
                : 'bg-red-900/40 border border-red-700 text-red-300'
            }`}>
              {forgotMsg.text}
            </div>
          )}
          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              className="text-sm text-cyan-400 hover:text-cyan-300 underline disabled:opacity-50"
            >
              {forgotLoading ? 'שולח...' : 'שכחתי סיסמה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
