import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';

import { categoryApi } from './category-api';
import { MerchantDialog } from './merchant-dialog';
import { merchantApi } from './merchant-api';
import type { MerchantResponse } from './types';
import { formatINR } from './utils';

export function MerchantsPage() {
  const queryClient = useQueryClient();
  const { data: merchants = [] } = useQuery({ queryKey: ['finance', 'merchants'], queryFn: merchantApi.getMerchants });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });

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
        meta: { title: 'Merchant', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div>
            {row.original.name}
            {!row.original.isRecognized && <div className="text-[10px] text-muted-foreground">manually added</div>}
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (m) => categories.find((c) => c.id === m.categoryId)?.name ?? 'Uncategorized',
        meta: { title: 'Default category', filter: { type: 'select' } },
      },
      {
        accessorKey: 'transactionCount',
        meta: { title: 'Transactions', align: 'right', aggregate: 'sum', filter: { type: 'number' } },
      },
      {
        accessorKey: 'averageTransactionAmount',
        meta: { title: 'Average spend', align: 'right', format: (v) => formatINR(Number(v)), filter: { type: 'number' } },
        cell: ({ row }) => (row.original.averageTransactionAmount ? formatINR(row.original.averageTransactionAmount) : '—'),
      },
      {
        accessorKey: 'lastTransactionDate',
        meta: { title: 'Last transaction', filter: { type: 'date' } },
        cell: ({ row }) => row.original.lastTransactionDate?.slice(0, 10) ?? '—',
      },
      {
        accessorKey: 'isRecognized',
        meta: { title: 'Recognised', filter: { type: 'boolean', labels: ['Recognised', 'Manually added'] }, exportValue: (m) => (m.isRecognized ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isRecognized ? 'Yes' : 'No'),
      },
      {
        accessorKey: 'website',
        meta: { title: 'Website', filter: { type: 'text' } },
        cell: ({ row }) => row.original.website ?? '—',
      },
      {
        id: 'aliases',
        accessorFn: (m) => (m.aliases ?? []).join(', '),
        meta: { title: 'Also known as', filter: { type: 'text' } },
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'createdAt',
        meta: { title: 'Added', filter: { type: 'date' } },
        cell: ({ row }) => row.original.createdAt.slice(0, 10),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>

      <div className="mt-4">
        <DataGrid
          tableId="finance.merchants"
          data={merchants}
          columns={columns}
          getRowId={(m) => m.id}
          onRowClick={openEdit}
          initialSorting={[{ id: 'name', desc: false }]}
          initialVisibility={{ lastTransactionDate: false, isRecognized: false, website: false, aliases: false, createdAt: false }}
          exportName="merchants"
          searchPlaceholder="Search merchants…"
          emptyMessage="No merchants yet - they appear as transactions come in."
        />
      </div>

      <MerchantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
