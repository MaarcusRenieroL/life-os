import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { buildRuntime, DEFAULT_SETTINGS, isMock, loadSettings, saveSettings, type Runtime, type Settings } from './runtime';

interface SessionValue {
  ready: boolean;
  runtime: Runtime | null;
  settings: Settings;
  signedIn: boolean;
  updateSettings: (next: Settings) => Promise<void>;
  /** Pass `next` to sign in against new server settings in the same step (the memoised runtime is still the old one). */
  signIn: (email: string, password: string, next?: Settings) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const markSignedOut = useCallback(() => setSignedIn(false), []);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  // The runtime is a pure function of the settings, so derive it instead of mirroring it in state.
  const runtime = useMemo<Runtime | null>(() => (settings ? buildRuntime(settings, markSignedOut) : null), [settings, markSignedOut]);

  useEffect(() => {
    if (!runtime) return;
    let cancelled = false;
    void runtime.client.isSignedIn().then((yes) => !cancelled && setSignedIn(yes));
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const value = useMemo<SessionValue>(
    () => ({
      ready: settings !== null && runtime !== null,
      runtime,
      settings: settings ?? DEFAULT_SETTINGS,
      signedIn,
      async updateSettings(next) {
        await saveSettings(next);
        setSettings(next);
      },
      async signIn(email, password, next) {
        const target = next ? buildRuntime(next, markSignedOut) : runtime;
        if (!target) throw new Error('Not ready yet');
        await target.client.signIn(email, password, isMock ? 'Preview' : 'Life OS Mobile', 'MOBILE');
        if (next) {
          await saveSettings(next);
          setSettings(next);
        }
        setSignedIn(true);
      },
      async signOut() {
        await runtime?.client.signOut();
        setSignedIn(false);
      },
    }),
    [runtime, settings, signedIn, markSignedOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}

export function useApi() {
  const { runtime } = useSession();
  if (!runtime) throw new Error('API used before sign-in');
  return runtime.api;
}
