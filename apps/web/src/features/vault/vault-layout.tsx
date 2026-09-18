import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

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
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
