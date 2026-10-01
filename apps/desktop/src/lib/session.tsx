import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { buildRuntime, isMock, loadSettings, saveSettings, type Runtime, type Settings } from './runtime';

interface SessionValue {
  runtime: Runtime | null;
  settings: Settings;
  signedIn: boolean;
  updateSettings: (next: Settings) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const markSignedOut = useCallback(() => setSignedIn(false), []);

  useEffect(() => {
    let cancelled = false;
    void buildRuntime(settings, markSignedOut).then(async (built) => {
      if (cancelled) return;
      setRuntime(built);
      setSignedIn(await built.client.isSignedIn());
    });
    return () => {
      cancelled = true;
    };
  }, [settings, markSignedOut]);

  const value = useMemo<SessionValue>(
    () => ({
      runtime,
      settings,
      signedIn,
      async updateSettings(next) {
        saveSettings(next);
        setSettings(next);
      },
      async signIn(email, password) {
        if (!runtime) throw new Error('Not ready yet');
        await runtime.client.signIn(email, password, isMock ? 'Preview' : 'Life OS Desktop', 'DESKTOP');
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

/** The API bundle for screens that only render once signed in. */
export function useApi() {
  const { runtime } = useSession();
  if (!runtime) throw new Error('API used before sign-in');
  return runtime.api;
}
