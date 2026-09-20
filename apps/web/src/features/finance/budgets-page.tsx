import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';

import { BudgetDialog } from './budget-dialog';
import { budgetApi } from './budget-api';
import { categoryApi } from './category-api';
import { analyticsApi } from './analytics-api';
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

  const expenseCategoryIds = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
  const comparisonIds = Array.from(new Set([...expenseCategoryIds, ...budgets.map((b) => b.categoryId)]));
  const { data: comparisons = [] } = useQuery({
    queryKey: ['finance', 'comparisons', comparisonIds],
    queryFn: () => Promise.all(comparisonIds.map((id) => analyticsApi.getCategoryComparison(id))),
    enabled: comparisonIds.length > 0,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      },
      {
        accessorKey: 'spend',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Spend / Budget" />,
        cell: ({ row }) => `${formatINR(row.original.spend)} / ${formatINR(row.original.budgetAmount)}`,
      },
      {
        accessorKey: 'pct',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Progress" />,
        cell: ({ row }) => (
          <div className="w-32">
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <span className={row.original.status === 'over' ? 'text-destructive' : ''}>{row.original.statusText}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Edit</button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void remove(row.original); }}>Delete</button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
          <DataTable table={table} onRowClick={openEdit} />
        </div>
      )}

      {uncapped.length > 0 && (
        <section className="mt-6">
          <SectionHeading>Uncapped spend</SectionHeading>
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
      {dialog}
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
