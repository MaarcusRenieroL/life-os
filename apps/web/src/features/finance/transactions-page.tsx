import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { selectionColumn } from '@/components/data-table/selection-column';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

import { AddTransactionDialog } from './add-transaction-dialog';
import { categoryApi } from './category-api';
import { CategorizeDialog } from './categorize-dialog';
import { DisputeDialog } from './dispute-dialog';
import { transactionApi } from './transaction-api';
import type { TransactionFilters, TransactionResponse } from './types';
import { formatINR } from './utils';

const PAGE_SIZE = 50;

type StatusChip = 'ALL' | 'NEEDS_REVIEW' | 'CATEGORIZED' | 'DUPLICATE';

function needsReview(t: TransactionResponse): boolean {
  return t.categoryId === null && t.type !== 'CREDIT';
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [statusChip, setStatusChip] = useState<StatusChip>('ALL');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionResponse | null>(null);
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [categorizeTargets, setCategorizeTargets] = useState<string[]>([]);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 350);

  const filters: TransactionFilters = {
    search: search || undefined,
    status: statusChip === 'ALL' ? undefined : statusChip,
    categoryId: categoryId ?? undefined,
  };

  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });
  const { data: txPage, isLoading } = useQuery({
    queryKey: ['finance', 'transactions', page, filters],
    queryFn: () => transactionApi.getTransactions(page, PAGE_SIZE, filters),
  });

  const transactions = useMemo(() => txPage?.content ?? [], [txPage]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] });
    setRowSelection({});
  }

  function categoryNames(t: TransactionResponse): string {
    if (t.categoryIds.length > 0) {
      return t.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ');
    }
    if (t.categoryId) return categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId;
    return 'Uncategorized';
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
    for (const id of categorizeTargets) {
      await transactionApi.updateCategories(id, { categoryIds });
    }
    invalidate();
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  async function markDuplicate() {
    if (selectedIds.length < 2) return;
    await transactionApi.merge(selectedIds[0], { duplicateTransactionIds: selectedIds.slice(1) });
    invalidate();
  }

  async function disputeSelected(reason: string) {
    for (const id of selectedIds) {
      await transactionApi.dispute(id, { reason });
    }
    invalidate();
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selectedIds.length} transaction(s)?`)) return;
    for (const id of selectedIds) {
      await transactionApi.deleteTransaction(id);
    }
    invalidate();
  }

  function exportCsv() {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = transactions.map((t) =>
      [
        t.transactionDate.slice(0, 10),
        escape(t.description),
        escape(categoryNames(t)),
        t.accountId,
        t.sourceType,
        t.type === 'CREDIT' ? t.amount : -t.amount,
      ].join(','),
    );
    const csv = ['Date,Description,Category,Account,Source,Amount', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const netTotal = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount), 0),
    [transactions],
  );

  const columns = useMemo<ColumnDef<TransactionResponse>[]>(
    () => [
      selectionColumn<TransactionResponse>(),
      {
        accessorKey: 'transactionDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => row.original.transactionDate.slice(0, 10),
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      },
      {
        id: 'category',
        accessorFn: (t) => categoryNames(t),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <span className={row.original.type === 'CREDIT' ? 'text-primary' : ''}>
            {row.original.type === 'CREDIT' ? '+' : '-'}
            {formatINR(row.original.amount)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex: page, pageSize: PAGE_SIZE },
    },
    getRowId: (row) => row.id,
    manualPagination: true,
    pageCount: txPage?.totalPages ?? -1,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex: page, pageSize: PAGE_SIZE }) : updater;
      setPage(next.pageIndex);
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button size="sm" onClick={() => { setEditingTx(null); setAddOpen(true); }}>+ Add transaction</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value); }}
          placeholder="Search…"
          className="max-w-xs"
        />
        {(['ALL', 'NEEDS_REVIEW', 'CATEGORIZED', 'DUPLICATE'] as StatusChip[]).map((chip) => (
          <Button
            key={chip}
            size="sm"
            variant={statusChip === chip ? 'secondary' : 'ghost'}
            onClick={() => { setStatusChip(chip); setPage(0); }}
          >
            {chip === 'ALL' ? 'All' : chip === 'NEEDS_REVIEW' ? 'Needs review' : chip === 'CATEGORIZED' ? 'Categorized' : 'Duplicates'}
          </Button>
        ))}
        <Select value={categoryId ?? '__all__'} onValueChange={(v) => { setCategoryId(v === '__all__' ? null : v); setPage(0); }}>
          <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DataTableViewOptions table={table} />
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span>{selectedIds.length} selected</span>
          {selectedIds.length === 1 && (
            <button className="hover:underline" onClick={() => { setEditingTx(transactions.find((t) => t.id === selectedIds[0])!); setAddOpen(true); }}>
              Edit
            </button>
          )}
          <button className="hover:underline" onClick={() => { setCategorizeTargets(selectedIds); setCategorizeOpen(true); }}>
            Set categories
          </button>
          {selectedIds.length >= 2 && <button className="hover:underline" onClick={() => void markDuplicate()}>Mark as duplicate</button>}
          <button className="hover:underline" onClick={() => setDisputeOpen(true)}>Dispute</button>
          <button className="text-destructive hover:underline" onClick={() => void deleteSelected()}>Delete</button>
          <button className="ml-auto hover:underline" onClick={() => setRowSelection({})}>Clear</button>
        </div>
      )}

      <div className="mt-3">
        <DataTable
          table={table}
          onRowClick={rowClick}
          emptyMessage={isLoading ? 'Loading transactions…' : 'No transactions found.'}
        />
        {transactions.length > 0 && (
          <div className="mt-2 flex justify-end border-t pt-2 text-sm font-medium">
            Net: {formatINR(netTotal)}
          </div>
        )}
      </div>

      <DataTablePagination table={table} />

      <AddTransactionDialog open={addOpen} onOpenChange={setAddOpen} editing={editingTx} onSaved={invalidate} />
      <CategorizeDialog
        open={categorizeOpen}
        onOpenChange={setCategorizeOpen}
        transactionLabel={categorizeTargets.length === 1 ? transactions.find((t) => t.id === categorizeTargets[0])?.description ?? '' : `${categorizeTargets.length} selected transactions`}
        onSave={(ids) => void saveCategories(ids)}
      />
      <DisputeDialog open={disputeOpen} onOpenChange={setDisputeOpen} count={selectedIds.length} onSubmit={(reason) => void disputeSelected(reason)} />
    </div>
  );
}
