import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { Input } from '@/components/ui/input';

import { categoryApi } from './category-api';
import { MerchantDialog } from './merchant-dialog';
import { merchantApi } from './merchant-api';
import type { MerchantResponse } from './types';
import { formatINR } from './utils';

export function MerchantsPage() {
  const queryClient = useQueryClient();
  const { data: merchants = [] } = useQuery({ queryKey: ['finance', 'merchants'], queryFn: merchantApi.getMerchants });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });

  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantResponse | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'merchants'] });
  }

  async function remove(merchant: MerchantResponse) {
    const ok = await confirm({ title: `Delete "${merchant.name}"?`, confirmLabel: 'Delete' });
    if (!ok) return;
    await merchantApi.deleteMerchant(merchant.id);
    invalidate();
  }

  function openEdit(merchant: MerchantResponse) {
    setEditing(merchant);
    setDialogOpen(true);
  }

  const columns = useMemo<ColumnDef<MerchantResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Merchant" />,
        cell: ({ row }) => (
          <div>
            {row.original.name}
            {!row.original.isRecognized && <div className="text-[10px] text-muted-foreground">manually added</div>}
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (m) => categories.find((c) => c.id === m.categoryId)?.name ?? '—',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Default category" />,
      },
      {
        accessorKey: 'averageTransactionAmount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Avg spend" />,
        cell: ({ row }) => (row.original.averageTransactionAmount ? formatINR(row.original.averageTransactionAmount) : '—'),
      },
      {
        accessorKey: 'transactionCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Txns" />,
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>
              Edit
            </button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void remove(row.original); }}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  const table = useReactTable({
    data: merchants,
    columns,
    state: { sorting, columnVisibility, globalFilter: query },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _id, filter) => row.original.name.toLowerCase().includes(String(filter).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>

      <div className="mt-4 flex items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search merchants…" className="max-w-xs" />
        <DataTableViewOptions table={table} />
      </div>

      <div className="mt-3">
        <DataTable table={table} onRowClick={openEdit} />
      </div>
      <DataTablePagination table={table} />

      <MerchantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
