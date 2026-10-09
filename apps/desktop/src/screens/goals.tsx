import { GOAL_STATUSES, LIFE_AREAS, type GoalDetail, type GoalStatus, type GoalSummary, type LifeArea } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useNavIntent } from '../lib/nav';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote, Field, Modal, opts, Panel, pretty, ProgressRow, Select, Tabs } from '../ui';

type TabId = 'goals' | 'timeline' | 'reviews';
const TABS = [
  { id: 'goals', label: 'Goals' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'reviews', label: 'Reviews due' },
] as const;

const tone = (s: GoalStatus) => (s === 'AT_RISK' ? 'bad' : s === 'ON_TRACK' || s === 'COMPLETED' ? 'good' : s === 'PAUSED' ? 'warn' : '');

export function GoalsScreen() {
  const api = useApi();
  const [tab, setTab] = useState<TabId>('goals');
  const [status, setStatus] = useState<GoalStatus | ''>('');
  const intent = useNavIntent('goals');
  const [open, setOpen] = useState<string | 'new' | null>(intent?.entity?.kind === 'goal' ? intent.entity.id : null);
  const goals = useAsync(() => api.goals.list({ status: status || undefined, includeArchived: status === 'ARCHIVED' }), [api, status]);
  const list = goals.data ?? [];

  const card = (g: GoalSummary) => (
    <li key={g.id} className="clickable" onClick={() => setOpen(g.id)}>
      <div className="grow">
        <div className="row"><b>{g.name}</b><span className={`pill ${tone(g.status)}`}>{pretty(g.status)}</span></div>
        <ProgressRow label={g.area ? pretty(g.area) : 'Progress'} pct={g.progress.overallPct} right={`${Math.round(g.progress.overallPct)}%${g.progress.expectedPct != null ? ` · expected ${Math.round(g.progress.expectedPct)}%` : ''}`} />
        <small className="muted">{g.targetDate ? `Target ${g.targetDate}` : 'No target date'}{g.blocked ? ' · blocked' : ''}{g.reviewDue ? ' · review due' : ''}</small>
      </div>
    </li>
  );

  const withDates = list.filter((g) => g.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!));

  return (
    <div className="stack">
      <div className="row">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <button className="primary" onClick={() => setOpen('new')}>+ New goal</button>
      </div>
      {goals.error && !goals.data && <ErrorNote message={goals.error} onRetry={goals.reload} />}
      {tab === 'goals' && (
        <>
          <div style={{ maxWidth: 220 }}><Select value={status} onChange={setStatus} options={opts(GOAL_STATUSES)} placeholder="All active" /></div>
          <Panel title={`Goals · ${list.length}`}>{list.length === 0 && !goals.loading ? <Empty>No goals yet. Set one worth chasing.</Empty> : <ul className="list">{list.map(card)}</ul>}</Panel>
        </>
      )}
      {tab === 'timeline' && (
        <Panel title="Timeline">{withDates.length === 0 ? <Empty>Goals with a target date appear here.</Empty> : <ul className="list">{withDates.map((g) => (
          <li key={g.id} className="clickable" onClick={() => setOpen(g.id)}><small className="muted" style={{ width: 90 }}>{g.targetDate}</small><span className="grow">{g.name}</span><span className="pill">{Math.round(g.progress.overallPct)}%</span></li>
        ))}</ul>}</Panel>
      )}
      {tab === 'reviews' && (
        <Panel title="Reviews due">{list.filter((g) => g.reviewDue).length === 0 ? <Empty>No reviews due.</Empty> : <ul className="list">{list.filter((g) => g.reviewDue).map(card)}</ul>}</Panel>
      )}
      {open === 'new' && <GoalForm goal={null} onClose={() => setOpen(null)} onSaved={async () => { setOpen(null); await goals.reload(); }} />}
      {open && open !== 'new' && <GoalDetailModal id={open} onClose={() => setOpen(null)} onChanged={goals.reload} />}
    </div>
  );
}

function GoalForm({ goal, onClose, onSaved }: { goal: GoalSummary | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState(goal?.name ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [area, setArea] = useState<LifeArea | ''>(goal?.area ?? '');
  const [priority, setPriority] = useState(String(goal?.priority ?? 3));
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = { name: name.trim(), description: description.trim() || null, area: area || null, priority: Number(priority), startDate: goal?.startDate ?? null, targetDate: targetDate || null };
    if (await runner.run(() => (goal ? api.goals.update(goal.id, body) : api.goals.create(body)))) await onSaved();
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Area"><Select value={area} onChange={setArea} options={opts(LIFE_AREAS)} placeholder="None" /></Field>
          <Field label="Priority"><Select value={priority as '1'} onChange={(v) => setPriority(v || '3')} options={[{ value: '1', label: 'P1 · Critical' }, { value: '2', label: 'P2 · High' }, { value: '3', label: 'P3 · Medium' }, { value: '4', label: 'P4 · Low' }]} /></Field>
          <Field label="Target date"><input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
        </div>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!name.trim() || runner.busy}>{goal ? 'Save' : 'Create'}</button></div>
      </form>
    </Modal>
  );
}

function GoalDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const detail = useAsync<GoalDetail>(() => api.goals.get(id), [api, id]);
  const [milestone, setMilestone] = useState('');
  const [metricValue, setMetricValue] = useState<Record<string, string>>({});
  const [review, setReview] = useState({ progressSummary: '', blockers: '', nextSteps: '' });
  const [editing, setEditing] = useState(false);
  const d = detail.data;
  const after = async () => { await Promise.all([detail.reload(), onChanged()]); };

  if (editing && d) return <GoalForm goal={d.goal} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await after(); }} />;

  return (
    <Modal title={d?.goal.name ?? 'Goal'} onClose={onClose} wide>
      {detail.error && !d && <ErrorNote message={detail.error} onRetry={detail.reload} />}
      {d && (
        <div className="stack">
          <div className="row">
            <ProgressRow label="Overall" pct={d.goal.progress.overallPct} />
            <Select value={d.goal.status} onChange={(v) => v && void runner.run(() => api.goals.setStatus(id, v), after)} options={opts(GOAL_STATUSES)} />
          </div>
          {d.goal.description && <p className="muted">{d.goal.description}</p>}
          {runner.error && <ErrorNote message={runner.error} />}

          <Panel title={`Milestones · ${d.goal.progress.milestonesDone}/${d.goal.progress.milestonesTotal}`}>
            <ul className="list">
              {d.milestones.map((m) => (
                <li key={m.id} className={m.completed ? 'done' : ''}>
                  <button className={`check${m.completed ? ' on' : ''}`} onClick={() => void runner.run(() => api.goals.setMilestone(id, m, !m.completed), after)}>{m.completed ? '✓' : ''}</button>
                  <span className="grow">{m.title}</span>{m.targetDate && <small className="muted">{m.targetDate}</small>}
                  <button className="link" onClick={() => void runner.run(() => api.goals.deleteMilestone(id, m.id), after)}>Remove</button>
                </li>
              ))}
            </ul>
            <form className="add" onSubmit={(e) => { e.preventDefault(); const t = milestone.trim(); if (t) { setMilestone(''); void runner.run(() => api.goals.addMilestone(id, t), after); } }}>
              <input placeholder="Add a milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)} /><button className="ghost">Add</button>
            </form>
          </Panel>

          {d.metrics.length > 0 && (
            <Panel title="Metrics">
              {d.metrics.map((m) => (
                <div key={m.id}>
                  <ProgressRow label={m.name} pct={m.progressPct} right={`${m.currentValue}${m.unit ?? ''} → ${m.targetValue}${m.unit ?? ''}`} />
                  <form className="add" onSubmit={(e) => { e.preventDefault(); const v = Number(metricValue[m.id]); if (!Number.isNaN(v) && metricValue[m.id]) { setMetricValue({ ...metricValue, [m.id]: '' }); void runner.run(() => api.goals.logMetric(id, m.id, v), after); } }}>
                    <input type="number" step="any" placeholder="Log a new value" value={metricValue[m.id] ?? ''} onChange={(e) => setMetricValue({ ...metricValue, [m.id]: e.target.value })} /><button className="ghost">Log</button>
                  </form>
                </div>
              ))}
            </Panel>
          )}

          <Panel title={`Linked tasks · ${d.tasks.length}`}>
            {d.tasks.length === 0 ? <Empty>No tasks linked. Link tasks from the Tasks screen.</Empty> : <ul className="list">{d.tasks.map((t) => <li key={t.id} className={t.status === 'DONE' ? 'done' : ''}><span className="grow">{t.title}</span><span className="pill">{pretty(t.status)}</span>{t.dueDate && <small className="muted">{t.dueDate}</small>}<button className="link" onClick={() => void runner.run(() => api.goals.unlinkTask(id, t.id), after)}>Unlink</button></li>)}</ul>}
          </Panel>

          <Panel title="Review">
            <div className="stack">
              <Field label="Progress"><input value={review.progressSummary} onChange={(e) => setReview({ ...review, progressSummary: e.target.value })} /></Field>
              <Field label="Blockers"><input value={review.blockers} onChange={(e) => setReview({ ...review, blockers: e.target.value })} /></Field>
              <Field label="Next steps"><input value={review.nextSteps} onChange={(e) => setReview({ ...review, nextSteps: e.target.value })} /></Field>
              <div className="actions"><button className="ghost" onClick={() => void runner.run(() => api.goals.review(id, review), async () => { setReview({ progressSummary: '', blockers: '', nextSteps: '' }); await after(); })}>Submit review</button></div>
            </div>
            {d.reviews.length > 0 && <ul className="list">{d.reviews.map((r) => <li key={r.id}><small className="muted" style={{ width: 90 }}>{r.reviewDate}</small><span className="grow">{r.progressSummary ?? '—'}</span><span className="pill">{Math.round(r.progressSnapshot)}%</span></li>)}</ul>}
          </Panel>

          <div className="actions">
            <button className="ghost" onClick={() => setEditing(true)}>Edit</button>
            <button className="danger" onClick={() => void runner.run(() => api.goals.remove(id), async () => { await onChanged(); onClose(); })}>Delete</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
