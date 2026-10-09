import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { coreApi, type Notification } from './core-api';
import { pathForNotification } from './notification-route';

/** Unread count polls every 30s so the badge stays roughly live without needing a websocket -
 * cheap enough for a single-user app, and the notification list itself only refetches when the
 * panel is actually open (see the `enabled` flag below). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ['core', 'notifications', 'unread-count'],
    queryFn: coreApi.getUnreadCount,
    // Mounted on every authenticated route (see AppShell), so this polls constantly regardless of
    // whether the bell is visible/relevant right now. 3 min is plenty fresh for a single-user app
    // with no concurrent writers; refetchOnWindowFocus overrides the app-wide default (off, see
    // main.tsx) just for this query so switching back to the tab still feels live.
    refetchInterval: 3 * 60_000,
    refetchOnWindowFocus: true,
    retry: false,
    throwOnError: false,
  });

  const { data: page, isLoading } = useQuery({
    queryKey: ['core', 'notifications', 'list'],
    queryFn: () => coreApi.getNotifications(0, 20),
    enabled: open,
    retry: false,
    throwOnError: false,
  });

  const unreadCount = unread?.count ?? 0;
  const hasAny = (page?.content.length ?? 0) > 0;
  const hasRead = page?.content.some((n) => n.read) ?? false;

  async function markRead(id: string) {
    try {
      await coreApi.markNotificationRead(id);
      void queryClient.invalidateQueries({ queryKey: ['core', 'notifications'] });
    } catch {
      // Best-effort - the item just stays unread if this fails, no need to surface an error
      // for a low-stakes action the user can just retry by clicking again.
    }
  }

  async function markAllRead() {
    try {
      await coreApi.markAllNotificationsRead();
      void queryClient.invalidateQueries({ queryKey: ['core', 'notifications'] });
    } catch {
      // Same best-effort reasoning as markRead above.
    }
  }

  async function remove(id: string) {
    try {
      await coreApi.deleteNotification(id);
      void queryClient.invalidateQueries({ queryKey: ['core', 'notifications'] });
    } catch {
      // Best-effort - the row just stays if the delete fails; the user can try again.
    }
  }

  async function clear(readOnly: boolean) {
    try {
      await coreApi.clearNotifications(readOnly);
      void queryClient.invalidateQueries({ queryKey: ['core', 'notifications'] });
    } catch {
      // Same best-effort reasoning as above.
    }
  }

  async function setAiFallback(id: string, approved: boolean) {
    try {
      await coreApi.setAiFallbackApproval(id, approved);
      void queryClient.invalidateQueries({ queryKey: ['core', 'notifications'] });
    } catch {
      // Best-effort - user can retry from the panel if this silently fails.
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Notifications
          </span>
          <div className="flex items-center gap-0.5">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => void markAllRead()}>
                Mark all read
              </Button>
            )}
            {hasRead && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => void clear(true)}>
                Clear read
              </Button>
            )}
            {hasAny && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive" onClick={() => void clear(false)}>
                Clear all
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-[11px] text-muted-foreground">Loading…</div>
          ) : !page || page.content.length === 0 ? (
            <div className="p-6 text-center text-[11px] text-muted-foreground">
              Nothing yet - you're all caught up.
            </div>
          ) : (
            <div className="flex flex-col">
              {page.content.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={() => {
                    if (!notification.read) void markRead(notification.id);
                    setOpen(false);
                    navigate(pathForNotification(notification));
                  }}
                  onDelete={() => void remove(notification.id)}
                  onAiFallback={(approved) => void setAiFallback(notification.id, approved)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification,
  onOpen,
  onDelete,
  onAiFallback,
}: {
  notification: Notification;
  onOpen: () => void;
  onDelete: () => void;
  onAiFallback: (approved: boolean) => void;
}) {
  const needsAiDecision = notification.requiresAiFallbackApproval && notification.aiFallbackApproved === null;

  return (
    <div className="group relative border-b last:border-b-0">
    {/* A pending AI question can't be deleted from here: it needs a yes or a no first. */}
    {!needsAiDecision && (
      <button
        type="button"
        aria-label="Delete notification"
        onClick={onDelete}
        className="absolute top-2 right-2 z-10 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10 hover:text-destructive focus-visible:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    )}
    <button
      type="button"
      onClick={() => !needsAiDecision && onOpen()}
      className={`flex w-full flex-col gap-1 px-3.5 py-3 text-left transition-colors hover:bg-foreground/5 ${
        notification.read ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 pr-6">
        <span className="text-sm font-medium">{notification.title}</span>
        {!notification.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
      </div>
      {notification.body && <p className="text-xs text-muted-foreground">{notification.body}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.occurredAt), { addSuffix: true })}
          {' · '}
          {notification.module}
        </span>
      </div>
      {needsAiDecision && (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2">
          <span className="flex-1 text-[11px] text-yellow-700 dark:text-yellow-400">
            Ollama couldn't process this - use Claude instead? This costs money.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              onAiFallback(true);
            }}
          >
            <Check className="size-3" /> Use Claude
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              onAiFallback(false);
            }}
          >
            <X className="size-3" /> Skip
          </Button>
        </div>
      )}
    </button>
    </div>
  );
}
