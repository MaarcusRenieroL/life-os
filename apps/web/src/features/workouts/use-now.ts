import { useEffect, useState } from 'react';

/** Re-renders every `intervalMs` with the current time - for live elapsed/rest timers. */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const handle = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs, active]);

  return now;
}
