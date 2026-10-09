import { NOTE_TYPES, type Note, type NoteSummary, type TrashedNote } from '@life-os/core';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Btn, Chips, Input, opts, pretty, Seg, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel } from '@/ui';

type Scope = 'all' | 'pinned' | 'favorites' | 'archived' | 'trash';
const SCOPES = [{ id: 'all', label: 'All' }, { id: 'pinned', label: 'Pinned' }, { id: 'favorites', label: 'Favorites' }, { id: 'archived', label: 'Archived' }, { id: 'trash', label: 'Trash' }] as const;

export function NotesTab({ initialOpenId = null }: { initialOpenId?: string | null }) {
  const api = useApi();
  const runner = useRunner();
  const [scope, setScope] = useState<Scope>('all');
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const notes = useAsync(async () => {
    if (scope === 'trash') return [] as NoteSummary[];
    return (await api.notes.list({ sort: 'modified', order: 'desc', size: 500, pinned: scope === 'pinned' || undefined, favorite: scope === 'favorites' || undefined, archived: scope === 'archived' || undefined })).content;
  }, scope);
  const trash = useAsync(() => (scope === 'trash' ? api.notes.trash() : Promise.resolve([])), scope);
  const columns: Col<NoteSummary>[] = [
    { id: 'title', title: 'Title', value: (n) => n.title || 'Untitled', filter: { type: 'text' }, cell: (n) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{n.isPinned ? '📌 ' : ''}{n.isFavorite ? '★ ' : ''}{n.title || 'Untitled'}</Text> },
    { id: 'type', title: 'Type', value: (n) => pretty(n.noteType), filter: { type: 'select' } },
    { id: 'tags', title: 'Tags', value: (n) => n.tags.map((t) => t.name), filter: { type: 'select' } },
    { id: 'updated', title: 'Updated', value: (n) => n.updatedAt.slice(0, 10), filter: { type: 'date' } },
    { id: 'description', title: 'Summary', value: (n) => n.description ?? '', hidden: true },
    { id: 'pinned', title: 'Pinned', value: (n) => n.isPinned, filter: { type: 'boolean' }, hidden: true },
    { id: 'favorite', title: 'Favourite', value: (n) => n.isFavorite, filter: { type: 'boolean' }, hidden: true },
  ];
  const trashColumns: Col<TrashedNote>[] = [
    { id: 'title', title: 'Title', value: (n) => n.title, filter: { type: 'text' } },
    { id: 'purges', title: 'Purges on', value: (n) => n.purgesAt.slice(0, 10), filter: { type: 'date' } },
  ];
  const refresh = async () => { await Promise.all([notes.reload(), trash.reload()]); };

  async function create() {
    const note = await runner.run(() => api.notes.create('Untitled note', '', 'GENERAL'), refresh);
    if (note) setOpenId(note.id);
  }

  return (
    <>
      <Btn label="+ New note" onPress={() => void create()} style={{ marginBottom: 12 }} />
      <Seg tabs={SCOPES} value={scope} onChange={setScope} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {notes.error && !notes.data ? <ErrorNote message={notes.error} onRetry={notes.reload} /> : null}
      {scope === 'trash' ? (
        <Panel title="Trash · purged after 30 days">
          <DataGrid
            tableId="notes.trash"
            data={trash.data ?? []}
            columns={trashColumns}
            getRowId={(n) => n.id}
            loading={trash.loading && !trash.data}
            emptyMessage="Trash is empty."
            searchPlaceholder="Search trash…"
            rowActions={(n, close) => (
              <>
                <Btn kind="ghost" label="Restore" onPress={() => { close(); void runner.run(() => api.notes.restore(n.id), refresh); }} />
                <Btn kind="danger" label="Delete forever" onPress={() => { close(); void runner.run(() => api.notes.purge(n.id), refresh); }} />
              </>
            )}
          />
        </Panel>
      ) : (
        <Panel title={`${notes.data?.length ?? 0} notes`}>
          <DataGrid
            tableId="notes.list"
            data={notes.data ?? []}
            columns={columns}
            getRowId={(n) => n.id}
            loading={notes.loading && !notes.data}
            initialSorting={[{ id: 'updated', desc: true }]}
            emptyMessage="No notes here yet."
            searchPlaceholder="Search notes…"
            exportName="notes"
            onRowClick={(n) => setOpenId(n.id)}
            drawer={false}
            views={[{ id: 'pinned', name: 'Pinned', filters: { pinned: ['true'] } }, { id: 'fav', name: 'Favourites', filters: { favorite: ['true'] } }]}
          />
        </Panel>
      )}
      {openId ? <NoteSheet id={openId} onClose={() => setOpenId(null)} onChanged={refresh} /> : null}
    </>
  );
}

function NoteSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const note = useAsync<Note>(() => api.notes.get(id), id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [state, setState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const loaded = useRef(false);

  useEffect(() => {
    if (note.data && !loaded.current) {
      loaded.current = true;
      setTitle(note.data.title);
      setContent(note.data.content ?? '');
    }
  }, [note.data]);

  // Autosave 800ms after the last keystroke.
  useEffect(() => {
    if (state !== 'dirty') return;
    const timer = setTimeout(async () => {
      setState('saving');
      try {
        await api.notes.update(id, { title: title.trim() || 'Untitled note', content });
        setState('saved');
        void onChanged();
      } catch {
        setState('dirty');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [state, title, content, api, id, onChanged]);

  const close = async () => {
    if (state === 'dirty') await api.notes.update(id, { title: title.trim() || 'Untitled note', content }).catch(() => undefined);
    await onChanged();
    onClose();
  };
  const n = note.data;
  const flag = (patch: { isPinned?: boolean; isFavorite?: boolean; isArchived?: boolean }) => runner.run(() => api.notes.update(id, patch), async () => { await note.reload(); await onChanged(); });
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <Sheet title="Note" onClose={() => void close()}>
      {note.error && !n ? <ErrorNote message={note.error} onRetry={note.reload} /> : null}
      {n ? (
        <>
          <Input value={title} onChangeText={(v) => { setTitle(v); setState('dirty'); }} placeholder="Title" style={{ fontSize: 20, fontWeight: '700', marginBottom: 10 }} />
          <Input value={content} onChangeText={(v) => { setContent(v); setState('dirty'); }} multiline placeholder="Start writing… (Markdown is fine)" style={{ minHeight: 260 }} />
          <Muted style={{ marginVertical: 8 }}>{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'dirty' ? 'Unsaved' : ''} · {words} words</Muted>
          <Chips value={n.noteType} onChange={(v) => v && void runner.run(() => api.notes.update(id, { noteType: v }), async () => { await note.reload(); await onChanged(); })} options={opts(NOTE_TYPES)} />
          {runner.error ? <ErrorNote message={runner.error} /> : null}
          <View style={{ gap: 10, marginTop: 14 }}>
            <Btn kind="ghost" label={n.isPinned ? 'Unpin' : 'Pin'} onPress={() => void flag({ isPinned: !n.isPinned })} />
            <Btn kind="ghost" label={n.isFavorite ? 'Remove favorite' : 'Favorite'} onPress={() => void flag({ isFavorite: !n.isFavorite })} />
            <Btn kind="ghost" label={n.isArchived ? 'Unarchive' : 'Archive'} onPress={() => void flag({ isArchived: !n.isArchived })} />
            <Btn kind="danger" label="Move to trash" onPress={() => void runner.run(() => api.notes.remove(id), async () => { await onChanged(); onClose(); })} />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
