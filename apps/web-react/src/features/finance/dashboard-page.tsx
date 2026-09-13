import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { accountApi } from './account-api';
import { analyticsApi } from './analytics-api';
import { budgetApi } from './budget-api';
import { categoryApi } from './category-api';
import { merchantApi } from './merchant-api';
import { recurringPatternApi } from './recurring-pattern-api';
import { transactionApi } from './transaction-api';
import { formatINR, monthlyEquivalent } from './utils';

const UNUSED_IDLE_DAYS = 30;

export function FinanceDashboardPage() {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });
  const { data: summary } = useQuery({ queryKey: ['finance', 'dashboard'], queryFn: analyticsApi.getDashboardSummary });
  const { data: trends = [] } = useQuery({ queryKey: ['finance', 'trends'], queryFn: analyticsApi.getTrends });
  const { data: budgets = [] } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: budgetApi.getBudgets });
  const { data: txPage } = useQuery({
    queryKey: ['finance', 'transactions', 'dashboard'],
    queryFn: () => transactionApi.getTransactions(0, 50),
  });
  const { data: patterns = [] } = useQuery({ queryKey: ['finance', 'recurring'], queryFn: recurringPatternApi.getPatterns });
  const { data: merchants = [] } = useQuery({ queryKey: ['finance', 'merchants'], queryFn: merchantApi.getMerchants });

  const expenseCategoryIds = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
  const budgetedCategoryIds = budgets.map((b) => b.categoryId);
  const comparisonIds = Array.from(new Set([...expenseCategoryIds, ...budgetedCategoryIds]));

  const { data: comparisons = [] } = useQuery({
    queryKey: ['finance', 'comparisons', comparisonIds],
    queryFn: () => Promise.all(comparisonIds.map((id) => analyticsApi.getCategoryComparison(id))),
    enabled: comparisonIds.length > 0,
  });

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');

  const totalIncome = summary?.totalIncome ?? null;
  const totalExpenses = summary?.totalExpenses ?? null;
  const fixedMonthlyIncome = summary?.fixedMonthlyIncome ?? null;
  // Income is the fixed salary, not the sum of this period's credit transactions -
  // those are just additions (transfers, refunds) layered on top. Savings/rate
  // follow the same definition, falling back to the transaction total if unset.
  const effectiveIncome = fixedMonthlyIncome ?? totalIncome ?? 0;
  const savings = effectiveIncome - (totalExpenses ?? 0);
  const savingsRate = effectiveIncome > 0 ? (savings / effectiveIncome) * 100 : 0;

  const transactions = txPage?.content ?? [];
  const needsReviewCount = transactions.filter((t) => t.categoryId === null && t.type !== 'CREDIT').length;

  const trendBars = useMemo(() => {
    const max = Math.max(1, ...trends.map((t) => t.totalSpend));
    return trends.map((t, i) => ({
      ...t,
      heightPct: Math.max((t.totalSpend / max) * 100, 4),
      current: i === trends.length - 1,
    }));
  }, [trends]);

  const categorySpend = useMemo(() => {
    const top = [...comparisons]
      .filter((c) => expenseCategoryIds.includes(c.categoryId))
      .sort((a, b) => b.currentMonthSpend - a.currentMonthSpend)
      .slice(0, 5);
    const max = Math.max(1, ...top.map((c) => c.currentMonthSpend));
    return top.map((c) => ({
      ...c,
      name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Unknown',
      pct: (c.currentMonthSpend / max) * 100,
    }));
  }, [comparisons, categories, expenseCategoryIds]);

  const budgetRows = useMemo(
    () =>
      budgets.map((b) => {
        const comparison = comparisons.find((c) => c.categoryId === b.categoryId);
        const spend = comparison?.currentMonthSpend ?? 0;
        const pct = b.budgetAmount > 0 ? (spend / b.budgetAmount) * 100 : 0;
        const colorClass = pct >= 100 ? 'bg-destructive' : pct >= (b.alertThreshold || 80) ? 'bg-yellow-500' : 'bg-primary';
        return {
          ...b,
          categoryName: categories.find((c) => c.id === b.categoryId)?.name ?? 'Unknown',
          spend,
          pct: Math.min(100, pct),
          colorClass,
        };
      }),
    [budgets, comparisons, categories],
  );

  const subscriptions = useMemo(() => {
    const now = Date.now();
    return patterns.map((p) => {
      const merchant = merchants.find((m) => m.id === p.merchantId);
      const monthly = monthlyEquivalent(p.averageAmount, p.frequency);
      const idleDays = p.lastTransactionDate ? Math.floor((now - new Date(p.lastTransactionDate).getTime()) / 86_400_000) : Infinity;
      const daysUntil = p.nextExpectedDate ? Math.ceil((new Date(p.nextExpectedDate).getTime() - now) / 86_400_000) : null;
      return {
        ...p,
        merchantName: merchant?.name ?? 'Unknown',
        monthly,
        unused: idleDays >= UNUSED_IDLE_DAYS,
        renewingSoon: daysUntil !== null && daysUntil >= 0 && daysUntil <= 7,
        daysUntil,
      };
    });
  }, [patterns, merchants]);

  const upcomingRenewals = subscriptions.filter((s) => s.renewingSoon).sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));

  const attentionItems = useMemo(() => {
    const items: { text: string; link: string }[] = [];
    if (needsReviewCount > 0) {
      items.push({ text: `${needsReviewCount} transaction(s) need review`, link: '/finance/transactions' });
    }
    for (const b of budgetRows.filter((r) => r.pct >= 100)) {
      items.push({
        text: `${b.categoryName} budget exceeded — ${formatINR(b.spend - b.budgetAmount)} over the ${formatINR(b.budgetAmount)} cap`,
        link: '/finance/budgets',
      });
    }
    for (const r of upcomingRenewals) {
      items.push({
        text: `${r.merchantName} renews in ${r.daysUntil} day(s) — ${formatINR(r.averageAmount)}`,
        link: '/finance/subscriptions',
      });
    }
    return items;
  }, [needsReviewCount, budgetRows, upcomingRenewals]);

  async function saveIncome() {
    const value = Number(incomeInput);
    if (Number.isNaN(value)) return;
    await analyticsApi.updateMonthlyIncome(value);
    setEditingIncome(false);
    queryClient.invalidateQueries({ queryKey: ['finance', 'dashboard'] });
  }

  if (!summary) {
    return <p className="text-sm text-muted-foreground">Loading your finances…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          {needsReviewCount > 0 && (
            <Link to="/finance/transactions" className="text-xs text-primary hover:underline">
              {needsReviewCount} need review
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Button render={<Link to="/finance/import" />} variant="outline" size="sm">Upload statement</Button>
          <Button render={<Link to="/finance/transactions" />} size="sm">+ Add transaction</Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Monthly income</span>
            {!editingIncome && (
              <button onClick={() => { setEditingIncome(true); setIncomeInput(String(fixedMonthlyIncome ?? '')); }}>✎</button>
            )}
          </div>
          {editingIncome ? (
            <div className="mt-1 flex gap-1">
              <Input
                autoFocus
                type="number"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveIncome();
                  if (e.key === 'Escape') setEditingIncome(false);
                }}
                className="h-7 text-sm"
              />
              <Button size="sm" onClick={() => void saveIncome()}>Save</Button>
            </div>
          ) : (
            <div className="text-xl font-semibold">{formatINR(effectiveIncome)}</div>
          )}
        </div>
        <StatTile label="Total expenses" value={formatINR(totalExpenses ?? 0)} />
        <StatTile label="Savings" value={formatINR(savings)} />
        <StatTile label="Savings rate" value={`${savingsRate.toFixed(1)}%`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg border bg-card p-5">
          <SectionHeading>Spending trend</SectionHeading>
          {trendBars.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Not enough history yet.</p>
          ) : (
            <div className="mt-3 flex h-32 items-end gap-2">
              {trendBars.map((t) => (
                <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${t.current ? 'bg-primary' : 'bg-foreground/18'}`}
                    style={{ height: `${t.heightPct}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{t.month}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5">
          <SectionHeading>Needs your attention</SectionHeading>
          <ul className="mt-2 flex flex-col gap-2">
            {attentionItems.map((item, i) => (
              <li key={i}>
                <Link to={item.link} className="text-sm hover:underline">{item.text}</Link>
              </li>
            ))}
            {attentionItems.length === 0 && <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <SectionHeading>Top spend categories</SectionHeading>
          {categorySpend.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No categorized spend yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {categorySpend.map((c) => (
                <li key={c.categoryId}>
                  <div className="flex justify-between text-xs"><span>{c.name}</span><span>{formatINR(c.currentMonthSpend)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${c.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5">
          <SectionHeading>Budgets</SectionHeading>
          {budgetRows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No budgets set up yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {budgetRows.map((b) => (
                <li key={b.id}>
                  <div className="flex justify-between text-xs"><span>{b.categoryName}</span><span>{formatINR(b.spend)} / {formatINR(b.budgetAmount)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={`h-1.5 rounded-full ${b.colorClass}`} style={{ width: `${b.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {accounts.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No transactions yet.</p>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
