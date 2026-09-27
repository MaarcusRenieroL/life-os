import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/error';

import { accountApi } from './account-api';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from './types';
import type { AccountResponse, AccountType, CurrencyCode } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AccountResponse | null;
  onSaved: () => void;
}

const BLANK = {
  accountName: '',
  accountType: 'SAVINGS' as AccountType,
  bankName: '',
  accountNumber: '',
  currencyCode: 'INR' as CurrencyCode,
  isPrimary: false,
};

export function AccountDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        accountName: editing.accountName,
        accountType: editing.accountType,
        bankName: editing.bankName ?? '',
        accountNumber: '',
        currencyCode: editing.currencyCode,
        isPrimary: editing.isPrimary,
      });
    } else {
      setForm(BLANK);
    }
    setError(null);
  }, [open, editing]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.accountName.trim() || saving) return;
    if (!editing && !form.accountNumber.trim()) {
      setError('Account number is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await accountApi.updateAccount(editing.id, {
          accountName: form.accountName,
          accountType: form.accountType,
          bankName: form.bankName || undefined,
          currencyCode: form.currencyCode,
          isPrimary: form.isPrimary,
          ...(form.accountNumber ? { accountNumber: form.accountNumber } : {}),
        });
      } else {
        await accountApi.createAccount({
          accountName: form.accountName,
          accountType: form.accountType,
          bankName: form.bankName || undefined,
          accountNumber: form.accountNumber,
          currencyCode: form.currencyCode,
          isPrimary: form.isPrimary,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(getErrorMessage(err, `Could not save this account (HTTP ${status ?? '?'})`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit account' : 'Add account'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Account name</Label>
            <Input value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.accountType} onValueChange={(v) => set('accountType', v as AccountType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bank name</Label>
            <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
          </div>
          <div>
            <Label>Account number {editing && '(leave blank to keep unchanged)'}</Label>
            <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={form.isPrimary} onCheckedChange={(v) => set('isPrimary', v)} />
            Primary account
          </Label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !form.accountName.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
