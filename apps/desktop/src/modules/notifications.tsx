import { needsAnswer, type AppNotification } from '@life-os/core';
import { useEffect, useRef, useState } from 'react';

import { announceNew } from '../lib/os-notify';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote } from '../ui';

const when = (iso: string) => iso.slice(0, 16).replace('T', ' ');

/** The notifications, with everything you can do to them: read one, read all, delete one, clear read, clear all. */
export function NotificationList({ onChanged, compact }: { onChanged?: () => void; compact?: boolean }) {
  const api = useApi();
  const runner = useRunner();
  const items = useAsync(() => api.core.notifications(0, 50), [api]);
  const list = items.data?.content ?? [];
  const unread = list.filter((n) => !n.read).length;
  const hasRead = list.some((n) => n.read && !needsAnswer(n));
  const hasClearable = list.some((n) => !needsAnswer(n));

  const after = async () => {
    await items.reload();
    onChanged?.();
  };
  const clear = (readOnly: boolean) => {
    if (!readOnly && !window.confirm('Clear every notification? Questions that still need an answer are kept.')) return;
    void runner.run(() => api.core.clearNotifications(readOnly), after);
  };

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      {items.error && !items.data && <ErrorNote message={items.error} onRetry={items.reload} />}
      <div className="n-bar">
        <small className="muted">{items.data ? `${items.data.totalElements} notification${items.data.totalElements === 1 ? '' : 's'}${unread ? ` · ${unread} unread` : ''}` : 'Loading…'}</small>
        <div className="n-bar-end">
          {unread > 0 && <button className="link" onClick={() => void runner.run(() => api.core.markAllRead(), after)}>Mark all read</button>}
          {hasRead && <button className="link" onClick={() => clear(true)}>Clear read</button>}
          {hasClearable && <button className="link n-danger" onClick={() => clear(false)}>Clear all</button>}
        </div>
      </div>
      {items.data && list.length === 0 ? <Empty>You are all caught up.</Empty> : (
        <ul className={`list n-list${compact ? ' compact' : ''}`}>
          {list.map((n: AppNotification) => (
            <li key={n.id} className={n.read ? 'n-read' : 'clickable'} onClick={n.read || needsAnswer(n) ? undefined : () => void runner.run(() => api.core.markRead(n.id), after)}>
              {!n.read && <span className="n-dot" />}
              <span className="grow">
                <b>{n.title}</b>
                {n.body && <div className="muted">{n.body}</div>}
                {needsAnswer(n) && (
                  <div className="n-ask">
                    <span>Ollama couldn&apos;t process this. Use Claude instead? That costs money.</span>
                    <button className="primary g-btn" onClick={(e) => { e.stopPropagation(); void runner.run(() => api.core.answerAiFallback(n.id, true), after); }}>Use Claude</button>
                    <button className="ghost g-btn" onClick={(e) => { e.stopPropagation(); void runner.run(() => api.core.answerAiFallback(n.id, false), after); }}>Skip</button>
                  </div>
                )}
                <small className="muted">{n.module} · {when(n.occurredAt)}</small>
              </span>
              {!needsAnswer(n) && <button className="n-x" aria-label="Delete notification" title="Delete" onClick={(e) => { e.stopPropagation(); void runner.run(() => api.core.deleteNotification(n.id), after); }}>✕</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The bell in the top bar: unread badge that refreshes every minute, and a dropdown with the list. */
export function NotificationBell() {
  const api = useApi();
  const count = useAsync(() => api.core.unreadCount(), [api]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Every 30s: refresh the badge, and tell the OS about anything new (the app keeps running in the tray).
  useEffect(() => {
    const check = async () => {
      try {
        await announceNew((await api.core.notifications(0, 20)).content);
      } catch {
        /* offline or signed out: try again next time */
      }
      void count.reload();
    };
    void check();
    const timer = setInterval(() => void check(), 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const unread = count.data ?? 0;
  return (
    <div className="n-bell" ref={ref}>
      <button className={`ghost n-bell-btn${open ? ' on' : ''}`} aria-label="Notifications" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span className="n-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="panel n-pop">
          <div className="panel-head"><span className="label">Notifications</span></div>
          <NotificationList compact onChanged={() => void count.reload()} />
        </div>
      )}
    </div>
  );
}
