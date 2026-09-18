import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

const TABS = [
  { label: 'Today', to: '/habits', end: true },
  { label: 'Habits', to: '/habits/list', end: false },
  { label: 'Weekly Grid', to: '/habits/weekly', end: false },
];

export function HabitsLayout() {
  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
