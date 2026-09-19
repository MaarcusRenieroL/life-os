import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

import { HabitNotificationsBell } from './habit-notifications-bell';

const TABS = [
  { label: 'Today', to: '/habits', end: true },
  { label: 'Habits', to: '/habits/list', end: false },
  { label: 'Weekly Grid', to: '/habits/weekly', end: false },
  { label: 'Calendar', to: '/habits/calendar', end: false },
  { label: 'Analytics', to: '/habits/analytics', end: false },
  { label: 'Archive', to: '/habits/archive', end: false },
];

export function HabitsLayout() {
  return (
    <div>
      {/* The bell lives on the module's own tab bar rather than the global app header: its feed is
          entirely habit-derived, and hanging it off AppShell would make every page in every module
          poll the habit endpoints. */}
      <TabNav tabs={TABS} trailing={<HabitNotificationsBell />} />
      <Outlet />
    </div>
  );
}
