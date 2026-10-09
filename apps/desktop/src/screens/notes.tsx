import { NOTE_TYPES, type Note, type NoteFolder, type NoteSummary, type TrashedNote } from '@life-os/core';
import { useEffect, useRef, useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { AttachmentsTab, GraphTab, JournalTab, NoteSettingsTab, SearchTab, TemplatesTab } from '../modules/notes-extra';
import { DataGrid, type Col } from '../grid/data-grid';
import { Empty, ErrorNote, opts, Panel, pretty, Select, Tabs } from '../ui';

type Scope = 'all' | 'pinned' | 'favorites' | 'archived' | 'trash';
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'All notes' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'archived', label: 'Archived' },
  { id: 'trash', label: 'Trash' },
];

const flatten = (folders: NoteFolder[], depth = 0): { folder: NoteFolder; depth: number }[] => folders.flatMap((f) => [{ folder: f, depth }, ...flatten(f.children ?? [], depth + 1)]);

export function NotesTab({ initialOpenId = null }: { initialOpenId?: string | null }) {
  const api = useApi();
  const runner = useRunner();
  const [scope, setScope] = useState<Scope>('all');
  const [folder, setFolder] = useState<string>('');
  const [openId, setOpenId] = useState<string | null>(initialOpenId);

  const folders = useAsync(() => api.notes.folders(), [api]);
  const trash = useAsync(() => (scope === 'trash' ? api.notes.trash() : Promise.resolve([])), [api, scope]);
  const notes = useAsync(async () => {
    if (scope === 'trash') return [] as NoteSummary[];
    const page = await api.notes.list({
      sort: 'modified', order: 'desc', size: 500,
      pinned: scope === 'pinned' || undefined, favorite: scope === 'favorites' || undefined, archived: scope === 'archived' || undefined,
      folder: folder || undefined,
    });
    return page.content;
  }, [api, scope, folder]);

  const refresh = async () => { await Promise.all([notes.reload(), trash.reload(), folders.reload()]); };
  const columns: Col<NoteSummary>[] = [
    { id: 'title', title: 'Title', value: (n) => n.title || 'Untitled', filter: { type: 'text' }, cell: (n) => <div><b>{n.isPinned && '📌 '}{n.isFavorite && '★ '}{n.title || 'Untitled'}</b>{n.description && <div className="muted">{n.description}</div>}</div> },
    { id: 'type', title: 'Type', value: (n) => pretty(n.noteType), filter: { type: 'select' } },
    { id: 'tags', title: 'Tags', value: (n) => n.tags.map((t) => t.name), filter: { type: 'select' } },
    { id: 'pinned', title: 'Pinned', value: (n) => n.isPinned, filter: { type: 'boolean' }, hidden: true },
    { id: 'favorite', title: 'Favourite', value: (n) => n.isFavorite, filter: { type: 'boolean' }, hidden: true },
    { id: 'updated', title: 'Updated', value: (n) => n.updatedAt.slice(0, 10), filter: { type: 'date' } },
  ];
  const trashColumns: Col<TrashedNote>[] = [
    { id: 'title', title: 'Title', value: (n) => n.title, filter: { type: 'text' } },
    { id: 'purges', title: 'Purges on', value: (n) => n.purgesAt.slice(0, 10), filter: { type: 'date' } },
  ];

  async function create() {
    const note = await runner.run(() => api.notes.create('Untitled note', '', 'GENERAL', folder || undefined), refresh);
    if (note) setOpenId(note.id);
  }

  return (
    <div className="split">
      <div className="stack">
        <div className="row"><button className="primary grow" onClick={() => void create()}>+ New note</button></div>
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
      </div>

      <div className="stack">
        {runner.error && <ErrorNote message={runner.error} />}
        {openId ? (
          <NoteEditor key={openId} id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
        ) : scope === 'trash' ? (
          <Panel title="Trash · purged after 30 days">
            <DataGrid
              tableId="notes.trash"
              data={trash.data ?? []}
              columns={trashColumns}
              getRowId={(n) => n.id}
              loading={trash.loading && !trash.data}
              emptyMessage="Trash is empty."
              searchPlaceholder="Search trash…"
              drawer={false}
              rowActions={(n) => (
                <>
                  <button className="link" onClick={() => void runner.run(() => api.notes.restore(n.id), refresh)}>Restore</button>
                  <button className="link" onClick={() => void runner.run(() => api.notes.purge(n.id), refresh)}>Delete forever</button>
                </>
              )}
            />
          </Panel>
        ) : (
          <Panel title={`${SCOPES.find((s) => s.id === scope)!.label} · ${notes.data?.length ?? 0}`}>
            {notes.error && <ErrorNote message={notes.error} onRetry={notes.reload} />}
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

const TABS = [{ id: 'notes', label: 'All notes' }, { id: 'journal', label: 'Journal' }, { id: 'search', label: 'Search' }, { id: 'templates', label: 'Templates' }, { id: 'graph', label: 'Graph' }, { id: 'attachments', label: 'Attachments' }, { id: 'settings', label: 'Settings' }] as const;
type TabId = (typeof TABS)[number]['id'];

export function NotesScreen() {
  const [tab, setTab] = useState<TabId>('notes');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = (id: string) => { setOpenId(id); setTab('notes'); };
  return (
    <div className="stack">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'notes' ? <NotesTab key={openId ?? 'none'} initialOpenId={openId} /> : tab === 'journal' ? <JournalTab /> : tab === 'search' ? <SearchTab onOpen={open} /> : tab === 'templates' ? <TemplatesTab onOpen={open} /> : tab === 'graph' ? <GraphTab onOpen={open} /> : tab === 'attachments' ? <AttachmentsTab onOpen={open} /> : <NoteSettingsTab />}
    </div>
  );
}
