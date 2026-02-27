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
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'staff';
  totpEnabled: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  requiresTotpSetup?: boolean;
}

export interface TotpChallengeResponse {
  requiresTotp: true;
  preAuthToken: string;
}

export type LoginResponse = AuthResponse | TotpChallengeResponse;

export interface PeopleListResponse {
  total: number;
  page: number;
  limit: number;
  data: Person[];
}

export interface ServiceCallUpdate {
  timestamp: string;
  notes?: string;
  status?: 'open' | 'closed';
  details?: string[];
}

export interface ServiceCall {
  id: number;
  subject: string;
  description: string;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  battalion: string | null;
  personId: number | null;
  personName: string | null;
  notes: string | null;
  updates?: ServiceCallUpdate[] | null;
  closedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}
