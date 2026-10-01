import type { ReactNode } from 'react';

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
