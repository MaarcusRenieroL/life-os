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
import { Switch } from '@/components/ui/switch';

import { budgetApi } from './budget-api';
import { categoryApi } from './category-api';
import type { BudgetPeriod, BudgetResponse } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BudgetResponse | null;
  onSaved: () => void;
}

export function BudgetDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { data: categories = [] } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: categoryApi.getCategories,
  });
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const [categoryId, setCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('MONTHLY');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoryId(editing?.categoryId ?? expenseCategories[0]?.id ?? '');
    setBudgetAmount(editing ? String(editing.budgetAmount) : '');
    setPeriod(editing?.period ?? 'MONTHLY');
    setAlertThreshold(editing?.alertThreshold ?? 80);
    setAlertEnabled(editing?.alertEnabled ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function submit() {
    if (!categoryId || !budgetAmount || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await budgetApi.updateBudget(editing.id, { categoryId, budgetAmount: Number(budgetAmount), period, alertThreshold, alertEnabled });
      } else {
        await budgetApi.createBudget({
          categoryId,
          budgetAmount: Number(budgetAmount),
          period,
          startDate: new Date().toISOString(),
          alertThreshold,
          alertEnabled,
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
        <DialogHeader><DialogTitle>{editing ? 'Edit budget' : 'New budget'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Budget amount</Label>
            <Input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
          </div>
          <div>
            <Label>Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Alert threshold</span>
              <span>{alertThreshold}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
            Alerts enabled
          </Label>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving || !categoryId || !budgetAmount}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
