import { describe, expect, it } from 'vitest';

import { notificationTarget } from './notification-target';

const n = (module: string, type: string, metadata: Record<string, string> | null = null) => ({ module, type, metadata });

describe('notificationTarget', () => {
  it('opens the module and the exact item a notification names', () => {
    expect(notificationTarget(n('tasks', 'TASK_OVERDUE', { taskId: 't1' }))).toEqual({ screen: 'tasks', entity: { kind: 'task', id: 't1' } });
    expect(notificationTarget(n('habit-tracker', 'HABIT_STREAK_AT_RISK', { habitId: 'h1', currentStreak: '2' }))).toEqual({ screen: 'habits', entity: { kind: 'habit', id: 'h1' } });
    expect(notificationTarget(n('calendar', 'EVENT_STARTING', { eventId: 'e1' }))).toEqual({ screen: 'calendar', entity: { kind: 'event', id: 'e1' } });
  });
  it('falls back to the module when there is no id', () => {
    expect(notificationTarget(n('tasks', 'TASK_DUE'))).toEqual({ screen: 'tasks' });
  });
  it('sends job alerts to the place that can fix them', () => {
    expect(notificationTarget(n('batches', 'GMAIL_SYNC_FAILED'))).toEqual({ screen: 'settings', tab: 'integrations' });
    expect(notificationTarget(n('automation', 'AUTOMATION'))).toEqual({ screen: 'analytics', tab: 'automation' });
    expect(notificationTarget(n('automation', 'REPORT'))).toEqual({ screen: 'analytics', tab: 'history' });
  });
  it('picks a finance tab from the alert type', () => {
    expect(notificationTarget(n('finance-tracker', 'SUBSCRIPTION_RENEWING'))).toEqual({ screen: 'finance', tab: 'subscriptions' });
    expect(notificationTarget(n('finance-tracker', 'BUDGET_EXCEEDED'))).toEqual({ screen: 'finance', tab: 'budgets' });
  });
  it('opens home for anything it does not recognise', () => {
    expect(notificationTarget(n('core', 'test'))).toEqual({ screen: 'home' });
    expect(notificationTarget(n('something-new', 'X'))).toEqual({ screen: 'home' });
  });
});
