import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { ErrorNote, inr, Panel, Stat } from '../ui';

export function FinanceScreen() {
  const api = useApi();
  const summary = useAsync(() => api.finance.summary(), [api]);
  if (summary.error && !summary.data) return <ErrorNote message={summary.error} onRetry={summary.reload} />;
  const s = summary.data;
  return (
    <Panel title="This month">
      <div className="stats">
        <Stat label="Income" value={inr(s?.totalIncome)} />
        <Stat label="Spent" value={inr(s?.totalExpenses)} />
        <Stat label="Saved" value={inr(s?.savings)} />
        <Stat label="Fixed income" value={inr(s?.fixedMonthlyIncome)} />
      </div>
    </Panel>
  );
}
