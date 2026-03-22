import axios, { AxiosInstance } from 'axios';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && !_sessionExpiredHandled) {
        _sessionExpiredHandled = true;
        // Show Hebrew toast before redirecting
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
    return Promise.reject(error);
  }
);

export default api;
