import { LIFE_AREAS, TASK_PRIORITIES, TASK_STATUSES, type LifeArea, type Task, type TaskPriority, type TaskStatus } from '@life-os/core';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/text';

import { Btn, Chips, DateInput, Empty, Field, Input, opts, pretty, Row, Screen, Seg, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { Check, ErrorNote, Muted, Panel, s } from '@/ui';

type TabId = 'today' | 'upcoming' | 'list' | 'board' | 'done';
const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'list', label: 'List' },
  { id: 'board', label: 'Board' },
  { id: 'done', label: 'Completed' },
] as const;
const ORDER: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_COLOR: Record<TaskPriority, string> = { URGENT: C.magenta, HIGH: C.gold, MEDIUM: C.muted, LOW: C.muted };
const byUrgency = (a: Task, b: Task) => ORDER[a.priority] - ORDER[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9');

export default function Tasks() {
  const api = useApi();
  const runner = useRunner();
  const [tab, setTab] = useState<TabId>('today');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const tasks = useAsync(() => {
    const q = query.trim() || undefined;
    if (tab === 'today') return api.tasks.list({ view: 'TODAY', q });
    if (tab === 'upcoming') return api.tasks.list({ view: 'UPCOMING', upcomingDays: 14, q });
    if (tab === 'done') return api.tasks.list({ view: 'COMPLETED', q });
    return api.tasks.list({ q });
  }, `${tab}|${query}`);
  const overdue = useAsync(() => (tab === 'today' ? api.tasks.list({ view: 'OVERDUE' }) : Promise.resolve([] as Task[])), `${tab}-overdue`);
  const list = tasks.data ?? [];
  const reload = async () => { await Promise.all([tasks.reload(), overdue.reload()]); };

  const toggle = (t: Task) => runner.run(() => (t.status === 'DONE' ? api.tasks.reopen(t.id) : api.tasks.complete(t.id)), reload);

  const row = (t: Task) => (
    <Row key={t.id} onPress={() => setEditing(t)}>
      {t.status === 'DONE' ? (
        <Pressable onPress={() => void toggle(t)} hitSlop={10} style={[s.check, { backgroundColor: C.accent, borderColor: C.accent }]}><Text style={{ fontWeight: '800', color: C.accentFg }}>✓</Text></Pressable>
      ) : <Check on={false} onPress={() => void toggle(t)} />}
      <View style={{ flex: 1 }}>
        <Text style={[s.body, t.status === 'DONE' && { textDecorationLine: 'line-through', color: C.muted }]}>{t.title}{t.recurrencePattern ? ' ↻' : ''}</Text>
        <Text style={{ color: PRIORITY_COLOR[t.priority], fontSize: 11 }}>{t.priority}{t.dueDate ? ` · ${t.dueDate}` : ''}{t.tags?.length ? ` · ${t.tags.join(', ')}` : ''}</Text>
      </View>
    </Row>
  );

  const days = [...new Set(list.map((t) => t.dueDate ?? 'No date'))].sort();

  return (
    <Screen title="Tasks" back={false} onRefresh={() => void reload()} refreshing={tasks.loading} action={<Btn label="+ New" onPress={() => setEditing('new')} style={{ paddingVertical: 7 }} />}>
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      <Input value={query} onChangeText={setQuery} placeholder="Search tasks…" style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {tasks.error && !tasks.data ? <ErrorNote message={tasks.error} onRetry={tasks.reload} /> : null}
      {tab === 'today' && (overdue.data?.length ?? 0) > 0 ? <Panel title={`Overdue · ${overdue.data!.length}`} accent={C.magenta}>{[...overdue.data!].sort(byUrgency).map(row)}</Panel> : null}
      {tab === 'board' ? TASK_STATUSES.map((status) => {
        const lane = list.filter((t) => t.status === status).sort(byUrgency);
        return <Panel key={status} title={`${pretty(status)} · ${lane.length}`}>{lane.length === 0 ? <Muted>Empty</Muted> : lane.map(row)}</Panel>;
      }) : tab === 'upcoming' ? (list.length === 0 && !tasks.loading ? <Panel><Empty>Nothing due in the next two weeks.</Empty></Panel> : days.map((d) => <Panel key={d} title={d}>{list.filter((t) => (t.dueDate ?? 'No date') === d).sort(byUrgency).map(row)}</Panel>)) : (
        <Panel title={`${TABS.find((t) => t.id === tab)!.label} · ${list.length}`}>{list.length === 0 && !tasks.loading ? <Empty>{tab === 'done' ? 'Nothing completed yet.' : 'Nothing here.'}</Empty> : [...list].sort(byUrgency).map(row)}</Panel>
      )}
      {editing ? <TaskSheet task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); }} /> : null}
    </Screen>
  );
}

function TaskSheet({ task, onClose, onSaved }: { task: Task | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const subtasks = useAsync(() => (task ? api.tasks.subtasks(task.id) : Promise.resolve([] as Task[])), task?.id ?? 'new');
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [area, setArea] = useState<LifeArea | ''>(task?.area ?? '');
  const [tags, setTags] = useState(task?.tags?.join(', ') ?? '');
  const [subtask, setSubtask] = useState('');

  async function save() {
    const body = { title: title.trim(), description: description.trim() || null, priority, dueDate: dueDate || null, area: area || null, tags: tags.split(',').map((x) => x.trim()).filter(Boolean) };
    if (await runner.run(() => (task ? api.tasks.update(task.id, { ...body, status }) : api.tasks.create(body)))) await onSaved();
  }

  return (
    <Sheet title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <Field label="Title"><Input value={title} onChangeText={setTitle} autoFocus={!task} /></Field>
      <Field label="Notes"><Input value={description} onChangeText={setDescription} multiline /></Field>
      <Field label="Priority"><Chips value={priority} onChange={(v) => v && setPriority(v)} options={opts(TASK_PRIORITIES)} /></Field>
      {task ? <Field label="Status"><Chips value={status} onChange={(v) => v && setStatus(v)} options={opts(TASK_STATUSES)} /></Field> : null}
      <Field label="Due date"><DateInput value={dueDate} onChange={setDueDate} /></Field>
      <Field label="Area"><Chips value={area} onChange={setArea} options={opts(LIFE_AREAS)} clearable /></Field>
      <Field label="Tags (comma separated)"><Input value={tags} onChangeText={setTags} autoCapitalize="none" /></Field>
      {task ? (
        <Field label="Subtasks">
          {(subtasks.data ?? []).map((st) => (
            <Row key={st.id}><Check on={st.status === 'DONE'} onPress={() => void runner.run(() => api.tasks.complete(st.id), subtasks.reload)} /><Text style={s.body}>{st.title}</Text></Row>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Input style={{ flex: 1 }} value={subtask} onChangeText={setSubtask} placeholder="Add a subtask" onSubmitEditing={() => { const t = subtask.trim(); if (t) { setSubtask(''); void runner.run(() => api.tasks.create({ title: t, parentTaskId: task.id }), subtasks.reload); } }} />
          </View>
        </Field>
      ) : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <View style={{ gap: 10, marginTop: 6 }}>
        <Btn label={task ? 'Save' : 'Create'} disabled={!title.trim() || runner.busy} onPress={() => void save()} />
        {task ? <Btn kind="ghost" label="Duplicate" onPress={() => void runner.run(() => api.tasks.duplicate(task.id), onSaved)} /> : null}
        {task ? <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.tasks.remove(task.id), onSaved)} /> : null}
      </View>
    </Sheet>
  );
}
