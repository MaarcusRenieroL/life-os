import type { Task } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Empty, ErrorNote, Panel } from '../ui';

const ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export function TasksScreen() {
  const api = useApi();
  const tasks = useAsync(() => api.tasks.list(), [api]);
  const [title, setTitle] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const all = tasks.data ?? [];
  const open = all.filter((t) => t.status !== 'DONE').sort((a, b) => ORDER[a.priority] - ORDER[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
  const done = all.filter((t) => t.status === 'DONE');

  async function toggle(task: Task) {
    const finishing = task.status !== 'DONE';
    const next: Task = { ...task, status: finishing ? 'DONE' : 'TODO' };
    tasks.mutate((prev) => prev?.map((t) => (t.id === task.id ? next : t)));
    try {
      await (finishing ? api.tasks.complete(task.id) : api.tasks.reopen(task.id));
    } catch (e) {
      tasks.mutate((prev) => prev?.map((t) => (t.id === task.id ? task : t)));
      setFailure(e instanceof Error ? e.message : 'Could not update the task');
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const text = title.trim();
    if (!text) return;
    setTitle('');
    try {
      const created = await api.tasks.create(text);
      tasks.mutate((prev) => [created, ...(prev ?? [])]);
    } catch (e) {
      setTitle(text);
      setFailure(e instanceof Error ? e.message : 'Could not add the task');
    }
  }

  const row = (t: Task) => (
    <li key={t.id} className={t.status === 'DONE' ? 'done' : ''}>
      <button className={`check${t.status === 'DONE' ? ' on' : ''}`} onClick={() => void toggle(t)} aria-label="Toggle">
        {t.status === 'DONE' ? '✓' : ''}
      </button>
      <span className="grow">{t.title}</span>
      <span className={`pill ${t.priority.toLowerCase()}`}>{t.priority}</span>
      {t.dueDate && <small className="muted">{t.dueDate}</small>}
    </li>
  );

  return (
    <div className="stack">
      <form className="panel add" onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter…" />
        <button className="primary" disabled={!title.trim()}>Add</button>
      </form>
      {failure && <ErrorNote message={failure} />}
      {tasks.error && !tasks.data && <ErrorNote message={tasks.error} onRetry={tasks.reload} />}
      <Panel title={`Open · ${open.length}`}>
        {open.length === 0 ? <Empty>Inbox zero.</Empty> : <ul className="list">{open.map(row)}</ul>}
      </Panel>
      {done.length > 0 && (
        <Panel title={`Completed · ${done.length}`} action={<button className="link" onClick={() => setShowDone((v) => !v)}>{showDone ? 'Hide' : 'Show'}</button>}>
          {showDone && <ul className="list">{done.map(row)}</ul>}
        </Panel>
      )}
    </div>
  );
}
