import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useApi } from './lib/session';

/** One line in, routed by the local model to the right module. */
export function QuickCapture({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const api = useApi();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.quickCapture(text.trim());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture that');
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="panel capture" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <span className="label">Quick capture</span>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder='e.g. "pay electricity bill 1200 friday" or "call mom tomorrow"' disabled={busy} />
        {error && <p className="error">{error}</p>}
        <small className="muted">{busy ? 'Routing…' : 'Enter to send · Esc to close'}</small>
      </form>
    </div>
  );
}
