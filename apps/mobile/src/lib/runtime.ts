import { createApis, createClient, createMockFetch, type StoredSession, type TokenStorage } from '@life-os/core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface Settings {
  baseUrl: string;
  cfClientId: string;
  cfClientSecret: string;
  /** Who is signed in, for the greeting. */
  email: string;
}

const SESSION_KEY = 'lifeos.session';
const SETTINGS_KEY = 'lifeos.settings';

/** The preview build talks to a fake gateway, so the UI can be checked without a backend. */
export const isMock = process.env.EXPO_PUBLIC_MOCK === '1';

export const DEFAULT_SETTINGS: Settings = { baseUrl: 'http://192.168.1.2', cfClientId: '', cfClientSecret: '', email: '' };

// Tokens live in the OS keychain/keystore on a phone; the browser preview has only localStorage.
export async function read(key: string): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
export async function write(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } else if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* storage unavailable: the session just won't survive a restart */
  }
}

export async function loadSettings(): Promise<Settings> {
  const raw = await read(SETTINGS_KEY);
  try {
    return { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const saveSettings = (settings: Settings) => write(SETTINGS_KEY, JSON.stringify(settings));

const storage: TokenStorage = {
  async get() {
    const raw = await read(SESSION_KEY);
    try {
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  },
  set: (session) => write(SESSION_KEY, session ? JSON.stringify(session) : null),
};

export function buildRuntime(settings: Settings, onSignedOut: () => void) {
  const client = createClient({
    baseUrl: settings.baseUrl,
    storage,
    fetchImpl: isMock ? createMockFetch() : undefined,
    onSignedOut,
    headers: (): Record<string, string> => (settings.cfClientId && settings.cfClientSecret ? { 'CF-Access-Client-Id': settings.cfClientId, 'CF-Access-Client-Secret': settings.cfClientSecret } : {}),
  });
  return { client, api: createApis(client) };
}

export type Runtime = ReturnType<typeof buildRuntime>;
