import { EQUIPMENT, EXERCISE_CATEGORIES, dayKey, type Equipment, type ExerciseCategory, type Routine, type SessionDetail, type SessionSet } from '@life-os/core';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Bars, Btn, Chips, Empty, Field, Input, opts, Pill, pretty, Row, Screen, Seg, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { Check, ErrorNote, Muted, Panel, s, success } from '@/ui';

type TabId = 'today' | 'routines' | 'exercises' | 'history' | 'records' | 'body' | 'analytics';
const TABS = [{ id: 'today', label: 'Today' }, { id: 'routines', label: 'Routines' }, { id: 'exercises', label: 'Exercises' }, { id: 'history', label: 'History' }, { id: 'records', label: 'Records' }, { id: 'body', label: 'Body' }, { id: 'analytics', label: 'Analytics' }] as const;
const mins = (sec: number | null) => (sec == null ? '—' : `${Math.round(sec / 60)} min`);

export default function Workouts() {
  const [tab, setTab] = useState<TabId>('today');
  return (
    <Screen title="Workouts">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'today' ? <Today /> : tab === 'routines' ? <Routines /> : tab === 'exercises' ? <Exercises /> : tab === 'history' ? <History /> : tab === 'records' ? <Records /> : tab === 'body' ? <Body /> : <Analytics />}
    </Screen>
  );
}

function Today() {
  const api = useApi();
  const runner = useRunner();
  const current = useAsync(() => api.workouts.current(), api);
  const routines = useAsync(() => api.workouts.routines(), api);
  const [name, setName] = useState('');
  if (current.error && !current.data) return <ErrorNote message={current.error} onRetry={current.reload} />;
  if (current.data) return <Active detail={current.data} onChange={(d) => current.mutate(d)} onFinished={current.reload} />;
  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Start a workout">
        <Input value={name} onChangeText={setName} placeholder="Freestyle session name (optional)" style={{ marginBottom: 10 }} />
        <Btn label="Start empty workout" onPress={() => void runner.run(() => api.workouts.start({ name: name.trim() || null }), current.reload)} />
      </Panel>
      <Panel title="From a routine">
        {(routines.data ?? []).length === 0 ? <Empty>No routines yet. Create one in the Routines tab.</Empty> : (routines.data ?? []).map((r) => <Row key={r.id}><View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{r.name}</Text><Muted>{r.exercises.length} exercises</Muted></View><Btn kind="ghost" label="Start" onPress={() => void runner.run(() => api.workouts.start({ routineId: r.id }), current.reload)} style={{ paddingVertical: 7 }} /></Row>)}
      </Panel>
    </>
  );
}

function Active({ detail, onChange, onFinished }: { detail: SessionDetail; onChange: (d: SessionDetail) => void; onFinished: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const exercises = useAsync(() => api.workouts.exercises(), api);
  const [picking, setPicking] = useState(false);
  const sid = detail.session.id;
  const patch = (set: SessionSet, change: Partial<SessionSet>) => {
    const next = { ...set, ...change };
    return runner.run(async () => onChange(await api.workouts.updateSet(sid, set.id, { actualReps: next.actualReps, actualWeight: next.actualWeight, restSeconds: next.restSeconds, completed: next.completed })));
  };
  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  return (
    <>
      <Panel title={`${detail.session.name} · ${detail.session.completedSets}/${detail.session.totalSets} sets · ${Math.round(detail.session.volume)} kg`}>
        {runner.error ? <ErrorNote message={runner.error} /> : null}
        {detail.exercises.map((ex) => (
          <View key={ex.exerciseId} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: C.text, fontWeight: '700' }}>{ex.exerciseName}</Text><Muted>{ex.previousBest != null ? `best ${ex.previousBest} kg` : pretty(ex.category)}</Muted></View>
            {ex.sets.map((set) => (
              <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Muted style={{ width: 24 }}>#{set.setNumber}</Muted>
                <Input style={{ flex: 1, padding: 9 }} keyboardType="decimal-pad" placeholder={set.targetWeight != null ? `${set.targetWeight} kg` : 'kg'} defaultValue={set.actualWeight?.toString() ?? ''} onEndEditing={(e) => { const v = num(e.nativeEvent.text); if (v !== set.actualWeight) void patch(set, { actualWeight: v }); }} />
                <Input style={{ flex: 1, padding: 9 }} keyboardType="number-pad" placeholder={set.targetReps != null ? `${set.targetReps} reps` : 'reps'} defaultValue={set.actualReps?.toString() ?? ''} onEndEditing={(e) => { const v = num(e.nativeEvent.text); if (v !== set.actualReps) void patch(set, { actualReps: v }); }} />
                {set.completed ? <Pressable onPress={() => void patch(set, { completed: false })} style={[s.check, { backgroundColor: C.accent, borderColor: C.accent }]}><Text style={{ fontWeight: '800', color: '#06120d' }}>✓</Text></Pressable> : <Check on={false} onPress={() => { void patch(set, { completed: true }); success(); }} />}
                <Pressable hitSlop={8} onPress={() => void runner.run(async () => onChange(await api.workouts.deleteSet(sid, set.id)))}><Text style={{ color: C.muted }}>✕</Text></Pressable>
              </View>
            ))}
            {ex.sets.some((x) => x.pr) ? <Text style={{ color: C.gold, marginTop: 6 }}>🏆 Personal record</Text> : null}
            <Pressable onPress={() => void runner.run(async () => onChange(await api.workouts.addSet(sid, ex.exerciseId)))} style={{ marginTop: 10 }}><Text style={{ color: C.accent }}>+ Add set</Text></Pressable>
          </View>
        ))}
        <Btn kind="ghost" label="Add an exercise" onPress={() => setPicking(true)} />
      </Panel>
      <View style={{ gap: 10 }}>
        <Btn label="Finish workout" onPress={() => void runner.run(() => api.workouts.complete(sid), onFinished)} />
        <Btn kind="danger" label="Discard" onPress={() => void runner.run(() => api.workouts.deleteSession(sid), onFinished)} />
      </View>
      {picking ? <Sheet title="Add an exercise" onClose={() => setPicking(false)}>{(exercises.data ?? []).map((e) => <Row key={e.id} onPress={() => { setPicking(false); void runner.run(async () => onChange(await api.workouts.addSet(sid, e.id))); }}><Text style={s.body}>{e.name}</Text><Muted>{pretty(e.category)}</Muted></Row>)}</Sheet> : null}
    </>
  );
}

function Routines() {
  const api = useApi();
  const runner = useRunner();
  const routines = useAsync(() => api.workouts.routines(), api);
  const templates = useAsync(() => api.workouts.templates(), api);
  const [creating, setCreating] = useState(false);
  const line = (r: Routine) => r.exercises.map((e) => `${e.exerciseName} ${e.targetSets}×${e.targetReps}`).join(' · ') || 'No exercises';
  return (
    <>
      <Btn label="+ New routine" onPress={() => setCreating(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Your routines">{(routines.data ?? []).length === 0 ? <Empty>No routines yet.</Empty> : (routines.data ?? []).map((r) => <Row key={r.id}><View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{r.name}</Text><Muted style={{ fontSize: 12 }}>{line(r)}</Muted></View><Pressable onPress={() => void runner.run(() => api.workouts.deleteRoutine(r.id), routines.reload)}><Text style={{ color: C.magenta }}>Delete</Text></Pressable></Row>)}</Panel>
      <Panel title="Templates">{(templates.data ?? []).map((r) => <Row key={r.id}><View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{r.name}</Text><Muted style={{ fontSize: 12 }}>{line(r)}</Muted></View><Pressable onPress={() => void runner.run(() => api.workouts.copyTemplate(r.id), routines.reload)}><Text style={{ color: C.accent }}>Copy</Text></Pressable></Row>)}</Panel>
      {creating ? <RoutineSheet onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); await routines.reload(); }} /> : null}
    </>
  );
}

function RoutineSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const exercises = useAsync(() => api.workouts.exercises(), api);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<{ exerciseId: string; targetSets: number; targetReps: number }[]>([]);
  const [picking, setPicking] = useState(false);
  const nameOf = (id: string) => exercises.data?.find((x) => x.id === id)?.name ?? id;
  return (
    <Sheet title="New routine" onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus /></Field>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={[s.body, { flex: 2 }]}>{nameOf(r.exerciseId)}</Text>
          <Input style={{ flex: 1, padding: 8 }} keyboardType="number-pad" value={String(r.targetSets)} onChangeText={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, targetSets: Number(v) || 0 } : x)))} />
          <Muted>×</Muted>
          <Input style={{ flex: 1, padding: 8 }} keyboardType="number-pad" value={String(r.targetReps)} onChangeText={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, targetReps: Number(v) || 0 } : x)))} />
          <Pressable onPress={() => setRows(rows.filter((_, j) => j !== i))}><Text style={{ color: C.muted }}>✕</Text></Pressable>
        </View>
      ))}
      <Btn kind="ghost" label="Add an exercise" onPress={() => setPicking(!picking)} style={{ marginBottom: 12 }} />
      {picking ? <View style={{ marginBottom: 12 }}>{(exercises.data ?? []).map((e) => <Row key={e.id} onPress={() => { setRows([...rows, { exerciseId: e.id, targetSets: 3, targetReps: 10 }]); setPicking(false); }}><Text style={s.body}>{e.name}</Text><Muted>{pretty(e.category)}</Muted></Row>)}</View> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Create routine" disabled={!name.trim() || rows.length === 0 || runner.busy} onPress={() => void runner.run(() => api.workouts.createRoutine({ name: name.trim(), exercises: rows }), onSaved)} />
    </Sheet>
  );
}

function Exercises() {
  const api = useApi();
  const runner = useRunner();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | ''>('');
  const [creating, setCreating] = useState(false);
  const list = useAsync(() => api.workouts.exercises({ q: q.trim() || undefined, category: category || undefined }), `${q}|${category}`);
  return (
    <>
      <Input value={q} onChangeText={setQ} placeholder="Search exercises…" style={{ marginBottom: 10 }} />
      <View style={{ marginBottom: 12 }}><Chips value={category} onChange={setCategory} options={opts(EXERCISE_CATEGORIES)} clearable /></View>
      <Btn kind="ghost" label="+ Custom exercise" onPress={() => setCreating(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${(list.data ?? []).length} exercises`}>{(list.data ?? []).map((e) => <Row key={e.id}><View style={{ flex: 1 }}><Text style={s.body}>{e.name}</Text><Muted style={{ fontSize: 11 }}>{pretty(e.category)} · {pretty(e.equipment)}</Muted></View>{e.custom ? <Pressable onPress={() => void runner.run(() => api.workouts.deleteExercise(e.id), list.reload)}><Text style={{ color: C.magenta }}>Delete</Text></Pressable> : null}</Row>)}</Panel>
      {creating ? <ExerciseSheet onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); await list.reload(); }} /> : null}
    </>
  );
}

function ExerciseSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('CHEST');
  const [equipment, setEquipment] = useState<Equipment>('BARBELL');
  const [instructions, setInstructions] = useState('');
  return (
    <Sheet title="Custom exercise" onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus /></Field>
      <Field label="Category"><Chips value={category} onChange={(v) => v && setCategory(v)} options={opts(EXERCISE_CATEGORIES)} /></Field>
      <Field label="Equipment"><Chips value={equipment} onChange={(v) => v && setEquipment(v)} options={opts(EQUIPMENT)} /></Field>
      <Field label="Instructions"><Input value={instructions} onChangeText={setInstructions} multiline /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Create" disabled={!name.trim() || runner.busy} onPress={() => void runner.run(() => api.workouts.createExercise({ name: name.trim(), category, equipment, instructions: instructions.trim() || null }), onSaved)} />
    </Sheet>
  );
}

function History() {
  const api = useApi();
  const runner = useRunner();
  const sessions = useAsync(() => api.workouts.sessions({ status: 'COMPLETED' }), api);
  return (
    <Panel title="Completed workouts">
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {(sessions.data ?? []).length === 0 && !sessions.loading ? <Empty>No workouts logged yet.</Empty> : (sessions.data ?? []).map((x) => (
        <Row key={x.id}><View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{x.name}</Text><Muted style={{ fontSize: 12 }}>{(x.completedAt ?? '').slice(0, 10)} · {mins(x.durationSeconds)} · {x.completedSets} sets · {Math.round(x.volume)} kg</Muted></View>{x.prCount > 0 ? <Pill label={`🏆 ${x.prCount}`} color={C.gold} /> : null}<Pressable onPress={() => void runner.run(() => api.workouts.deleteSession(x.id), sessions.reload)}><Text style={{ color: C.muted }}>✕</Text></Pressable></Row>
      ))}
    </Panel>
  );
}

function Records() {
  const api = useApi();
  const records = useAsync(() => api.workouts.records(), api);
  return (
    <Panel title="Personal records">
      {(records.data ?? []).length === 0 && !records.loading ? <Empty>Finish a workout with weights to set your first record.</Empty> : (records.data ?? []).map((r) => <Row key={r.exerciseId}><View style={{ flex: 1 }}><Text style={s.body}>{r.exerciseName}</Text><Muted style={{ fontSize: 11 }}>{pretty(r.category)} · {r.best.achievedAt.slice(0, 10)}</Muted></View><Text style={{ color: C.gold, fontWeight: '700' }}>{r.best.weight} kg × {r.best.reps}</Text></Row>)}
    </Panel>
  );
}

function Body() {
  const api = useApi();
  const runner = useRunner();
  const rows = useAsync(() => api.workouts.measurements(), api);
  const blank = { weightKg: '', bodyFatPct: '', chestCm: '', waistCm: '', armsCm: '', legsCm: '' };
  const [form, setForm] = useState(blank);
  const n = (v: string) => (v === '' ? null : Number(v));
  const list = [...(rows.data ?? [])].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));
  const weights = [...list].reverse().filter((m) => m.weightKg != null).slice(-8);
  const labels: [keyof typeof blank, string][] = [['weightKg', 'Weight (kg)'], ['bodyFatPct', 'Body fat %'], ['chestCm', 'Chest (cm)'], ['waistCm', 'Waist (cm)'], ['armsCm', 'Arms (cm)'], ['legsCm', 'Legs (cm)']];
  return (
    <>
      <Panel title="Log today">
        {labels.map(([key, label]) => <Field key={key} label={label}><Input keyboardType="decimal-pad" value={form[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} /></Field>)}
        {runner.error ? <ErrorNote message={runner.error} /> : null}
        <Btn label="Save" disabled={Object.values(form).every((v) => v === '') || runner.busy} onPress={() => void runner.run(() => api.workouts.createMeasurement({ measuredOn: dayKey(new Date()), weightKg: n(form.weightKg), bodyFatPct: n(form.bodyFatPct), chestCm: n(form.chestCm), waistCm: n(form.waistCm), armsCm: n(form.armsCm), legsCm: n(form.legsCm) }), async () => { setForm(blank); await rows.reload(); })} />
      </Panel>
      {weights.length > 1 ? <Panel title="Weight trend"><Bars rows={weights.map((m) => ({ label: m.measuredOn, value: m.weightKg! }))} format={(v) => `${v.toFixed(1)} kg`} /></Panel> : null}
      <Panel title="History">{list.length === 0 ? <Empty>No measurements yet.</Empty> : list.map((m) => <Row key={m.id}><Muted style={{ width: 84 }}>{m.measuredOn}</Muted><Text style={[s.body, { fontSize: 13 }]}>{[m.weightKg != null && `${m.weightKg} kg`, m.bodyFatPct != null && `${m.bodyFatPct}%`, m.waistCm != null && `waist ${m.waistCm}`].filter(Boolean).join(' · ')}</Text><Pressable onPress={() => void runner.run(() => api.workouts.deleteMeasurement(m.id), rows.reload)}><Text style={{ color: C.muted }}>✕</Text></Pressable></Row>)}</Panel>
    </>
  );
}

function Analytics() {
  const api = useApi();
  const a = useAsync(() => api.workouts.analytics(12), api);
  if (a.error && !a.data) return <ErrorNote message={a.error} onRetry={a.reload} />;
  const d = a.data;
  return (
    <>
      <Panel title="Last 12 weeks"><StatGrid>
        <Stat label="Sessions" value={d?.totalSessions ?? '—'} sub={d ? `${d.sessionsPerWeek.toFixed(1)}/week` : undefined} />
        <Stat label="This week" value={d ? `${d.currentWeekSessions}/${d.weeklyTarget}` : '—'} />
        <Stat label="Avg duration" value={d ? `${Math.round(d.averageDurationMinutes)} min` : '—'} />
        <Stat label="Records" value={d?.personalRecords ?? '—'} />
        <Stat label="Streak" value={d ? `${d.currentStreakWeeks}w` : '—'} sub={d ? `best ${d.longestStreakWeeks}w` : undefined} />
      </StatGrid></Panel>
      <Panel title="Sessions per week">{d?.weeks.length ? <Bars rows={d.weeks.map((w) => ({ label: w.weekStart, value: w.sessions }))} /> : <Empty>No data yet.</Empty>}</Panel>
      <Panel title="Volume per week">{d?.weeks.length ? <Bars rows={d.weeks.map((w) => ({ label: w.weekStart, value: w.volume }))} format={(v) => `${Math.round(v).toLocaleString()} kg`} /> : <Empty>No data yet.</Empty>}</Panel>
    </>
  );
}
