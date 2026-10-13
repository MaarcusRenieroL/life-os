import { dayKey, shiftDay, type Habit, type HabitLog } from '@life-os/core';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Btn, Chips, Empty, Field, Input, pretty, Progress, Row, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

const monday = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))); };
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS = [
  { value: '1', label: 'Mon' }, { value: '2', label: 'Tue' }, { value: '3', label: 'Wed' }, { value: '4', label: 'Thu' }, { value: '5', label: 'Fri' }, { value: '6', label: 'Sat' }, { value: '7', label: 'Sun' },
];

const cell = (status: string | undefined) => (status === 'COMPLETED' ? { bg: '#4fcb6f33', border: C.accent, text: '✓' } : status === 'SKIPPED' ? { bg: '#ffffff10', border: C.line, text: '–' } : status ? { bg: '#f75d5933', border: C.destructive, text: '×' } : { bg: 'transparent', border: C.line, text: '' });

/** Every active habit across one week: tap a day to log it done, tap again to clear it. */
export function WeeklyTab() {
  const api = useApi();
  const runner = useRunner();
  const [offset, setOffset] = useState(0);
  const start = shiftDay(monday(dayKey(new Date())), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const habits = useAsync(() => api.habits.list('ACTIVE'), api);
  const logs = useAsync(async () => {
    const list = await api.habits.list('ACTIVE');
    const out: Record<string, HabitLog[]> = {};
    await Promise.all(list.map(async (h) => { out[h.id] = await api.habits.logs(h.id, days[0], days[6]); }));
    return out;
  }, start);
  const today = dayKey(new Date());

  async function toggle(h: Habit, date: string, log: HabitLog | undefined) {
    await runner.run(async () => { if (log) await api.habits.deleteLog(h.id, log.id); else await api.habits.log(h.id, 'COMPLETED', { logDate: date }); }, logs.reload);
  }

  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Btn kind="ghost" label="‹ Earlier" onPress={() => setOffset(offset - 1)} style={{ paddingVertical: 7 }} />
        <Muted style={{ alignSelf: 'center' }}>{days[0]} → {days[6]}</Muted>
        <Btn kind="ghost" label="Later ›" disabled={offset >= 0} onPress={() => setOffset(offset + 1)} style={{ paddingVertical: 7 }} />
      </View>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {habits.error && !habits.data ? <ErrorNote message={habits.error} onRetry={habits.reload} /> : null}
      <Panel title="Weekly grid">
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ flex: 1 }} />
          {days.map((d, i) => <Text key={d} style={{ width: 34, textAlign: 'center', color: d === today ? C.accent : C.muted, fontSize: 11 }}>{DAY_LETTERS[i]}</Text>)}
        </View>
        {habits.data?.length === 0 ? <Empty>No active habits.</Empty> : habits.data?.map((h) => (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <Text numberOfLines={1} style={[s.body, { flex: 1, paddingRight: 6 }]}>{h.name}</Text>
            {days.map((d) => {
              const log = logs.data?.[h.id]?.find((l) => l.logDate.slice(0, 10) === d);
              const c = cell(log?.status);
              return <Pressable key={d} onPress={() => void toggle(h, d, log)} disabled={d > today} style={{ width: 30, height: 30, marginHorizontal: 2, borderRadius: 4, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', opacity: d > today ? 0.3 : 1 }}><Text style={{ color: C.text, fontSize: 13 }}>{c.text}</Text></Pressable>;
            })}
          </View>
        ))}
      </Panel>
    </>
  );
}

/** One habit's month as a calendar of completed days. */
export function CalendarTab() {
  const api = useApi();
  const habits = useAsync(() => api.habits.list('ACTIVE'), api);
  const [habitId, setHabitId] = useState('');
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const chosen = habitId || habits.data?.[0]?.id || '';
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const last = dayKey(new Date(y, m, 0));
  const logs = useAsync(() => (chosen ? api.habits.logs(chosen, first, last) : Promise.resolve([] as HabitLog[])), `${chosen}|${month}`);
  const byDay = new Map((logs.data ?? []).map((l) => [l.logDate.slice(0, 10), l.status]));
  const lead = (new Date(`${first}T12:00:00`).getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: Number(last.slice(8)) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const shiftMonth = (n: number) => setMonth(dayKey(new Date(y, m - 1 + n, 1)).slice(0, 7));
  const done = [...byDay.values()].filter((v) => v === 'COMPLETED').length;
  return (
    <>
      <View style={{ marginBottom: 10 }}><Chips value={chosen} onChange={(v) => v && setHabitId(v)} options={(habits.data ?? []).map((h) => ({ value: h.id, label: h.name }))} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Btn kind="ghost" label="‹" onPress={() => shiftMonth(-1)} style={{ paddingVertical: 6 }} />
        <Text style={s.h2}>{month}</Text>
        <Btn kind="ghost" label="›" onPress={() => shiftMonth(1)} style={{ paddingVertical: 6 }} />
      </View>
      <Panel title={`${done} completed this month`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DAY_LETTERS.map((d, i) => <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: C.muted, fontSize: 11 }}>{d}</Text>)}
          {cells.map((d, i) => {
            const c = cell(d ? byDay.get(d) : undefined);
            return <View key={i} style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}>{d ? <View style={{ flex: 1, borderRadius: 4, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.text, fontSize: 12 }}>{Number(d.slice(8))}</Text></View> : null}</View>;
          })}
        </View>
      </Panel>
    </>
  );
}

/** A habit's streaks, consistency, recent logs and reminders. */
export function HabitDetailSheet({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const streak = useAsync(() => api.habits.streak(habit.id), habit.id);
  const week = useAsync(() => api.habitTools.consistency(habit.id, 'week'), habit.id);
  const month = useAsync(() => api.habitTools.consistency(habit.id, 'month'), habit.id);
  const from = shiftDay(dayKey(new Date()), -29);
  const logs = useAsync(() => api.habits.logs(habit.id, from, dayKey(new Date())), habit.id);
  const reminders = useAsync(() => api.habitTools.reminders(habit.id), habit.id);
  const logColumns: Col<HabitLog>[] = [
    { id: 'date', title: 'Date', value: (l) => l.logDate.slice(0, 10), filter: { type: 'date' } },
    { id: 'status', title: 'Status', value: (l) => pretty(String(l.status)), filter: { type: 'select' } },
    { id: 'value', title: 'Value', value: (l) => l.value ?? null, align: 'right', filter: { type: 'number' } },
    { id: 'note', title: 'Note', value: (l) => l.note ?? '' },
  ];
  const [time, setTime] = useState('08:00');
  const [days, setDays] = useState<string[]>([]);
  return (
    <Sheet title={habit.name} onClose={onClose}>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <StatGrid>
        <Stat label="Current streak" value={streak.data ? `${streak.data.currentStreak} d` : '—'} sub={streak.data ? `longest ${streak.data.longestStreak} d` : undefined} />
        <Stat label="This week" value={week.data ? `${Math.round(week.data.score)}%` : '—'} sub={week.data ? `${week.data.completions} of ${week.data.scheduledOccurrences}` : undefined} />
        <Stat label="This month" value={month.data ? `${Math.round(month.data.score)}%` : '—'} sub={month.data ? `${month.data.completions} of ${month.data.scheduledOccurrences}` : undefined} />
      </StatGrid>
      {month.data ? <Progress label="Month consistency" pct={month.data.score} /> : null}
      <Panel title="Last 30 days">
        <DataGrid
          tableId="habits.logs"
          data={logs.data ?? []}
          columns={logColumns}
          getRowId={(l) => l.id}
          loading={logs.loading && !logs.data}
          initialSorting={[{ id: 'date', desc: true }]}
          emptyMessage="No logs yet."
          searchPlaceholder="Search logs…"
          exportName={`${habit.name}-logs`}
          initialPageSize={10}
          rowActions={(l, close) => <Btn kind="danger" label="Remove log" onPress={() => { close(); void runner.run(() => api.habits.deleteLog(habit.id, l.id), logs.reload); }} />}
        />
      </Panel>
      <Panel title="Reminders">
        {reminders.data?.length === 0 ? <Empty>No reminders.</Empty> : reminders.data?.map((r) => (
          <Row key={r.id}><Text style={[s.body, { flex: 1 }]}>{r.reminderTime.slice(0, 5)}{r.daysOfWeek?.length ? ` · ${r.daysOfWeek.map((d) => WEEKDAYS[d - 1]?.label).join(' ')}` : ' · every day'}{r.enabled ? '' : ' (off)'}</Text><Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.habitTools.deleteReminder(habit.id, r.id), reminders.reload)} style={{ paddingVertical: 4, paddingHorizontal: 8 }} /></Row>
        ))}
        <Field label="New reminder at (HH:MM)"><Input value={time} onChangeText={setTime} /></Field>
        <Field label="On"><Chips value={days[0] ?? ''} onChange={(v) => v && setDays(days.includes(v) ? days.filter((d) => d !== v) : [...days, v])} options={WEEKDAYS} /></Field>
        <Muted style={{ fontSize: 11, marginBottom: 6 }}>{days.length ? `Selected: ${days.map((d) => WEEKDAYS[Number(d) - 1].label).join(', ')}` : 'No days picked means every day.'}</Muted>
        <Btn label="Add reminder" disabled={!/^\d{2}:\d{2}$/.test(time) || runner.busy} onPress={() => void runner.run(() => api.habitTools.addReminder(habit.id, { reminderTime: `${time}:00`, daysOfWeek: days.length ? days.map(Number) : null, enabled: true }), async () => { setDays([]); await reminders.reload(); })} />
      </Panel>
    </Sheet>
  );
}
