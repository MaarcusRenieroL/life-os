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
import { CATEGORY_TYPES } from './types';
import type { CategoryResponse, CategoryType } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CategoryResponse | null;
  onSaved: () => void;
}

export function CategoryDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [excludeFromAutoLearning, setExcludeFromAutoLearning] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setType(editing?.type ?? 'EXPENSE');
    setExcludeFromAutoLearning(editing?.excludeFromAutoLearning ?? false);
  }, [open, editing]);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await categoryApi.updateCategory(editing.id, { name, type, excludeFromAutoLearning });
      } else {
        await categoryApi.createCategory({ name, type, displayOrder: 0 });
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
        <DialogHeader><DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeFromAutoLearning}
              onChange={(e) => setExcludeFromAutoLearning(e.target.checked)}
              className="mt-1"
            />
            Don't auto-create rules from this category (for one-off payments to people, like drivers)
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
