import { createApis, createClient, createMockFetch, type StoredSession, type TokenStorage } from '@life-os/core';

export interface Settings {
  baseUrl: string;
  /** Optional Cloudflare Access service token, for reaching the public domain from outside the Mac. */
  cfClientId: string;
  cfClientSecret: string;
  /** Who is signed in, for the greeting. */
  email: string;
}

const SETTINGS_KEY = 'lifeos.settings';
const SESSION_KEY = 'lifeos.session';

export const isMock = new URLSearchParams(location.search).has('mock');
const inTauri = '__TAURI_INTERNALS__' in window;

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { baseUrl: 'http://localhost', cfClientId: '', cfClientSecret: '', email: '', ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* corrupt settings fall back to defaults */
  }
  return { baseUrl: 'http://localhost', cfClientId: '', cfClientSecret: '', email: '' };
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const storage: TokenStorage = {
  async get() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  },
  async set(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  },
};

async function pickFetch(): Promise<typeof fetch> {
  if (isMock) return createMockFetch();
  if (inTauri) return (await import('@tauri-apps/plugin-http')).fetch as typeof fetch;
  return window.fetch.bind(window);
}

export async function buildRuntime(settings: Settings, onSignedOut: () => void) {
  const client = createClient({
    baseUrl: settings.baseUrl,
    storage,
    fetchImpl: await pickFetch(),
    onSignedOut,
    headers: (): Record<string, string> => (settings.cfClientId && settings.cfClientSecret ? { 'CF-Access-Client-Id': settings.cfClientId, 'CF-Access-Client-Secret': settings.cfClientSecret } : {}),
  });
  return { client, api: createApis(client) };
}

export type Runtime = Awaited<ReturnType<typeof buildRuntime>>;

/** Opens a URL in the system browser: the Tauri opener when packaged, a new tab in a plain browser. */
export async function openExternal(url: string) {
  if (inTauri) await (await import('@tauri-apps/plugin-opener')).openUrl(url);
  else window.open(url, '_blank', 'noopener');
}
