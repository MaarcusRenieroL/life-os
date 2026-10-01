import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { read, write } from './runtime';

const KEY = 'lifeos.biometric';
/** How long the app can sit in the background before it asks again. */
const RELOCK_AFTER_MS = 60_000;

interface LockValue {
  /** The device has biometrics (or a passcode) enrolled that we can ask. */
  /** The saved preference has been read; until then nothing should render. */
  ready: boolean;
  available: boolean;
  enabled: boolean;
  locked: boolean;
  unlock: () => Promise<boolean>;
  /** Asks once, then turns the lock on or off. Returns whether the change went through. */
  setEnabled: (on: boolean) => Promise<boolean>;
}

const Ctx = createContext<LockValue | null>(null);

async function ask(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancel', fallbackLabel: 'Use passcode' });
  return result.success;
}

export function LockProvider({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [flag, hardware, enrolled] = await Promise.all([
        read(KEY),
        Platform.OS === 'web' ? Promise.resolve(false) : LocalAuthentication.hasHardwareAsync().catch(() => false),
        Platform.OS === 'web' ? Promise.resolve(false) : LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      if (cancelled) return;
      setAvailable(hardware && enrolled);
      setEnabledState(flag === '1');
      // A cold start with the lock on begins locked.
      setLocked(flag === '1' && hardware && enrolled);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        leftAt.current ??= Date.now();
      } else if (state === 'active') {
        if (enabled && available && leftAt.current !== null && Date.now() - leftAt.current > RELOCK_AFTER_MS) setLocked(true);
        leftAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled, available]);

  const unlock = useCallback(async () => {
    const ok = await ask('Unlock Life OS');
    if (ok) setLocked(false);
    return ok;
  }, []);

  const value = useMemo<LockValue>(
    () => ({
      ready: loaded,
      available,
      enabled,
      // Nothing to protect until someone is signed in.
      locked: loaded && signedIn && enabled && locked,
      unlock,
      async setEnabled(on) {
        if (on && !(available && (await ask('Turn on fingerprint unlock')))) return false;
        await write(KEY, on ? '1' : null);
        setEnabledState(on);
        if (!on) setLocked(false);
        return true;
      },
    }),
    [available, enabled, locked, loaded, signedIn, unlock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLock(): LockValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useLock outside LockProvider');
  return value;
}
