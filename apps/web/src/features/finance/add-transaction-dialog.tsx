import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { accountApi } from './account-api';
import { transactionApi } from './transaction-api';
import type { TransactionResponse, TransactionType } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TransactionResponse | null;
  onSaved: () => void;
}

export function AddTransactionDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts });

  const [accountId, setAccountId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAccountId(editing?.accountId ?? accounts[0]?.id ?? '');
    setTransactionDate(editing?.transactionDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setDescription(editing?.description ?? '');
    setAmount(editing ? String(editing.amount) : '');
    // Transfers aren't editable via this dialog's type selector.
    setType(editing?.type === 'TRANSFER' ? 'DEBIT' : editing?.type ?? 'DEBIT');
    setNotes(editing?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function submit() {
    if (!description.trim() || !amount || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await transactionApi.updateTransaction(editing.id, { description, amount: Number(amount), type, notes: notes || undefined });
      } else {
        await transactionApi.createTransaction({
          accountId,
          transactionDate: new Date(transactionDate).toISOString(),
          description,
          amount: Number(amount),
          type,
          notes: notes || undefined,
        });
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Account</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? '')} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} disabled={!!editing} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBIT">Debit (money out)</SelectItem>
                <SelectItem value="CREDIT">Credit (money in)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !description.trim() || !amount}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
