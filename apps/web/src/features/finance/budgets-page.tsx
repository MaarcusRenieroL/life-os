import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { calendarApi } from '@/features/calendar/calendar-api';
import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';

import { BudgetDialog } from './budget-dialog';
import { budgetApi } from './budget-api';
import { categoryApi } from './category-api';
import { useCategoryComparisons } from './category-comparison-query';
import type { BudgetResponse } from './types';
import { formatINR } from './utils';

interface BudgetRow extends BudgetResponse {
  categoryName: string;
  spend: number;
  pct: number;
  status: 'over' | 'near-limit' | 'on-track';
  statusText: string;
}

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: budgetApi.getBudgets });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });

  // Memoized so its identity is stable across unrelated re-renders - it's a dependency of the
  // uncapped memo below, which would otherwise recompute on every render of this page.
  const expenseCategoryIds = useMemo(
    () => categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id),
    [categories],
  );

  const comparisons = useCategoryComparisons(categories);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetResponse | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] });
  }

  async function remove(budget: BudgetResponse) {
    const ok = await confirm({ title: 'Delete this budget?', confirmLabel: 'Delete' });
    if (!ok) return;
    await budgetApi.deleteBudget(budget.id);
    invalidate();
  }

  function openEdit(budget: BudgetResponse) {
    setEditing(budget);
    setDialogOpen(true);
  }

  // "Display budget deadlines in calendar" integration point - one-directional, same pattern as
  // the other module bridges built this pass.
  async function addDeadlineToCalendar(budget: BudgetRow) {
    if (!budget.endDate) {
      toast.error('This budget has no end date.');
      return;
    }
    try {
      const date = budget.endDate.slice(0, 10);
      await calendarApi.create({
        title: `Budget reset: ${budget.categoryName}`,
        description: `${formatINR(budget.budgetAmount)} / ${budget.period}`,
        category: 'PERSONAL',
        allDay: true,
        startDate: date,
        endDate: date,
      });
      toast.success('Added to calendar');
    } catch {
      toast.error('Could not add the budget deadline to the calendar. Please try again.');
    }
  }

  const rows = useMemo<BudgetRow[]>(
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
          statusText: status === 'over' ? `${formatINR(Math.abs(remaining))} over` : `${formatINR(remaining)} left`,
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

  const totalBudgeted = rows.reduce((sum, c) => sum + c.budgetAmount, 0);
  const totalSpent = rows.reduce((sum, c) => sum + c.spend, 0);

  const columns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      {
        accessorKey: 'categoryName',
        meta: { title: 'Category', filter: { type: 'select' } },
      },
      {
        accessorKey: 'period',
        meta: { title: 'Period', filter: { type: 'select' } },
      },
      {
        accessorKey: 'budgetAmount',
        meta: { title: 'Budget', align: 'right', aggregate: 'sum', format: (v) => formatINR(Number(v)), filter: { type: 'number' } },
        cell: ({ row }) => formatINR(row.original.budgetAmount),
      },
      {
        accessorKey: 'spend',
        meta: { title: 'Spent', align: 'right', aggregate: 'sum', format: (v) => formatINR(Number(v)), filter: { type: 'number' } },
        cell: ({ row }) => `${formatINR(row.original.spend)} / ${formatINR(row.original.budgetAmount)}`,
      },
      {
        accessorKey: 'pct',
        meta: { title: 'Progress', align: 'right', filter: { type: 'number' }, format: (v) => `${Math.round(Number(v))}%` },
        cell: ({ row }) => (
          <div className="ml-auto w-32">
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full ${row.original.status === 'over' ? 'bg-destructive' : row.original.status === 'near-limit' ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${row.original.pct}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        meta: {
          title: 'Status',
          filter: {
            type: 'select',
            options: [
              { value: 'on-track', label: 'On track' },
              { value: 'near-limit', label: 'Near limit' },
              { value: 'over', label: 'Over budget' },
            ],
          },
          exportValue: (b) => b.statusText,
        },
        cell: ({ row }) => (
          <span className={row.original.status === 'over' ? 'text-destructive' : ''}>{row.original.statusText}</span>
        ),
      },
      {
        accessorKey: 'startDate',
        meta: { title: 'Starts', filter: { type: 'date' } },
        cell: ({ row }) => row.original.startDate.slice(0, 10),
      },
      {
        accessorKey: 'endDate',
        meta: { title: 'Resets on', filter: { type: 'date' } },
        cell: ({ row }) => row.original.endDate?.slice(0, 10) ?? '—',
      },
      {
        accessorKey: 'alertThreshold',
        meta: { title: 'Alert at (%)', align: 'right', filter: { type: 'number' } },
      },
      {
        accessorKey: 'alertEnabled',
        meta: { title: 'Alerts on', filter: { type: 'boolean' }, exportValue: (b) => (b.alertEnabled ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.alertEnabled ? 'Yes' : 'No'),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Edit</button>
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); void addDeadlineToCalendar(row.original); }}>Add to calendar</button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void remove(row.original); }}>Delete</button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>+ New budget</Button>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile label="Total budgeted" value={formatINR(totalBudgeted)} />
          <SummaryTile label="Total spent" value={formatINR(totalSpent)} />
          <SummaryTile label="On track / near limit" value={`${rows.filter((c) => c.status === 'on-track').length} / ${rows.filter((c) => c.status === 'near-limit').length}`} />
          <SummaryTile label="Over budget" value={String(rows.filter((c) => c.status === 'over').length)} />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState className="mt-6" message="No budgets yet — set a cap on a category to start tracking it." />
      ) : (
        <div className="mt-4">
          <DataGrid
            tableId="finance.budgets"
            data={rows}
            columns={columns}
            getRowId={(b) => b.id}
            onRowClick={openEdit}
            initialVisibility={{ period: false, startDate: false, endDate: false, alertThreshold: false, alertEnabled: false }}
            exportName="budgets"
            searchPlaceholder="Search budgets…"
            hidePagination={rows.length <= 10}
          />
        </div>
      )}

      {uncapped.length > 0 && (
        <section className="mt-6">
          <SectionHeading>Uncapped spend</SectionHeading>
          <ul className="mt-2 flex flex-col gap-1.5">
            {uncapped.map((c) => (
              <li key={c.categoryId} className="flex justify-between hud-panel px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span>{formatINR(c.currentMonthSpend)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BudgetDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      {dialog}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-panel p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
