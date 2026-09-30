// Mirrors apps/web's core/config/app-modules.ts. This is the static registry of
// every planned module; `enabled` here is the *default* - core-api's
// /v1/core/modules per-user overrides win over it (see useModuleSettings).

export interface AppModuleTab {
  label: string;
  path: string;
}

export interface AppModuleConfig {
  code: string;
  name: string;
  enabled: boolean;
  path?: string;
  tabs?: AppModuleTab[];
}

export const APP_MODULES: AppModuleConfig[] = [
  {
    code: 'PM',
    name: 'Password Manager',
    enabled: true,
    path: '/vault/entries',
    tabs: [
      { label: 'Vault', path: '/vault/entries' },
      { label: 'Health', path: '/vault/health' },
      { label: 'Cards', path: '/vault/cards' },
      { label: 'Security', path: '/vault/security' },
      { label: 'Audit Log', path: '/vault/audit-log' },
      { label: 'Data', path: '/vault/data' },
    ],
  },
  {
    code: 'JT',
    name: 'Job Tracker',
    enabled: true,
    path: '/jobs',
    tabs: [
      { label: 'Dashboard', path: '/jobs' },
      { label: 'Jobs', path: '/jobs/list' },
      { label: 'Add a Job', path: '/jobs/discovery' },
      { label: 'Resume', path: '/jobs/resumes' },
      { label: 'Analytics', path: '/jobs/analytics' },
    ],
  },
  {
    code: 'TK',
    name: 'Tasks',
    enabled: true,
    path: '/tasks',
    tabs: [
      { label: 'Today', path: '/tasks' },
      { label: 'Upcoming', path: '/tasks/upcoming' },
      { label: 'List', path: '/tasks/list' },
      { label: 'Board', path: '/tasks/board' },
      { label: 'Completed', path: '/tasks/completed' },
      { label: 'Analytics', path: '/tasks/analytics' },
    ],
  },
  {
    code: 'FN',
    name: 'Finance',
    enabled: true,
    path: '/finance/dashboard',
    tabs: [
      { label: 'Dashboard', path: '/finance/dashboard' },
      { label: 'Transactions', path: '/finance/transactions' },
      { label: 'Subscriptions', path: '/finance/subscriptions' },
      { label: 'Budgets', path: '/finance/budgets' },
      { label: 'Analytics', path: '/finance/analytics' },
      { label: 'Report', path: '/finance/report' },
      { label: 'Import', path: '/finance/import' },
      { label: 'Rules', path: '/finance/rules' },
      { label: 'Accounts', path: '/finance/accounts' },
      { label: 'Categories', path: '/finance/categories' },
      { label: 'Merchants', path: '/finance/merchants' },
    ],
  },
  {
    code: 'WK',
    name: 'Workouts',
    enabled: true,
    path: '/workouts',
    tabs: [
      { label: 'Today', path: '/workouts' },
      { label: 'Routines', path: '/workouts/routines' },
      { label: 'Exercises', path: '/workouts/exercises' },
      { label: 'History', path: '/workouts/history' },
      { label: 'Records', path: '/workouts/records' },
      { label: 'Body', path: '/workouts/body' },
      { label: 'Analytics', path: '/workouts/analytics' },
    ],
  },
  { code: 'SB', name: 'Subscriptions', enabled: false },
  {
    code: 'GL',
    name: 'Goals',
    enabled: true,
    path: '/goals',
    tabs: [
      { label: 'Goals', path: '/goals' },
      { label: 'Timeline', path: '/goals/timeline' },
      { label: 'Reviews', path: '/goals/reviews' },
    ],
  },
  {
    code: 'HB',
    name: 'Habits',
    enabled: true,
    path: '/habits',
    tabs: [
      { label: 'Today', path: '/habits' },
      { label: 'Habits', path: '/habits/list' },
      { label: 'Weekly Grid', path: '/habits/weekly' },
    ],
  },
  {
    code: 'CL',
    name: 'Calendar',
    enabled: true,
    path: '/calendar',
    tabs: [
      { label: 'Month', path: '/calendar' },
      { label: 'Week', path: '/calendar/week' },
      { label: 'Day', path: '/calendar/day' },
      { label: 'Agenda', path: '/calendar/agenda' },
    ],
  },
  {
    code: 'NT',
    name: 'Notes',
    enabled: true,
    path: '/notes',
    tabs: [
      { label: 'All Notes', path: '/notes' },
      { label: 'Journal', path: '/notes/journal' },
      { label: 'Search', path: '/notes/search' },
      { label: 'Templates', path: '/notes/templates' },
      { label: 'Graph', path: '/notes/graph' },
      { label: 'Attachments', path: '/notes/attachments' },
      { label: 'Settings', path: '/notes/settings' },
    ],
  },
  { code: 'AN', name: 'Analytics', enabled: false },
  { code: 'NB', name: 'Nutrition', enabled: false },
  { code: 'LN', name: 'Learning', enabled: false },
  { code: 'PJ', name: 'Projects', enabled: false },
];
