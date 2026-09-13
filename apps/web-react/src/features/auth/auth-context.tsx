import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { tokenStore } from '@/lib/token';
import type { LoginRequest, UserProfileResponse } from '@/lib/types';

import { authApi } from './auth-api';

interface AuthContextValue {
  user: UserProfileResponse | null;
  /** True while the initial "am I already logged in" check is running. */
  loading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  /** Saves the profile name and reflects it locally without a round-trip GET /me. */
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.getAccessToken()) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    await authApi.login(request);
    setUser(await authApi.getMe());
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const updateProfileName = useCallback(async (name: string) => {
    const updated = await authApi.updateProfile(name);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
