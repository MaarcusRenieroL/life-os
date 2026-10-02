import { dayKey, MOOD_LABELS, NOTE_TYPES, type JournalEntry, type NoteType } from '@life-os/core';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '@/text';

import { Bars, Btn, Chips, DateInput, Empty, Field, Input, opts, pretty, Pill, Progress, Row, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

const MOODS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ${MOOD_LABELS[n]}` }));

// ------------------------------------------------------------------ journal
export function JournalTab() {
  const api = useApi();
  const [mood, setMood] = useState('');
  const [open, setOpen] = useState<JournalEntry | 'new' | null>(null);
  const entries = useAsync(() => api.journal.list(mood ? { mood: Number(mood) } : {}), mood);
  const insights = useAsync(() => api.journal.insights(), api);
  const i = insights.data;
  return (
    <>
      <Btn label="Write an entry" onPress={() => setOpen('new')} style={{ marginBottom: 12 }} />
      <Panel title="Your streak"><StatGrid>
        <Stat label="Entries" value={i?.totalEntries ?? '—'} />
        <Stat label="Current streak" value={i ? `${i.currentStreakDays} d` : '—'} sub={i ? `longest ${i.longestStreakDays} d` : undefined} />
        <Stat label="Avg mood" value={i?.averageMood != null ? i.averageMood.toFixed(1) : '—'} />
        <Stat label="Avg energy" value={i?.averageEnergy != null ? i.averageEnergy.toFixed(1) : '—'} />
      </StatGrid></Panel>
      <View style={{ marginBottom: 10 }}><Chips value={mood} onChange={setMood} options={MOODS} clearable /></View>
      {entries.error && !entries.data ? <ErrorNote message={entries.error} onRetry={entries.reload} /> : null}
      <Panel title={`${entries.data?.length ?? 0} entries`}>
        {entries.data?.length === 0 ? <Empty>No entries yet.</Empty> : entries.data?.map((e) => (
          <Row key={e.noteId} onPress={() => setOpen(e)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>{e.entryDate}{e.mood ? ` · ${MOOD_LABELS[e.mood]}` : ''}</Text>
              <Muted numberOfLines={2} style={{ fontSize: 12 }}>{e.excerpt || e.title}</Muted>
            </View>
          </Row>
        ))}
      </Panel>
      {open ? <JournalSheet entry={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={async () => { setOpen(null); await Promise.all([entries.reload(), insights.reload()]); }} /> : null}
    </>
  );
}

function JournalSheet({ entry, onClose, onSaved }: { entry: JournalEntry | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const prompts = useAsync(() => api.journal.suggestedPrompts(entry?.entryDate), entry?.entryDate);
  const [date, setDate] = useState(entry?.entryDate ?? dayKey(new Date()));
  const [mood, setMood] = useState(entry?.mood ? String(entry.mood) : '');
  const [energy, setEnergy] = useState(entry?.energy ? String(entry.energy) : '');
  const [free, setFree] = useState(entry?.freeWriting ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries((entry?.prompts ?? []).map((p) => [p.prompt, p.answer])));
  const promptTexts = [...new Set([...(entry?.prompts ?? []).map((p) => p.prompt), ...(prompts.data ?? []).map((p) => p.text)])];

  async function save() {
    const body = { entryDate: date, mood: mood ? Number(mood) : null, energy: energy ? Number(energy) : null, freeWriting: free.trim() || null, prompts: promptTexts.filter((p) => answers[p]?.trim()).map((p) => ({ prompt: p, answer: answers[p].trim() })), links: [] };
    if (await runner.run(() => (entry ? api.journal.update(entry.noteId, body) : api.journal.create(body)))) await onSaved();
  }

  return (
    <Sheet title={entry ? 'Journal entry' : 'New journal entry'} onClose={onClose}>
      <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
      <Field label="Mood"><Chips value={mood} onChange={setMood} options={MOODS} clearable /></Field>
      <Field label="Energy"><Chips value={energy} onChange={setEnergy} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} clearable /></Field>
      {promptTexts.map((p) => <Field key={p} label={p}><Input value={answers[p] ?? ''} onChangeText={(v) => setAnswers({ ...answers, [p]: v })} multiline style={{ minHeight: 60 }} /></Field>)}
      <Field label="Free writing"><Input value={free} onChangeText={setFree} multiline style={{ minHeight: 120 }} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <View style={{ gap: 10 }}>
        <Btn label="Save" disabled={runner.busy} onPress={() => void save()} />
        {entry ? <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.journal.remove(entry.noteId), onSaved)} /> : null}
      </View>
    </Sheet>
  );
}

// ------------------------------------------------------------------ search
export function SearchTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const results = useAsync(() => (term ? api.noteTools.search(term, 0, 30) : Promise.resolve(null)), term);
  return (
    <>
      <Input value={q} onChangeText={setQ} onSubmitEditing={() => setTerm(q.trim())} returnKeyType="search" placeholder="Search titles, text and tags…" style={{ marginBottom: 10 }} />
      <Btn label="Search" disabled={!q.trim()} onPress={() => setTerm(q.trim())} style={{ marginBottom: 12 }} />
      {results.error ? <ErrorNote message={results.error} /> : null}
      {term ? (
        <Panel title={`${results.data?.totalElements ?? 0} results`}>
          {results.data?.content.length === 0 ? <Empty>Nothing matches.</Empty> : results.data?.content.map((r) => (
            <Row key={r.id} onPress={() => onOpen(r.id)}>
              <View style={{ flex: 1 }}><Text style={[s.body, { fontWeight: '700' }]}>{r.title}</Text><Muted numberOfLines={2} style={{ fontSize: 12 }}>{r.excerpt}</Muted><Muted style={{ fontSize: 11 }}>{r.matchedFields.join(', ')} · {r.updatedAt.slice(0, 10)}</Muted></View>
            </Row>
          ))}
        </Panel>
      ) : <Empty>Type something to search every note.</Empty>}
    </>
  );
}

// ------------------------------------------------------------------ templates
export function TemplatesTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const runner = useRunner();
  const templates = useAsync(() => api.noteTools.templates(), api);
  const [using, setUsing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: '', content: '' });
  return (
    <>
      <Btn label="+ New template" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {templates.error && !templates.data ? <ErrorNote message={templates.error} onRetry={templates.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${templates.data?.totalElements ?? 0} templates`}>
        {templates.data?.content.length === 0 ? <Empty>No templates yet.</Empty> : templates.data?.content.map((t) => (
          <Row key={t.id}>
            <View style={{ flex: 1 }}><Text style={[s.body, { fontWeight: '700' }]}>{t.name}</Text><Muted numberOfLines={2} style={{ fontSize: 12 }}>{t.preview}</Muted>{t.category ? <Muted style={{ fontSize: 11 }}>{t.category}</Muted> : null}</View>
            <Btn label="Use" onPress={() => { setUsing(t.id); setTitle(t.name); }} style={{ paddingVertical: 5, paddingHorizontal: 10 }} />
            <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.noteTools.deleteTemplate(t.id), templates.reload)} style={{ paddingVertical: 5, paddingHorizontal: 10 }} />
          </Row>
        ))}
      </Panel>
      {using ? (
        <Sheet title="New note from template" onClose={() => setUsing(null)}>
          <Field label="Title"><Input value={title} onChangeText={setTitle} /></Field>
          <Btn label="Create note" disabled={!title.trim() || runner.busy} onPress={() => void runner.run(() => api.noteTools.useTemplate(using, title.trim())).then((n) => { if (n) { setUsing(null); onOpen(n.id); } })} />
        </Sheet>
      ) : null}
      {adding ? (
        <Sheet title="New template" onClose={() => setAdding(false)}>
          <Field label="Name"><Input value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} /></Field>
          <Field label="Category"><Input value={draft.category} onChangeText={(v) => setDraft({ ...draft, category: v })} /></Field>
          <Field label="Content"><Input value={draft.content} onChangeText={(v) => setDraft({ ...draft, content: v })} multiline style={{ minHeight: 140 }} /></Field>
          <Btn label="Save template" disabled={!draft.name.trim() || runner.busy} onPress={() => void runner.run(() => api.noteTools.createTemplate(draft.name.trim(), draft.content, draft.category.trim() || undefined), async () => { setAdding(false); setDraft({ name: '', category: '', content: '' }); await templates.reload(); })} />
        </Sheet>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ graph
/** The note graph as a list: the most connected notes first, each with what it links to and from. */
export function GraphTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const graph = useAsync(() => api.noteTools.graph(), api);
  const g = graph.data;
  const title = new Map((g?.nodes ?? []).map((n) => [n.id, n.title]));
  const links = (id: string) => (g?.edges ?? []).filter((e) => e.sourceId === id || e.targetId === id).map((e) => title.get(e.sourceId === id ? e.targetId : e.sourceId)).filter(Boolean);
  const nodes = [...(g?.nodes ?? [])].sort((a, b) => b.connectionCount - a.connectionCount);
  return (
    <>
      {graph.error && !g ? <ErrorNote message={graph.error} onRetry={graph.reload} /> : null}
      <Panel title={`${g?.nodes.length ?? 0} notes · ${g?.edges.length ?? 0} links`}>
        {nodes.length === 0 ? <Empty>Link notes together with [[double brackets]] and they appear here.</Empty> : nodes.map((n) => (
          <Row key={n.id} onPress={() => onOpen(n.id)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>{n.title}</Text>
              <Muted style={{ fontSize: 11 }}>{pretty(n.noteType)}{n.folderName ? ` · ${n.folderName}` : ''}</Muted>
              {n.connectionCount > 0 ? <Muted numberOfLines={2} style={{ fontSize: 12 }}>↔ {links(n.id).join(', ')}</Muted> : null}
            </View>
            <Pill label={`${n.connectionCount} links`} color={n.connectionCount ? C.accent : C.muted} />
          </Row>
        ))}
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ attachments
export function AttachmentsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const api = useApi();
  const files = useAsync(() => api.noteTools.attachments(), api);
  const size = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  return (
    <>
      {files.error && !files.data ? <ErrorNote message={files.error} onRetry={files.reload} /> : null}
      <Panel title={`${files.data?.length ?? 0} files`}>
        {files.data?.length === 0 ? <Empty>No attachments yet. Add files from a note on the website.</Empty> : files.data?.map((f) => (
          <Row key={f.id} onPress={() => onOpen(f.noteId)}>
            <View style={{ flex: 1 }}><Text style={s.body}>{f.fileName}</Text><Muted style={{ fontSize: 11 }}>{size(f.fileSize)} · in “{f.noteTitle}” · {f.uploadDate.slice(0, 10)}</Muted></View>
          </Row>
        ))}
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ settings + folders
export function NoteSettingsTab() {
  const api = useApi();
  const runner = useRunner();
  const settings = useAsync(() => api.noteTools.settings(), api);
  const folders = useAsync(() => api.notes.folders(), api);
  const [name, setName] = useState('');
  const st = settings.data;
  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Defaults">
        <Field label="New notes start as"><Chips value={st?.defaultNoteType ?? 'GENERAL'} onChange={(v) => v && void runner.run(() => api.noteTools.updateSettings({ defaultNoteType: v as NoteType }), settings.reload)} options={opts(NOTE_TYPES)} /></Field>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={s.body}>Archive old notes automatically</Text>
          <Switch value={!!st?.autoArchiveEnabled} onValueChange={(v) => void runner.run(() => api.noteTools.updateSettings({ autoArchiveEnabled: v }), settings.reload)} trackColor={{ true: C.accent }} />
        </View>
        {st?.autoArchiveEnabled ? <Field label="After (days)"><Input defaultValue={String(st.autoArchiveDays)} keyboardType="numeric" onEndEditing={(e) => { const n = Number(e.nativeEvent.text); if (n > 0) void runner.run(() => api.noteTools.updateSettings({ autoArchiveDays: n }), settings.reload); }} /></Field> : null}
      </Panel>
      <Panel title="Folders">
        {folders.data?.length === 0 ? <Empty>No folders yet.</Empty> : folders.data?.map((f) => (
          <Row key={f.id}><Text style={[s.body, { flex: 1 }]}>{f.name}</Text><Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.noteTools.deleteFolder(f.id), folders.reload)} style={{ paddingVertical: 5, paddingHorizontal: 10 }} /></Row>
        ))}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Input value={name} onChangeText={setName} placeholder="New folder" style={{ flex: 1 }} />
          <Btn label="Add" disabled={!name.trim() || runner.busy} onPress={() => void runner.run(() => api.noteTools.createFolder(name.trim()), async () => { setName(''); await folders.reload(); })} />
        </View>
      </Panel>
    </>
  );
}
