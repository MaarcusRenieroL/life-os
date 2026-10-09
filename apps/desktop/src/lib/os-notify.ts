import type { AppNotification } from '@life-os/core';

const KEY = 'lifeos.notified';
const isTauri = () => '__TAURI_INTERNALS__' in window;

function seenIds(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function saveSeen(ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-300)));
  } catch {
    /* storage unavailable: worst case old notifications pop again after a restart */
  }
}

async function show(title: string, body: string) {
  if (isTauri()) {
    const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
    if (!(await isPermissionGranted()) && (await requestPermission()) !== 'granted') return;
    sendNotification({ title, body });
  } else if ('Notification' in window) {
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, { body });
  }
}

/**
 * Pops a system notification for each unread notification this device has not announced yet.
 * The first run only records what already exists, so installing the app does not dump the whole backlog.
 */
export async function announceNew(items: AppNotification[]) {
  const seen = seenIds();
  const ids = new Set(seen ?? []);
  const fresh = items.filter((n) => !n.read && !ids.has(n.id));
  for (const n of items) ids.add(n.id);
  saveSeen(ids);
  if (!seen) return;
  // A burst becomes one summary so a catch-up after sleep does not stack up ten pop-ups.
  if (fresh.length > 3) await show('Life OS', `${fresh.length} new notifications`);
  else for (const n of fresh) await show(n.title, n.body ?? n.module);
}
