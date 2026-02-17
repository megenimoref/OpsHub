import api from './api';
import { AuthResponse, LoginResponse, PeopleListResponse, Person } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login', { email, password });
    // If full auth returned (no TOTP or needs setup), store token
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  verifyTotp: async (preAuthToken: string, code: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/verify-totp', { preAuthToken, code });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  setupTotp: async (): Promise<{ qrCodeUrl: string; manualCode: string }> => {
    const { data } = await api.post('/auth/setup-totp');
    return data;
  },

  confirmTotp: async (code: string): Promise<void> => {
    await api.post('/auth/confirm-totp', { code });
    // Update stored user to reflect totpEnabled = true
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      user.totpEnabled = true;
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  resetUserTotp: async (userId: number): Promise<void> => {
    await api.delete(`/auth/reset-totp/${userId}`);
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getStoredToken: () => localStorage.getItem('token'),
};

export const peopleService = {
  getPeople: async (
    search?: string,
    battalion?: string,
    page = 1,
    limit = 20
  ): Promise<PeopleListResponse> => {
    const { data } = await api.get('/people', {
      params: { search, battalion, page, limit },
    });
    return data;
  },

  getPersonById: async (id: number): Promise<Person> => {
    const { data } = await api.get(`/people/${id}`);
    return data;
  },

  createPerson: async (
    firstName: string,
    lastName: string,
    battalion: string,
    email?: string,
    phone?: string
  ): Promise<Person> => {
    const { data } = await api.post('/people', {
      firstName,
      lastName,
      battalion,
      email,
      phone,
    });
    return data;
  },

  updatePerson: async (
    id: number,
    firstName?: string,
    lastName?: string,
    battalion?: string,
    email?: string,
    phone?: string
  ): Promise<Person> => {
    const { data } = await api.put(`/people/${id}`, {
      firstName,
      lastName,
      battalion,
      email,
      phone,
    });
    return data;
  },

  deletePerson: async (id: number): Promise<void> => {
    await api.delete(`/people/${id}`);
  },
};
