import { useState } from 'react';

import { Screen, Seg } from '@/kit';
import { HistoryTab, RulesTab, TemplatesTab } from '@/modules/automation';
import { InsightsTab, OverviewTab, PeriodTab, TrendsTab } from '@/modules/analytics';

const TABS = [
  { id: 'overview', label: 'Overview' }, { id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }, { id: 'trends', label: 'Trends' },
  { id: 'insights', label: 'Insights' }, { id: 'automation', label: 'Automation' }, { id: 'templates', label: 'Templates' }, { id: 'history', label: 'History' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Analytics() {
  const [tab, setTab] = useState<TabId>('overview');
  return (
    <Screen title="Analytics">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'overview' ? <OverviewTab /> : tab === 'weekly' ? <PeriodTab period="WEEK" /> : tab === 'monthly' ? <PeriodTab period="MONTH" /> : tab === 'trends' ? <TrendsTab /> : tab === 'insights' ? <InsightsTab /> : tab === 'automation' ? <RulesTab /> : tab === 'templates' ? <TemplatesTab /> : <HistoryTab />}
    </Screen>
  );
}
