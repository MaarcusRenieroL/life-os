import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/error';

import { accountApi } from './account-api';
import { transactionApi } from './transaction-api';
import { accountLabel } from './utils';

/**
 * Money moved between two of your own accounts - paying a credit card from savings, topping up a
 * wallet. Recorded as a linked pair that moves both balances but counts as neither spending nor
 * income, so it never shows up as an expense or inflates your income.
 */
export function TransferDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts, staleTime: 5 * 60_000 });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrom(accounts[0]?.id ?? '');
    setTo(accounts[1]?.id ?? '');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Accounts can arrive after the dialog opens; pick sensible defaults as soon as they do.
  useEffect(() => {
    if (!open || accounts.length === 0) return;
    setFrom((current) => current || accounts[0].id);
    setTo((current) => current || accounts[1]?.id || '');
  }, [open, accounts]);

  const sameAccount = from !== '' && from === to;
  const valid = from !== '' && to !== '' && !sameAccount && Number(amount) > 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await transactionApi.createTransfer({
        fromAccountId: from,
        toAccountId: to,
        amount: Number(amount),
        transactionDate: new Date(`${date}T00:00:00`).toISOString(),
        notes: notes || undefined,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record the transfer.'));
    } finally {
      setSaving(false);
    }
  }

  const accountSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>{accountLabel(a)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
          <DialogDescription>Moves money between your own accounts. It is not counted as spending or income.</DialogDescription>
        </DialogHeader>
        {accounts.length < 2 ? (
          <p className="text-sm text-muted-foreground">You need at least two accounts to record a transfer. Add another one in Accounts first.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <Label>From</Label>
              {accountSelect(from, setFrom)}
            </div>
            <div>
              <Label>To</Label>
              {accountSelect(to, setTo)}
              {sameAccount && <p className="mt-1 text-xs text-destructive">Pick two different accounts.</p>}
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={!valid || saving || accounts.length < 2}>{saving ? 'Saving…' : 'Record transfer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
