import { LIFE_AREAS, TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskPriority, type TaskStatus, type LifeArea } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote, Field, Modal, opts, Panel, pretty, Select, Tabs } from '../ui';

type TabId = 'today' | 'upcoming' | 'list' | 'board' | 'completed';
const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'list', label: 'List' },
  { id: 'board', label: 'Board' },
  { id: 'completed', label: 'Completed' },
] as const;

const ORDER: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const byUrgency = (a: Task, b: Task) => ORDER[a.priority] - ORDER[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9');

export function TasksScreen() {
  const api = useApi();
  const [tab, setTab] = useState<TabId>('today');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const runner = useRunner();

  const tasks = useAsync(() => {
    const q = query.trim() || undefined;
    switch (tab) {
      case 'today': return api.tasks.list({ view: 'TODAY', q });
      case 'upcoming': return api.tasks.list({ view: 'UPCOMING', upcomingDays: 14, q });
      case 'completed': return api.tasks.list({ view: 'COMPLETED', q });
      default: return api.tasks.list({ q });
    }
  }, [api, tab, query]);
  const overdue = useAsync(() => (tab === 'today' ? api.tasks.list({ view: 'OVERDUE' }) : Promise.resolve([] as Task[])), [api, tab]);

  const list = tasks.data ?? [];
  const reloadAll = async () => {
    await Promise.all([tasks.reload(), overdue.reload()]);
  };

  async function toggle(task: Task) {
    await runner.run(() => (task.status === 'DONE' ? api.tasks.reopen(task.id) : api.tasks.complete(task.id)), reloadAll);
  }

  const row = (t: Task) => (
    <li key={t.id} className={`clickable${t.status === 'DONE' ? ' done' : ''}`} onClick={() => setEditing(t)}>
      <button className={`check${t.status === 'DONE' ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); void toggle(t); }} aria-label="Toggle">
        {t.status === 'DONE' ? '✓' : ''}
      </button>
      <span className="grow">{t.title}{t.recurrencePattern && <small className="muted"> ↻</small>}</span>
      {t.tags?.slice(0, 2).map((tag) => <span key={tag} className="pill">{tag}</span>)}
      <span className={`pill ${t.priority.toLowerCase()}`}>{t.priority}</span>
      {t.dueDate && <small className="muted">{t.dueDate}</small>}
    </li>
  );

  return (
    <div className="stack">
      <div className="row">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <button className="primary" onClick={() => setEditing('new')}>+ New task</button>
      </div>
      <input placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {runner.error && <ErrorNote message={runner.error} />}
      {tasks.error && !tasks.data && <ErrorNote message={tasks.error} onRetry={tasks.reload} />}

      {tab === 'today' && (overdue.data?.length ?? 0) > 0 && (
        <Panel title={`Overdue · ${overdue.data!.length}`} accent="var(--magenta)"><ul className="list">{overdue.data!.sort(byUrgency).map(row)}</ul></Panel>
      )}

      {tab === 'board' ? (
        <Board tasks={list} onOpen={setEditing} onMove={(t, status) => runner.run(() => api.tasks.update(t.id, { status }), reloadAll)} />
      ) : tab === 'upcoming' ? (
        <Upcoming tasks={list} row={row} />
      ) : (
        <Panel title={`${TABS.find((t) => t.id === tab)!.label} · ${list.length}`}>
          {list.length === 0 && !tasks.loading ? <Empty>{tab === 'completed' ? 'Nothing completed yet.' : 'Nothing here. Enjoy the quiet.'}</Empty> : <ul className="list">{[...list].sort(tab === 'completed' ? (a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '') : byUrgency).map(row)}</ul>}
        </Panel>
      )}

      {editing && <TaskEditor task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reloadAll(); }} />}
    </div>
  );
}

function Upcoming({ tasks, row }: { tasks: Task[]; row: (t: Task) => React.ReactNode }) {
  const days = [...new Set(tasks.map((t) => t.dueDate ?? 'No date'))].sort();
  if (tasks.length === 0) return <Panel><Empty>Nothing due in the next two weeks.</Empty></Panel>;
  return (
    <>
      {days.map((day) => (
        <Panel key={day} title={day}><ul className="list">{tasks.filter((t) => (t.dueDate ?? 'No date') === day).sort(byUrgency).map(row)}</ul></Panel>
      ))}
    </>
  );
}

function Board({ tasks, onOpen, onMove }: { tasks: Task[]; onOpen: (t: Task) => void; onMove: (t: Task, s: TaskStatus) => void }) {
  return (
    <div className="board">
      {TASK_STATUSES.map((status) => {
        const lane = tasks.filter((t) => t.status === status).sort(byUrgency);
        return (
          <div key={status} className="lane">
            <span className="label">{pretty(status)} · {lane.length}</span>
            {lane.map((t) => (
              <div key={t.id} className="card" onClick={() => onOpen(t)}>
                <span>{t.title}</span>
                <div className="row">
                  <span className={`pill ${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <select value={t.status} onClick={(e) => e.stopPropagation()} onChange={(e) => onMove(t, e.target.value as TaskStatus)} style={{ width: 'auto', padding: '2px 4px', fontSize: 11 }}>
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
                  </select>
                </div>
                {t.dueDate && <small className="muted">{t.dueDate}</small>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TaskEditor({ task, onClose, onSaved }: { task: Task | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const projects = useAsync(() => api.tasks.projects(), [api]);
  const subtasks = useAsync(() => (task ? api.tasks.subtasks(task.id) : Promise.resolve([] as Task[])), [api, task?.id]);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime?.slice(0, 5) ?? '');
  const [area, setArea] = useState<LifeArea | ''>(task?.area ?? '');
  const [projectId, setProjectId] = useState(task?.projectId ?? '');
  const [tags, setTags] = useState(task?.tags?.join(', ') ?? '');
  const [estimate, setEstimate] = useState(task?.estimateMinutes?.toString() ?? '');
  const [subtask, setSubtask] = useState('');

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
      area: area || null,
      projectId: projectId || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      estimateMinutes: estimate ? Number(estimate) : null,
    };
    const ok = await runner.run(() => (task ? api.tasks.update(task.id, { ...body, status }) : api.tasks.create(body)));
    if (ok) await onSaved();
  }

  async function addSubtask() {
    if (!task || !subtask.trim()) return;
    const text = subtask.trim();
    setSubtask('');
    await runner.run(() => api.tasks.create({ title: text, parentTaskId: task.id }), subtasks.reload);
  }

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose} wide>
      <form className="stack" onSubmit={save}>
        <Field label="Title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Notes"><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Priority"><Select value={priority} onChange={(v) => v && setPriority(v)} options={opts(TASK_PRIORITIES)} /></Field>
          {task && <Field label="Status"><Select value={status} onChange={(v) => v && setStatus(v)} options={opts(TASK_STATUSES)} /></Field>}
          <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Due time"><input type="time" value={dueTime} disabled={!dueDate} onChange={(e) => setDueTime(e.target.value)} /></Field>
          <Field label="Area"><Select value={area} onChange={setArea} options={opts(LIFE_AREAS)} placeholder="None" /></Field>
          <Field label="Project"><Select value={projectId} onChange={setProjectId} options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))} placeholder="None" /></Field>
          <Field label="Tags (comma separated)"><input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
          <Field label="Estimate (minutes)"><input type="number" min={0} value={estimate} onChange={(e) => setEstimate(e.target.value)} /></Field>
        </div>
        {task && (
          <Panel title="Subtasks">
            <ul className="list">
              {(subtasks.data ?? []).map((s) => (
                <li key={s.id} className={s.status === 'DONE' ? 'done' : ''}>
                  <button type="button" className={`check${s.status === 'DONE' ? ' on' : ''}`} onClick={() => void runner.run(() => (s.status === 'DONE' ? api.tasks.reopen(s.id) : api.tasks.complete(s.id)), subtasks.reload)}>{s.status === 'DONE' ? '✓' : ''}</button>
                  <span className="grow">{s.title}</span>
                </li>
              ))}
            </ul>
            <div className="add"><input placeholder="Add a subtask" value={subtask} onChange={(e) => setSubtask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addSubtask(); } }} /><button type="button" className="ghost" onClick={() => void addSubtask()}>Add</button></div>
          </Panel>
        )}
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions">
          {task && <button type="button" className="ghost" onClick={() => void runner.run(() => api.tasks.duplicate(task.id), onSaved)}>Duplicate</button>}
          {task && <button type="button" className="danger" onClick={() => void runner.run(() => api.tasks.remove(task.id), onSaved)}>Delete</button>}
          <button className="primary" disabled={!title.trim() || runner.busy}>{task ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
