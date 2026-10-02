import { dayKey, type Habit, type HabitFrequencyType, type HabitType } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { CalendarTab, HabitDetailModal, WeeklyTab } from '../modules/habits-extra';
import { Bars, Empty, ErrorNote, Field, Modal, opts, Panel, pretty, ProgressRow, Select, Stat, Tabs } from '../ui';

type TabId = 'today' | 'all' | 'weekly' | 'calendar' | 'analytics';
const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'all', label: 'All habits' },
  { id: 'weekly', label: 'Weekly grid' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'analytics', label: 'Analytics' },
] as const;

const TYPES: HabitType[] = ['BINARY', 'COUNT', 'DURATION', 'NEGATIVE'];
const FREQUENCIES: HabitFrequencyType[] = ['DAILY', 'WEEKLY_DAYS', 'X_PER_WEEK', 'X_PER_MONTH', 'CUSTOM_INTERVAL'];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function HabitsScreen() {
  const [tab, setTab] = useState<TabId>('today');
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const reloadKey = useState(0);
  const [epoch, setEpoch] = reloadKey;

  return (
    <div className="stack">
      <div className="row">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <button className="primary" onClick={() => setEditing('new')}>+ New habit</button>
      </div>
      {tab === 'today' && <TodayTab key={epoch} />}
      {tab === 'all' && <AllTab key={epoch} onEdit={setEditing} onOpen={setDetail} />}
      {tab === 'weekly' && <WeeklyTab />}
      {tab === 'calendar' && <CalendarTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {detail && <HabitDetailModal habit={detail} onClose={() => setDetail(null)} />}
      {editing && <HabitEditor habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setEpoch((n) => n + 1); }} />}
    </div>
  );
}

function TodayTab() {
  const api = useApi();
  const habits = useAsync(() => api.habits.today(), [api]);
  const runner = useRunner();
  const [valueFor, setValueFor] = useState<Record<string, string>>({});
  const list = habits.data ?? [];
  const done = list.filter((h) => h.todayLog?.status === 'COMPLETED').length;

  if (habits.error && !habits.data) return <ErrorNote message={habits.error} onRetry={habits.reload} />;

  return (
    <Panel title={`Habits today · ${done} of ${list.length}`}>
      {runner.error && <ErrorNote message={runner.error} />}
      <ProgressRow label="Today" pct={list.length ? (done / list.length) * 100 : 0} right={`${done}/${list.length}`} />
      {list.length === 0 && !habits.loading ? <Empty>No habits scheduled today.</Empty> : (
        <ul className="list">
          {list.map(({ habit, todayLog }) => {
            const on = todayLog?.status === 'COMPLETED';
            const measured = habit.type === 'COUNT' || habit.type === 'DURATION';
            const log = (status: 'COMPLETED' | 'SKIPPED') =>
              runner.run(() => api.habits.log(habit.id, status, measured && status === 'COMPLETED' && valueFor[habit.id] ? { value: Number(valueFor[habit.id]) } : {}), habits.reload);
            return (
              <li key={habit.id} className={on ? 'done' : ''}>
                <button className={`check${on ? ' on' : ''}`} disabled={on} onClick={() => void log('COMPLETED')} aria-label="Log habit">{on ? '✓' : ''}</button>
                <span className="grow">{habit.icon} {habit.name}{habit.type === 'NEGATIVE' && <small className="muted"> (avoid)</small>}</span>
                {measured && !on && <input style={{ width: 80 }} type="number" placeholder={habit.targetUnit ?? 'value'} value={valueFor[habit.id] ?? ''} onChange={(e) => setValueFor({ ...valueFor, [habit.id]: e.target.value })} />}
                {todayLog?.status === 'SKIPPED' ? <span className="pill">skipped</span> : !on && <button className="link" onClick={() => void log('SKIPPED')}>Skip</button>}
                {on && todayLog?.id !== 'pending' && <button className="link" onClick={() => void runner.run(() => api.habits.deleteLog(habit.id, todayLog!.id), habits.reload)}>Undo</button>}
                {habit.category && <small className="muted">{habit.category}</small>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function AllTab({ onEdit, onOpen }: { onEdit: (h: Habit) => void; onOpen: (h: Habit) => void }) {
  const api = useApi();
  const habits = useAsync(() => api.habits.list(), [api]);
  const runner = useRunner();
  const groups = ['ACTIVE', 'PAUSED', 'ARCHIVED'].map((status) => ({ status, items: (habits.data ?? []).filter((h) => (h.status ?? 'ACTIVE') === status) })).filter((g) => g.items.length);

  if (habits.error && !habits.data) return <ErrorNote message={habits.error} onRetry={habits.reload} />;
  return (
    <>
      {runner.error && <ErrorNote message={runner.error} />}
      {groups.length === 0 && !habits.loading && <Panel><Empty>No habits yet.</Empty></Panel>}
      {groups.map((g) => (
        <Panel key={g.status} title={`${pretty(g.status)} · ${g.items.length}`}>
          <ul className="list">
            {g.items.map((h) => <HabitRow key={h.id} habit={h} onOpen={() => onOpen(h)} onEdit={() => onEdit(h)} onPause={() => runner.run(() => (h.status === 'PAUSED' ? api.habits.resume(h.id) : api.habits.pause(h.id)), habits.reload)} />)}
          </ul>
        </Panel>
      ))}
    </>
  );
}

function HabitRow({ habit, onEdit, onOpen, onPause }: { habit: Habit; onEdit: () => void; onOpen: () => void; onPause: () => void }) {
  const api = useApi();
  const streak = useAsync(() => api.habits.streak(habit.id), [api, habit.id]);
  return (
    <li className="clickable" onClick={onOpen}>
      <span className="grow"><b>{habit.icon} {habit.name}</b> <small className="muted">{pretty(habit.frequencyType)}</small></span>
      <span className="pill good">🔥 {streak.data?.currentStreak ?? 0}</span>
      <small className="muted">best {streak.data?.longestStreak ?? 0}</small>
      <button className="link" onClick={(e) => { e.stopPropagation(); onEdit(); }}>Edit</button>
      {habit.status !== 'ARCHIVED' && <button className="link" onClick={(e) => { e.stopPropagation(); onPause(); }}>{habit.status === 'PAUSED' ? 'Resume' : 'Pause'}</button>}
    </li>
  );
}

function AnalyticsTab() {
  const api = useApi();
  const analytics = useAsync(() => api.habits.analytics(12), [api]);
  if (analytics.error && !analytics.data) return <ErrorNote message={analytics.error} onRetry={analytics.reload} />;
  const a = analytics.data;
  const habits = a?.habitPerformance ?? [];
  return (
    <div className="stack">
      <Panel title="Health">
        <div className="stats">
          <Stat label="Health score" value={a?.healthScore ? Math.round(a.healthScore.score) : '—'} />
          <Stat label="Tracked habits" value={habits.length} />
          <Stat label="Best streak" value={Math.max(0, ...habits.map((h) => h.longestStreak))} />
        </div>
      </Panel>
      <Panel title="Weekly consistency">
        {a?.trend?.length ? <Bars rows={a.trend.map((t) => ({ label: t.weekStart, value: t.score }))} format={(n) => `${Math.round(n)}%`} /> : <Empty>Not enough data yet.</Empty>}
      </Panel>
      <Panel title="By habit">
        {habits.length ? <Bars rows={[...habits].sort((x, y) => y.completionRate - x.completionRate).map((h) => ({ label: h.name, value: h.completionRate }))} format={(n) => `${Math.round(n)}%`} /> : <Empty>No data.</Empty>}
      </Panel>
    </div>
  );
}

function HabitEditor({ habit, onClose, onSaved }: { habit: Habit | null; onClose: () => void; onSaved: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [type, setType] = useState<HabitType>(habit?.type ?? 'BINARY');
  const [frequency, setFrequency] = useState<HabitFrequencyType>(habit?.frequencyType ?? 'DAILY');
  const cfg = habit?.frequencyConfig ?? {};
  const [days, setDays] = useState<number[]>(Array.isArray(cfg.daysOfWeek) ? (cfg.daysOfWeek as number[]) : []);
  const [count, setCount] = useState(String((cfg.timesPerWeek as number) ?? (cfg.timesPerMonth as number) ?? 3));
  const [interval, setIntervalDays] = useState(String((cfg.intervalDays as number) ?? 2));
  const [category, setCategory] = useState(habit?.category ?? '');
  const [target, setTarget] = useState(habit?.targetValue?.toString() ?? '');
  const [unit, setUnit] = useState(habit?.targetUnit ?? '');
  const [why, setWhy] = useState(habit?.why ?? '');

  const frequencyConfig = () => {
    if (frequency === 'WEEKLY_DAYS') return { daysOfWeek: days };
    if (frequency === 'X_PER_WEEK') return { timesPerWeek: Number(count) || 1 };
    if (frequency === 'X_PER_MONTH') return { timesPerMonth: Number(count) || 1 };
    if (frequency === 'CUSTOM_INTERVAL') return { intervalDays: Number(interval) };
    return {};
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      category: category.trim() || null,
      frequencyType: frequency,
      frequencyConfig: frequencyConfig(),
      targetValue: target ? Number(target) : null,
      targetUnit: unit.trim() || null,
      startDate: habit?.startDate ?? dayKey(new Date()),
      why: why.trim() || null,
    };
    const ok = await runner.run(() => (habit ? api.habits.update(habit.id, body) : api.habits.create(body)));
    if (ok) onSaved();
  }

  return (
    <Modal title={habit ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Type"><Select value={type} onChange={(v) => v && setType(v)} options={opts(TYPES)} /></Field>
          <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
          <Field label="Frequency"><Select value={frequency} onChange={(v) => v && setFrequency(v)} options={opts(FREQUENCIES)} /></Field>
          {(frequency === 'X_PER_WEEK' || frequency === 'X_PER_MONTH') && <Field label="Times"><input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} /></Field>}
          {frequency === 'CUSTOM_INTERVAL' && <Field label="Every N days"><input type="number" min={1} value={interval} onChange={(e) => setIntervalDays(e.target.value)} /></Field>}
          {(type === 'COUNT' || type === 'DURATION') && (
            <>
              <Field label="Target"><input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
              <Field label="Unit"><input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
            </>
          )}
        </div>
        {frequency === 'WEEKLY_DAYS' && (
          <div className="seg">{DAYS.map((d, i) => <button type="button" key={d} className={days.includes(i + 1) ? 'on' : ''} onClick={() => setDays(days.includes(i + 1) ? days.filter((x) => x !== i + 1) : [...days, i + 1])}>{d}</button>)}</div>
        )}
        <Field label="Why does this matter?"><input value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions">
          {habit && <button type="button" className="danger" onClick={() => void runner.run(() => api.habits.remove(habit.id), onSaved)}>Delete</button>}
          <button className="primary" disabled={!name.trim() || runner.busy || (frequency === 'WEEKLY_DAYS' && days.length === 0)}>{habit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
