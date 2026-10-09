import { dayKey, shiftDay, type Habit, type HabitLog } from '@life-os/core';
import { useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { DataGrid, type Col } from '../grid/data-grid';
import { Empty, ErrorNote, Field, Modal, Panel, pretty, ProgressRow, Select, Stat } from '../ui';

const monday = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))); };
const DAY_LETTERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS = DAY_LETTERS.map((label, i) => ({ value: String(i + 1), label }));
const cell = (status: string | undefined) => (status === 'COMPLETED' ? { cls: 'good', text: '✓' } : status === 'SKIPPED' ? { cls: '', text: '–' } : status ? { cls: 'bad', text: '×' } : { cls: '', text: '' });

/** Every active habit across one week: click a day to log it done, click again to clear it. */
export function WeeklyTab() {
  const api = useApi();
  const runner = useRunner();
  const [offset, setOffset] = useState(0);
  const start = shiftDay(monday(dayKey(new Date())), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const habits = useAsync(() => api.habits.list('ACTIVE'), [api]);
  const logs = useAsync(async () => {
    const list = await api.habits.list('ACTIVE');
    const out: Record<string, HabitLog[]> = {};
    await Promise.all(list.map(async (h) => { out[h.id] = await api.habits.logs(h.id, days[0], days[6]); }));
    return out;
  }, [api, start]);
  const today = dayKey(new Date());

  async function toggle(h: Habit, date: string, log: HabitLog | undefined) {
    await runner.run(async () => { if (log) await api.habits.deleteLog(h.id, log.id); else await api.habits.log(h.id, 'COMPLETED', { logDate: date }); }, logs.reload);
  }

  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <button className="ghost" onClick={() => setOffset(offset - 1)}>‹ Earlier</button>
        <span className="grow muted" style={{ textAlign: 'center' }}>{days[0]} → {days[6]}</span>
        <button className="ghost" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>Later ›</button>
      </div>
      {runner.error && <ErrorNote message={runner.error} />}
      {habits.error && !habits.data && <ErrorNote message={habits.error} onRetry={habits.reload} />}
      <Panel title="Weekly grid">
        {habits.data?.length === 0 ? <Empty>No active habits.</Empty> : (
          <table className="week-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ textAlign: 'left' }} />{days.map((d, i) => <th key={d} className={d === today ? 'good' : 'muted'} style={{ fontWeight: 500, padding: 4 }}>{DAY_LETTERS[i]}<br /><small>{d.slice(8)}</small></th>)}</tr></thead>
            <tbody>
              {habits.data?.map((h) => (
                <tr key={h.id}>
                  <td style={{ padding: '4px 8px 4px 0' }}>{h.icon} {h.name}</td>
                  {days.map((d) => {
                    const log = logs.data?.[h.id]?.find((l) => l.logDate.slice(0, 10) === d);
                    const c = cell(log?.status);
                    return <td key={d} style={{ textAlign: 'center', padding: 2 }}><button className={`check${log?.status === 'COMPLETED' ? ' on' : ''}`} disabled={d > today} onClick={() => void toggle(h, d, log)} aria-label={`${h.name} ${d}`}>{c.text}</button></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

/** One habit's month as a calendar of completed days. */
export function CalendarTab() {
  const api = useApi();
  const habits = useAsync(() => api.habits.list('ACTIVE'), [api]);
  const [habitId, setHabitId] = useState('');
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const chosen = habitId || habits.data?.[0]?.id || '';
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const last = dayKey(new Date(y, m, 0));
  const logs = useAsync(() => (chosen ? api.habits.logs(chosen, first, last) : Promise.resolve([] as HabitLog[])), [api, chosen, month]);
  const byDay = new Map((logs.data ?? []).map((l) => [l.logDate.slice(0, 10), l.status]));
  const lead = (new Date(`${first}T12:00:00`).getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: Number(last.slice(8)) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const shiftMonth = (n: number) => setMonth(dayKey(new Date(y, m - 1 + n, 1)).slice(0, 7));
  const done = [...byDay.values()].filter((v) => v === 'COMPLETED').length;
  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <Select value={chosen} onChange={(v) => v && setHabitId(v)} options={(habits.data ?? []).map((h) => ({ value: h.id, label: h.name }))} />
        <button className="ghost" onClick={() => shiftMonth(-1)}>‹</button>
        <b>{month}</b>
        <button className="ghost" onClick={() => shiftMonth(1)}>›</button>
      </div>
      <Panel title={`${done} completed this month`}>
        <div className="cal">
          {DAY_LETTERS.map((d) => <div key={d} className="cal-head">{d}</div>)}
          {cells.map((d, i) => {
            const c = cell(d ? byDay.get(d) : undefined);
            return <div key={i} className={`cal-cell${d ? '' : ' off'}`}>{d && <><b>{Number(d.slice(8))}</b><span className={c.cls}>{c.text}</span></>}</div>;
          })}
        </div>
      </Panel>
    </>
  );
}

/** A habit's streaks, consistency, recent logs and reminders. */
export function HabitDetailModal({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const streak = useAsync(() => api.habits.streak(habit.id), [api, habit.id]);
  const week = useAsync(() => api.habitTools.consistency(habit.id, 'week'), [api, habit.id]);
  const month = useAsync(() => api.habitTools.consistency(habit.id, 'month'), [api, habit.id]);
  const logs = useAsync(() => api.habits.logs(habit.id, shiftDay(dayKey(new Date()), -29), dayKey(new Date())), [api, habit.id]);
  const reminders = useAsync(() => api.habitTools.reminders(habit.id), [api, habit.id]);
  const logColumns: Col<HabitLog>[] = [
    { id: 'date', title: 'Date', value: (l) => l.logDate.slice(0, 10), filter: { type: 'date' } },
    { id: 'status', title: 'Status', value: (l) => pretty(String(l.status)), filter: { type: 'select' } },
    { id: 'value', title: 'Value', value: (l) => l.value ?? null, align: 'right', filter: { type: 'number' } },
    { id: 'note', title: 'Note', value: (l) => l.note ?? '' },
  ];
  const [time, setTime] = useState('08:00');
  const [days, setDays] = useState<string[]>([]);
  return (
    <Modal title={habit.name} onClose={onClose} wide>
      <div className="stack">
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="stats">
          <Stat label="Current streak" value={streak.data ? `${streak.data.currentStreak} d` : '—'} sub={streak.data ? `longest ${streak.data.longestStreak} d` : undefined} />
          <Stat label="This week" value={week.data ? `${Math.round(week.data.score)}%` : '—'} sub={week.data ? `${week.data.completions} of ${week.data.scheduledOccurrences}` : undefined} />
          <Stat label="This month" value={month.data ? `${Math.round(month.data.score)}%` : '—'} sub={month.data ? `${month.data.completions} of ${month.data.scheduledOccurrences}` : undefined} />
        </div>
        {month.data && <ProgressRow label="Month consistency" pct={month.data.score} />}
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
            rowActions={(l) => <button className="link" onClick={() => void runner.run(() => api.habits.deleteLog(habit.id, l.id), logs.reload)}>Remove</button>}
          />
        </Panel>
        <Panel title="Reminders">
          {reminders.data?.length === 0 ? <Empty>No reminders.</Empty> : (
            <ul className="list">
              {reminders.data?.map((r) => <li key={r.id}><span className="grow">{r.reminderTime.slice(0, 5)}{r.daysOfWeek?.length ? ` · ${r.daysOfWeek.map((d) => DAY_LETTERS[d - 1]).join(' ')}` : ' · every day'}{r.enabled ? '' : ' (off)'}</span><button className="danger" onClick={() => void runner.run(() => api.habitTools.deleteReminder(habit.id, r.id), reminders.reload)}>Delete</button></li>)}
            </ul>
          )}
          <div className="cols" style={{ marginTop: 10 }}>
            <Field label="New reminder at"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="On (none = every day)"><div className="seg">{WEEKDAYS.map((d) => <button type="button" key={d.value} className={days.includes(d.value) ? 'on' : ''} onClick={() => setDays(days.includes(d.value) ? days.filter((x) => x !== d.value) : [...days, d.value])}>{d.label}</button>)}</div></Field>
          </div>
          <div className="actions"><button className="primary" disabled={!time || runner.busy} onClick={() => void runner.run(() => api.habitTools.addReminder(habit.id, { reminderTime: `${time}:00`, daysOfWeek: days.length ? days.map(Number) : null, enabled: true }), async () => { setDays([]); await reminders.reload(); })}>Add reminder</button></div>
        </Panel>
      </div>
    </Modal>
  );
}
