import { dayKey, shiftDay, type PeriodSummary, type TrendPoint } from '@life-os/core';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/text';

import { Bars, Btn, Empty, money, Pill, Progress, Row, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

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
      <Panel title={w ? `${w.from} → ${w.to}` : 'Summary'}><StatGrid>
        <Stat label="Tasks done" value={w?.tasksCompleted ?? '—'} sub={w ? `of ${w.tasksDue} due${w.taskCompletionPct != null ? ` · ${Math.round(w.taskCompletionPct)}%` : ''}` : undefined} />
        <Stat label="Habits" value={w?.habitConsistencyPct != null ? `${Math.round(w.habitConsistencyPct)}%` : '—'} />
        <Stat label="Workouts" value={w?.workouts ?? '—'} sub={w ? `${w.workoutMinutes} min` : undefined} />
        <Stat label="Spent" value={money(w?.spending)} sub={w?.previousSpending != null ? `before ${money(w.previousSpending)}` : undefined} />
        <Stat label="Income" value={money(w?.income)} />
        <Stat label="Focus hours" value={w ? w.focusHours.toFixed(1) : '—'} />
        <Stat label="Applications" value={w?.applicationsApplied ?? '—'} sub={w ? `${w.applicationsSaved} saved · ${w.interviews} interviews` : undefined} />
        <Stat label="Journal entries" value={w?.journalEntries ?? '—'} sub={w?.averageMood != null ? `mood ${w.averageMood.toFixed(1)}` : undefined} />
        <Stat label="Milestones" value={w?.milestonesCompleted ?? '—'} />
        <Stat label="Weight change" value={w?.weightChangeKg != null ? `${w.weightChangeKg > 0 ? '+' : ''}${w.weightChangeKg.toFixed(1)} kg` : '—'} />
      </StatGrid></Panel>
      <Panel title="Spending by category">{w?.spendingByCategory.length ? <Bars rows={w.spendingByCategory.map((c) => ({ label: c.category, value: c.amount }))} format={(n) => money(n)} /> : <Empty>No spending recorded.</Empty>}</Panel>
      <Panel title="Goals">{w?.goals.length ? w.goals.map((g) => <Progress key={g.name} label={g.name} pct={g.progressPct ?? 0} right={`${Math.round(g.progressPct ?? 0)}%${g.expectedPct != null ? ` / exp ${Math.round(g.expectedPct)}%` : ''}`} />) : <Empty>No active goals.</Empty>}</Panel>
      {w?.unavailableModules.length ? <Muted>Numbers from {w.unavailableModules.join(', ')} are missing right now.</Muted> : null}
    </>
  );
}

/** The snapshot: this week so far, what looks unusual, and patterns worth knowing. */
export function OverviewTab() {
  const api = useApi();
  const dash = useAsync(() => api.dashboard(), api);
  return (
    <>
      {dash.error && !dash.data ? <ErrorNote message={dash.error} onRetry={dash.reload} /> : null}
      <SummaryPanels w={dash.data?.week} />
      {(dash.data?.anomalies.length ?? 0) > 0 ? <Panel title="Heads up">{dash.data!.anomalies.map((a) => <Row key={a.title}><Pill label={a.severity} color={a.severity === 'ALERT' ? C.magenta : C.gold} /><Text style={s.body}>{a.title}{'\n'}<Text style={{ color: C.muted, fontSize: 12 }}>{a.detail}</Text></Text></Row>)}</Panel> : null}
      {(dash.data?.insights.length ?? 0) > 0 ? <Panel title="Insights">{dash.data!.insights.map((i) => <Row key={i.title}><Text style={s.body}>{i.title}{'\n'}<Text style={{ color: C.muted, fontSize: 12 }}>{i.detail}</Text></Text></Row>)}</Panel> : null}
    </>
  );
}

/** One week or one month, with arrows to move through time. */
export function PeriodTab({ period }: { period: 'WEEK' | 'MONTH' }) {
  const api = useApi();
  const [offset, setOffset] = useState(0);
  const asOf = shiftDay(dayKey(new Date()), period === 'WEEK' ? offset * 7 : offset * 30);
  const summary = useAsync(() => api.analytics.summary(period, asOf), `${period}|${asOf}`);
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Btn kind="ghost" label={period === 'WEEK' ? '‹ Earlier week' : '‹ Earlier month'} onPress={() => setOffset(offset - 1)} style={{ paddingVertical: 7 }} />
        <Btn kind="ghost" label="Now" disabled={offset === 0} onPress={() => setOffset(0)} style={{ paddingVertical: 7 }} />
        <Btn kind="ghost" label="Later ›" disabled={offset >= 0} onPress={() => setOffset(offset + 1)} style={{ paddingVertical: 7 }} />
      </View>
      {summary.error && !summary.data ? <ErrorNote message={summary.error} onRetry={summary.reload} /> : null}
      <SummaryPanels w={summary.data} />
    </>
  );
}

export function TrendsTab() {
  const api = useApi();
  const trends = useAsync(() => api.trends(120), api);
  const weeks = byWeek(trends.data ?? [], 12);
  const none = <Empty>Not enough data yet.</Empty>;
  return (
    <>
      {trends.error && !trends.data ? <ErrorNote message={trends.error} onRetry={trends.reload} /> : null}
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
  const insights = useAsync(() => api.analytics.insights(days), days);
  const anomalies = useAsync(() => api.analytics.anomalies(), api);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[30, 60, 90].map((d) => <Btn key={d} kind={days === d ? 'primary' : 'ghost'} label={`${d} days`} onPress={() => setDays(d)} style={{ paddingVertical: 7 }} />)}
      </View>
      {insights.error && !insights.data ? <ErrorNote message={insights.error} onRetry={insights.reload} /> : null}
      <Panel title="Patterns in your data">
        {insights.data?.length === 0 ? <Empty>Not enough history for patterns yet.</Empty> : insights.data?.map((i) => (
          <Row key={i.title}><View style={{ flex: 1 }}><Text style={s.body}>{i.title}</Text><Muted style={{ fontSize: 12 }}>{i.detail}</Muted><Muted style={{ fontSize: 11 }}>correlation {i.correlation.toFixed(2)} · {i.sampleSize} days</Muted></View></Row>
        ))}
      </Panel>
      <Panel title="Heads up">
        {anomalies.data?.length === 0 ? <Empty>Nothing unusual.</Empty> : anomalies.data?.map((a) => (
          <Row key={a.title}><Pill label={a.severity} color={a.severity === 'ALERT' ? C.magenta : C.gold} /><View style={{ flex: 1 }}><Text style={s.body}>{a.title}</Text><Muted style={{ fontSize: 12 }}>{a.detail}</Muted></View></Row>
        ))}
      </Panel>
    </>
  );
}
