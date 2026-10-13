import { notificationTarget, type NotificationTarget } from '@life-os/core';

import type { Notification } from './core-api';

/** The page a notification should open: the item itself when it names one, otherwise the right tab of its module. */
export function targetPath(target: NotificationTarget): string {
  const { screen, tab, entity } = target;
  switch (screen) {
    case 'tasks':
      return entity ? `/tasks/list?task=${encodeURIComponent(entity.id)}` : '/tasks';
    case 'habits':
      return entity ? `/habits/${entity.id}` : '/habits';
    case 'goals':
      return entity ? `/goals/${entity.id}` : '/goals';
    case 'calendar':
      return '/calendar';
    case 'notes':
      return entity ? `/notes/${entity.id}` : '/notes';
    case 'vault':
      return '/vault';
    case 'workouts':
      return '/workouts';
    case 'jobs':
      return entity ? `/jobs/${entity.id}` : '/jobs/list';
    case 'finance':
      return entity?.kind === 'transaction' ? `/finance/transactions/${entity.id}` : `/finance/${tab ?? 'dashboard'}`;
    case 'analytics':
      return tab ? `/analytics/${tab}` : '/analytics';
    case 'email':
      return '/email';
    case 'settings':
      return tab ? `/settings#${tab}` : '/settings';
    default:
      return '/home';
  }
}

export const pathForNotification = (n: Notification) => targetPath(notificationTarget(n));
