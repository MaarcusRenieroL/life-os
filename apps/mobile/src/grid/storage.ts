import * as SecureStore from 'expo-secure-store';

// A grid's saved layout and views. They live in memory for the session and are mirrored to the keychain on
// a best-effort basis (the values are tiny); if that fails the grid just forgets across launches.
const memory = new Map<string, string>();

const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export async function readJson<V>(key: string): Promise<V | null> {
  try {
    const raw = memory.get(key) ?? (await SecureStore.getItemAsync(safeKey(key)));
    if (raw) memory.set(key, raw);
    return raw ? (JSON.parse(raw) as V) : null;
  } catch {
    return null;
  }
}

export function readSession<V>(key: string): V | null {
  const raw = memory.get(`session:${key}`);
  return raw ? (JSON.parse(raw) as V) : null;
}

export function writeSession(key: string, value: unknown) {
  memory.set(`session:${key}`, JSON.stringify(value));
}

export function writeJson(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  void SecureStore.setItemAsync(safeKey(key), raw).catch(() => {});
}
