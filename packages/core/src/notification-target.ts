// Where a notification should take you. Every app turns this into its own navigation.

export type NotificationScreen = 'home' | 'tasks' | 'habits' | 'goals' | 'calendar' | 'notes' | 'vault' | 'workouts' | 'jobs' | 'finance' | 'analytics' | 'email' | 'settings';
export type EntityKind = 'task' | 'habit' | 'goal' | 'event' | 'job' | 'note' | 'transaction';

export interface NotificationTarget {
  screen: NotificationScreen;
  /** A tab inside the module, named the way each app's tabs are (e.g. `subscriptions`, `integrations`). */
  tab?: string;
  /** The specific item, when the notification names one. */
  entity?: { kind: EntityKind; id: string };
}

interface Notifying {
  module: string;
  type: string;
  metadata?: Record<string, string> | null;
}

const MODULE_SCREEN: Record<string, NotificationScreen> = {
  tasks: 'tasks',
  task: 'tasks',
  'habit-tracker': 'habits',
  habits: 'habits',
  goals: 'goals',
  calendar: 'calendar',
  notes: 'notes',
  vault: 'vault',
  security: 'vault',
  workouts: 'workouts',
  'job-tracker': 'jobs',
  jobs: 'jobs',
  'finance-tracker': 'finance',
  finance: 'finance',
  analytics: 'analytics',
  'email-hub': 'email',
  email: 'email',
};

const ENTITY_KEYS: [string, EntityKind][] = [
  ['taskId', 'task'],
  ['habitId', 'habit'],
  ['goalId', 'goal'],
  ['eventId', 'event'],
  ['jobId', 'job'],
  ['noteId', 'note'],
  ['transactionId', 'transaction'],
];

/** The tab a finance alert belongs on, judging by its type. */
function financeTab(type: string): string | undefined {
  if (/SUBSCRIPTION/.test(type)) return 'subscriptions';
  if (/BUDGET/.test(type)) return 'budgets';
  if (/REVIEW|TRANSACTION|DUPLICATE/.test(type)) return 'transactions';
  if (/IMPORT|GMAIL|STATEMENT/.test(type)) return 'import';
  return undefined;
}

export function notificationTarget(n: Notifying): NotificationTarget {
  const module = n.module.toLowerCase().replace(/_/g, '-');
  const type = n.type.toUpperCase();

  // Alerts raised by background jobs rather than by one module.
  if (module === 'batches' || /GMAIL/.test(type)) return { screen: 'settings', tab: 'integrations' };
  if (module === 'automation') return { screen: 'analytics', tab: /REPORT/.test(type) ? 'history' : 'automation' };
  if (/EMAIL_ALERT|NEEDS_REVIEW/.test(type) && (module === 'core' || module === 'email-hub')) return { screen: 'email' };

  const screen = MODULE_SCREEN[module] ?? 'home';
  const target: NotificationTarget = { screen };

  for (const [key, kind] of ENTITY_KEYS) {
    const id = n.metadata?.[key];
    if (id) {
      target.entity = { kind, id };
      break;
    }
  }
  if (screen === 'finance') target.tab = financeTab(type);
  return target;
}
