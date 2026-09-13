import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { BudgetDialog } from './budget-dialog';
import { budgetApi } from './budget-api';
import { categoryApi } from './category-api';
import { analyticsApi } from './analytics-api';
import type { BudgetResponse } from './types';
import { formatINR } from './utils';

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: budgetApi.getBudgets });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });

  const expenseCategoryIds = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
  const comparisonIds = Array.from(new Set([...expenseCategoryIds, ...budgets.map((b) => b.categoryId)]));
  const { data: comparisons = [] } = useQuery({
    queryKey: ['finance', 'comparisons', comparisonIds],
    queryFn: () => Promise.all(comparisonIds.map((id) => analyticsApi.getCategoryComparison(id))),
    enabled: comparisonIds.length > 0,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetResponse | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] });
  }

  async function remove(budget: BudgetResponse) {
    if (!confirm('Delete this budget?')) return;
    await budgetApi.deleteBudget(budget.id);
    invalidate();
  }

  const cards = useMemo(
    () =>
      budgets.map((b) => {
        const spend = comparisons.find((c) => c.categoryId === b.categoryId)?.currentMonthSpend ?? 0;
        const pct = b.budgetAmount > 0 ? (spend / b.budgetAmount) * 100 : 0;
        const status = pct >= 100 ? 'over' : pct >= (b.alertThreshold || 80) ? 'near-limit' : 'on-track';
        const remaining = b.budgetAmount - spend;
        return {
          ...b,
          categoryName: categories.find((c) => c.id === b.categoryId)?.name ?? 'Unknown',
          spend,
          pct: Math.min(100, pct),
          status,
          statusText: status === 'over' ? `${formatINR(Math.abs(remaining))} over budget` : `${formatINR(remaining)} left`,
        };
      }),
    [budgets, comparisons, categories],
  );

  const uncapped = useMemo(() => {
    const budgetedIds = new Set(budgets.map((b) => b.categoryId));
    return comparisons
      .filter((c) => expenseCategoryIds.includes(c.categoryId) && !budgetedIds.has(c.categoryId) && c.currentMonthSpend > 0)
      .sort((a, b) => b.currentMonthSpend - a.currentMonthSpend)
      .map((c) => ({ ...c, name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Unknown' }));
  }, [comparisons, budgets, categories, expenseCategoryIds]);

  const totalBudgeted = cards.reduce((sum, c) => sum + c.budgetAmount, 0);
  const totalSpent = cards.reduce((sum, c) => sum + c.spend, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          + New budget
        </button>
      </div>

      {cards.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile label="Total budgeted" value={formatINR(totalBudgeted)} />
          <SummaryTile label="Total spent" value={formatINR(totalSpent)} />
          <SummaryTile label="On track / near limit" value={`${cards.filter((c) => c.status === 'on-track').length} / ${cards.filter((c) => c.status === 'near-limit').length}`} />
          <SummaryTile label="Over budget" value={String(cards.filter((c) => c.status === 'over').length)} />
        </div>
      )}

      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No budgets yet — set a cap on a category to start tracking it.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{c.categoryName}</span>
                <span className="flex gap-2 text-xs">
                  <button className="text-primary hover:underline" onClick={() => { setEditing(c); setDialogOpen(true); }}>Edit</button>
                  <button className="text-destructive hover:underline" onClick={() => void remove(c)}>Delete</button>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full ${c.status === 'over' ? 'bg-destructive' : c.status === 'near-limit' ? 'bg-yellow-500' : 'bg-primary'}`}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{formatINR(c.spend)} / {formatINR(c.budgetAmount)}</span>
                <span className={c.status === 'over' ? 'text-destructive' : ''}>{c.statusText}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {uncapped.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Uncapped spend</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {uncapped.map((c) => (
              <li key={c.categoryId} className="flex justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span>{formatINR(c.currentMonthSpend)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BudgetDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
