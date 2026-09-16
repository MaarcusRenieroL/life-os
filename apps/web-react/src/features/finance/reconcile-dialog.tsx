import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { accountApi } from './account-api';
import type { AccountResponse } from './types';
import { accountLabel, accountSubLabel, formatINR } from './utils';

export function ReconcileDialog({
  account,
  onClose,
  onSaved,
}: {
  account: AccountResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [statementBalance, setStatementBalance] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!account || saving) return;
    setSaving(true);
    try {
      await accountApi.reconcileAccount(account.id, {
        statementBalance: Number(statementBalance),
        statementDate,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reconcile account</DialogTitle></DialogHeader>
        {account && (
          <p className="text-sm text-muted-foreground">
            {accountLabel(account)} ({accountSubLabel(account)}) — app balance {formatINR(account.currentBalance)}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <div>
            <Label>Statement balance</Label>
            <Input type="number" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} />
          </div>
          <div>
            <Label>Statement date</Label>
            <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving || !statementBalance}>
            {saving ? 'Saving…' : 'Reconcile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
