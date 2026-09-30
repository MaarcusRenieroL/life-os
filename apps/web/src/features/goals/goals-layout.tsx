import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

const TABS = [
  { label: 'Goals', to: '/goals', end: true },
  { label: 'Timeline', to: '/goals/timeline', end: false },
  { label: 'Reviews', to: '/goals/reviews', end: false },
];

export function GoalsLayout() {
  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
