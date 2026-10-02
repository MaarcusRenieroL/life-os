import { dayKey, MOOD_LABELS, NOTE_TYPES, type JournalEntry, type NoteType } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote, Field, Modal, opts, Panel, pretty, Select, Stat } from '../ui';

const MOODS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ${MOOD_LABELS[n]}` }));

// ------------------------------------------------------------------ journal
export function JournalTab() {
  const api = useApi();
  const [mood, setMood] = useState('');
  const [open, setOpen] = useState<JournalEntry | 'new' | null>(null);
  const entries = useAsync(() => api.journal.list(mood ? { mood: Number(mood) } : {}), [api, mood]);
  const insights = useAsync(() => api.journal.insights(), [api]);
  const i = insights.data;
  return (
    <>
      <div className="row" style={{ gap: 8 }}><Select value={mood} onChange={setMood} options={MOODS} placeholder="Any mood" /><span className="grow" /><button className="primary" onClick={() => setOpen('new')}>Write an entry</button></div>
      <Panel title="Your streak">
        <div className="stats">
          <Stat label="Entries" value={i?.totalEntries ?? '—'} />
          <Stat label="Current streak" value={i ? `${i.currentStreakDays} d` : '—'} sub={i ? `longest ${i.longestStreakDays} d` : undefined} />
          <Stat label="Avg mood" value={i?.averageMood != null ? i.averageMood.toFixed(1) : '—'} />
          <Stat label="Avg energy" value={i?.averageEnergy != null ? i.averageEnergy.toFixed(1) : '—'} />
        </div>
      </Panel>
      {entries.error && !entries.data && <ErrorNote message={entries.error} onRetry={entries.reload} />}
      <Panel title={`${entries.data?.length ?? 0} entries`}>
        {entries.data?.length === 0 ? <Empty>No entries yet.</Empty> : (
          <ul className="list">
            {entries.data?.map((e) => <li key={e.noteId} className="clickable" onClick={() => setOpen(e)}><span className="grow"><b>{e.entryDate}{e.mood ? ` · ${MOOD_LABELS[e.mood]}` : ''}</b><div className="muted">{e.excerpt || e.title}</div></span></li>)}
          </ul>
        )}
      </Panel>
      {open && <JournalModal entry={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={async () => { setOpen(null); await Promise.all([entries.reload(), insights.reload()]); }} />}
    </>
  );
}

function JournalModal({ entry, onClose, onSaved }: { entry: JournalEntry | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const prompts = useAsync(() => api.journal.suggestedPrompts(entry?.entryDate), [api, entry?.entryDate]);
  const [date, setDate] = useState(entry?.entryDate ?? dayKey(new Date()));
  const [mood, setMood] = useState(entry?.mood ? String(entry.mood) : '');
  const [energy, setEnergy] = useState(entry?.energy ? String(entry.energy) : '');
  const [free, setFree] = useState(entry?.freeWriting ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries((entry?.prompts ?? []).map((p) => [p.prompt, p.answer])));
  const promptTexts = [...new Set([...(entry?.prompts ?? []).map((p) => p.prompt), ...(prompts.data ?? []).map((p) => p.text)])];

  async function save(event: FormEvent) {
    event.preventDefault();
    const body = { entryDate: date, mood: mood ? Number(mood) : null, energy: energy ? Number(energy) : null, freeWriting: free.trim() || null, prompts: promptTexts.filter((p) => answers[p]?.trim()).map((p) => ({ prompt: p, answer: answers[p].trim() })), links: [] };
    if (await runner.run(() => (entry ? api.journal.update(entry.noteId, body) : api.journal.create(body)))) await onSaved();
  }

  return (
    <Modal title={entry ? 'Journal entry' : 'New journal entry'} onClose={onClose} wide>
      <form className="stack" onSubmit={save}>
        <div className="cols">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Mood"><Select value={mood} onChange={setMood} options={MOODS} placeholder="—" /></Field>
          <Field label="Energy"><Select value={energy} onChange={setEnergy} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} placeholder="—" /></Field>
        </div>
        {promptTexts.map((p) => <Field key={p} label={p}><textarea rows={2} value={answers[p] ?? ''} onChange={(e) => setAnswers({ ...answers, [p]: e.target.value })} /></Field>)}
        <Field label="Free writing"><textarea rows={8} value={free} onChange={(e) => setFree(e.target.value)} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions">
          {entry && <button type="button" className="danger" onClick={() => void runner.run(() => api.journal.remove(entry.noteId), onSaved)}>Delete</button>}
          <button className="primary" disabled={runner.busy}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ search
export function SearchTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const results = useAsync(() => (term ? api.noteTools.search(term, 0, 30) : Promise.resolve(null)), [api, term]);
  return (
    <>
      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }}>
        <input className="grow" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, text and tags…" />
        <button className="primary" disabled={!q.trim()}>Search</button>
      </form>
      {results.error && <ErrorNote message={results.error} />}
      {term ? (
        <Panel title={`${results.data?.totalElements ?? 0} results`}>
          {results.data?.content.length === 0 ? <Empty>Nothing matches.</Empty> : (
            <ul className="list">
              {results.data?.content.map((r) => <li key={r.id} className="clickable" onClick={() => onOpen(r.id)}><span className="grow"><b>{r.title}</b><div className="muted">{r.excerpt}</div><small className="muted">{r.matchedFields.join(', ')} · {r.updatedAt.slice(0, 10)}</small></span></li>)}
            </ul>
          )}
        </Panel>
      ) : <Empty>Type something to search every note.</Empty>}
    </>
  );
}

// ------------------------------------------------------------------ templates
export function TemplatesTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const runner = useRunner();
  const templates = useAsync(() => api.noteTools.templates(), [api]);
  const [using, setUsing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: '', content: '' });
  return (
    <>
      <div className="row"><span className="grow" /><button className="primary" onClick={() => setAdding(true)}>+ New template</button></div>
      {templates.error && !templates.data && <ErrorNote message={templates.error} onRetry={templates.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${templates.data?.totalElements ?? 0} templates`}>
        {templates.data?.content.length === 0 ? <Empty>No templates yet.</Empty> : (
          <ul className="list">
            {templates.data?.content.map((t) => (
              <li key={t.id}>
                <span className="grow"><b>{t.name}</b><div className="muted">{t.preview}</div>{t.category && <small className="muted">{t.category}</small>}</span>
                <button className="primary" onClick={() => { setUsing(t.id); setTitle(t.name); }}>Use</button>
                <button className="danger" onClick={() => void runner.run(() => api.noteTools.deleteTemplate(t.id), templates.reload)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {using && (
        <Modal title="New note from template" onClose={() => setUsing(null)}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.noteTools.useTemplate(using, title.trim())).then((n) => { if (n) { setUsing(null); onOpen(n.id); } }); }}>
            <Field label="Title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <div className="actions"><button className="primary" disabled={!title.trim() || runner.busy}>Create note</button></div>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal title="New template" onClose={() => setAdding(false)}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.noteTools.createTemplate(draft.name.trim(), draft.content, draft.category.trim() || undefined), async () => { setAdding(false); setDraft({ name: '', category: '', content: '' }); await templates.reload(); }); }}>
            <div className="cols"><Field label="Name"><input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Category"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field></div>
            <Field label="Content"><textarea rows={8} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></Field>
            <div className="actions"><button className="primary" disabled={!draft.name.trim() || runner.busy}>Save template</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------------ graph
/** The note graph as a list: the most connected notes first, each with what it links to and from. */
export function GraphTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const graph = useAsync(() => api.noteTools.graph(), [api]);
  const g = graph.data;
  const title = new Map((g?.nodes ?? []).map((n) => [n.id, n.title]));
  const links = (id: string) => (g?.edges ?? []).filter((e) => e.sourceId === id || e.targetId === id).map((e) => title.get(e.sourceId === id ? e.targetId : e.sourceId)).filter(Boolean);
  const nodes = [...(g?.nodes ?? [])].sort((a, b) => b.connectionCount - a.connectionCount);
  return (
    <>
      {graph.error && !g && <ErrorNote message={graph.error} onRetry={graph.reload} />}
      <Panel title={`${g?.nodes.length ?? 0} notes · ${g?.edges.length ?? 0} links`}>
        {nodes.length === 0 ? <Empty>Link notes together with [[double brackets]] and they appear here.</Empty> : (
          <ul className="list">
            {nodes.map((n) => (
              <li key={n.id} className="clickable" onClick={() => onOpen(n.id)}>
                <span className="grow"><b>{n.title}</b><div className="muted">{pretty(n.noteType)}{n.folderName ? ` · ${n.folderName}` : ''}</div>{n.connectionCount > 0 && <small className="muted">↔ {links(n.id).join(', ')}</small>}</span>
                <span className={`pill ${n.connectionCount ? 'good' : ''}`}>{n.connectionCount} links</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ attachments
export function AttachmentsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const files = useAsync(() => api.noteTools.attachments(), [api]);
  const size = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  return (
    <>
      {files.error && !files.data && <ErrorNote message={files.error} onRetry={files.reload} />}
      <Panel title={`${files.data?.length ?? 0} files`}>
        {files.data?.length === 0 ? <Empty>No attachments yet. Add files from a note on the website.</Empty> : (
          <ul className="list">
            {files.data?.map((f) => <li key={f.id} className="clickable" onClick={() => onOpen(f.noteId)}><span className="grow">{f.fileName}<div className="muted">{size(f.fileSize)} · in “{f.noteTitle}” · {f.uploadDate.slice(0, 10)}</div></span></li>)}
          </ul>
        )}
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ settings + folders
export function NoteSettingsTab() {
  const api = useApi();
  const runner = useRunner();
  const settings = useAsync(() => api.noteTools.settings(), [api]);
  const folders = useAsync(() => api.notes.folders(), [api]);
  const [name, setName] = useState('');
  const st = settings.data;
  return (
    <>
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Defaults">
        <div className="cols">
          <Field label="New notes start as"><Select value={st?.defaultNoteType ?? 'GENERAL'} onChange={(v) => v && void runner.run(() => api.noteTools.updateSettings({ defaultNoteType: v as NoteType }), settings.reload)} options={opts(NOTE_TYPES)} /></Field>
          <Field label="Archive old notes automatically"><input type="checkbox" checked={!!st?.autoArchiveEnabled} onChange={(e) => void runner.run(() => api.noteTools.updateSettings({ autoArchiveEnabled: e.target.checked }), settings.reload)} /></Field>
          {st?.autoArchiveEnabled && <Field label="After (days)"><input type="number" min={1} defaultValue={st.autoArchiveDays} onBlur={(e) => { const n = Number(e.target.value); if (n > 0 && n !== st.autoArchiveDays) void runner.run(() => api.noteTools.updateSettings({ autoArchiveDays: n }), settings.reload); }} /></Field>}
        </div>
      </Panel>
      <Panel title="Folders">
        {folders.data?.length === 0 ? <Empty>No folders yet.</Empty> : <ul className="list">{folders.data?.map((f) => <li key={f.id}><span className="grow">{f.name}</span><button className="danger" onClick={() => void runner.run(() => api.noteTools.deleteFolder(f.id), folders.reload)}>Delete</button></li>)}</ul>}
        <form className="row" style={{ gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.noteTools.createFolder(name.trim()), async () => { setName(''); await folders.reload(); }); }}>
          <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="New folder" />
          <button className="primary" disabled={!name.trim() || runner.busy}>Add</button>
        </form>
      </Panel>
    </>
  );
}
