import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

// The Angular app never wired a tab bar for this module (job-tracker was
// `enabled: false` in its module config, so it fell back to no tabs at all -
// /jobs/resumes had no in-app link whatsoever). Fixing that here.
const TABS = [
  { label: 'Jobs', to: '/jobs', end: true },
  { label: 'Add a Job', to: '/jobs/discovery', end: false },
  { label: 'Resume', to: '/jobs/resumes', end: false },
];

export function JobTrackerLayout() {
  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
