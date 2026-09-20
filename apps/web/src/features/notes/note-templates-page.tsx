import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { templatesApi } from './templates-api';
import type { NoteTemplate } from './types';
import { categoryColor, categoryIcon } from './utils/template-category';

export function NoteTemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: page } = useQuery({ queryKey: ['notes', 'templates'], queryFn: () => templatesApi.list() });
  const templates = page?.content ?? [];

  const [selected, setSelected] = useState<NoteTemplate | null>(null);
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [useTitle, setUseTitle] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NoteTemplate | null>(null);
  const [form, setForm] = useState({ name: '', content: '', category: '' });
  const { confirm, dialog } = useConfirmDialog();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', content: '', category: '' });
    setEditDialogOpen(true);
  }

  function openEdit(template: NoteTemplate) {
    setEditing(template);
    setForm({ name: template.name, content: template.content ?? '', category: template.category ?? '' });
    setEditDialogOpen(true);
  }

  async function saveTemplate() {
    if (editing) {
      await templatesApi.update(editing.id, form.name, form.content, form.category || undefined);
    } else {
      await templatesApi.create(form.name, form.content, form.category || undefined);
    }
    setEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['notes', 'templates'] });
  }

  async function deleteTemplate(template: NoteTemplate) {
    const ok = await confirm({ title: `Delete "${template.name}"? This can't be undone.`, confirmLabel: 'Delete' });
    if (!ok) return;
    await templatesApi.delete(template.id);
    if (selected?.id === template.id) setSelected(null);
    queryClient.invalidateQueries({ queryKey: ['notes', 'templates'] });
  }

  // Named createNoteFromTemplate, not useTemplate - a name starting with "use"
  // reads as a hook to React's tooling (and its own rules-of-hooks lint rule),
  // which flagged this exact false positive when it was called from a plain
  // onClick handler.
  async function createNoteFromTemplate() {
    if (!selected || !useTitle.trim()) return;
    const note = await templatesApi.use(selected.id, useTitle.trim());
    navigate(`/notes/${note.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <Button onClick={openCreate}>+ New template</Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((t) => {
            const Icon = categoryIcon(t.category);
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left hover:border-primary/40"
              >
                <Icon className="size-4" style={{ color: categoryColor(t.category) }} />
                <div className="text-sm font-semibold">{t.name}</div>
                {t.category && <div className="text-[11px] text-muted-foreground">{t.category}</div>}
                <p className="line-clamp-2 text-xs text-muted-foreground">{t.preview}</p>
              </button>
            );
          })}
          {templates.length === 0 && <EmptyState message="No templates yet." />}
        </div>

        {selected && (
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">{selected.name}</h2>
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selected.preview}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => { setUseTitle(''); setUseDialogOpen(true); }}>Use template</Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteTemplate(selected)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New note from "{selected?.name}"</DialogTitle></DialogHeader>
          <Input value={useTitle} onChange={(e) => setUseTitle(e.target.value)} placeholder="Note title" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createNoteFromTemplate()} disabled={!useTitle.trim()}>Create note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Free text, e.g. Meetings" />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveTemplate()} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
