import { useEffect, type ReactNode } from 'react';

export function Panel({ title, action, children, accent }: { title?: string; action?: ReactNode; children: ReactNode; accent?: string }) {
  return (
    <section className="panel" style={accent ? { borderColor: accent } : undefined}>
      {(title || action) && (
        <div className="panel-head">
          <span className="label">{title}</span>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p className="error">
      {message} {onRetry && <button className="link" onClick={onRetry}>Retry</button>}
    </p>
  );
}

export function Bar({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  return (
    <div className="xp-track">
      <div className="xp-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <b>{value}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={t.id === value ? 'tab active' : 'tab'} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`panel modal${wide ? ' wide' : ''}`}>
        <div className="panel-head">
          <span className="label">{title}</span>
          <button className="link" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Select<T extends string>({ value, onChange, options, placeholder }: { value: T | ''; onChange: (v: T | '') => void; options: readonly { value: T; label: string }[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T | '')}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** "URGENT" -> "Urgent", "FULL_BODY" -> "Full body" */
export const pretty = (s: string | null | undefined) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '');
export const opts = <T extends string>(values: readonly T[]) => values.map((v) => ({ value: v, label: pretty(v) }));

export const money = (n: number | null | undefined, currency = 'INR') =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

export function ProgressRow({ label, pct, right }: { label: string; pct: number; right?: ReactNode }) {
  return (
    <div className="progress-row">
      <div className="row"><span>{label}</span><small className="muted">{right ?? `${Math.round(pct)}%`}</small></div>
      <Bar pct={pct} />
    </div>
  );
}

/** Tiny horizontal bar chart: label, value bar, value text. */
export function Bars({ rows, format = (n: number) => String(Math.round(n)) }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <small className="muted">{r.label}</small>
          <Bar pct={(r.value / max) * 100} />
          <small>{format(r.value)}</small>
        </div>
      ))}
    </div>
  );
}
