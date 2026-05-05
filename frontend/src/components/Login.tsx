import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../hooks/useAuth';
import api from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (otpStep) otpRefs.current[0]?.focus();
  }, [otpStep]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.otpRequired) {
        setOtpHint(res.data.message || 'קוד נשלח לטלפון שלך');
        setOtpStep(true);
      } else {
        // fallback if 2FA disabled
        setAuth(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) handleOtpSubmit(next.join(''));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length < 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: otpCode });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setAuth(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'קוד שגוי');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
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
          <img src="/logo.jpeg" alt="Logo" className="w-80 h-80 rounded-2xl shadow-2xl mb-4" />
          <h2 className="text-center text-3xl font-extrabold text-cyan-300">CRM Login</h2>
        </div>

        {!otpStep ? (
          /* ── Step 1: Email + Password ── */
          <form className="mt-8 space-y-6" onSubmit={handleCredentialsSubmit}>
            {error && (
              <div className="rounded-md bg-red-900/70 border border-red-500 p-4">
                <p className="text-sm font-semibold text-red-200 text-center">{error}</p>
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
                  dir="ltr"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-left"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  dir="ltr"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-left"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none z-20"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L3 3m6.88 6.88L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
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
        ) : (
          /* ── Step 2: OTP ── */
          <div className="mt-8 space-y-6" dir="rtl">
            <div className="text-center">
              <div className="text-4xl mb-3">📱</div>
              <p className="text-cyan-300 font-semibold text-lg mb-1">אימות דו-שלבי</p>
              <p className="text-gray-400 text-sm">{otpHint}</p>
            </div>

            {error && (
              <div className="rounded-md bg-red-900/70 border border-red-500 p-4">
                <p className="text-sm font-semibold text-red-200 text-center">{error}</p>
              </div>
            )}

            <div className="flex justify-center gap-3 dir-ltr" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-gray-800 border-2 border-gray-600 text-white rounded-xl focus:border-cyan-400 focus:outline-none transition-colors"
                />
              ))}
            </div>

            <button
              onClick={() => handleOtpSubmit()}
              disabled={loading || otp.some((d) => !d)}
              className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black font-bold rounded-md transition-colors"
            >
              {loading ? 'מאמת...' : 'אמת קוד'}
            </button>

            <div className="text-center">
              <button
                onClick={() => { setOtpStep(false); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="text-sm text-gray-400 hover:text-white underline"
              >
                חזור להתחברות
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
