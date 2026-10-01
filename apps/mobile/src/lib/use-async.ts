import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  /** Replace the cached value, for optimistic updates. */
  mutate: (next: T | ((prev: T | undefined) => T | undefined)) => void;
}

/**
 * Loads on mount and again whenever `key` changes (pass the thing `load` closes over, e.g. the api);
 * keeps showing the old data while reloading.
 */
export function useAsync<T>(load: () => Promise<T>, key: unknown): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  // Fetches and stores the result. State is only touched after the await, never synchronously, so it
  // is safe to start from an effect.
  const run = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const next = await loadRef.current();
      if (ticket !== latest.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (ticket === latest.current) setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await run();
  }, [run]);

  useEffect(() => {
    void run();
  }, [run, key]);

  return { data, error, loading, reload, mutate: (next) => setData((prev) => (typeof next === 'function' ? (next as (p: T | undefined) => T | undefined)(prev) : next)) };
}

/** Runs a mutation, reports failure in `error`, then calls `after` (usually a reload). */
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
  return { error, busy, run };
}
