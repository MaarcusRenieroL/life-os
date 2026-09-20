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
import { merchantApi } from './merchant-api';
import type { MerchantResponse } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MerchantResponse | null;
  onSaved: () => void;
}

export function MerchantDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setCategoryId(editing?.categoryId ?? null);
    setWebsite(editing?.website ?? '');
  }, [open, editing]);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { name, categoryId: categoryId ?? undefined, website: website || undefined };
      if (editing) {
        await merchantApi.updateMerchant(editing.id, payload);
      } else {
        await merchantApi.createMerchant(payload);
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
        <DialogHeader><DialogTitle>{editing ? 'Edit merchant' : 'New merchant'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Default category</Label>
            <Select value={categoryId ?? '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="No default category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No default category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
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
