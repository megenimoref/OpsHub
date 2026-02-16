export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  battalion: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'staff';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PeopleListResponse {
  total: number;
  page: number;
  limit: number;
  data: Person[];
}
