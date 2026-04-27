import axios, { AxiosInstance } from 'axios';
import { logDisconnect } from './disconnectLogger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
let _sessionExpiredHandled = false;

// Decode the JWT payload locally so we can tell whether a 401 means the token
// is actually expired or whether the server happened to return 401 for some
// other reason (transient bug, route mis-config, race condition during a
// silent refresh). Returns true ONLY if the token is missing or its `exp`
// has passed — i.e. genuinely needs a re-login.
function isTokenActuallyExpired(): boolean {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    // Malformed token → treat as expired so the user can recover.
    return true;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';

    if (status === 403) {
      logDisconnect('response_403', { url, detail: error.response?.data?.error });
    }

    if (status === 401) {
      // Never auto-logout on a failed silent refresh — authService.refreshToken
      // has its own try/catch and intentionally swallows the failure so the
      // existing token can keep working until it really expires.
      const isRefreshCall = url.includes('/auth/refresh');
      const expired = isTokenActuallyExpired();

      if (isRefreshCall) {
        logDisconnect('response_401_on_refresh', { url });
      } else if (!expired) {
        // Important diagnostic: backend rejected the request but our local
        // JWT is still valid. We do NOT log the user out here — but we
        // want to know how often this happens because each one is a
        // potential mid-typing disruption that we suppressed.
        logDisconnect('response_401_token_still_valid', { url });
      }

      // Don't kick the user out on a transient 401 if their JWT is still
      // valid locally. This is the cause of "search threw me out" reports —
      // an unrelated 401 (refresh race, brief server issue) should not
      // destroy an active session.
      if (!isRefreshCall && expired) {
        logDisconnect('response_401_token_expired', { url });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && !_sessionExpiredHandled) {
          _sessionExpiredHandled = true;
          const toast = document.createElement('div');
          toast.textContent = 'פג תוקף הסשן — מנתב להתחברות...';
          toast.style.cssText = [
            'position:fixed', 'top:20px', 'right:20px', 'z-index:99999',
            'background:#dc2626', 'color:#fff', 'padding:12px 20px',
            'border-radius:8px', 'font-size:15px', 'font-family:sans-serif',
            'direction:rtl', 'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
          ].join(';');
          document.body.appendChild(toast);
          setTimeout(() => {
            _sessionExpiredHandled = false;
            window.location.href = '/login';
          }, 1500);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
