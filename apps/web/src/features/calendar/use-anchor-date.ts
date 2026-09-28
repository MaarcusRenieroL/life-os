import { useSearchParams } from 'react-router-dom';

/** Shared "which date is this view centered on" state, kept in the URL (?d=yyyy-MM-dd) rather
 * than component state so switching tabs (Month/Week/Day/Agenda) or reloading the page keeps the
 * same date instead of always snapping back to today. */
export function useAnchorDate(): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const anchor = params.get('d') ?? new Date().toISOString().slice(0, 10);

  function setAnchor(next: string) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('d', next);
    setParams(nextParams, { replace: true });
  }

  return [anchor, setAnchor];
}
