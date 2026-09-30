import { useQuery, useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClipboard } from '@/lib/use-clipboard';

import { vaultCategoryApi } from './category-api';
import { VaultCategoryDialog } from './vault-category-dialog';
import { VaultEntryFormDialog } from './vault-entry-form-dialog';
import type { VaultCategory, VaultEntrySummary } from './types';
import { buildEntryStrengthMap, type EntryStrengthLabel } from './utils/entry-security';
import { vaultApi } from './vault-api';
import { useVaultState } from './vault-state';

type QuickChip = 'all' | 'favorites' | string;

export function VaultEntryListPage() {
  // This page only ever renders inside <VaultUnlockGuard>'s <Outlet>, which already did its own
  // fresh GET /v1/vault/status before allowing that render and wrote the result into this same
  // shared context - a second status fetch here just repeated it for no reason.
  const { unlocked } = useVaultState();
  const queryClient = useQueryClient();
  const { copyWithAutoClear } = useClipboard();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: entries = [] } = useQuery({ queryKey: ['vault', 'entries'], queryFn: vaultApi.getEntries });
  const { data: categories = [] } = useQuery({ queryKey: ['vault', 'categories'], queryFn: vaultCategoryApi.getCategories, staleTime: 5 * 60_000 });
  const { data: health } = useQuery({
    queryKey: ['vault', 'health'],
    queryFn: vaultApi.getHealthSummary,
    retry: false,
  });

  const [search, setSearch] = useState('');
  const [quickChip, setQuickChip] = useState<QuickChip>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingId(editId);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const strengthMap = useMemo(
    () => buildEntryStrengthMap(health?.actionRequired ?? []),
    [health],
  );

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((e) =>
        [e.title, e.username, e.email, e.url].filter(Boolean).join(' ').toLowerCase().includes(term),
      );
    }
    if (quickChip === 'favorites') {
      list = list.filter((e) => e.favorite);
    } else if (quickChip !== 'all') {
      list = list.filter((e) => e.categoryId === quickChip);
    }
    return list;
  }, [entries, search, quickChip]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vault'] });
  }

  function openAdd() {
    setEditingId(null);
    setFormOpen(true);
  }

  // useCallback so these keep a stable identity across renders - they're passed as props to the
  // memoized EntryRow below, and a new function identity every render would defeat that memo just
  // as badly as not memoizing at all.
  const openEdit = useCallback((id: string) => {
    setEditingId(id);
    setFormOpen(true);
  }, []);

  const duplicateEntry = useCallback(
    async (entry: VaultEntrySummary) => {
      const detail = await vaultApi.getEntry(entry.id);
      await vaultApi.createEntry({ ...detail, title: `${detail.title} (copy)`, favorite: false });
      invalidate();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const deleteEntry = useCallback(async (id: string) => {
    const ok = await confirm({ title: 'Delete this vault entry?', confirmLabel: 'Delete' });
    if (!ok) return;
    await vaultApi.deleteEntry(id);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveToFolder = useCallback(async (id: string, categoryId: string) => {
    const detail = await vaultApi.getEntry(id);
    await vaultApi.updateEntry(id, { ...detail, categoryId });
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function deleteSelected() {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} selected entries?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await Promise.all([...selected].map((id) => vaultApi.deleteEntry(id)));
    setSelected(new Set());
    invalidate();
  }

  function exportSelected() {
    const ids = selected.size > 0 ? selected : new Set(filteredEntries.map((e) => e.id));
    const rows = entries.filter((e) => ids.has(e.id));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vault-entries-summary.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  const openEntry = entries.find((e) => e.id === openEntryId);

  return (
    <div>
      {!unlocked && (
        <Link to="/vault" className="mb-3 block text-sm text-primary hover:underline">
          🔒 Unlock to reveal passwords
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Vault ({entries.length})</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCategoriesOpen(true)}>Categories</Button>
          <Button onClick={openAdd}>Add entry</Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total items" value={health?.totalCount ?? entries.length} />
        <StatTile label="Weak" value={health?.weakCount ?? 0} destructive={!!health?.weakCount} />
        <StatTile label="Duplicate" value={health?.duplicateCount ?? 0} destructive={!!health?.duplicateCount} />
        <StatTile
          label="Action required"
          value={(health?.weakCount ?? 0) + (health?.duplicateCount ?? 0)}
          destructive={(health?.weakCount ?? 0) + (health?.duplicateCount ?? 0) > 0}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries…" className="max-w-xs" />
        <Button size="sm" variant={quickChip === 'all' ? 'secondary' : 'ghost'} onClick={() => setQuickChip('all')}>All</Button>
        <Button size="sm" variant={quickChip === 'favorites' ? 'secondary' : 'ghost'} onClick={() => setQuickChip('favorites')}>Favorites</Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={quickChip === c.id ? 'secondary' : 'ghost'}
            onClick={() => setQuickChip(c.id)}
          >
            {c.name}
          </Button>
        ))}
        {selected.size > 0 && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteSelected()}>
            Delete {selected.size} selected
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={exportSelected}>
          Export {selected.size > 0 ? 'selected' : 'all'}
        </Button>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {filteredEntries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            strength={strengthMap.get(entry.id) ?? 'Strong'}
            selected={selected.has(entry.id)}
            categories={categories}
            onToggleSelect={toggleSelect}
            onOpen={setOpenEntryId}
            onCopy={copyWithAutoClear}
            onEdit={openEdit}
            onDuplicate={duplicateEntry}
            onMoveToFolder={moveToFolder}
            onDelete={deleteEntry}
          />
        ))}
        {filteredEntries.length === 0 && <EmptyState message="No entries found." />}
      </ul>

      {openEntry && (
        <EntryDetailDialog
          entry={openEntry}
          onClose={() => setOpenEntryId(null)}
          onEdit={() => {
            setOpenEntryId(null);
            openEdit(openEntry.id);
          }}
        />
      )}

      <VaultEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entryId={editingId}
        onSaved={() => toast.success('Entry saved')}
        onDeleted={() => toast.success('Entry deleted')}
      />

      <VaultCategoryDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
      {dialog}
    </div>
  );
}

// Memoized so typing in the search box (which re-renders the parent on every keystroke) doesn't
// re-render every row - each row's radix DropdownMenu only needs to re-render when its own props
// actually change. Callback props must stay referentially stable (useCallback in the parent) or
// this memo is defeated.
const EntryRow = memo(function EntryRow({
  entry,
  strength,
  selected,
  categories,
  onToggleSelect,
  onOpen,
  onCopy,
  onEdit,
  onDuplicate,
  onMoveToFolder,
  onDelete,
}: {
  entry: VaultEntrySummary;
  strength: EntryStrengthLabel;
  selected: boolean;
  categories: VaultCategory[];
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onCopy: (value: string, fieldKey: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (entry: VaultEntrySummary) => void;
  onMoveToFolder: (id: string, categoryId: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 hud-panel px-3 py-2.5">
      <input type="checkbox" checked={selected} onChange={() => onToggleSelect(entry.id)} />
      <button className="flex flex-1 items-center gap-3 text-left" onClick={() => onOpen(entry.id)}>
        {entry.icon ? (
          <img src={entry.icon} alt="" className="size-6 rounded" />
        ) : (
          <div className="flex size-6 items-center justify-center rounded bg-muted text-[10px]">
            {entry.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {entry.title} {entry.favorite && <span className="text-primary">★</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {entry.username || entry.email || entry.url || '—'}
          </div>
        </div>
      </button>
      <Badge
        variant={strength === 'Strong' ? 'secondary' : 'outline'}
        className={strength !== 'Strong' ? 'border-destructive text-destructive' : undefined}
      >
        {strength}
      </Badge>
      <button
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={() => onCopy(entry.username || entry.email || '', `row-${entry.id}`)}
      >
        Copy
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">⋯</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(entry.id)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void onDuplicate(entry)}>Duplicate</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={categories.length === 0}>
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {categories.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => void onMoveToFolder(entry.id, c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem disabled>Share</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => void onDelete(entry.id)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
});

function StatTile({ label, value, destructive }: { label: string; value: number; destructive?: boolean }) {
  return (
    <div className="hud-panel px-4 py-3">
      <div className={`text-xl font-semibold ${destructive ? 'text-destructive' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EntryDetailDialog({
  entry,
  onClose,
  onEdit,
}: {
  entry: VaultEntrySummary;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { copyWithAutoClear } = useClipboard();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof vaultApi.getEntry>> | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    vaultApi.getEntry(entry.id).then(setDetail);
  }, [entry.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md hud-panel p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold">{entry.title}</h2>
        {detail && (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {detail.username && (
              <Row label="Username" value={detail.username} onCopy={() => copyWithAutoClear(detail.username!, 'username')} />
            )}
            {detail.email && (
              <Row label="Email" value={detail.email} onCopy={() => copyWithAutoClear(detail.email!, 'email')} />
            )}
            {detail.password !== null && (
              <Row
                label="Password"
                value={showPassword ? detail.password ?? '' : '•'.repeat(detail.password?.length || 8)}
                onCopy={() => copyWithAutoClear(detail.password ?? '', 'password')}
                extra={
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                }
              />
            )}
            {detail.url && (
              <Row label="URL" value={detail.url} onCopy={() => copyWithAutoClear(detail.url!, 'url')} />
            )}
            {detail.notes && <p className="text-xs text-muted-foreground">{detail.notes}</p>}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={onEdit}>Edit</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, onCopy, extra }: { label: string; value: string; onCopy: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate">{value}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <button className="text-xs text-primary hover:underline" onClick={onCopy}>Copy</button>
      </div>
    </div>
  );
}
