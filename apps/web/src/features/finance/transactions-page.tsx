import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { Button } from '@/components/ui/button';

import { accountApi } from './account-api';
import { AddTransactionDialog } from './add-transaction-dialog';
import { categoryApi } from './category-api';
import { CategorizeDialog } from './categorize-dialog';
import { DisputeDialog } from './dispute-dialog';
import { transactionApi } from './transaction-api';
import { TransferDialog } from './transfer-dialog';
import type { TransactionResponse } from './types';
import { accountLabel, formatINR } from './utils';

const REVIEW = { needs: 'Needs review', categorized: 'Categorized', duplicate: 'Duplicate' } as const;

const SOURCE_LABELS: Record<string, string> = {
  EMAIL_ALERT: 'Email alert',
  CSV_IMPORT: 'Statement import',
  MANUAL_ENTRY: 'Manual',
  API: 'API',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  RECONCILED: 'Reconciled',
  DISPUTED: 'Disputed',
  IGNORED: 'Ignored',
};

function needsReview(t: TransactionResponse): boolean {
  // A transfer between your own accounts never needs a category.
  return t.categoryId === null && t.type !== 'CREDIT' && !t.isTransfer;
}

/** Money in is positive, money out negative - so sorting, filtering and the footer total all agree. */
function signed(t: TransactionResponse): number {
  return t.type === 'CREDIT' ? t.amount : -t.amount;
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionResponse | null>(null);
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [categorizeTargets, setCategorizeTargets] = useState<string[]>([]);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeTargets, setDisputeTargets] = useState<string[]>([]);
  const { confirm, dialog } = useConfirmDialog();

  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts, staleTime: 5 * 60_000 });
  // Everything is loaded and handled in the browser, so filters, sorting and totals cover all rows.
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['finance', 'transactions', 'all'],
    queryFn: () => transactionApi.getAllTransactions(),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] });
  }

  function categoryNames(t: TransactionResponse): string {
    if (t.categoryIds.length > 0) {
      return t.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ');
    }
    if (t.categoryId) return categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId;
    return 'Uncategorized';
  }

  function accountName(id: string): string {
    const account = accounts.find((a) => a.id === id);
    return account ? accountLabel(account) : 'Unknown account';
  }

  function rowClick(t: TransactionResponse) {
    if (needsReview(t)) {
      setCategorizeTargets([t.id]);
      setCategorizeOpen(true);
    } else {
      navigate(`/finance/transactions/${t.id}`);
    }
  }

  async function saveCategories(categoryIds: string[]) {
    await Promise.all(categorizeTargets.map((id) => transactionApi.updateCategories(id, { categoryIds })));
    invalidate();
  }

  async function markDuplicate(ids: string[]) {
    if (ids.length < 2) return;
    await transactionApi.merge(ids[0], { duplicateTransactionIds: ids.slice(1) });
    invalidate();
  }

  async function disputeSelected(reason: string) {
    await Promise.all(disputeTargets.map((id) => transactionApi.dispute(id, { reason })));
    invalidate();
  }

  async function deleteSelected(ids: string[]) {
    const ok = await confirm({ title: `Delete ${ids.length} transaction(s)?`, confirmLabel: 'Delete' });
    if (!ok) return;
    await Promise.all(ids.map((id) => transactionApi.deleteTransaction(id)));
    invalidate();
  }

  const columns = useMemo<ColumnDef<TransactionResponse>[]>(
    () => [
      {
        accessorKey: 'transactionDate',
        meta: { title: 'Date', filter: { type: 'date' } },
        cell: ({ row }) => row.original.transactionDate.slice(0, 10),
      },
      {
        accessorKey: 'description',
        meta: { title: 'Description', filter: { type: 'text' } },
      },
      {
        id: 'category',
        accessorFn: (t) => categoryNames(t),
        meta: { title: 'Category', filter: { type: 'select' } },
      },
      {
        id: 'amount',
        accessorFn: (t) => signed(t),
        meta: { title: 'Amount', align: 'right', aggregate: 'sum', format: (v) => formatINR(Number(v)), filter: { type: 'number' } },
        cell: ({ row }) => (
          <span className={row.original.type === 'CREDIT' ? 'text-primary' : ''}>
            {row.original.type === 'CREDIT' ? '+' : '-'}
            {formatINR(row.original.amount)}
          </span>
        ),
      },
      {
        id: 'type',
        accessorFn: (t) => (t.isTransfer || t.type === 'TRANSFER' ? 'Transfer' : t.type === 'CREDIT' ? 'Money in' : 'Money out'),
        meta: { title: 'Direction', filter: { type: 'select' } },
      },
      {
        id: 'account',
        accessorFn: (t) => accountName(t.accountId),
        meta: { title: 'Account', filter: { type: 'select' } },
      },
      {
        id: 'review',
        accessorFn: (t) => (t.isDuplicate ? REVIEW.duplicate : t.isTransfer ? 'Transfer' : needsReview(t) ? REVIEW.needs : REVIEW.categorized),
        meta: { title: 'Review state', filter: { type: 'select' } },
      },
      {
        id: 'status',
        accessorFn: (t) => STATUS_LABELS[t.status] ?? t.status,
        meta: { title: 'Status', filter: { type: 'select' } },
      },
      {
        id: 'source',
        accessorFn: (t) => SOURCE_LABELS[t.sourceType] ?? t.sourceType,
        meta: { title: 'Source', filter: { type: 'select' } },
      },
      {
        accessorKey: 'isRecurring',
        meta: { title: 'Recurring', filter: { type: 'boolean' }, exportValue: (t) => (t.isRecurring ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isRecurring ? 'Yes' : '—'),
      },
      {
        accessorKey: 'isReconciled',
        meta: { title: 'Reconciled', filter: { type: 'boolean' }, exportValue: (t) => (t.isReconciled ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isReconciled ? 'Yes' : '—'),
      },
      {
        accessorKey: 'notes',
        meta: { title: 'Notes', filter: { type: 'text' } },
        cell: ({ row }) => row.original.notes ?? '—',
      },
      {
        accessorKey: 'disputeReason',
        meta: { title: 'Dispute reason', filter: { type: 'text' } },
        cell: ({ row }) => row.original.disputeReason ?? '—',
      },
      {
        accessorKey: 'importedAt',
        meta: { title: 'Imported', filter: { type: 'date' } },
        cell: ({ row }) => row.original.importedAt?.slice(0, 10) ?? '—',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, accounts],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>Transfer between accounts</Button>
          <Button size="sm" onClick={() => { setEditingTx(null); setAddOpen(true); }}>+ Add transaction</Button>
        </div>
      </div>

      <div className="mt-4">
        <DataGrid
          tableId="finance.transactions"
          data={transactions}
          columns={columns}
          getRowId={(t) => t.id}
          onRowClick={rowClick}
          loading={isLoading}
          enableSelection
          initialSorting={[{ id: 'transactionDate', desc: true }]}
          initialVisibility={{ type: false, status: false, source: false, isRecurring: false, isReconciled: false, notes: false, disputeReason: false, importedAt: false }}
          initialPageSize={50}
          exportName="transactions"
          searchPlaceholder="Search transactions…"
          emptyMessage="No transactions found."
          toolbarStart={(table) => (
            <div className="flex flex-wrap items-center gap-1">
              {([['All', null], ['Needs review', REVIEW.needs], ['Categorized', REVIEW.categorized], ['Duplicates', REVIEW.duplicate]] as const).map(([label, value]) => {
                const current = (table.getColumn('review')?.getFilterValue() as string[] | undefined) ?? [];
                const active = value === null ? current.length === 0 : current.length === 1 && current[0] === value;
                return (
                  <Button
                    key={label}
                    size="sm"
                    variant={active ? 'secondary' : 'ghost'}
                    onClick={() => table.getColumn('review')?.setFilterValue(value === null ? undefined : [value])}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}
          bulkActions={(selected, clear) => {
            const ids = selected.map((t) => t.id);
            return (
              <>
                {selected.length === 1 && (
                  <button className="hover:underline" onClick={() => { setEditingTx(selected[0]); setAddOpen(true); }}>
                    Edit
                  </button>
                )}
                <button className="hover:underline" onClick={() => { setCategorizeTargets(ids); setCategorizeOpen(true); }}>
                  Set categories
                </button>
                {selected.length >= 2 && <button className="hover:underline" onClick={() => void markDuplicate(ids).then(clear)}>Mark as duplicate</button>}
                <button className="hover:underline" onClick={() => { setDisputeTargets(ids); setDisputeOpen(true); }}>Dispute</button>
                <button className="text-destructive hover:underline" onClick={() => void deleteSelected(ids).then(clear)}>Delete</button>
              </>
            );
          }}
        />
      </div>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} onSaved={() => { invalidate(); queryClient.invalidateQueries({ queryKey: ['finance'] }); }} />
      <AddTransactionDialog open={addOpen} onOpenChange={setAddOpen} editing={editingTx} onSaved={invalidate} />
      <CategorizeDialog
        open={categorizeOpen}
        onOpenChange={setCategorizeOpen}
        transactionLabel={categorizeTargets.length === 1 ? transactions.find((t) => t.id === categorizeTargets[0])?.description ?? '' : `${categorizeTargets.length} selected transactions`}
        onSave={(ids) => void saveCategories(ids)}
      />
      <DisputeDialog open={disputeOpen} onOpenChange={setDisputeOpen} count={disputeTargets.length} onSubmit={(reason) => void disputeSelected(reason)} />
      {dialog}
    </div>
  );
}
