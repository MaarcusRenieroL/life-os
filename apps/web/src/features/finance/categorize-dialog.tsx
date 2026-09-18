import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { categoryApi } from './category-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionLabel: string;
  initialCategoryIds?: string[];
  onSave: (categoryIds: string[]) => void;
}

export function CategorizeDialog({ open, onOpenChange, transactionLabel, initialCategoryIds = [], onSave }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });
  const [selected, setSelected] = useState<string[]>(initialCategoryIds);

  useEffect(() => {
    if (open) setSelected(initialCategoryIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((c) => c !== id) : [...s, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Categorize</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{transactionLabel}</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.id} onClick={() => toggle(c.id)}>
              <Badge variant={selected.includes(c.id) ? 'default' : 'outline'}>{c.name}</Badge>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => { onSave(selected); onOpenChange(false); }}
            disabled={selected.length === 0}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
