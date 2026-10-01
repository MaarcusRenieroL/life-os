import { NOTE_TYPES, type Note, type NoteFolder, type NoteSummary, type NoteType } from '@life-os/core';
import { useEffect, useRef, useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote, opts, Panel, pretty, Select } from '../ui';

type Scope = 'all' | 'pinned' | 'favorites' | 'archived' | 'trash';
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'All notes' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'archived', label: 'Archived' },
  { id: 'trash', label: 'Trash' },
];

const flatten = (folders: NoteFolder[], depth = 0): { folder: NoteFolder; depth: number }[] => folders.flatMap((f) => [{ folder: f, depth }, ...flatten(f.children ?? [], depth + 1)]);

export function NotesScreen() {
  const api = useApi();
  const runner = useRunner();
  const [scope, setScope] = useState<Scope>('all');
  const [folder, setFolder] = useState<string>('');
  const [tag, setTag] = useState('');
  const [noteType, setNoteType] = useState<NoteType | ''>('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const folders = useAsync(() => api.notes.folders(), [api]);
  const tags = useAsync(() => api.notes.tags(), [api]);
  const trash = useAsync(() => (scope === 'trash' ? api.notes.trash() : Promise.resolve([])), [api, scope]);
  const notes = useAsync(async () => {
    if (scope === 'trash') return [] as NoteSummary[];
    const page = await api.notes.list({
      sort: 'modified', order: 'desc', size: 100,
      pinned: scope === 'pinned' || undefined, favorite: scope === 'favorites' || undefined, archived: scope === 'archived' || undefined,
      folder: folder || undefined, tag: tag || undefined, noteType: noteType || undefined,
    });
    return page.content;
  }, [api, scope, folder, tag, noteType]);

  const visible = (notes.data ?? []).filter((n) => !query.trim() || `${n.title} ${n.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const refresh = async () => { await Promise.all([notes.reload(), trash.reload(), folders.reload(), tags.reload()]); };

  async function create() {
    const note = await runner.run(() => api.notes.create('Untitled note', '', noteType || 'GENERAL', folder || undefined), refresh);
    if (note) setOpenId(note.id);
  }

  return (
    <div className="split">
      <div className="stack">
        <div className="row"><button className="primary grow" onClick={() => void create()}>+ New note</button></div>
        <input placeholder="Search notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Panel>
          <ul className="list">
            {SCOPES.map((s) => <li key={s.id} className="clickable" onClick={() => { setScope(s.id); setOpenId(null); }}><span className={`grow${scope === s.id ? ' good' : ''}`}>{s.label}</span></li>)}
          </ul>
        </Panel>
        <Panel title="Folders">
          <ul className="list">
            <li className="clickable" onClick={() => setFolder('')}><span className={`grow${folder === '' ? ' good' : ''}`}>Everything</span></li>
            {flatten(folders.data ?? []).map(({ folder: f, depth }) => <li key={f.id} className="clickable" style={{ paddingLeft: depth * 14 }} onClick={() => setFolder(f.id)}><span className={`grow${folder === f.id ? ' good' : ''}`}>{f.name}</span><small className="muted">{f.noteCount}</small></li>)}
          </ul>
        </Panel>
        <Select value={noteType} onChange={setNoteType} options={opts(NOTE_TYPES)} placeholder="Any type" />
        <Select value={tag} onChange={setTag} options={(tags.data ?? []).map((t) => ({ value: t.id, label: t.name }))} placeholder="Any tag" />
      </div>

      <div className="stack">
        {runner.error && <ErrorNote message={runner.error} />}
        {openId ? (
          <NoteEditor key={openId} id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
        ) : scope === 'trash' ? (
          <Panel title="Trash · purged after 30 days">
            {(trash.data ?? []).length === 0 ? <Empty>Trash is empty.</Empty> : <ul className="list">{(trash.data ?? []).map((n) => (
              <li key={n.id}><span className="grow">{n.title}</span><small className="muted">purges {n.purgesAt.slice(0, 10)}</small>
                <button className="link" onClick={() => void runner.run(() => api.notes.restore(n.id), refresh)}>Restore</button>
                <button className="link" onClick={() => void runner.run(() => api.notes.purge(n.id), refresh)}>Delete forever</button></li>
            ))}</ul>}
          </Panel>
        ) : (
          <Panel title={`${SCOPES.find((s) => s.id === scope)!.label} · ${visible.length}`}>
            {notes.error && <ErrorNote message={notes.error} onRetry={notes.reload} />}
            {visible.length === 0 && !notes.loading ? <Empty>No notes here yet.</Empty> : (
              <ul className="list">{visible.map((n) => (
                <li key={n.id} className="clickable" onClick={() => setOpenId(n.id)}>
                  <div className="grow"><b>{n.isPinned && '📌 '}{n.isFavorite && '★ '}{n.title || 'Untitled'}</b>{n.description && <div className="muted">{n.description}</div>}</div>
                  {n.tags.slice(0, 3).map((t) => <span key={t.id} className="pill">{t.name}</span>)}
                  <span className="pill">{pretty(n.noteType)}</span><small className="muted">{n.updatedAt.slice(0, 10)}</small>
                </li>
              ))}</ul>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function NoteEditor({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const note = useAsync<Note>(() => api.notes.get(id), [api, id]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
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
    if (saved !== 'dirty') return;
    const timer = setTimeout(async () => {
      setSaved('saving');
      try {
        await api.notes.update(id, { title: title.trim() || 'Untitled note', content });
        setSaved('saved');
        void onChanged();
      } catch {
        setSaved('dirty');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [saved, title, content, api, id, onChanged]);

  const n = note.data;
  const flag = (patch: { isPinned?: boolean; isFavorite?: boolean; isArchived?: boolean }) => runner.run(() => api.notes.update(id, patch), async () => { await note.reload(); await onChanged(); });
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  if (note.error && !n) return <ErrorNote message={note.error} onRetry={note.reload} />;
  if (!n) return <Panel><Empty>Loading…</Empty></Panel>;

  return (
    <Panel>
      <div className="stack">
        <div className="row">
          <button className="link" onClick={() => void (saved === 'dirty' ? api.notes.update(id, { title: title.trim() || 'Untitled note', content }).catch(() => undefined) : Promise.resolve()).then(async () => { await onChanged(); onClose(); })}>‹ Back</button>
          <div className="actions">
            <small className="muted">{saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : saved === 'dirty' ? 'Unsaved' : ''} · {words} words</small>
            <button className="ghost" onClick={() => void flag({ isPinned: !n.isPinned })}>{n.isPinned ? 'Unpin' : 'Pin'}</button>
            <button className="ghost" onClick={() => void flag({ isFavorite: !n.isFavorite })}>{n.isFavorite ? '★ Favorited' : '☆ Favorite'}</button>
            <button className="ghost" onClick={() => void flag({ isArchived: !n.isArchived })}>{n.isArchived ? 'Unarchive' : 'Archive'}</button>
            <button className="danger" onClick={() => void runner.run(() => api.notes.remove(id), async () => { await onChanged(); onClose(); })}>Trash</button>
          </div>
        </div>
        {runner.error && <ErrorNote message={runner.error} />}
        <input className="note-title" value={title} placeholder="Title" onChange={(e) => { setTitle(e.target.value); setSaved('dirty'); }} />
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <Select value={n.noteType} onChange={(v) => v && void runner.run(() => api.notes.update(id, { noteType: v }), async () => { await note.reload(); await onChanged(); })} options={opts(NOTE_TYPES)} />
          {n.tags.map((t) => <span key={t.id} className="pill">{t.name} <button className="link" onClick={() => void runner.run(() => api.notes.removeTag(id, t.id), note.reload)}>×</button></span>)}
        </div>
        <textarea className="editor" value={content} placeholder="Start writing… (Markdown is fine)" onChange={(e) => { setContent(e.target.value); setSaved('dirty'); }} />
      </div>
    </Panel>
  );
}
