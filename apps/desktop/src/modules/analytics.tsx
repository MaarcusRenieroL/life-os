import { dayKey, shiftDay, type PeriodSummary, type TrendPoint } from '@life-os/core';
import { useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Bars, Empty, ErrorNote, money, Panel, ProgressRow, Stat } from '../ui';

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

function SummaryPanels({ w }: { w: PeriodSummary | undefined }) {
  return (
    <>
      <Panel title={w ? `${w.from} → ${w.to}` : 'Summary'}>
        <div className="stats">
          <Stat label="Tasks done" value={w?.tasksCompleted ?? '—'} sub={w ? `of ${w.tasksDue} due${w.taskCompletionPct != null ? ` · ${Math.round(w.taskCompletionPct)}%` : ''}` : undefined} />
          <Stat label="Habit consistency" value={w?.habitConsistencyPct != null ? `${Math.round(w.habitConsistencyPct)}%` : '—'} />
          <Stat label="Workouts" value={w?.workouts ?? '—'} sub={w ? `${w.workoutMinutes} min` : undefined} />
          <Stat label="Spent" value={money(w?.spending)} sub={w?.previousSpending != null ? `before ${money(w.previousSpending)}` : undefined} />
          <Stat label="Income" value={money(w?.income)} />
          <Stat label="Focus hours" value={w ? w.focusHours.toFixed(1) : '—'} />
          <Stat label="Applications" value={w?.applicationsApplied ?? '—'} sub={w ? `${w.applicationsSaved} saved · ${w.interviews} interviews` : undefined} />
          <Stat label="Journal entries" value={w?.journalEntries ?? '—'} sub={w?.averageMood != null ? `mood ${w.averageMood.toFixed(1)}` : undefined} />
          <Stat label="Milestones" value={w?.milestonesCompleted ?? '—'} />
          <Stat label="Weight change" value={w?.weightChangeKg != null ? `${w.weightChangeKg > 0 ? '+' : ''}${w.weightChangeKg.toFixed(1)} kg` : '—'} />
        </div>
      </Panel>
      <div className="grid">
        <Panel title="Spending by category">{w?.spendingByCategory.length ? <Bars rows={w.spendingByCategory.map((c) => ({ label: c.category, value: c.amount }))} format={(n) => money(n)} /> : <Empty>No spending recorded.</Empty>}</Panel>
        <Panel title="Goals">{w?.goals.length ? w.goals.map((g) => <ProgressRow key={g.name} label={g.name} pct={g.progressPct ?? 0} right={`${Math.round(g.progressPct ?? 0)}%${g.expectedPct != null ? ` / expected ${Math.round(g.expectedPct)}%` : ''}`} />) : <Empty>No active goals.</Empty>}</Panel>
      </div>
      {w?.unavailableModules.length ? <p className="muted">Numbers from {w.unavailableModules.join(', ')} are missing right now.</p> : null}
    </>
  );
}

export function OverviewTab() {
  const api = useApi();
  const dash = useAsync(() => api.dashboard(), [api]);
  return (
    <>
      {dash.error && !dash.data && <ErrorNote message={dash.error} onRetry={dash.reload} />}
      <SummaryPanels w={dash.data?.week} />
      {(dash.data?.anomalies.length ?? 0) > 0 && <Panel title="Heads up"><ul className="list">{dash.data!.anomalies.map((a) => <li key={a.title}><span className={`pill ${a.severity === 'ALERT' ? 'bad' : 'warn'}`}>{a.severity.toLowerCase()}</span><span className="grow"><b>{a.title}</b><div className="muted">{a.detail}</div></span></li>)}</ul></Panel>}
      {(dash.data?.insights.length ?? 0) > 0 && <Panel title="Insights"><ul className="list">{dash.data!.insights.map((i) => <li key={i.title}><span className="grow"><b>{i.title}</b><div className="muted">{i.detail}</div></span></li>)}</ul></Panel>}
    </>
  );
}

/** One week or one month, with arrows to move through time. */
export function PeriodTab({ period }: { period: 'WEEK' | 'MONTH' }) {
  const api = useApi();
  const [offset, setOffset] = useState(0);
  const asOf = shiftDay(dayKey(new Date()), period === 'WEEK' ? offset * 7 : offset * 30);
  const summary = useAsync(() => api.analytics.summary(period, asOf), [api, period, asOf]);
  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <button className="ghost" onClick={() => setOffset(offset - 1)}>‹ Earlier {period === 'WEEK' ? 'week' : 'month'}</button>
        <button className="ghost" disabled={offset === 0} onClick={() => setOffset(0)}>Now</button>
        <button className="ghost" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>Later ›</button>
      </div>
      {summary.error && !summary.data && <ErrorNote message={summary.error} onRetry={summary.reload} />}
      <SummaryPanels w={summary.data} />
    </>
  );
}

export function TrendsTab() {
  const api = useApi();
  const trends = useAsync(() => api.trends(120), [api]);
  const weeks = byWeek(trends.data ?? [], 12);
  const none = <Empty>Not enough data yet.</Empty>;
  return (
    <>
      {trends.error && !trends.data && <ErrorNote message={trends.error} onRetry={trends.reload} />}
      <Panel title="Tasks completed per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.tasks }))} /> : none}</Panel>
      <Panel title="Habit consistency per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.habitPct }))} format={(n) => `${Math.round(n)}%`} /> : none}</Panel>
      <Panel title="Workouts per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.workouts }))} /> : none}</Panel>
      <Panel title="Spending per week">{weeks.length ? <Bars rows={weeks.map((r) => ({ label: r.week, value: r.spending }))} format={(n) => money(n)} /> : none}</Panel>
    </>
  );
}

export function InsightsTab() {
  const api = useApi();
  const [days, setDays] = useState(60);
  const insights = useAsync(() => api.analytics.insights(days), [api, days]);
  const anomalies = useAsync(() => api.analytics.anomalies(), [api]);
  return (
    <>
      <div className="row" style={{ gap: 8 }}>{[30, 60, 90].map((d) => <button key={d} className={days === d ? 'primary' : 'ghost'} onClick={() => setDays(d)}>{d} days</button>)}</div>
      {insights.error && !insights.data && <ErrorNote message={insights.error} onRetry={insights.reload} />}
      <Panel title="Patterns in your data">
        {insights.data?.length === 0 ? <Empty>Not enough history for patterns yet.</Empty> : (
          <ul className="list">{insights.data?.map((i) => <li key={i.title}><span className="grow"><b>{i.title}</b><div className="muted">{i.detail}</div><small className="muted">correlation {i.correlation.toFixed(2)} · {i.sampleSize} days</small></span></li>)}</ul>
        )}
      </Panel>
      <Panel title="Heads up">
        {anomalies.data?.length === 0 ? <Empty>Nothing unusual.</Empty> : (
          <ul className="list">{anomalies.data?.map((a) => <li key={a.title}><span className={`pill ${a.severity === 'ALERT' ? 'bad' : 'warn'}`}>{a.severity.toLowerCase()}</span><span className="grow"><b>{a.title}</b><div className="muted">{a.detail}</div></span></li>)}</ul>
        )}
      </Panel>
    </>
  );
}
