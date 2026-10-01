import type { ApiResponse, AuthResponse } from './types';

/** Where a platform keeps the session: localStorage on desktop, SecureStore on mobile. */
export interface TokenStorage {
  get(): Promise<StoredSession | null>;
  set(session: StoredSession | null): Promise<void>;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  deviceSessionId: string;
}

/** Thrown when the "API" answers with HTML: almost always Cloudflare Access (or a captive portal) in front of the server. */
export const NOT_THE_API = 'The server answered with a web page instead of the API. If it sits behind Cloudflare Access, enter the Access client id and secret on the sign-in screen.';

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, NOT_THE_API);
  }
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ClientOptions {
  /** Gateway origin, e.g. https://life-os.maarcus.dev (no trailing slash). */
  baseUrl: string;
  storage: TokenStorage;
  /** Extra headers on every request (used for Cloudflare Access service tokens). */
  headers?: () => Record<string, string>;
  /** Called when the session is unrecoverable (refresh failed), so the UI can show the login screen. */
  onSignedOut?: () => void;
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Minimal typed client for the gateway. Mirrors the web app's behaviour: the backend answers an
 * expired access token with 403, so on 401 or 403 the token is refreshed once (concurrent callers
 * share one refresh) and the request retried once.
 */
export function createClient(options: ClientOptions) {
  const doFetch = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/+$/, '');
  let session: StoredSession | null | undefined;
  let refreshing: Promise<StoredSession> | null = null;

  async function current(): Promise<StoredSession | null> {
    if (session === undefined) session = await options.storage.get();
    return session;
  }

  async function save(next: StoredSession | null) {
    session = next;
    await options.storage.set(next);
  }

  async function raw(path: string, init: RequestInit & { query?: Query }, token: string | null): Promise<Response> {
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers?.() };
    if (init.body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return doFetch(url.toString(), { ...init, headers });
  }

  async function refresh(): Promise<StoredSession> {
    const existing = await current();
    if (!existing) throw new ApiError(401, 'Not signed in');
    const response = await raw('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: existing.refreshToken }) }, null);
    if (!response.ok) throw new ApiError(response.status, 'Session expired');
    const auth = (await readJson<ApiResponse<AuthResponse>>(response)).data;
    const next = { accessToken: auth.accessToken, refreshToken: auth.refreshToken, deviceSessionId: auth.deviceSessionId };
    await save(next);
    return next;
  }

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const init = { method, body: body === undefined ? undefined : JSON.stringify(body), query };
    let response = await raw(path, init, (await current())?.accessToken ?? null);

    const authRelated = path.startsWith('/v1/auth/login') || path.startsWith('/v1/auth/refresh');
    if ((response.status === 401 || response.status === 403) && !authRelated && (await current())) {
      try {
        refreshing ??= refresh().finally(() => {
          refreshing = null;
        });
        const fresh = await refreshing;
        response = await raw(path, init, fresh.accessToken);
      } catch {
        await save(null);
        options.onSignedOut?.();
        throw new ApiError(401, 'Session expired');
      }
    }

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        message = ((await response.json()) as { message?: string }).message ?? message;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(response.status, message);
    }
    if (response.status === 204) return undefined as T;
    return (await readJson<ApiResponse<T>>(response)).data;
  }

  return {
    get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
    post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),

    async signIn(email: string, rawPassword: string, deviceName: string, deviceType: string): Promise<void> {
      const response = await raw('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, rawPassword, deviceName, deviceType }) }, null);
      if (!response.ok) {
        throw new ApiError(response.status, response.status === 401 || response.status === 403 ? 'Wrong email or password' : `Sign-in failed (${response.status})`);
      }
      const auth = (await readJson<ApiResponse<AuthResponse>>(response)).data;
      await save({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, deviceSessionId: auth.deviceSessionId });
    },

    async signOut(): Promise<void> {
      const existing = await current();
      if (existing) {
        try {
          await request('POST', '/v1/auth/logout', { deviceSessionId: existing.deviceSessionId });
        } catch {
          /* signing out locally matters more than telling the server */
        }
      }
      await save(null);
    },

    isSignedIn: async () => (await current()) !== null,
  };
}

export type Client = ReturnType<typeof createClient>;

/**
 * Reads a `lifeos://setup?server=...&id=...&secret=...` link (printed as a QR by scripts/native-access-setup.sh)
 * into the server address and Cloudflare Access service token the apps need to sign in from anywhere.
 */
export function parseSetupLink(link: string): { baseUrl: string; cfClientId: string; cfClientSecret: string } | null {
  try {
    const url = new URL(link.trim());
    if (url.protocol !== 'lifeos:' || url.hostname !== 'setup') return null;
    const server = url.searchParams.get('server');
    if (!server) return null;
    return { baseUrl: server.replace(/\/+$/, ''), cfClientId: url.searchParams.get('id') ?? '', cfClientSecret: url.searchParams.get('secret') ?? '' };
  } catch {
    return null;
  }
}
