import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { analyticsApi } from './analytics-api';
import { categoryApi } from './category-api';
import { formatINR } from './utils';

export function AnalyticsPage() {
  const { data: trends = [] } = useQuery({ queryKey: ['finance', 'trends'], queryFn: analyticsApi.getTrends });
  const { data: merchants = [] } = useQuery({
    queryKey: ['finance', 'merchants', 'top'],
    queryFn: () => analyticsApi.getTopMerchants(8),
  });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });
  const expenseCategoryIds = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
  const { data: comparisons = [] } = useQuery({
    queryKey: ['finance', 'comparisons', expenseCategoryIds],
    queryFn: () => Promise.all(expenseCategoryIds.map((id) => analyticsApi.getCategoryComparison(id))),
    enabled: expenseCategoryIds.length > 0,
  });

  const avgMonthlySpend = trends.length ? trends.reduce((s, t) => s + t.totalSpend, 0) / trends.length : 0;
  const highestMonth = trends.length ? trends.reduce((a, b) => (b.totalSpend > a.totalSpend ? b : a)) : null;
  const lowestMonth = trends.length ? trends.reduce((a, b) => (b.totalSpend < a.totalSpend ? b : a)) : null;

  const trendBars = useMemo(() => {
    const max = Math.max(1, ...trends.map((t) => t.totalSpend));
    return trends.map((t) => ({ ...t, heightPct: Math.max((t.totalSpend / max) * 100, 4) }));
  }, [trends]);

  const categoryRows = useMemo(() => {
    const max = Math.max(1, ...comparisons.map((c) => c.currentMonthSpend));
    return comparisons
      .map((c) => ({
        ...c,
        name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Unknown',
        pct: (c.currentMonthSpend / max) * 100,
      }))
      .sort((a, b) => b.currentMonthSpend - a.currentMonthSpend);
  }, [comparisons, categories]);

  const insights = useMemo(() => {
    const list: { text: string; colorClass: string }[] = [];
    const riser = [...categoryRows].filter((c) => c.percentageChange > 0).sort((a, b) => b.percentageChange - a.percentageChange)[0];
    if (riser) {
      list.push({
        text: `${riser.name} is up ${riser.percentageChange.toFixed(0)}% vs last month, now ${formatINR(riser.currentMonthSpend)}.`,
        colorClass: 'bg-destructive',
      });
    }
    const dropper = [...categoryRows].filter((c) => c.percentageChange < 0).sort((a, b) => a.percentageChange - b.percentageChange)[0];
    if (dropper) {
      list.push({ text: `${dropper.name} dropped ${Math.abs(dropper.percentageChange).toFixed(0)}% vs last month.`, colorClass: 'bg-primary' });
    }
    if (highestMonth && avgMonthlySpend > 0) {
      const pctAbove = ((highestMonth.totalSpend - avgMonthlySpend) / avgMonthlySpend) * 100;
      if (pctAbove > 0) {
        list.push({
          text: `${highestMonth.month} was your highest month at ${formatINR(highestMonth.totalSpend)}, ${pctAbove.toFixed(0)}% above your average.`,
          colorClass: 'bg-yellow-500',
        });
      }
    }
    if (merchants[0]) {
      list.push({ text: `${merchants[0].merchant} is your top merchant at ${formatINR(merchants[0].totalSpend)} over this window.`, colorClass: 'bg-foreground/40' });
    }
    return list.slice(0, 4);
  }, [categoryRows, highestMonth, avgMonthlySpend, merchants]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Avg monthly spend" value={formatINR(avgMonthlySpend)} />
        <StatTile label="Highest month" value={highestMonth ? `${highestMonth.month} · ${formatINR(highestMonth.totalSpend)}` : '—'} />
        <StatTile label="Lowest month" value={lowestMonth ? `${lowestMonth.month} · ${formatINR(lowestMonth.totalSpend)}` : '—'} />
      </div>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Spending trend</SectionHeading>
        {trendBars.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Not enough history yet.</p>
        ) : (
          <div className="mt-3 flex h-32 items-end gap-2">
            {trendBars.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary/70" style={{ height: `${t.heightPct}%` }} />
                <span className="text-[10px] text-muted-foreground">{t.month}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Category trends</SectionHeading>
        {categoryRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No categorized spend yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {categoryRows.map((c) => (
              <li key={c.categoryId}>
                <div className="flex justify-between text-xs">
                  <span>{c.name}</span>
                  <span className={c.percentageChange > 15 ? 'text-destructive' : c.percentageChange > 0 ? 'text-yellow-600' : 'text-primary'}>
                    {c.percentageChange > 0 ? '+' : ''}{c.percentageChange.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${c.percentageChange > 15 ? 'bg-destructive' : c.percentageChange > 0 ? 'bg-yellow-500' : 'bg-primary'}`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Top merchants</SectionHeading>
        {merchants.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No merchant data yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {merchants.map((m) => (
              <li key={m.merchant} className="flex justify-between">
                <span>{m.merchant}</span>
                <span>{formatINR(m.totalSpend)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Insights</SectionHeading>
        {insights.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Not enough data yet for insights.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${insight.colorClass}`} />
                {insight.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
