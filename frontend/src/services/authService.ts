import api from './api';
import { AuthResponse, PeopleListResponse, Person } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  register: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
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
