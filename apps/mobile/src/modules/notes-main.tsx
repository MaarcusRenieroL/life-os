import { NOTE_TYPES, type Note, type NoteSummary, type NoteType } from '@life-os/core';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/text';

import { Btn, Chips, Empty, Input, opts, pretty, Row, Seg, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

type Scope = 'all' | 'pinned' | 'favorites' | 'archived' | 'trash';
const SCOPES = [{ id: 'all', label: 'All' }, { id: 'pinned', label: 'Pinned' }, { id: 'favorites', label: 'Favorites' }, { id: 'archived', label: 'Archived' }, { id: 'trash', label: 'Trash' }] as const;

export function NotesTab({ initialOpenId = null }: { initialOpenId?: string | null }) {
  const api = useApi();
  const runner = useRunner();
  const [scope, setScope] = useState<Scope>('all');
  const [noteType, setNoteType] = useState<NoteType | ''>('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const notes = useAsync(async () => {
    if (scope === 'trash') return [] as NoteSummary[];
    return (await api.notes.list({ sort: 'modified', order: 'desc', size: 100, pinned: scope === 'pinned' || undefined, favorite: scope === 'favorites' || undefined, archived: scope === 'archived' || undefined, noteType: noteType || undefined })).content;
  }, `${scope}|${noteType}`);
  const trash = useAsync(() => (scope === 'trash' ? api.notes.trash() : Promise.resolve([])), scope);
  const visible = (notes.data ?? []).filter((n) => !query.trim() || `${n.title} ${n.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const refresh = async () => { await Promise.all([notes.reload(), trash.reload()]); };

  async function create() {
    const note = await runner.run(() => api.notes.create('Untitled note', '', noteType || 'GENERAL'), refresh);
    if (note) setOpenId(note.id);
  }

  return (
    <>
      <Btn label="+ New note" onPress={() => void create()} style={{ marginBottom: 12 }} />
      <Seg tabs={SCOPES} value={scope} onChange={setScope} />
      <Input value={query} onChangeText={setQuery} placeholder="Search notes…" style={{ marginBottom: 10 }} />
      <View style={{ marginBottom: 12 }}><Chips value={noteType} onChange={setNoteType} options={opts(NOTE_TYPES)} clearable /></View>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {notes.error && !notes.data ? <ErrorNote message={notes.error} onRetry={notes.reload} /> : null}
      {scope === 'trash' ? (
        <Panel title="Trash · purged after 30 days">
          {(trash.data ?? []).length === 0 ? <Empty>Trash is empty.</Empty> : (trash.data ?? []).map((n) => (
            <Row key={n.id}><View style={{ flex: 1 }}><Text style={s.body}>{n.title}</Text><Muted style={{ fontSize: 11 }}>purges {n.purgesAt.slice(0, 10)}</Muted></View>
              <Pressable onPress={() => void runner.run(() => api.notes.restore(n.id), refresh)}><Text style={{ color: C.accent }}>Restore</Text></Pressable>
              <Pressable onPress={() => void runner.run(() => api.notes.purge(n.id), refresh)}><Text style={{ color: C.magenta }}>Delete</Text></Pressable></Row>
          ))}
        </Panel>
      ) : (
        <Panel title={`${visible.length} notes`}>
          {visible.length === 0 && !notes.loading ? <Empty>No notes here yet.</Empty> : visible.map((n) => (
            <Row key={n.id} onPress={() => setOpenId(n.id)}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700' }}>{n.isPinned ? '📌 ' : ''}{n.isFavorite ? '★ ' : ''}{n.title || 'Untitled'}</Text>
                {n.description ? <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>{n.description}</Text> : null}
                <Muted style={{ fontSize: 11 }}>{pretty(n.noteType)} · {n.updatedAt.slice(0, 10)}{n.tags.length ? ` · ${n.tags.map((t) => t.name).join(', ')}` : ''}</Muted>
              </View>
            </Row>
          ))}
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
