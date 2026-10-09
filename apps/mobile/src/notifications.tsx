import { needsAnswer, type AppNotification } from '@life-os/core';
import { Bell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Btn, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { Text } from '@/text';
import { C } from '@/theme';
import { ErrorNote, Muted, tap } from '@/ui';

const when = (iso: string) => iso.slice(0, 16).replace('T', ' ');

/** The notifications, with everything you can do to them: read one, read all, delete one, clear read, clear all. */
export function NotificationList({ onChanged }: { onChanged?: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const items = useAsync(() => api.core.notifications(0, 50), api);
  const list = items.data?.content ?? [];
  const unread = list.filter((n) => !n.read).length;
  const hasRead = list.some((n) => n.read && !needsAnswer(n));
  const hasClearable = list.some((n) => !needsAnswer(n));

  const after = async () => {
    await items.reload();
    onChanged?.();
  };
  const clearAll = () =>
    Alert.alert('Clear every notification?', 'Questions that still need an answer are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: () => void runner.run(() => api.core.clearNotifications(false), after) },
    ]);

  return (
    <View>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {items.error && !items.data ? <ErrorNote message={items.error} onRetry={items.reload} /> : null}
      <Muted style={{ marginBottom: 10 }}>{items.data ? `${items.data.totalElements} notification${items.data.totalElements === 1 ? '' : 's'}${unread ? ` · ${unread} unread` : ''}` : 'Loading…'}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {unread > 0 ? <Btn kind="ghost" label="Mark all read" onPress={() => void runner.run(() => api.core.markAllRead(), after)} style={{ paddingVertical: 7 }} /> : null}
        {hasRead ? <Btn kind="ghost" label="Clear read" onPress={() => void runner.run(() => api.core.clearNotifications(true), after)} style={{ paddingVertical: 7 }} /> : null}
        {hasClearable ? <Btn kind="danger" label="Clear all" onPress={clearAll} style={{ paddingVertical: 7 }} /> : null}
      </View>
      {items.data && list.length === 0 ? <Muted>You are all caught up.</Muted> : null}
      {list.map((n: AppNotification) => (
        <Pressable
          key={n.id}
          onPress={n.read || needsAnswer(n) ? undefined : () => void runner.run(() => api.core.markRead(n.id), after)}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ffffff0f', opacity: n.read ? 0.6 : 1 }}>
          {!n.read ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent, marginTop: 6 }} /> : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: n.read ? '400' : '700' }}>{n.title}</Text>
            {n.body ? <Muted style={{ fontSize: 12 }}>{n.body}</Muted> : null}
            {needsAnswer(n) ? <Text style={{ color: C.gold, fontSize: 12 }}>Needs your answer on the web app.</Text> : null}
            <Muted style={{ fontSize: 11 }}>{n.module} · {when(n.occurredAt)}</Muted>
          </View>
          {!needsAnswer(n) ? (
            <Pressable hitSlop={10} accessibilityLabel="Delete notification" onPress={() => { tap(); void runner.run(() => api.core.deleteNotification(n.id), after); }}>
              <Text style={{ color: C.muted, fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
            </Pressable>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

/** The bell in the header: unread badge that refreshes every minute, and a sheet with the list. */
export function NotificationBell() {
  const api = useApi();
  const count = useAsync(() => api.core.unreadCount(), api);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => void count.reload(), 60_000);
    return () => clearInterval(timer);
  }, [count]);

  const unread = count.data ?? 0;
  return (
    <>
      <Pressable hitSlop={8} onPress={() => { tap(); setOpen(true); }} accessibilityLabel="Notifications" style={{ width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: C.input, backgroundColor: '#ffffff0d', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={16} color={C.text} />
        {unread > 0 ? (
          <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: C.destructive, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      {open ? (
        <Sheet title="Notifications" onClose={() => { setOpen(false); void count.reload(); }}>
          <NotificationList onChanged={() => void count.reload()} />
        </Sheet>
      ) : null}
    </>
  );
}
