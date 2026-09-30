import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

import { DatePicker } from '@/components/date-time-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/error';

import { accountApi } from './account-api';
import { categoryApi } from './category-api';
import { subscriptionApi } from './subscription-api';
import type { BillingCycle, SubscriptionResponse } from './types';
import { accountLabel } from './utils';

const NONE = 'NONE';
const CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

/** Create or edit a tracked subscription. */
export function SubscriptionDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SubscriptionResponse | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [next, setNext] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(NONE);
  const [categoryId, setCategoryId] = useState(NONE);
  const [auto, setAuto] = useState(true);
  const [reminder, setReminder] = useState('3');
  const [rating, setRating] = useState(NONE);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts, enabled: open });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, enabled: open });

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? '');
      setAmount(editing ? String(editing.amount) : '');
      setCycle(editing?.billingCycle ?? 'MONTHLY');
      setNext(editing?.nextBillingDate ?? format(addDays(new Date(), 30), 'yyyy-MM-dd'));
      setAccountId(editing?.accountId ?? NONE);
      setCategoryId(editing?.categoryId ?? NONE);
      setAuto(editing?.autoCreateExpense ?? true);
      setReminder(String(editing?.reminderDaysBefore ?? 3));
      setRating(editing?.usageRating ? String(editing.usageRating) : NONE);
      setNotes(editing?.notes ?? '');
    }
  }

  const amountNumber = Number(amount);
  const valid = name.trim() !== '' && amountNumber > 0 && next != null && (!auto || accountId !== NONE);

  async function submit() {
    if (!valid || !next) return;
    setSaving(true);
    try {
      const request = {
        name: name.trim(),
        amount: amountNumber,
        billingCycle: cycle,
        nextBillingDate: next,
        accountId: accountId === NONE ? null : accountId,
        categoryId: categoryId === NONE ? null : categoryId,
        autoCreateExpense: auto,
        reminderDaysBefore: Math.min(30, Math.max(0, Number(reminder) || 0)),
        usageRating: rating === NONE ? null : Number(rating),
        lastUsedOn: editing?.lastUsedOn ?? null,
        notes: notes.trim() || null,
      };
      if (editing) await subscriptionApi.update(editing.id, request);
      else await subscriptionApi.create(request);
      toast.success(editing ? 'Subscription updated' : 'Subscription added');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the subscription.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit subscription' : 'New subscription'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-name">Name</Label>
          <Input id="sub-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Netflix" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-amount">Amount (₹)</Label>
            <Input id="sub-amount" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Billing cycle</Label>
            <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
              <SelectTrigger aria-label="Billing cycle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Next billing date</Label>
            <DatePicker value={next} onChange={setNext} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-reminder">Remind me (days before)</Label>
            <Input id="sub-reminder" type="number" min={0} max={30} value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger aria-label="Account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No account</SelectItem>
                {accounts.filter((a) => a.isActive).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Auto</SelectItem>
                {categories.filter((c) => c.type === 'EXPENSE').map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="sub-auto" checked={auto} onCheckedChange={(v) => setAuto(v === true)} />
          <div>
            <Label htmlFor="sub-auto">Create an expense each billing cycle</Label>
            <p className="text-xs text-muted-foreground">Needs an account. Turn off if the charge already arrives through bank import, or it will be counted twice.</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>How much do you use it?</Label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger aria-label="Usage rating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not rated</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} - {['Barely', 'Rarely', 'Sometimes', 'Often', 'Constantly'][n - 1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-notes">Notes</Label>
          <Input id="sub-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !valid}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
