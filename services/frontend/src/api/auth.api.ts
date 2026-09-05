import { apiClient, setStoredTokens, clearStoredTokens } from './client.ts';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  firstName?: string;
  last_name: string;
  lastName?: string;
  role: string;
}

export interface AuthResponse {
  message?: string;
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
    user: UserProfile;
  };
}

function mapUser(u: any): UserProfile {
  const firstName = u?.firstName || u?.first_name || '';
  const lastName = u?.lastName || u?.last_name || '';
  return {
    id: u?.id || '',
    email: u?.email || '',
    first_name: firstName,
    firstName,
    last_name: lastName,
    lastName,
    role: u?.role || 'CUSTOMER',
  };
}

export const authApi = {
  async register(data: { email: string; password: string; first_name: string; last_name: string }): Promise<UserProfile> {
    const res = await apiClient<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const rawUser = res.data?.user || res.data;
    return mapUser(rawUser);
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse['data']> {
    const res = await apiClient<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    const data = res.data || res;
    const user = mapUser(data.user);
    const accessToken = data.accessToken;
    const refreshToken = data.refreshToken || '';

    setStoredTokens(accessToken, refreshToken);
    localStorage.setItem('apex_user', JSON.stringify(user));

    return {
      accessToken,
      refreshToken,
      expiresIn: data.expiresIn,
      tokenType: 'Bearer',
      user,
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors on logout
    } finally {
      clearStoredTokens();
    }
  },

  async getProfile(): Promise<UserProfile> {
    const res = await apiClient<any>('/auth/me');
    const rawUser = res.data?.user || res.data;
    return mapUser(rawUser);
  },
};
