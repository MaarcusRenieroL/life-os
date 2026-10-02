import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { VaultEntrySummary } from './types';
import { buildEntryStrengthMap } from './utils/entry-security';
import { vaultApi } from './vault-api';
import { useVaultState } from './vault-state';

export function VaultEntryListPage() {
  // This page only ever renders inside <VaultUnlockGuard>'s <Outlet>, which already did its own
  // fresh GET /v1/vault/status before allowing that render and wrote the result into this same
  // shared context - a second status fetch here just repeated it for no reason.
  const { unlocked } = useVaultState();
  const queryClient = useQueryClient();
  const { copyWithAutoClear } = useClipboard();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['vault', 'entries'], queryFn: vaultApi.getEntries });
  const { data: categories = [] } = useQuery({ queryKey: ['vault', 'categories'], queryFn: vaultCategoryApi.getCategories, staleTime: 5 * 60_000 });
  const { data: health } = useQuery({
    queryKey: ['vault', 'health'],
    queryFn: vaultApi.getHealthSummary,
    retry: false,
  });

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

  const strengthMap = useMemo(() => buildEntryStrengthMap(health?.actionRequired ?? []), [health]);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vault'] });
  }

  function openAdd() {
    setEditingId(null);
    setFormOpen(true);
  }

  const openEdit = useCallback((id: string) => {
    setEditingId(id);
    setFormOpen(true);
  }, []);

  async function duplicateEntry(entry: VaultEntrySummary) {
    const detail = await vaultApi.getEntry(entry.id);
    await vaultApi.createEntry({ ...detail, title: `${detail.title} (copy)`, favorite: false });
    invalidate();
  }

  async function deleteEntry(id: string) {
    const ok = await confirm({ title: 'Delete this vault entry?', confirmLabel: 'Delete' });
    if (!ok) return;
    await vaultApi.deleteEntry(id);
    invalidate();
  }

  async function moveToFolder(id: string, categoryId: string) {
    const detail = await vaultApi.getEntry(id);
    await vaultApi.updateEntry(id, { ...detail, categoryId });
    invalidate();
  }

  async function deleteMany(ids: string[]): Promise<boolean> {
    const ok = await confirm({ title: `Delete ${ids.length} selected entries?`, confirmLabel: 'Delete' });
    if (!ok) return false;
    await Promise.all(ids.map((id) => vaultApi.deleteEntry(id)));
    invalidate();
    return true;
  }

  const columns = useMemo<ColumnDef<VaultEntrySummary>[]>(
    () => [
      {
        accessorKey: 'title',
        meta: { title: 'Name', filter: { type: 'text' } },
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex items-center gap-3">
              {entry.icon ? (
                <img src={entry.icon} alt="" className="size-6 rounded" />
              ) : (
                <div className="flex size-6 items-center justify-center rounded bg-muted text-[10px]">{entry.title.slice(0, 1).toUpperCase()}</div>
              )}
              <span className="truncate font-medium">{entry.title}</span>
              {entry.favorite && <span className="text-primary">★</span>}
            </div>
          );
        },
      },
      {
        id: 'login',
        accessorFn: (e) => e.username || e.email || '',
        meta: { title: 'Username / email', filter: { type: 'text' } },
        cell: ({ row }) => row.original.username || row.original.email || '—',
      },
      { accessorKey: 'url', meta: { title: 'Website', filter: { type: 'text' } }, cell: ({ row }) => row.original.url ?? '—' },
      {
        id: 'category',
        accessorFn: (e) => (e.categoryId ? (categoryName.get(e.categoryId) ?? 'Unknown') : 'No folder'),
        meta: { title: 'Folder', filter: { type: 'select' } },
      },
      {
        id: 'strength',
        accessorFn: (e) => strengthMap.get(e.id) ?? 'Strong',
        meta: { title: 'Strength', filter: { type: 'select' } },
        cell: ({ row }) => {
          const strength = strengthMap.get(row.original.id) ?? 'Strong';
          return (
            <Badge variant={strength === 'Strong' ? 'secondary' : 'outline'} className={strength !== 'Strong' ? 'border-destructive text-destructive' : undefined}>
              {strength}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'favorite',
        meta: { title: 'Favorite', filter: { type: 'boolean' }, exportValue: (e) => (e.favorite ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.favorite ? '★' : '—'),
      },
      { accessorKey: 'type', meta: { title: 'Type', filter: { type: 'select' } } },
      { accessorKey: 'updatedAt', meta: { title: 'Updated', filter: { type: 'date' } }, cell: ({ row }) => row.original.updatedAt.slice(0, 10) },
      { accessorKey: 'expiresAt', meta: { title: 'Expires', filter: { type: 'date' } }, cell: ({ row }) => row.original.expiresAt?.slice(0, 10) ?? '—' },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => copyWithAutoClear(entry.username || entry.email || '', `row-${entry.id}`)}>
                Copy
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${entry.title}`}>⋯</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(entry.id)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void duplicateEntry(entry)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={categories.length === 0}>Move to folder</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {categories.map((c) => (
                        <DropdownMenuItem key={c.id} onClick={() => void moveToFolder(entry.id, c.id)}>{c.name}</DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => void deleteEntry(entry.id)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, categoryName, strengthMap],
  );

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

      <div className="mt-4">
        <DataGrid
          tableId="vault.entries"
          data={entries}
          columns={columns}
          getRowId={(e) => e.id}
          onRowClick={(e) => setOpenEntryId(e.id)}
          loading={isLoading}
          enableSelection
          initialSorting={[{ id: 'title', desc: false }]}
          initialVisibility={{ url: false, favorite: false, type: false, updatedAt: false, expiresAt: false }}
          views={[
            { id: 'favorites', name: 'Favorites', filters: [{ id: 'favorite', value: ['true'] }] },
            { id: 'attention', name: 'Needs attention', filters: [{ id: 'strength', value: ['Weak', 'Reused'] }] },
            ...categories.map((c) => ({ id: `cat-${c.id}`, name: c.name, filters: [{ id: 'category', value: [c.name] }] })),
          ]}
          exportName="vault-entries"
          searchPlaceholder="Search entries…"
          emptyMessage="No entries found."
          bulkActions={(selected, clear) => (
            <button className="text-destructive hover:underline" onClick={() => void deleteMany(selected.map((e) => e.id)).then((ok) => ok && clear())}>
              Delete
            </button>
          )}
          mobileCard={(entry) => (
            <div className="flex cursor-pointer items-center gap-3 rounded-lg border p-3" onClick={() => setOpenEntryId(entry.id)}>
              <div className="flex size-6 items-center justify-center rounded bg-muted text-[10px]">{entry.title.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{entry.title} {entry.favorite && <span className="text-primary">★</span>}</div>
                <div className="truncate text-xs text-muted-foreground">{entry.username || entry.email || entry.url || '—'}</div>
              </div>
            </div>
          )}
        />
      </div>

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
