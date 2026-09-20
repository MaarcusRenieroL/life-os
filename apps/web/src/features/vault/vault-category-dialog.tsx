import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { vaultCategoryApi } from './category-api';
import type { VaultCategory } from './types';

const PRESET_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
];

export function VaultCategoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ['vault', 'categories'],
    queryFn: vaultCategoryApi.getCategories,
  });

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editing, setEditing] = useState<VaultCategory | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vault', 'categories'] });
  }

  function startEdit(category: VaultCategory) {
    setEditing(category);
    setName(category.name);
    setColor(category.color ?? PRESET_COLORS[0]);
  }

  function resetForm() {
    setEditing(null);
    setName('');
    setColor(PRESET_COLORS[0]);
  }

  async function save() {
    if (!name.trim() || name.length > 100) return;
    if (editing) {
      await vaultCategoryApi.updateCategory(editing.id, { name: name.trim(), color });
    } else {
      await vaultCategoryApi.createCategory({ name: name.trim(), color });
    }
    resetForm();
    invalidate();
  }

  async function remove(category: VaultCategory) {
    const ok = await confirm({
      title: `Delete category "${category.name}"?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await vaultCategoryApi.deleteCategory(category.id);
    if (editing?.id === category.id) resetForm();
    invalidate();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Categories</DialogTitle></DialogHeader>

        <ul className="flex flex-col gap-1">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
              <span className="flex items-center gap-2 text-sm">
                <span className="size-3 rounded-full" style={{ background: c.color ?? '#999' }} />
                {c.name}
              </span>
              <span className="flex gap-2 text-xs">
                <button className="text-primary hover:underline" onClick={() => startEdit(c)}>Edit</button>
                <button className="text-destructive hover:underline" onClick={() => void remove(c)}>Delete</button>
              </span>
            </li>
          ))}
          {categories.length === 0 && <EmptyState message="No categories yet." />}
        </ul>

        <div className="mt-2 flex flex-col gap-2 border-t pt-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder={editing ? 'Rename category' : 'New category name'}
          />
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="size-6 rounded-full border-2"
                style={{ background: c, borderColor: color === c ? 'var(--foreground)' : 'transparent' }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()} disabled={!name.trim()}>
              {editing ? 'Save' : 'Add category'}
            </Button>
            {editing && (
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      {dialog}
    </Dialog>
  );
}
