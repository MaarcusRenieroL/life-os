import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { buildRuntime, DEFAULT_SETTINGS, isMock, loadSettings, saveSettings, type Runtime, type Settings } from './runtime';

interface SessionValue {
  ready: boolean;
  runtime: Runtime | null;
  settings: Settings;
  signedIn: boolean;
  updateSettings: (next: Settings) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const markSignedOut = useCallback(() => setSignedIn(false), []);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;
    let cancelled = false;
    const built = buildRuntime(settings, markSignedOut);
    setRuntime(built);
    void built.client.isSignedIn().then((yes) => !cancelled && setSignedIn(yes));
    return () => {
      cancelled = true;
    };
  }, [settings, markSignedOut]);

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
      async signIn(email, password) {
        if (!runtime) throw new Error('Not ready yet');
        await runtime.client.signIn(email, password, isMock ? 'Preview' : 'Life OS Mobile', 'MOBILE');
        setSignedIn(true);
      },
      async signOut() {
        await runtime?.client.signOut();
        setSignedIn(false);
      },
    }),
    [runtime, settings, signedIn],
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
