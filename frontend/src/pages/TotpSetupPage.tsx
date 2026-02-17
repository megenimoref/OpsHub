import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../hooks/useAuth';

export const TotpSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setAuth, token } = useAuthStore();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(true);

  useEffect(() => {
    authService.setupTotp()
      .then(({ qrCodeUrl, manualCode }) => {
        setQrCodeUrl(qrCodeUrl);
        setManualCode(manualCode);
      })
      .catch(() => setError('שגיאה בטעינת קוד QR'))
      .finally(() => setLoadingQr(false));
  }, []);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.confirmTotp(code);
      // Update user in store to reflect totpEnabled = true
      if (user && token) {
        setAuth(token, { ...user, totpEnabled: true });
      }
      navigate('/people');
    } catch (err: any) {
      setError(err.response?.data?.error || 'קוד שגוי');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-md w-full bg-black bg-opacity-60 p-8 rounded-xl backdrop-blur-sm border border-cyan-800" dir="rtl">
        <h2 className="text-2xl font-bold text-cyan-300 text-center mb-2">הגדרת אימות דו-שלבי</h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          סרוק את קוד ה-QR עם Google Authenticator ואשר עם הקוד שיוצג
        </p>

        {loadingQr ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Code לGoogle Authenticator"
                  className="w-48 h-48 rounded-lg bg-white p-2"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="w-full text-sm text-cyan-400 hover:text-cyan-300 mb-4 text-center"
            >
              {showManual ? 'הסתר קוד ידני' : 'לא מצליח לסרוק? הצג קוד ידני'}
            </button>

            {showManual && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600 text-center">
                <p className="text-xs text-gray-400 mb-1">הקוד הידני (base32):</p>
                <p className="text-sm text-white font-mono tracking-wider break-all">{manualCode}</p>
              </div>
            )}

            <form onSubmit={handleConfirm} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-md text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-300 mb-1 text-center">
                  הזן את הקוד מהאפליקציה לאישור
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  className="appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md text-center text-2xl tracking-widest bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2 px-4 border border-transparent text-sm font-bold rounded-md text-black bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                {loading ? 'מאמת...' : 'אשר והפעל 2FA'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
