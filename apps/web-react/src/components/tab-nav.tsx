import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface TabNavItem {
  label: string;
  to: string;
  end?: boolean;
}

/** Shared module tab bar (job-tracker, notes, vault, finance all use this). */
export function TabNav({ tabs, trailing }: { tabs: TabNavItem[]; trailing?: ReactNode }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-1 border-b">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground',
                isActive ? 'border-primary text-primary' : 'border-transparent',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      {trailing}
    </nav>
  );
}
