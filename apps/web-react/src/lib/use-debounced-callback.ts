import { useCallback, useEffect, useRef } from 'react';

/** Returns a stable function that calls `fn` `delayMs` after the last invocation. */
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  return useCallback(
    (...args: Args) => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
