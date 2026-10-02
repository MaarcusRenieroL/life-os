import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DataGrid } from '@/components/data-table/data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { FolderManagerDialog } from './folder-manager-dialog';
import { foldersApi } from './folders-api';
import { notesApi } from './notes-api';
import { noteSettingsApi } from './settings-api';
import type { NoteSummary } from './types';
import { noteTypeMeta } from './utils/note-type-meta';
import { relativeTime } from './utils/relative-time';

const SERVER_PAGE = 200; // the most notes the API returns in one go
const MAX_PAGES = 10;

/** Every note matching the server-side filters, page by page, so the table can search, sort and filter all of them. */
async function fetchAll(archived: boolean, folder?: string): Promise<NoteSummary[]> {
  const notes: NoteSummary[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await notesApi.list({ sort: 'modified', order: 'desc', archived, folder, page, size: SERVER_PAGE });
    notes.push(...result.content);
    if (result.last) break;
  }
  return notes;
}

export function NotesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<string | null>(null);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);

  const { data: folders = [] } = useQuery({ queryKey: ['notes', 'folders'], queryFn: foldersApi.list, staleTime: 5 * 60_000 });
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', 'list', 'all', folder],
    queryFn: async () => [...(await fetchAll(false, folder ?? undefined)), ...(await fetchAll(true, folder ?? undefined))],
  });

  async function createNote() {
    const settings = await noteSettingsApi.get().catch(() => null);
    const note = await notesApi.create({
      title: 'Untitled note',
      noteType: settings?.defaultNoteType ?? 'GENERAL',
      folderId: folder ?? undefined,
    });
    navigate(`/notes/${note.id}`);
  }

  async function quickAction(note: NoteSummary, patch: Parameters<typeof notesApi.update>[1]) {
    await notesApi.update(note.id, patch);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  }

  async function deleteNote(note: NoteSummary) {
    await notesApi.delete(note.id);
    toast.success(`Moved "${note.title}" to Trash`);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  }

  const columns = useMemo<ColumnDef<NoteSummary>[]>(
    () => [
      {
        accessorKey: 'title',
        meta: { title: 'Title', filter: { type: 'text' }, edit: { type: 'text' } },
        cell: ({ row }) => {
          const note = row.original;
          const meta = noteTypeMeta(note.noteType);
          const Icon = meta.icon;
          return (
            <div className="flex items-center gap-2.5">
              <Icon className="size-4 shrink-0" style={{ color: meta.colorVar }} />
              <span className="truncate font-medium">{note.title}</span>
              {note.isPinned && <Badge variant="outline">Pinned</Badge>}
              {note.isFavorite && <span className="text-primary">★</span>}
            </div>
          );
        },
      },
      { accessorKey: 'description', meta: { title: 'Summary', filter: { type: 'text' }, edit: { type: 'textarea' } }, cell: ({ row }) => <span className="line-clamp-1 text-muted-foreground">{row.original.description ?? '—'}</span> },
      { id: 'noteType', accessorFn: (n) => noteTypeMeta(n.noteType).label, meta: { title: 'Type', filter: { type: 'select' } } },
      {
        id: 'tags',
        accessorFn: (n) => n.tags.map((t) => t.name),
        meta: { title: 'Tags', filter: { type: 'select' }, exportValue: (n) => n.tags.map((t) => t.name).join('; ') },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 3).map((t) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
            {row.original.tags.length === 0 && '—'}
          </div>
        ),
      },
      { accessorKey: 'isPinned', meta: { title: 'Pinned', filter: { type: 'boolean' }, exportValue: (n) => (n.isPinned ? 'Yes' : 'No') }, cell: ({ row }) => (row.original.isPinned ? 'Yes' : '—') },
      { accessorKey: 'isFavorite', meta: { title: 'Favorite', filter: { type: 'boolean' }, exportValue: (n) => (n.isFavorite ? 'Yes' : 'No') }, cell: ({ row }) => (row.original.isFavorite ? '★' : '—') },
      { accessorKey: 'isArchived', meta: { title: 'Archived', filter: { type: 'boolean' }, exportValue: (n) => (n.isArchived ? 'Yes' : 'No') }, cell: ({ row }) => (row.original.isArchived ? 'Yes' : 'No') },
      { accessorKey: 'updatedAt', meta: { title: 'Modified', filter: { type: 'date' } }, cell: ({ row }) => relativeTime(row.original.updatedAt) },
      { accessorKey: 'createdAt', meta: { title: 'Created', filter: { type: 'date' } }, cell: ({ row }) => row.original.createdAt.slice(0, 10) },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const note = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${note.title}`}>⋯</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void quickAction(note, { isPinned: !note.isPinned })}>{note.isPinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void quickAction(note, { isFavorite: !note.isFavorite })}>{note.isFavorite ? 'Unfavorite' : 'Favorite'}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void quickAction(note, { isArchived: !note.isArchived })}>{note.isArchived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => void deleteNote(note)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <Button onClick={() => void createNote()}>
          <Plus /> New note
        </Button>
      </div>

      <div className="mt-4">
        <DataGrid
          tableId="notes.list"
          data={notes}
          columns={columns}
          getRowId={(n) => n.id}
          onRowClick={(n) => navigate(`/notes/${n.id}`)}
          drawerTitle={(n) => n.title}
          drawerOpenLabel="Open note"
          onEditRow={async (n, changes) => {
            await notesApi.update(n.id, {
              ...(changes.title ? { title: String(changes.title) } : {}),
              ...(changes.description !== undefined ? { description: String(changes.description ?? '') } : {}),
            });
            queryClient.invalidateQueries({ queryKey: ['notes'] });
          }}
          loading={isLoading}
          initialSorting={[{ id: 'updatedAt', desc: true }]}
          initialFilters={[{ id: 'isArchived', value: ['false'] }]}
          initialVisibility={{ description: false, isPinned: false, isFavorite: false, isArchived: false, createdAt: false }}
          views={[
            { id: 'favorites', name: 'Favorites', filters: [{ id: 'isFavorite', value: ['true'] }, { id: 'isArchived', value: ['false'] }] },
            { id: 'pinned', name: 'Pinned', filters: [{ id: 'isPinned', value: ['true'] }, { id: 'isArchived', value: ['false'] }] },
            { id: 'archived', name: 'Archived', filters: [{ id: 'isArchived', value: ['true'] }] },
          ]}
          exportName="notes"
          searchPlaceholder="Search notes…"
          emptyMessage={<>No notes here yet. <Button variant="link" className="px-0" onClick={() => void createNote()}>Create one</Button>.</>}
          toolbarStart={
            <Select value={folder ?? '__all__'} onValueChange={(v) => setFolder(v === '__all__' ? null : v)}>
              <SelectTrigger size="sm" className="h-8 min-w-36" aria-label="Folder">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All folders</SelectItem>
                {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          }
          toolbarEnd={<Button size="sm" variant="ghost" onClick={() => setFolderManagerOpen(true)}>+ Manage folders</Button>}
          mobileCard={(note) => (
            <div className="cursor-pointer rounded-lg border p-3" onClick={() => navigate(`/notes/${note.id}`)}>
              <p className="font-medium">{note.title} {note.isFavorite && <span className="text-primary">★</span>}</p>
              {note.description && <p className="line-clamp-2 text-xs text-muted-foreground">{note.description}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(note.updatedAt)}</p>
            </div>
          )}
        />
      </div>

      <FolderManagerDialog open={folderManagerOpen} onOpenChange={setFolderManagerOpen} />
    </div>
  );
}
