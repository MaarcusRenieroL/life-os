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
  { code: 'JT', name: 'Job Tracker', enabled: false },
  { code: 'TK', name: 'Tasks', enabled: false },
  { code: 'FN', name: 'Finance', enabled: false },
  { code: 'JR', name: 'Journal', enabled: false },
  { code: 'WK', name: 'Workouts', enabled: false },
  { code: 'SB', name: 'Subscriptions', enabled: false },
  { code: 'GL', name: 'Goals', enabled: false },
  { code: 'HB', name: 'Habits', enabled: false },
  { code: 'CL', name: 'Calendar', enabled: false },
  { code: 'NT', name: 'Notes', enabled: false },
  { code: 'AN', name: 'Analytics', enabled: false },
  { code: 'NB', name: 'Nutrition', enabled: false },
  { code: 'LN', name: 'Learning', enabled: false },
  { code: 'PJ', name: 'Projects', enabled: false },
];
