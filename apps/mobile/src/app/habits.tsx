import { dayKey, type Habit, type HabitFrequencyType, type HabitType } from '@life-os/core';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Bars, Btn, Chips, Empty, Field, Input, opts, Pill, pretty, Progress, Row, Screen, Seg, Sheet, Stat, StatGrid } from '@/kit';
import { tabFrom, useOpenRequest } from '@/lib/open-from';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { CalendarTab, HabitDetailSheet, WeeklyTab } from '@/modules/habits-extra';
import { Check, ErrorNote, Muted, Panel, s, success } from '@/ui';

type TabId = 'today' | 'all' | 'weekly' | 'calendar' | 'analytics';
const TABS = [{ id: 'today', label: 'Today' }, { id: 'all', label: 'All habits' }, { id: 'weekly', label: 'Weekly grid' }, { id: 'calendar', label: 'Calendar' }, { id: 'analytics', label: 'Analytics' }] as const;
const TYPES: HabitType[] = ['BINARY', 'COUNT', 'DURATION', 'NEGATIVE'];
const FREQS: HabitFrequencyType[] = ['DAILY', 'WEEKLY_DAYS', 'X_PER_WEEK', 'X_PER_MONTH', 'CUSTOM_INTERVAL'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Habits() {
  const [tab, setTab] = useState<TabId>('today');
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [detail, setDetail] = useState<Habit | null>(null);
  const api = useApi();
  useOpenRequest((r) => {
    if (r.kind === 'habit' && r.id) { setTab('all'); void api.habits.list().then((all) => setDetail(all.find((h) => h.id === r.id) ?? null)).catch(() => {}); }
    else { const t = tabFrom(r, TABS); if (t) setTab(t); }
  });
  return (
    <Screen title="Habits" back={false} action={<Btn label="+ New" onPress={() => setEditing('new')} style={{ paddingVertical: 7 }} />}>
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'today' ? <Today key={epoch} /> : tab === 'all' ? <All key={epoch} onEdit={setEditing} onOpen={setDetail} /> : tab === 'weekly' ? <WeeklyTab /> : tab === 'calendar' ? <CalendarTab /> : <Analytics />}
      {detail ? <HabitDetailSheet habit={detail} onClose={() => setDetail(null)} /> : null}
      {editing ? <HabitSheet habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setEpoch((n) => n + 1); }} /> : null}
    </Screen>
  );
}

function Today() {
  const api = useApi();
  const runner = useRunner();
  const habits = useAsync(() => api.habits.today(), api);
  const [values, setValues] = useState<Record<string, string>>({});
  const list = habits.data ?? [];
  const done = list.filter((h) => h.todayLog?.status === 'COMPLETED').length;
  return (
    <Panel title={`Habits today · ${done} of ${list.length}`}>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {habits.error && !habits.data ? <ErrorNote message={habits.error} onRetry={habits.reload} /> : null}
      <Progress label="Today" pct={list.length ? (done / list.length) * 100 : 0} right={`${done}/${list.length}`} />
      {list.length === 0 && !habits.loading ? <Empty>No habits scheduled today.</Empty> : null}
      {list.map(({ habit, todayLog }) => {
        const on = todayLog?.status === 'COMPLETED';
        const measured = habit.type === 'COUNT' || habit.type === 'DURATION';
        const log = async (status: 'COMPLETED' | 'SKIPPED') => { await runner.run(() => api.habits.log(habit.id, status, measured && status === 'COMPLETED' && values[habit.id] ? { value: Number(values[habit.id]) } : {}), habits.reload); if (status === 'COMPLETED') success(); };
        return (
          <Row key={habit.id}>
            <Check on={on} onPress={() => void log('COMPLETED')} />
            <View style={{ flex: 1 }}>
              <Text style={[s.body, on && { color: C.muted }]}>{habit.icon} {habit.name}{habit.type === 'NEGATIVE' ? ' (avoid)' : ''}</Text>
              {habit.category ? <Muted style={{ fontSize: 11 }}>{habit.category}</Muted> : null}
            </View>
            {measured && !on ? <Input value={values[habit.id] ?? ''} onChangeText={(v) => setValues({ ...values, [habit.id]: v })} keyboardType="numeric" placeholder={habit.targetUnit ?? 'value'} style={{ width: 80, padding: 8 }} /> : null}
            {todayLog?.status === 'SKIPPED' ? <Pill label="skipped" /> : !on ? <Pressable onPress={() => void log('SKIPPED')}><Text style={{ color: C.muted }}>Skip</Text></Pressable> : null}
          </Row>
        );
      })}
    </Panel>
  );
}

function All({ onEdit, onOpen }: { onEdit: (h: Habit) => void; onOpen: (h: Habit) => void }) {
  const api = useApi();
  const runner = useRunner();
  const habits = useAsync(() => api.habits.list(), api);
  const ids = (habits.data ?? []).map((h) => h.id).join(',');
  const streaks = useAsync(async () => Object.fromEntries(await Promise.all((habits.data ?? []).map(async (h) => [h.id, await api.habits.streak(h.id).catch(() => null)] as const))), ids);
  const streakOf = (h: Habit) => streaks.data?.[h.id]?.currentStreak ?? 0;

  const columns: Col<Habit>[] = [
    { id: 'name', title: 'Habit', value: (h) => h.name, filter: { type: 'text' }, cell: (h) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{h.icon} {h.name}</Text> },
    { id: 'streak', title: 'Streak', value: streakOf, align: 'right', filter: { type: 'number' }, cell: (h) => <Text style={{ color: C.accent, fontSize: 13 }}>🔥 {streakOf(h)}</Text> },
    { id: 'status', title: 'Status', value: (h) => pretty(h.status ?? 'ACTIVE'), filter: { type: 'select' } },
    { id: 'frequency', title: 'Frequency', value: (h) => pretty(h.frequencyType), filter: { type: 'select' } },
    { id: 'best', title: 'Best streak', value: (h) => streaks.data?.[h.id]?.longestStreak ?? 0, align: 'right', filter: { type: 'number' } },
    { id: 'type', title: 'Type', value: (h) => pretty(h.type), filter: { type: 'select' }, hidden: true },
    { id: 'category', title: 'Category', value: (h) => h.category ?? '', filter: { type: 'select' }, hidden: true },
    { id: 'target', title: 'Target', value: (h) => (h.targetValue != null ? `${h.targetValue} ${h.targetUnit ?? ''}`.trim() : ''), hidden: true },
    { id: 'started', title: 'Started', value: (h) => h.startDate ?? '', filter: { type: 'date' }, hidden: true },
  ];

  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {habits.error && !habits.data ? <ErrorNote message={habits.error} onRetry={habits.reload} /> : null}
      <DataGrid
        tableId="habits.list"
        data={habits.data ?? []}
        columns={columns}
        getRowId={(h) => h.id}
        loading={habits.loading && !habits.data}
        initialSorting={[{ id: 'streak', desc: true }]}
        initialFilters={{ status: ['Active', 'Paused'] }}
        emptyMessage="No habits yet."
        searchPlaceholder="Search habits…"
        exportName="habits"
        onRowClick={onOpen}
        drawer={false}
        views={[{ id: 'active', name: 'Active', filters: { status: ['Active'] } }, { id: 'paused', name: 'Paused', filters: { status: ['Paused'] } }, { id: 'archived', name: 'Archived', filters: { status: ['Archived'] } }]}
        trailing={(h) => (
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <Pressable onPress={() => onEdit(h)} hitSlop={8}><Text style={{ color: C.muted }}>Edit</Text></Pressable>
            {h.status !== 'ARCHIVED' ? <Pressable onPress={() => void runner.run(() => (h.status === 'PAUSED' ? api.habits.resume(h.id) : api.habits.pause(h.id)), habits.reload)} hitSlop={8}><Text style={{ color: C.accent }}>{h.status === 'PAUSED' ? 'Resume' : 'Pause'}</Text></Pressable> : null}
          </View>
        )}
      />
    </>
  );
}

function Analytics() {
  const api = useApi();
  const a = useAsync(() => api.habits.analytics(12), api);
  if (a.error && !a.data) return <ErrorNote message={a.error} onRetry={a.reload} />;
  const habits = a.data?.habitPerformance ?? [];
  return (
    <>
      <Panel title="Health"><StatGrid><Stat label="Health score" value={a.data?.healthScore ? Math.round(a.data.healthScore.score) : '—'} /><Stat label="Tracked" value={habits.length} /><Stat label="Best streak" value={Math.max(0, ...habits.map((h) => h.longestStreak))} /></StatGrid></Panel>
      <Panel title="Weekly consistency">{a.data?.trend?.length ? <Bars rows={a.data.trend.map((t) => ({ label: t.weekStart, value: t.score }))} format={(n) => `${Math.round(n)}%`} /> : <Empty>Not enough data yet.</Empty>}</Panel>
      <Panel title="By habit">{habits.length ? <Bars rows={[...habits].sort((x, y) => y.completionRate - x.completionRate).map((h) => ({ label: h.name, value: h.completionRate }))} format={(n) => `${Math.round(n)}%`} /> : <Empty>No data.</Empty>}</Panel>
    </>
  );
}

function HabitSheet({ habit, onClose, onSaved }: { habit: Habit | null; onClose: () => void; onSaved: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const cfg = habit?.frequencyConfig ?? {};
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [type, setType] = useState<HabitType>(habit?.type ?? 'BINARY');
  const [frequency, setFrequency] = useState<HabitFrequencyType>(habit?.frequencyType ?? 'DAILY');
  const [days, setDays] = useState<number[]>(Array.isArray(cfg.daysOfWeek) ? (cfg.daysOfWeek as number[]) : []);
  const [count, setCount] = useState(String((cfg.timesPerWeek as number) ?? (cfg.timesPerMonth as number) ?? 3));
  const [interval, setIntervalDays] = useState(String((cfg.intervalDays as number) ?? 2));
  const [category, setCategory] = useState(habit?.category ?? '');
  const [target, setTarget] = useState(habit?.targetValue?.toString() ?? '');
  const [unit, setUnit] = useState(habit?.targetUnit ?? '');
  const [why, setWhy] = useState(habit?.why ?? '');

  const config = () => (frequency === 'WEEKLY_DAYS' ? { daysOfWeek: days } : frequency === 'X_PER_WEEK' ? { timesPerWeek: Number(count) || 1 } : frequency === 'X_PER_MONTH' ? { timesPerMonth: Number(count) || 1 } : frequency === 'CUSTOM_INTERVAL' ? { intervalDays: Number(interval) || 1 } : {});

  async function save() {
    const body = { name: name.trim(), description: description.trim() || null, type, category: category.trim() || null, frequencyType: frequency, frequencyConfig: config(), targetValue: target ? Number(target) : null, targetUnit: unit.trim() || null, startDate: habit?.startDate ?? dayKey(new Date()), why: why.trim() || null };
    if (await runner.run(() => (habit ? api.habits.update(habit.id, body) : api.habits.create(body)))) onSaved();
  }

  return (
    <Sheet title={habit ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus={!habit} /></Field>
      <Field label="Description"><Input value={description} onChangeText={setDescription} /></Field>
      <Field label="Type"><Chips value={type} onChange={(v) => v && setType(v)} options={opts(TYPES)} /></Field>
      <Field label="Frequency"><Chips value={frequency} onChange={(v) => v && setFrequency(v)} options={opts(FREQS)} /></Field>
      {frequency === 'WEEKLY_DAYS' ? <Field label="Days"><View style={{ flexDirection: 'row', gap: 6 }}>{DAYS.map((d, i) => { const on = days.includes(i + 1); return <Pressable key={i} onPress={() => setDays(on ? days.filter((x) => x !== i + 1) : [...days, i + 1])} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? '#4fcb6f24' : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: on ? C.accent : C.muted }}>{d}</Text></Pressable>; })}</View></Field> : null}
      {frequency === 'X_PER_WEEK' || frequency === 'X_PER_MONTH' ? <Field label="Times"><Input value={count} onChangeText={setCount} keyboardType="numeric" /></Field> : null}
      {frequency === 'CUSTOM_INTERVAL' ? <Field label="Every N days"><Input value={interval} onChangeText={setIntervalDays} keyboardType="numeric" /></Field> : null}
      {type === 'COUNT' || type === 'DURATION' ? <><Field label="Target"><Input value={target} onChangeText={setTarget} keyboardType="numeric" /></Field><Field label="Unit"><Input value={unit} onChangeText={setUnit} autoCapitalize="none" /></Field></> : null}
      <Field label="Category"><Input value={category} onChangeText={setCategory} /></Field>
      <Field label="Why does this matter?"><Input value={why} onChangeText={setWhy} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <View style={{ gap: 10 }}>
        <Btn label={habit ? 'Save' : 'Create'} disabled={!name.trim() || runner.busy || (frequency === 'WEEKLY_DAYS' && days.length === 0)} onPress={() => void save()} />
        {habit ? <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.habits.remove(habit.id), onSaved)} /> : null}
      </View>
    </Sheet>
  );
}
