import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

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
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
