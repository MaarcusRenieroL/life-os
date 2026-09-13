import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Dashboard', to: '/finance/dashboard' },
  { label: 'Transactions', to: '/finance/transactions' },
  { label: 'Subscriptions', to: '/finance/subscriptions' },
  { label: 'Budgets', to: '/finance/budgets' },
  { label: 'Analytics', to: '/finance/analytics' },
  { label: 'Report', to: '/finance/report' },
  { label: 'Import', to: '/finance/import' },
  { label: 'Rules', to: '/finance/rules' },
  { label: 'Accounts', to: '/finance/accounts' },
  { label: 'Categories', to: '/finance/categories' },
  { label: 'Merchants', to: '/finance/merchants' },
];

export function FinanceLayout() {
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
