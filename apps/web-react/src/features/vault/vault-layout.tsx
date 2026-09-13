import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Vault', to: '/vault/entries' },
  { label: 'Health', to: '/vault/health' },
  { label: 'Cards', to: '/vault/cards' },
  { label: 'Security', to: '/vault/security' },
  { label: 'Audit Log', to: '/vault/audit-log' },
  { label: 'Data', to: '/vault/data' },
];

export function VaultLayout() {
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
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
