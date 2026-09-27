import axios, { type AxiosRequestConfig } from 'axios';

import { tokenStore } from './token';
import type { ApiResponse, AuthResponse } from './types';

// Every backend service sits behind Vite's dev proxy (see vite.config.ts) or,
// in production, behind the same origin/reverse proxy - so no baseURL needed.
export const api = axios.create();

api.interceptors.request.use((config) => {
  const accessToken = tokenStore.getAccessToken();
  if (accessToken && config.url?.startsWith('/v1/')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

// Mirrors apps/web's token-refresh.interceptor.ts: on a 403 from any request
// other than login/refresh itself, refresh the access token once and retry -
// concurrent 403s while a refresh is already in flight all await the same
// promise instead of triggering their own refresh calls.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefreshToken();
  const response = await axios.post<ApiResponse<AuthResponse>>('/v1/auth/refresh', {
    refreshToken,
  });
  const auth = response.data.data;
  tokenStore.setTokens(auth.accessToken, auth.refreshToken, auth.deviceSessionId);
  return auth.accessToken;
}

interface RetriableConfig extends AxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config: RetriableConfig = error.config ?? {};
    const url: string = config.url ?? '';
    const isAuthFailure = status === 403;
    const isExemptUrl = url.includes('/auth/login') || url.includes('/auth/refresh');

    // A request that already went through one refresh-and-retry and still failed isn't a
    // stale-token problem - refreshing again would just retry forever against a 403 that's a
    // genuine authorization failure, not an expired token (this happened for real: a backend
    // route with a real bug produced a 403 that wasn't expiry-related, and this loop hammered
    // it with thousands of requests before the retry cap below existed).
    if (!isAuthFailure || isExemptUrl || config._retriedAfterRefresh) {
      return Promise.reject(error);
    }

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;

      const retryConfig: RetriableConfig = { ...config, _retriedAfterRefresh: true };
      retryConfig.headers = { ...retryConfig.headers, Authorization: `Bearer ${newAccessToken}` };
      return api.request(retryConfig);
    } catch (refreshError) {
      tokenStore.clear();
      // Outside a component/router context here, so a hard redirect is the
      // simplest way to bounce to the login screen on a dead session.
      window.location.assign('/login');
      return Promise.reject(refreshError);
    }
  },
);

/** Unwraps the `{ success, message, data, timestamp }` envelope every endpoint returns. */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
