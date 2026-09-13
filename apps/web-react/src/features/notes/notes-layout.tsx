import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

const TABS = [
  { label: 'All Notes', to: '/notes', end: true },
  { label: 'Search', to: '/notes/search', end: false },
  { label: 'Templates', to: '/notes/templates', end: false },
  { label: 'Graph', to: '/notes/graph', end: false },
  { label: 'Attachments', to: '/notes/attachments', end: false },
  { label: 'Settings', to: '/notes/settings', end: false },
];

export function NotesLayout() {
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b">
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
