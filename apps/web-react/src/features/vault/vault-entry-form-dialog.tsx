import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';

import { vaultCategoryApi } from './category-api';
import { PasswordGeneratorDialog } from './password-generator-dialog';
import type { VaultEntryDetail, VaultEntryType, VaultEntryWriteRequest } from './types';
import { vaultApi } from './vault-api';

function faviconUrlFor(rawUrl: string): string | null {
  if (!rawUrl.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const hostname = new URL(withProtocol).hostname;
    if (!hostname.includes('.')) return null;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
  } catch {
    return null;
  }
}

const BLANK: VaultEntryWriteRequest = {
  type: 'LOGIN',
  title: '',
  email: '',
  username: '',
  url: '',
  password: '',
  notes: '',
  categoryId: null,
  favorite: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string | null;
  onSaved: () => void;
  onDeleted: () => void;
}

export function VaultEntryFormDialog({ open, onOpenChange, entryId, onSaved, onDeleted }: Props) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ['vault', 'categories'],
    queryFn: vaultCategoryApi.getCategories,
  });

  const [form, setForm] = useState<VaultEntryWriteRequest>(BLANK);
  const [showPassword, setShowPassword] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entryId) {
      vaultApi.getEntry(entryId).then((entry: VaultEntryDetail) =>
        setForm({
          type: entry.type,
          title: entry.title,
          email: entry.email ?? '',
          username: entry.username ?? '',
          url: entry.url ?? '',
          password: entry.password ?? '',
          notes: entry.notes ?? '',
          categoryId: entry.categoryId,
          favorite: entry.favorite,
        }),
      );
    } else {
      setForm(BLANK);
    }
    setError(null);
    setShowPassword(false);
  }, [open, entryId]);

  function set<K extends keyof VaultEntryWriteRequest>(key: K, value: VaultEntryWriteRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const icon = faviconUrlFor(form.url ?? '');
      const payload = { ...form, icon };
      if (entryId) {
        await vaultApi.updateEntry(entryId, payload);
      } else {
        await vaultApi.createEntry(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Unable to save this entry.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!entryId || !confirm('Delete this vault entry?')) return;
    await vaultApi.deleteEntry(entryId);
    queryClient.invalidateQueries({ queryKey: ['vault'] });
    onDeleted();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entryId ? 'Edit entry' : 'Add entry'}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-auto">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v as VaultEntryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="NOTE">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={255} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={form.username ?? ''} onChange={(e) => set('username', e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={form.url ?? ''} onChange={(e) => set('url', e.target.value)} maxLength={2048} />
          </div>
          <div>
            <Label>Password</Label>
            <div className="flex items-center gap-2">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password ?? ''}
                onChange={(e) => set('password', e.target.value)}
                maxLength={1000}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setGeneratorOpen(true)}>
                Generate
              </Button>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.categoryId ?? '__none__'} onValueChange={(v) => set('categoryId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} maxLength={5000} />
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={form.favorite ?? false} onCheckedChange={(v) => set('favorite', v)} />
            Favorite
          </Label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="justify-between sm:justify-between">
          {entryId ? (
            <Button variant="ghost" className="text-destructive" onClick={() => void remove()}>
              Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <PasswordGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        onUse={(password) => set('password', password)}
      />
    </Dialog>
  );
}
