import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, CalendarCheck, Clock, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { habitsApi } from './habits-api';
import type { HabitNotification, HabitNotificationType } from './types';

const ICONS: Record<HabitNotificationType, typeof Bell> = {
  STREAK_AT_RISK: AlertTriangle,
  STREAK_MILESTONE: Flame,
  WEEKLY_SUMMARY: CalendarCheck,
  REMINDER_SUGGESTION: Clock,
};

const SEVERITY_CLASSES: Record<HabitNotification['severity'], string> = {
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  info: 'text-muted-foreground',
};

/** Only the actionable ones drive the badge - a weekly recap shouldn't nag. */
function actionableCount(notifications: HabitNotification[]): number {
  return notifications.filter((notification) => notification.type === 'STREAK_AT_RISK').length;
}

function NotificationRow({ notification }: { notification: HabitNotification }) {
  const Icon = ICONS[notification.type];

  const body = (
    <div className="flex gap-3 rounded-md p-2 transition-colors hover:bg-muted">
      <Icon className={cn('mt-0.5 size-4 shrink-0', SEVERITY_CLASSES[notification.severity])} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="text-xs text-muted-foreground">{notification.message}</p>
      </div>
    </div>
  );

  return notification.habitId ? (
    <Link to={`/habits/${notification.habitId}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * In-app notification feed. Everything shown is computed live by the backend from habits, logs and
 * streaks - nothing is stored, so there's no read/unread state to keep, and no email or push is
 * involved. Polls while the habits module is open so a streak-at-risk warning clears shortly after
 * the habit is logged.
 */
export function HabitNotificationsBell() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['habits', 'notifications'],
    queryFn: habitsApi.notifications,
    refetchInterval: 5 * 60 * 1000,
  });

  const count = actionableCount(notifications);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Habit notifications">
          <Bell className="size-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {count > 0
              ? `${count} streak${count === 1 ? '' : 's'} at risk today`
              : 'Nothing needs your attention right now'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            You're all caught up. Streak warnings and your weekly recap will show up here.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="flex flex-col gap-0.5 p-1.5">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
