import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../hooks/useAuth';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@crm.com');
  const [password, setPassword] = useState('admin123');
  const [totpCode, setTotpCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if ('requiresTotp' in response) {
        // TOTP challenge — show code input
        setPreAuthToken(response.preAuthToken);
        setStep('totp');
      } else {
        // Full auth (TOTP not yet set up)
        setAuth(response.token, response.user);
        navigate('/setup-totp');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.verifyTotp(preAuthToken, totpCode);
      setAuth(response.token, response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code');
      setTotpCode('');
    } finally {
      setLoading(false);
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
            {step === 'credentials' ? 'CRM Login' : 'אימות דו-שלבי'}
          </h2>
          {step === 'totp' && (
            <p className="mt-2 text-center text-sm text-gray-400">
              הזן את הקוד מ-Google Authenticator
            </p>
          )}
        </div>

        {step === 'credentials' ? (
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                שכחתי סיסמה
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleTotpSubmit} dir="rtl">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md text-center text-2xl tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 font-bold"
              >
                {loading ? 'מאמת...' : 'אמת'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                className="px-4 py-2 border border-gray-500 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700"
              >
                חזור
              </button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-totp')}
                className="text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                שכחתי Google Authenticator
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
