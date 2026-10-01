// Mirrors apps/web's core/services/token.service.ts - same storage keys, so a
// browser that's logged into the Angular app is already logged into this one.

const ACCESS_TOKEN_KEY = 'life_os_access_token';
const REFRESH_TOKEN_KEY = 'life_os_refresh_token';
const DEVICE_SESSION_ID_KEY = 'life_os_device_session_id';

export const tokenStore = {
  setTokens(accessToken: string, refreshToken: string, deviceSessionId: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(DEVICE_SESSION_ID_KEY, deviceSessionId);
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getDeviceSessionId(): string | null {
    return localStorage.getItem(DEVICE_SESSION_ID_KEY);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(DEVICE_SESSION_ID_KEY);
  },
};
