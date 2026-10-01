import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { AccountDialog } from './account-dialog';
import { accountApi } from './account-api';
import { ReconcileDialog } from './reconcile-dialog';
import { ACCOUNT_TYPE_LABELS, type AccountResponse } from './types';
import { accountSubLabel, formatINR } from './utils';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts, staleTime: 5 * 60_000 });

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
        meta: { title: 'Account', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.accountName}
            {row.original.isPrimary && <Badge variant="secondary">Primary</Badge>}
          </div>
        ),
      },
      {
        id: 'accountType',
        accessorFn: (a) => ACCOUNT_TYPE_LABELS[a.accountType],
        meta: { title: 'Type', filter: { type: 'select' } },
      },
      {
        accessorKey: 'bankName',
        meta: { title: 'Bank', filter: { type: 'select' } },
        cell: ({ row }) => row.original.bankName ?? '—',
      },
      {
        id: 'detail',
        accessorFn: (a) => accountSubLabel(a),
        meta: { title: 'Detail', filter: { type: 'text' } },
      },
      {
        accessorKey: 'currentBalance',
        meta: { title: 'Balance', align: 'right', aggregate: 'sum', format: (v) => formatINR(Number(v)), filter: { type: 'number' } },
        cell: ({ row }) => formatINR(row.original.currentBalance),
      },
      {
        accessorKey: 'currencyCode',
        meta: { title: 'Currency', filter: { type: 'select' } },
      },
      {
        accessorKey: 'isPrimary',
        meta: { title: 'Primary account', filter: { type: 'boolean' }, exportValue: (a) => (a.isPrimary ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isPrimary ? 'Yes' : '—'),
      },
      {
        accessorKey: 'isActive',
        meta: { title: 'Active', filter: { type: 'boolean', labels: ['Active', 'Inactive'] }, exportValue: (a) => (a.isActive ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isActive ? 'Yes' : 'No'),
      },
      {
        accessorKey: 'openedDate',
        meta: { title: 'Opened', filter: { type: 'date' } },
        cell: ({ row }) => row.original.openedDate?.slice(0, 10) ?? '—',
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setReconciling(row.original); }}>Reconcile</button>
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Edit</button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void deleteAccount(row.original); }}>Delete</button>
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
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>+ Add account</Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {accounts.length === 0 ? (
        <EmptyState
          className="mt-6"
          message="No accounts yet — add one to start tracking balances and importing statements."
        />
      ) : (
        <div className="mt-4">
          <DataGrid
            tableId="finance.accounts"
            data={accounts}
            columns={columns}
            getRowId={(a) => a.id}
            onRowClick={openEdit}
            initialSorting={[{ id: 'accountName', desc: false }]}
            initialVisibility={{ bankName: false, isPrimary: false, isActive: false, openedDate: false }}
            exportName="accounts"
            searchPlaceholder="Search accounts…"
            hidePagination={accounts.length <= 10}
          />
        </div>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      <ReconcileDialog account={reconciling} onClose={() => setReconciling(null)} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
