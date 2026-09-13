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

import { categoryApi } from './category-api';
import { ruleApi } from './rule-api';
import type { CategorizationRuleResponse, MatchField, MatchType } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CategorizationRuleResponse | null;
  prefillMatchValue?: string;
  onSaved: () => void;
}

export function RuleDialog({ open, onOpenChange, editing, prefillMatchValue, onSaved }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });

  const [categoryId, setCategoryId] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('CONTAINS');
  const [matchField, setMatchField] = useState<MatchField>('MERCHANT_NAME');
  const [matchValue, setMatchValue] = useState('');
  const [priority, setPriority] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoryId(editing?.categoryId ?? categories[0]?.id ?? '');
    setMatchType(editing?.matchType ?? 'CONTAINS');
    setMatchField(editing?.matchField ?? 'MERCHANT_NAME');
    setMatchValue(editing?.matchValue ?? prefillMatchValue ?? '');
    setPriority(editing?.priority ?? 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, prefillMatchValue]);

  async function submit() {
    if (!categoryId || !matchValue.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await ruleApi.updateRule(editing.id, { categoryId, matchType, matchField, matchValue, priority });
      } else {
        await ruleApi.createRule({ categoryId, matchType, matchField, matchValue, priority });
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
        <DialogHeader><DialogTitle>{editing ? 'Edit rule' : 'New rule'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Match type</Label>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as MatchType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXACT">Exact</SelectItem>
                <SelectItem value="CONTAINS">Contains</SelectItem>
                <SelectItem value="REGEX">Regex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Match field</Label>
            <Select value={matchField} onValueChange={(v) => setMatchField(v as MatchField)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MERCHANT_NAME">Merchant name</SelectItem>
                <SelectItem value="DESCRIPTION">Description</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pattern</Label>
            <Input value={matchValue} onChange={(e) => setMatchValue(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Input type="number" min={1} value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving || !categoryId || !matchValue.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
