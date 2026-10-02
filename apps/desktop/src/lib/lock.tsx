import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const KEY = 'lifeos.biometric';
/** How long the window can be out of focus before it asks again. */
const RELOCK_AFTER_MS = 5 * 60_000;
const inTauri = '__TAURI_INTERNALS__' in window;

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: call } = await import('@tauri-apps/api/core');
  return call<T>(command, args);
}

interface LockValue {
  ready: boolean;
  /** Touch ID or the Mac password can be asked for. */
  available: boolean;
  enabled: boolean;
  locked: boolean;
  unlock: () => Promise<boolean>;
  setEnabled: (on: boolean) => Promise<boolean>;
}

const Ctx = createContext<LockValue | null>(null);

const ask = (reason: string) => (inTauri ? invoke<boolean>('biometric_authenticate', { reason }).catch(() => false) : Promise.resolve(false));

function savedFlag(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function LockProvider({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const [available, setAvailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabledState] = useState(savedFlag);
  const [locked, setLocked] = useState(savedFlag);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = inTauri ? invoke<boolean>('biometric_available').catch(() => false) : Promise.resolve(false);
    void probe.then((yes) => {
      if (cancelled) return;
      setAvailable(yes);
      // The flag outlives a change of hardware; if nothing can be asked any more, do not lock people out.
      if (!yes) setLocked(false);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const away = () => {
      leftAt.current ??= Date.now();
    };
    const back = () => {
      if (enabled && available && leftAt.current !== null && Date.now() - leftAt.current > RELOCK_AFTER_MS) setLocked(true);
      leftAt.current = null;
    };
    window.addEventListener('blur', away);
    window.addEventListener('focus', back);
    return () => {
      window.removeEventListener('blur', away);
      window.removeEventListener('focus', back);
    };
  }, [enabled, available]);

  const unlock = useCallback(async () => {
    const ok = await ask('Unlock Life OS');
    if (ok) setLocked(false);
    return ok;
  }, []);

  const value = useMemo<LockValue>(
    () => ({
      ready,
      available,
      enabled,
      locked: signedIn && enabled && available && locked,
      unlock,
      async setEnabled(on) {
        if (on && !(available && (await ask('Turn on Touch ID unlock')))) return false;
        try {
          if (on) localStorage.setItem(KEY, '1');
          else localStorage.removeItem(KEY);
        } catch {
          /* storage unavailable: the choice lasts until the app closes */
        }
        setEnabledState(on);
        if (!on) setLocked(false);
        return true;
      },
    }),
    [ready, available, enabled, locked, signedIn, unlock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLock(): LockValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useLock outside LockProvider');
  return value;
}
