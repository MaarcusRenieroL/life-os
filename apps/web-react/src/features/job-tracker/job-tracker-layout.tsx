import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

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
      <nav className="mb-6 flex gap-1 border-b">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                isActive && 'border-primary text-foreground',
                !isActive && 'border-transparent',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
