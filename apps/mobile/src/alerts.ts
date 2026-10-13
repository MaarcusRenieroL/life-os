import type { AppNotification } from '@life-os/core';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { readJson, writeJson } from '@/grid/storage';
import { buildRuntime, loadSettings } from '@/lib/runtime';

// Real notifications on the phone: while the app is open it polls every 30s, and a background task asks the
// OS to wake it about every 15 minutes (a minimum - Android and iOS decide when). Anything new and unread is
// shown as a system notification. Instant delivery with the app closed would need Firebase push, which this
// does not use.

const SEEN_KEY = 'lifeos.notified';
const TASK = 'life-os-notification-check';
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/** Creates the Android channel and asks for permission once; returns whether alerts may be shown. */
export async function enableAlerts(): Promise<boolean> {
  if (!supported) return false;
  try {
    await Notifications.setNotificationChannelAsync('default', { name: 'Life OS', importance: Notifications.AndroidImportance.DEFAULT });
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Shows a system notification for each unread notification this phone has not announced yet.
 * The first run only records what already exists, so installing does not dump the whole backlog.
 */
export async function announceNew(items: AppNotification[]) {
  if (!supported) return;
  const stored = await readJson<string[]>(SEEN_KEY);
  const ids = new Set(stored ?? []);
  const fresh = items.filter((n) => !n.read && !ids.has(n.id));
  for (const n of items) ids.add(n.id);
  writeJson(SEEN_KEY, [...ids].slice(-200));
  if (!stored || fresh.length === 0) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  // A burst becomes one summary so catching up after a long gap does not stack up pop-ups.
  if (fresh.length > 3) await Notifications.scheduleNotificationAsync({ content: { title: 'Life OS', body: `${fresh.length} new notifications` }, trigger: null });
  // `data` rides along so tapping the notification can open the right module and item.
  else for (const n of fresh) await Notifications.scheduleNotificationAsync({ content: { title: n.title, body: n.body ?? n.module, data: { id: n.id, module: n.module, type: n.type, metadata: n.metadata ?? null } }, trigger: null });
}

if (supported) {
  // Defined at module level so the OS can run it when it wakes the app in the background.
  TaskManager.defineTask(TASK, async () => {
    try {
      const { api } = buildRuntime(await loadSettings(), () => {});
      await announceNew((await api.core.notifications(0, 20)).content);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundCheck() {
  if (!supported) return;
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  } catch {
    /* background work is unavailable (simulator, battery saver): the foreground check still runs */
  }
}
