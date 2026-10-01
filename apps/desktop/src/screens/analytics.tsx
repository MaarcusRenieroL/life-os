import { dayKey, shiftDay, type TrendPoint } from '@life-os/core';
import { useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Bars, Empty, ErrorNote, money, Panel, ProgressRow, Stat, Tabs } from '../ui';

type Range = 'week' | 'trends';
const RANGES = [
  { id: 'week', label: 'This week' },
  { id: 'trends', label: 'Trends' },
] as const;

/** Sums daily points into Monday-start weeks, oldest first. */
function byWeek(points: TrendPoint[], weeks: number) {
  const monday = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))); };
  const start = monday(shiftDay(dayKey(new Date()), -7 * (weeks - 1)));
  const map = new Map<string, { tasks: number; workouts: number; spending: number; habit: number[] }>();
  for (const p of points) {
    if (p.date < start) continue;
    const key = monday(p.date);
    const row = map.get(key) ?? { tasks: 0, workouts: 0, spending: 0, habit: [] };
    row.tasks += p.tasksCompleted; row.workouts += p.workouts; row.spending += p.spending;
    if (p.habitPct != null) row.habit.push(p.habitPct);
    map.set(key, row);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, r]) => ({ week, ...r, habitPct: r.habit.length ? r.habit.reduce((a, b) => a + b, 0) / r.habit.length : 0 }));
}

export function AnalyticsScreen() {
  const api = useApi();
  const [range, setRange] = useState<Range>('week');
  const dash = useAsync(() => api.dashboard(), [api]);
  const trends = useAsync(() => api.trends(120), [api]);
  const w = dash.data?.week;
  const weeks = byWeek(trends.data ?? [], 12);

  if (dash.error && !dash.data) return <ErrorNote message={dash.error} onRetry={dash.reload} />;

  return (
    <div className="stack">
      <Tabs tabs={RANGES} value={range} onChange={setRange} />
      {range === 'week' && (
        <>
          <Panel title={w ? `${w.from} → ${w.to}` : 'This week'}>
            <div className="stats">
              <Stat label="Tasks done" value={w?.tasksCompleted ?? '—'} sub={w ? `of ${w.tasksDue} due` : undefined} />
              <Stat label="Habit consistency" value={w?.habitConsistencyPct != null ? `${Math.round(w.habitConsistencyPct)}%` : '—'} />
              <Stat label="Workouts" value={w?.workouts ?? '—'} sub={w ? `${w.workoutMinutes} min` : undefined} />
              <Stat label="Spent" value={money(w?.spending)} sub={w?.previousSpending != null ? `last week ${money(w.previousSpending)}` : undefined} />
              <Stat label="Applications" value={w?.applicationsApplied ?? '—'} sub={w ? `${w.interviews} interviews` : undefined} />
              <Stat label="Mood" value={w?.averageMood != null ? w.averageMood.toFixed(1) : '—'} />
            </div>
          </Panel>
          <div className="grid">
            <Panel title="Spending by category">{w?.spendingByCategory.length ? <Bars rows={w.spendingByCategory.map((c) => ({ label: c.category, value: c.amount }))} format={(n) => money(n)} /> : <Empty>No spending recorded.</Empty>}</Panel>
            <Panel title="Goals">{w?.goals.length ? w.goals.map((g) => <ProgressRow key={g.name} label={g.name} pct={g.progressPct ?? 0} right={`${Math.round(g.progressPct ?? 0)}%${g.expectedPct != null ? ` / expected ${Math.round(g.expectedPct)}%` : ''}`} />) : <Empty>No active goals.</Empty>}</Panel>
          </div>
          {(dash.data?.anomalies.length ?? 0) > 0 && <Panel title="Heads up"><ul className="list">{dash.data!.anomalies.map((a) => <li key={a.title}><span className={`pill ${a.severity === 'ALERT' ? 'bad' : 'warn'}`}>{a.severity.toLowerCase()}</span><span className="grow"><b>{a.title}</b><div className="muted">{a.detail}</div></span></li>)}</ul></Panel>}
          {(dash.data?.insights.length ?? 0) > 0 && <Panel title="Insights"><ul className="list">{dash.data!.insights.map((i) => <li key={i.title}><span className="grow"><b>{i.title}</b><div className="muted">{i.detail}</div></span></li>)}</ul></Panel>}
        </>
      )}
      {range === 'trends' && (
        <>
          <Panel title="Tasks completed per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.tasks }))} /> : <Empty>Not enough data yet.</Empty>}</Panel>
          <Panel title="Habit consistency per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.habitPct }))} format={(n) => `${Math.round(n)}%`} /> : <Empty>Not enough data yet.</Empty>}</Panel>
          <Panel title="Workouts per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.workouts }))} /> : <Empty>Not enough data yet.</Empty>}</Panel>
          <Panel title="Spending per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.spending }))} format={(n) => money(n)} /> : <Empty>Not enough data yet.</Empty>}</Panel>
        </>
      )}
    </div>
  );
}
