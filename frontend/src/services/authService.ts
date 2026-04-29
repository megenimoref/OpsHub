import api from './api';
import { AuthResponse, PeopleListResponse, Person } from '../types';
import { logDisconnect } from './disconnectLogger';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    await api.put(`/users/${userId}/reset-password`, { password: newPassword });
  },

  updateUser: async (userId: number, firstName?: string, lastName?: string, role?: string, email?: string, mobilePhone?: string | null, hidePersonalNumber?: boolean): Promise<any> => {
    const payload: Record<string, any> = { firstName, lastName, role, email };
    if (mobilePhone !== undefined) payload.mobilePhone = mobilePhone;
    if (hidePersonalNumber !== undefined) payload.hidePersonalNumber = hidePersonalNumber;
    const { data } = await api.put(`/users/${userId}`, payload);
    return data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
  },

  refreshToken: async (): Promise<void> => {
    try {
      const { data } = await api.post('/auth/refresh');
      localStorage.setItem('token', data.token);
      logDisconnect('refresh_success');
    } catch (err: any) {
      logDisconnect('refresh_failed', {
        detail: err?.response?.status ? `HTTP ${err.response.status}` : err?.message,
      });
      // If refresh fails, do nothing — let existing token expire naturally
    }
  },

  logout: () => {
    logDisconnect('manual_logout');
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
