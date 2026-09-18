import { api, unwrap } from '@/lib/api-client';
import { tokenStore } from '@/lib/token';
import type { AuthResponse, DeviceSession, LoginRequest, UserProfileResponse } from '@/lib/types';

const baseUrl = '/v1/auth';

export const authApi = {
  async login(request: LoginRequest): Promise<AuthResponse> {
    const auth = await unwrap<AuthResponse>(api.post(`${baseUrl}/login`, request));
    tokenStore.setTokens(auth.accessToken, auth.refreshToken, auth.deviceSessionId);
    return auth;
  },

  async logout(): Promise<void> {
    const deviceSessionId = tokenStore.getDeviceSessionId();
    if (!deviceSessionId) {
      return;
    }
    await api.post(`${baseUrl}/logout`, { deviceSessionId });
  },

  listSessions(): Promise<DeviceSession[]> {
    return unwrap(api.get(`${baseUrl}/sessions`));
  },

  async revokeSession(sessionId: string): Promise<void> {
    await api.post(`${baseUrl}/sessions/${sessionId}/revoke`, {});
  },

  getMe(): Promise<UserProfileResponse> {
    return unwrap(api.get(`${baseUrl}/me`));
  },

  updateProfile(name: string): Promise<UserProfileResponse> {
    return unwrap(api.put(`${baseUrl}/me`, { name }));
  },

  async deleteAccount(): Promise<void> {
    await api.delete(`${baseUrl}/me`);
  },
};
