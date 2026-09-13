import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { FolderManagerDialog } from './folder-manager-dialog';
import { foldersApi } from './folders-api';
import { notesApi } from './notes-api';
import { tagsApi } from './tags-api';
import { noteSettingsApi } from './settings-api';
import type { NoteListFilters, NoteSummary } from './types';
import { noteTypeMeta } from './utils/note-type-meta';
import { relativeTime } from './utils/relative-time';

type QuickView = 'all' | 'favorites' | 'pinned' | 'archived';

const PAGE_SIZE = 24;

export function NotesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [quickView, setQuickView] = useState<QuickView>('all');
  const [folder, setFolder] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<NoteListFilters['sort']>('modified');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);

  const filters: NoteListFilters = {
    sort,
    order: 'desc',
    folder: folder ?? undefined,
    tag: tag ?? undefined,
    archived: quickView === 'archived',
    favorite: quickView === 'favorites' ? true : undefined,
    page,
    size: PAGE_SIZE,
  };

  const { data: folders = [] } = useQuery({ queryKey: ['notes', 'folders'], queryFn: foldersApi.list });
  const { data: tags = [] } = useQuery({ queryKey: ['notes', 'tags'], queryFn: () => tagsApi.list() });
  const { data: pinned = [] } = useQuery({ queryKey: ['notes', 'pinned'], queryFn: notesApi.pinned });
  const { data: favorites = [] } = useQuery({
    queryKey: ['notes', 'favorites'],
    queryFn: notesApi.favorites,
  });
  const { data: page_, isLoading } = useQuery({
    queryKey: ['notes', 'list', filters],
    queryFn: () => notesApi.list(filters),
  });

  // Search is client-side over the already-loaded page, matching the Angular app's
  // existing behavior (a real fix would be a server-side query param, but that's a
  // product change beyond a straight port).
  const filteredNotes = useMemo(() => {
    const notes = page_?.content ?? [];
    if (!searchTerm.trim()) return notes;
    const term = searchTerm.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(term) || (n.description ?? '').toLowerCase().includes(term),
    );
  }, [page_, searchTerm]);

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <Button onClick={() => void createNote()}>
          <Plus /> New note
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['all', 'favorites', 'pinned', 'archived'] as QuickView[]).map((view) => (
          <Button
            key={view}
            size="sm"
            variant={quickView === view ? 'secondary' : 'ghost'}
            onClick={() => {
              setQuickView(view);
              setPage(0);
            }}
          >
            {view === 'all' ? 'All notes' : view[0].toUpperCase() + view.slice(1)}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search loaded notes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={folder ?? '__all__'} onValueChange={(v) => setFolder(v === '__all__' ? null : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All folders</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tag ?? '__all__'} onValueChange={(v) => setTag(v === '__all__' ? null : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={() => setFolderManagerOpen(true)}>
          + Manage folders
        </Button>
        <Select value={sort} onValueChange={(v) => setSort(v as NoteListFilters['sort'])}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modified">Last modified</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(pinned.length > 0 || favorites.length > 0) && quickView === 'all' && (
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <span>{pinned.length} pinned</span>
          <span>{favorites.length} favorites</span>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No notes here yet. <Button variant="link" className="px-0" onClick={() => void createNote()}>Create one</Button>.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => {
            const meta = noteTypeMeta(note.noteType);
            const Icon = meta.icon;
            return (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-4" style={{ color: meta.colorVar }} />
                  <div className="flex items-center gap-1">
                    {note.isPinned && <Badge variant="outline">Pinned</Badge>}
                    {note.isFavorite && <Badge variant="outline">★</Badge>}
                  </div>
                </div>
                <h3 className="line-clamp-1 text-sm font-semibold">{note.title}</h3>
                {note.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{note.description}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                  {note.tags.slice(0, 3).map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-[10px]">
                      {t.name}
                    </Badge>
                  ))}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {relativeTime(note.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1 border-t pt-2" onClick={(e) => e.preventDefault()}>
                  <Button size="sm" variant="ghost" onClick={() => void quickAction(note, { isPinned: !note.isPinned })}>
                    {note.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void quickAction(note, { isFavorite: !note.isFavorite })}>
                    {note.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void quickAction(note, { isArchived: !note.isArchived })}>
                    {note.isArchived ? 'Unarchive' : 'Archive'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteNote(note)}>
                    Delete
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {page_ && page_.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page_.first} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page_.number + 1} of {page_.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page_.last} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <FolderManagerDialog open={folderManagerOpen} onOpenChange={setFolderManagerOpen} />
    </div>
  );
}
