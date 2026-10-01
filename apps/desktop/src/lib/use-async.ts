import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  /** Replace the cached value, for optimistic updates. */
  mutate: (next: T | ((prev: T | undefined) => T | undefined)) => void;
}

/** Loads `load()` on mount and whenever `deps` change; keeps showing old data while reloading. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const ticket = ++latest.current;
    setLoading(true);
    try {
      const next = await load();
      if (ticket !== latest.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (ticket === latest.current) setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, mutate: (next) => setData((prev) => (typeof next === 'function' ? (next as (p: T | undefined) => T | undefined)(prev) : next)) };
}

/** Runs a mutation, reports failure in `error`, and reloads whatever the caller names afterwards. */
export function useRunner() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run<T>(action: () => Promise<T>, after?: () => unknown): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      await after?.();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run, clear: () => setError(null) };
}
