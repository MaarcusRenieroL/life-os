import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoreRowModel,
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
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { AccountDialog } from './account-dialog';
import { accountApi } from './account-api';
import { ReconcileDialog } from './reconcile-dialog';
import type { AccountResponse } from './types';
import { accountSubLabel, formatINR } from './utils';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts });

  const [sorting, setSorting] = useState<SortingState>([{ id: 'accountName', desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccountResponse | null>(null);
  const [reconciling, setReconciling] = useState<AccountResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
  }

  async function deleteAccount(account: AccountResponse) {
    const ok = await confirm({ title: `Delete "${account.accountName}"?`, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await accountApi.deleteAccount(account.id);
      invalidate();
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(`Could not delete this account (HTTP ${status ?? '?'})`);
    }
  }

  function openEdit(account: AccountResponse) {
    setEditing(account);
    setDialogOpen(true);
  }

  const columns = useMemo<ColumnDef<AccountResponse>[]>(
    () => [
      {
        accessorKey: 'accountName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.accountName}
            {row.original.isPrimary && <Badge variant="secondary">Primary</Badge>}
          </div>
        ),
      },
      {
        id: 'detail',
        accessorFn: (a) => accountSubLabel(a),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Detail" />,
      },
      {
        accessorKey: 'currentBalance',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
        cell: ({ row }) => formatINR(row.original.currentBalance),
      },
      {
        accessorKey: 'currencyCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Currency" />,
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setReconciling(row.original); }}>Reconcile</button>
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Edit</button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void deleteAccount(row.original); }}>Delete</button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: accounts,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>+ Add account</Button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {accounts.length === 0 ? (
        <EmptyState
          className="mt-6"
          message="No accounts yet — add one to start tracking balances and importing statements."
        />
      ) : (
        <div className="mt-4">
          <DataTable table={table} onRowClick={openEdit} />
        </div>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      <ReconcileDialog account={reconciling} onClose={() => setReconciling(null)} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
