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

/** Asks the OS once (macOS shows its prompt the first time) and reports whether banners are allowed. */
export async function enableOsNotifications(): Promise<boolean> {
  try {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('notify_permission');
    }
    if ('Notification' in window) {
      if (Notification.permission === 'default') await Notification.requestPermission();
      return Notification.permission === 'granted';
    }
  } catch {
    /* fall through: treated as not allowed */
  }
  return false;
}

export async function show(title: string, body: string, id?: string) {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    // The app's own macOS code shows it; elsewhere it answers false and the generic plugin does the job.
    if (await invoke<boolean>('notify_os', { title, body, id })) return;
    const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
    if (!(await isPermissionGranted()) && (await requestPermission()) !== 'granted') return;
    sendNotification({ title, body });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
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
  else for (const n of fresh) await show(n.title, n.body ?? n.module, n.id);
}
