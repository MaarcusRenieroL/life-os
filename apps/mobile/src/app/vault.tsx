import { useState } from 'react';

import { Screen, Seg } from '@/kit';
import { AuditTab, CardsTab, DataTab, EntriesTab, HealthTab, SecurityTab, VaultGate } from '@/modules/vault';

const TABS = [{ id: 'vault', label: 'Vault' }, { id: 'health', label: 'Health' }, { id: 'cards', label: 'Cards' }, { id: 'security', label: 'Security' }, { id: 'audit', label: 'Audit log' }, { id: 'data', label: 'Data' }] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Vault() {
  const [tab, setTab] = useState<TabId>('vault');
  return (
    <Screen title="Password Manager">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      <VaultGate>
        {tab === 'vault' ? <EntriesTab /> : tab === 'health' ? <HealthTab /> : tab === 'cards' ? <CardsTab /> : tab === 'security' ? <SecurityTab /> : tab === 'audit' ? <AuditTab /> : <DataTab />}
      </VaultGate>
    </Screen>
  );
}
