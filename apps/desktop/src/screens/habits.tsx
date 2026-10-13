import { dayKey, type Habit, type HabitFrequencyType, type HabitType } from '@life-os/core';
import { useEffect, useState, type FormEvent } from 'react';

import { intentTab, useNavIntent } from '../lib/nav';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { CalendarTab, HabitDetailModal, WeeklyTab } from '../modules/habits-extra';
import { DataGrid, type Col } from '../grid/data-grid';
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
  const api = useApi();
  const intent = useNavIntent('habits');
  const [tab, setTab] = useState<TabId>(() => (intent?.entity?.kind === 'habit' ? 'all' : intentTab(intent, TABS, 'today')));
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const reloadKey = useState(0);
  const [epoch, setEpoch] = reloadKey;
  // Opened from a notification about one habit: show that habit.
  useEffect(() => {
    if (intent?.entity?.kind === 'habit') {
      const id = intent.entity.id;
      void api.habits.list().then((all) => setDetail(all.find((h) => h.id === id) ?? null)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const streaks = useAsync(async () => Object.fromEntries(await Promise.all((habits.data ?? []).map(async (h) => [h.id, await api.habits.streak(h.id).catch(() => null)] as const))), [api, habits.data]);
  const runner = useRunner();
  if (habits.error && !habits.data) return <ErrorNote message={habits.error} onRetry={habits.reload} />;

  const columns: Col<Habit>[] = [
    { id: 'name', title: 'Habit', value: (h) => h.name, filter: { type: 'text' }, cell: (h) => <b>{h.icon} {h.name}</b> },
    { id: 'status', title: 'Status', value: (h) => pretty(h.status ?? 'ACTIVE'), filter: { type: 'select' } },
    { id: 'frequency', title: 'Frequency', value: (h) => pretty(h.frequencyType), filter: { type: 'select' } },
    { id: 'type', title: 'Type', value: (h) => pretty(h.type), filter: { type: 'select' } },
    { id: 'category', title: 'Category', value: (h) => h.category ?? '', filter: { type: 'select' } },
    { id: 'streak', title: 'Streak', value: (h) => streaks.data?.[h.id]?.currentStreak ?? 0, align: 'right', filter: { type: 'number' }, cell: (h) => <span className="g-chip success">🔥 {streaks.data?.[h.id]?.currentStreak ?? 0}</span> },
    { id: 'best', title: 'Best', value: (h) => streaks.data?.[h.id]?.longestStreak ?? 0, align: 'right', filter: { type: 'number' } },
    { id: 'target', title: 'Target', value: (h) => (h.targetValue != null ? `${h.targetValue} ${h.targetUnit ?? ''}`.trim() : ''), hidden: true },
    { id: 'started', title: 'Started', value: (h) => h.startDate ?? '', filter: { type: 'date' }, hidden: true },
  ];

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <DataGrid
        tableId="habits.list"
        data={habits.data ?? []}
        columns={columns}
        getRowId={(h) => h.id}
        loading={habits.loading && !habits.data}
        initialSorting={[{ id: 'streak', desc: true }]}
        emptyMessage="No habits yet."
        searchPlaceholder="Search habits…"
        exportName="habits"
        onRowClick={onOpen}
        drawer={false}
        views={[{ id: 'active', name: 'Active', filters: { status: ['Active'] } }, { id: 'paused', name: 'Paused', filters: { status: ['Paused'] } }, { id: 'archived', name: 'Archived', filters: { status: ['Archived'] } }]}
        initialFilters={{ status: ['Active', 'Paused'] }}
        rowActions={(h) => (
          <>
            <button className="link" onClick={() => onEdit(h)}>Edit</button>
            {h.status !== 'ARCHIVED' && <button className="link" onClick={() => void runner.run(() => (h.status === 'PAUSED' ? api.habits.resume(h.id) : api.habits.pause(h.id)), habits.reload)}>{h.status === 'PAUSED' ? 'Resume' : 'Pause'}</button>}
          </>
        )}
      />
    </div>
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
