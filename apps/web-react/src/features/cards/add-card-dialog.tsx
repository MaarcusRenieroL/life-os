import { useState } from 'react';

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

import type { AddCardFormValue, CardNetwork } from './types';

const NETWORK_OPTIONS: CardNetwork[] = ['Visa', 'Mastercard', 'Amex', 'Discover'];

const BLANK: AddCardFormValue = {
  nickname: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
  network: 'Visa',
  cardholderName: '',
  billingZip: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: AddCardFormValue) => void;
  error?: string | null;
}

export function AddCardDialog({ open, onOpenChange, onSave, error }: Props) {
  const [form, setForm] = useState<AddCardFormValue>(BLANK);

  function set<K extends keyof AddCardFormValue>(key: K, value: AddCardFormValue[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const valid =
    form.nickname.trim().length > 0 &&
    form.nickname.length <= 100 &&
    form.cardNumber.replace(/\D/g, '').length >= 12 &&
    form.cardNumber.replace(/\D/g, '').length <= 19 &&
    /^\d{2}\/\d{2}$/.test(form.expiry) &&
    form.cvv.length >= 3 &&
    form.cvv.length <= 4 &&
    form.cardholderName.trim().length > 0 &&
    form.billingZip.trim().length > 0;

  function submit() {
    if (!valid) return;
    onSave(form);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setForm(BLANK);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add a card</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Nickname</Label>
            <Input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Card number</Label>
            <Input value={form.cardNumber} onChange={(e) => set('cardNumber', e.target.value)} maxLength={19} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expiry (MM/YY)</Label>
              <Input value={form.expiry} onChange={(e) => set('expiry', e.target.value)} placeholder="MM/YY" maxLength={5} />
            </div>
            <div>
              <Label>CVV</Label>
              <Input value={form.cvv} onChange={(e) => set('cvv', e.target.value)} maxLength={4} />
            </div>
          </div>
          <div>
            <Label>Network</Label>
            <Select value={form.network} onValueChange={(v) => set('network', v as CardNetwork)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NETWORK_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cardholder name</Label>
            <Input value={form.cardholderName} onChange={(e) => set('cardholderName', e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Billing ZIP</Label>
            <Input value={form.billingZip} onChange={(e) => set('billingZip', e.target.value)} maxLength={12} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!valid}>Add card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
