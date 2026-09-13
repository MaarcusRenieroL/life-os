import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccountResponse | null>(null);
  const [reconciling, setReconciling] = useState<AccountResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
  }

  async function deleteAccount(account: AccountResponse) {
    if (!confirm(`Delete "${account.accountName}"?`)) return;
    try {
      await accountApi.deleteAccount(account.id);
      invalidate();
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(`Could not delete this account (HTTP ${status ?? '?'})`);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>+ Add account</Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {accounts.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No accounts yet — add one to start tracking balances and importing statements.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{account.accountName}</div>
                {account.isPrimary && <Badge variant="secondary">Primary</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{accountSubLabel(account)}</div>
              <div className="mt-3 text-lg font-semibold">{formatINR(account.currentBalance)}</div>
              <div className="text-[11px] text-muted-foreground">{account.currencyCode}</div>
              <div className="mt-3 flex gap-2 text-xs">
                <button className="text-primary hover:underline" onClick={() => setReconciling(account)}>Reconcile</button>
                <button className="text-primary hover:underline" onClick={() => { setEditing(account); setDialogOpen(true); }}>Edit</button>
                <button className="text-destructive hover:underline" onClick={() => void deleteAccount(account)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      <ReconcileDialog account={reconciling} onClose={() => setReconciling(null)} onSaved={invalidate} />
    </div>
  );
}
