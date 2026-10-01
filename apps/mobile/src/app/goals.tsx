import { GOAL_STATUSES, LIFE_AREAS, type GoalDetail, type GoalStatus, type GoalSummary, type LifeArea } from '@life-os/core';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Btn, Chips, DateInput, Empty, Field, Input, opts, Pill, pretty, Progress, Row, Screen, Seg, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { Check, ErrorNote, Muted, Panel, s } from '@/ui';

type TabId = 'goals' | 'timeline' | 'reviews';
const TABS = [{ id: 'goals', label: 'Goals' }, { id: 'timeline', label: 'Timeline' }, { id: 'reviews', label: 'Reviews due' }] as const;
const tone = (st: GoalStatus) => (st === 'AT_RISK' ? C.magenta : st === 'ON_TRACK' || st === 'COMPLETED' ? C.accent : st === 'PAUSED' ? C.gold : C.muted);

export default function Goals() {
  const api = useApi();
  const [tab, setTab] = useState<TabId>('goals');
  const [status, setStatus] = useState<GoalStatus | ''>('');
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const goals = useAsync(() => api.goals.list({ status: status || undefined, includeArchived: status === 'ARCHIVED' }), status);
  const list = goals.data ?? [];

  const card = (g: GoalSummary) => (
    <Row key={g.id} onPress={() => setOpen(g.id)}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>{g.name}</Text><Pill label={pretty(g.status)} color={tone(g.status)} /></View>
        <Progress label={g.area ? pretty(g.area) : 'Progress'} pct={g.progress.overallPct} right={`${Math.round(g.progress.overallPct)}%${g.progress.expectedPct != null ? ` · exp ${Math.round(g.progress.expectedPct)}%` : ''}`} />
        <Muted style={{ fontSize: 11 }}>{g.targetDate ? `Target ${g.targetDate}` : 'No target date'}{g.blocked ? ' · blocked' : ''}{g.reviewDue ? ' · review due' : ''}</Muted>
      </View>
    </Row>
  );
  const dated = list.filter((g) => g.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!));

  return (
    <Screen title="Goals" onRefresh={() => void goals.reload()} refreshing={goals.loading} action={<Btn label="+ New" onPress={() => setOpen('new')} style={{ paddingVertical: 7 }} />}>
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {goals.error && !goals.data ? <ErrorNote message={goals.error} onRetry={goals.reload} /> : null}
      {tab === 'goals' ? (
        <>
          <View style={{ marginBottom: 12 }}><Chips value={status} onChange={setStatus} options={opts(GOAL_STATUSES)} clearable /></View>
          <Panel title={`Goals · ${list.length}`}>{list.length === 0 && !goals.loading ? <Empty>No goals yet. Set one worth chasing.</Empty> : list.map(card)}</Panel>
        </>
      ) : null}
      {tab === 'timeline' ? <Panel title="Timeline">{dated.length === 0 ? <Empty>Goals with a target date appear here.</Empty> : dated.map((g) => <Row key={g.id} onPress={() => setOpen(g.id)}><Muted style={{ width: 84 }}>{g.targetDate}</Muted><Text style={[s.body]}>{g.name}</Text><Text style={{ color: C.accent }}>{Math.round(g.progress.overallPct)}%</Text></Row>)}</Panel> : null}
      {tab === 'reviews' ? <Panel title="Reviews due">{list.filter((g) => g.reviewDue).length === 0 ? <Empty>No reviews due.</Empty> : list.filter((g) => g.reviewDue).map(card)}</Panel> : null}
      {open === 'new' ? <GoalForm goal={null} onClose={() => setOpen(null)} onSaved={async () => { setOpen(null); await goals.reload(); }} /> : null}
      {open && open !== 'new' ? <GoalDetailSheet id={open} onClose={() => setOpen(null)} onChanged={goals.reload} /> : null}
    </Screen>
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
  async function save() {
    const body = { name: name.trim(), description: description.trim() || null, area: area || null, priority: Number(priority), startDate: goal?.startDate ?? null, targetDate: targetDate || null };
    if (await runner.run(() => (goal ? api.goals.update(goal.id, body) : api.goals.create(body)))) await onSaved();
  }
  return (
    <Sheet title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus={!goal} /></Field>
      <Field label="Description"><Input value={description} onChangeText={setDescription} multiline /></Field>
      <Field label="Area"><Chips value={area} onChange={setArea} options={opts(LIFE_AREAS)} clearable /></Field>
      <Field label="Priority"><Chips value={priority as '1'} onChange={(v) => setPriority(v || '3')} options={[{ value: '1', label: 'P1 Critical' }, { value: '2', label: 'P2 High' }, { value: '3', label: 'P3 Medium' }, { value: '4', label: 'P4 Low' }]} /></Field>
      <Field label="Target date"><DateInput value={targetDate} onChange={setTargetDate} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label={goal ? 'Save' : 'Create'} disabled={!name.trim() || runner.busy} onPress={() => void save()} />
    </Sheet>
  );
}

function GoalDetailSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const detail = useAsync<GoalDetail>(() => api.goals.get(id), id);
  const [milestone, setMilestone] = useState('');
  const [metricValue, setMetricValue] = useState<Record<string, string>>({});
  const [review, setReview] = useState({ progressSummary: '', blockers: '', nextSteps: '' });
  const [editing, setEditing] = useState(false);
  const d = detail.data;
  const after = async () => { await Promise.all([detail.reload(), onChanged()]); };

  if (editing && d) return <GoalForm goal={d.goal} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await after(); }} />;

  return (
    <Sheet title={d?.goal.name ?? 'Goal'} onClose={onClose}>
      {detail.error && !d ? <ErrorNote message={detail.error} onRetry={detail.reload} /> : null}
      {d ? (
        <>
          <Progress label="Overall" pct={d.goal.progress.overallPct} />
          {d.goal.description ? <Muted style={{ marginBottom: 10 }}>{d.goal.description}</Muted> : null}
          <Field label="Status"><Chips value={d.goal.status} onChange={(v) => v && void runner.run(() => api.goals.setStatus(id, v), after)} options={opts(GOAL_STATUSES)} /></Field>
          {runner.error ? <ErrorNote message={runner.error} /> : null}
          <Panel title={`Milestones · ${d.goal.progress.milestonesDone}/${d.goal.progress.milestonesTotal}`}>
            {d.milestones.map((m) => (
              <Row key={m.id}>
                {m.completed ? <Pressable onPress={() => void runner.run(() => api.goals.setMilestone(id, m, false), after)} style={[s.check, { backgroundColor: C.accent, borderColor: C.accent }]}><Text style={{ fontWeight: '800', color: '#06120d' }}>✓</Text></Pressable> : <Check on={false} onPress={() => void runner.run(() => api.goals.setMilestone(id, m, true), after)} />}
                <Text style={[s.body, m.completed && { color: C.muted, textDecorationLine: 'line-through' }]}>{m.title}</Text>
                <Pressable onPress={() => void runner.run(() => api.goals.deleteMilestone(id, m.id), after)} hitSlop={8}><Text style={{ color: C.muted }}>✕</Text></Pressable>
              </Row>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Input style={{ flex: 1 }} value={milestone} onChangeText={setMilestone} placeholder="Add a milestone" onSubmitEditing={() => { const t = milestone.trim(); if (t) { setMilestone(''); void runner.run(() => api.goals.addMilestone(id, t), after); } }} />
            </View>
          </Panel>
          {d.metrics.length ? <Panel title="Metrics">{d.metrics.map((m) => (
            <View key={m.id} style={{ marginBottom: 10 }}>
              <Progress label={m.name} pct={m.progressPct} right={`${m.currentValue}${m.unit ?? ''} → ${m.targetValue}${m.unit ?? ''}`} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input style={{ flex: 1 }} value={metricValue[m.id] ?? ''} onChangeText={(v) => setMetricValue({ ...metricValue, [m.id]: v })} keyboardType="numeric" placeholder="Log a new value" />
                <Btn kind="ghost" label="Log" disabled={!metricValue[m.id]} onPress={() => { const v = Number(metricValue[m.id]); setMetricValue({ ...metricValue, [m.id]: '' }); void runner.run(() => api.goals.logMetric(id, m.id, v), after); }} />
              </View>
            </View>
          ))}</Panel> : null}
          <Panel title={`Linked tasks · ${d.tasks.length}`}>{d.tasks.length === 0 ? <Empty>No tasks linked.</Empty> : d.tasks.map((t) => <Row key={t.id}><Text style={[s.body, t.status === 'DONE' && { color: C.muted }]}>{t.title}</Text><Muted>{pretty(t.status)}</Muted></Row>)}</Panel>
          <Panel title="Review">
            <Field label="Progress"><Input value={review.progressSummary} onChangeText={(v) => setReview({ ...review, progressSummary: v })} /></Field>
            <Field label="Blockers"><Input value={review.blockers} onChangeText={(v) => setReview({ ...review, blockers: v })} /></Field>
            <Field label="Next steps"><Input value={review.nextSteps} onChangeText={(v) => setReview({ ...review, nextSteps: v })} /></Field>
            <Btn kind="ghost" label="Submit review" onPress={() => void runner.run(() => api.goals.review(id, review), async () => { setReview({ progressSummary: '', blockers: '', nextSteps: '' }); await after(); })} />
            {d.reviews.map((r) => <Row key={r.id}><Muted style={{ width: 84 }}>{r.reviewDate}</Muted><Text style={s.body}>{r.progressSummary ?? '—'}</Text><Text style={{ color: C.accent }}>{Math.round(r.progressSnapshot)}%</Text></Row>)}
          </Panel>
          <View style={{ gap: 10 }}>
            <Btn kind="ghost" label="Edit" onPress={() => setEditing(true)} />
            <Btn kind="danger" label="Delete goal" onPress={() => void runner.run(() => api.goals.remove(id), async () => { await onChanged(); onClose(); })} />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
