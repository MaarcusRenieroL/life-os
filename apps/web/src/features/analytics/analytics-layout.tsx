import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

const TABS = [
  { label: 'Overview', to: '/analytics', end: true },
  { label: 'Weekly', to: '/analytics/weekly', end: false },
  { label: 'Monthly', to: '/analytics/monthly', end: false },
  { label: 'Trends', to: '/analytics/trends', end: false },
  { label: 'Insights', to: '/analytics/insights', end: false },
  { label: 'Automation', to: '/analytics/automation', end: false },
  { label: 'Templates', to: '/analytics/templates', end: false },
  { label: 'History', to: '/analytics/history', end: false },
];

export function AnalyticsLayout() {
  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
