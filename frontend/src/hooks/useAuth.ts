import { create } from 'zustand';
import { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  initFromStorage: () => void;
}

// Initialize immediately from localStorage so new tabs don't flash to login
const _storedToken = localStorage.getItem('token');
const _storedUser = (() => {
  try {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
})();

export const useAuthStore = create<AuthStore>((set) => ({
  user: _storedUser,
  token: _storedToken,
  isAuthenticated: !!(_storedToken && _storedUser),
  setAuth: (token, user) =>
    set({ token, user, isAuthenticated: true }),
  clearAuth: () =>
    set({ token: null, user: null, isAuthenticated: false }),
  initFromStorage: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      set({ token, user, isAuthenticated: true });
    }
  },
}));
