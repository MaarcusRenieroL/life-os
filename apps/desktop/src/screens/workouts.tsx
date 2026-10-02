import { EQUIPMENT, EXERCISE_CATEGORIES, dayKey, type Equipment, type ExerciseCategory, type Routine, type SessionDetail, type SessionSet } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Bars, Empty, ErrorNote, Field, Modal, opts, Panel, pretty, Select, Stat, Tabs } from '../ui';

type TabId = 'today' | 'routines' | 'exercises' | 'history' | 'records' | 'body' | 'analytics';
const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'routines', label: 'Routines' },
  { id: 'exercises', label: 'Exercises' },
  { id: 'history', label: 'History' },
  { id: 'records', label: 'Records' },
  { id: 'body', label: 'Body' },
  { id: 'analytics', label: 'Analytics' },
] as const;

export function WorkoutsScreen() {
  const [tab, setTab] = useState<TabId>('today');
  return (
    <div className="stack">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'today' && <TodayTab />}
      {tab === 'routines' && <RoutinesTab />}
      {tab === 'exercises' && <ExercisesTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'records' && <RecordsTab />}
      {tab === 'body' && <BodyTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

const duration = (s: number | null) => (s == null ? '—' : `${Math.round(s / 60)} min`);

function TodayTab() {
  const api = useApi();
  const runner = useRunner();
  const current = useAsync(() => api.workouts.current(), [api]);
  const routines = useAsync(() => api.workouts.routines(), [api]);
  const [name, setName] = useState('');
  const detail = current.data;

  if (current.error && !detail) return <ErrorNote message={current.error} onRetry={current.reload} />;

  if (detail) return <ActiveSession detail={detail} onChange={(d) => current.mutate(d)} onFinished={current.reload} />;

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Start a workout">
        <div className="add"><input placeholder="Freestyle session name (optional)" value={name} onChange={(e) => setName(e.target.value)} /><button className="primary" onClick={() => void runner.run(() => api.workouts.start({ name: name.trim() || null }), current.reload)}>Start empty</button></div>
      </Panel>
      <Panel title="From a routine">
        {(routines.data ?? []).length === 0 ? <Empty>No routines yet. Create one in the Routines tab.</Empty> : (
          <ul className="list">{(routines.data ?? []).map((r) => <li key={r.id}><span className="grow"><b>{r.name}</b> <small className="muted">{r.exercises.length} exercises</small></span><button className="ghost" onClick={() => void runner.run(() => api.workouts.start({ routineId: r.id }), current.reload)}>Start</button></li>)}</ul>
        )}
      </Panel>
    </div>
  );
}

function ActiveSession({ detail, onChange, onFinished }: { detail: SessionDetail; onChange: (d: SessionDetail) => void; onFinished: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const exercises = useAsync(() => api.workouts.exercises(), [api]);
  const [adding, setAdding] = useState('');
  const sid = detail.session.id;

  const patchSet = (set: SessionSet, patch: Partial<SessionSet>) => {
    const next = { ...set, ...patch };
    return runner.run(async () => onChange(await api.workouts.updateSet(sid, set.id, { actualReps: next.actualReps, actualWeight: next.actualWeight, restSeconds: next.restSeconds, completed: next.completed })));
  };

  return (
    <div className="stack">
      <Panel title={`${detail.session.name} · ${detail.session.completedSets}/${detail.session.totalSets} sets · ${Math.round(detail.session.volume)} kg volume`}>
        {runner.error && <ErrorNote message={runner.error} />}
        {detail.exercises.map((ex) => (
          <div key={ex.exerciseId} className="stack" style={{ marginBottom: 14 }}>
            <div className="row"><b>{ex.exerciseName}</b><small className="muted">{ex.previousBest != null ? `Previous best ${ex.previousBest} kg` : pretty(ex.category)}</small></div>
            {ex.sets.map((set) => (
              <div key={set.id} className="set-row">
                <small className="muted">#{set.setNumber}</small>
                <input type="number" step="any" placeholder={set.targetWeight != null ? `${set.targetWeight} kg` : 'kg'} defaultValue={set.actualWeight ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== set.actualWeight) void patchSet(set, { actualWeight: v }); }} />
                <input type="number" placeholder={set.targetReps != null ? `${set.targetReps} reps` : 'reps'} defaultValue={set.actualReps ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== set.actualReps) void patchSet(set, { actualReps: v }); }} />
                <button className={`check${set.completed ? ' on' : ''}`} onClick={() => void patchSet(set, { completed: !set.completed })}>{set.completed ? '✓' : ''}</button>
                <button className="link" title="Remove set" onClick={() => void runner.run(async () => onChange(await api.workouts.deleteSet(sid, set.id)))}>×</button>
                {set.pr && <span className="pill warn" style={{ gridColumn: '2 / 5' }}>🏆 Personal record</span>}
              </div>
            ))}
            <button className="ghost" style={{ justifySelf: 'start' }} onClick={() => void runner.run(async () => onChange(await api.workouts.addSet(sid, ex.exerciseId)))}>+ Add set</button>
          </div>
        ))}
        <div className="add">
          <Select value={adding} onChange={setAdding} options={(exercises.data ?? []).map((e) => ({ value: e.id, label: `${e.name} · ${pretty(e.category)}` }))} placeholder="Add an exercise…" />
          <button className="ghost" disabled={!adding} onClick={() => void runner.run(async () => { onChange(await api.workouts.addSet(sid, adding)); setAdding(''); })}>Add</button>
        </div>
      </Panel>
      <div className="actions">
        <button className="danger" onClick={() => void runner.run(() => api.workouts.deleteSession(sid), onFinished)}>Discard</button>
        <button className="primary" onClick={() => void runner.run(() => api.workouts.complete(sid), onFinished)}>Finish workout</button>
      </div>
    </div>
  );
}

function RoutinesTab() {
  const api = useApi();
  const runner = useRunner();
  const routines = useAsync(() => api.workouts.routines(), [api]);
  const templates = useAsync(() => api.workouts.templates(), [api]);
  const [creating, setCreating] = useState(false);
  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <div className="row"><span /><button className="primary" onClick={() => setCreating(true)}>+ New routine</button></div>
      <Panel title="Your routines">
        {(routines.data ?? []).length === 0 ? <Empty>No routines yet.</Empty> : <ul className="list">{(routines.data ?? []).map((r) => <RoutineRow key={r.id} routine={r} action={<button className="link" onClick={() => void runner.run(() => api.workouts.deleteRoutine(r.id), routines.reload)}>Delete</button>} />)}</ul>}
      </Panel>
      <Panel title="Templates">
        <ul className="list">{(templates.data ?? []).map((r) => <RoutineRow key={r.id} routine={r} action={<button className="ghost" onClick={() => void runner.run(() => api.workouts.copyTemplate(r.id), routines.reload)}>Copy to mine</button>} />)}</ul>
      </Panel>
      {creating && <RoutineForm onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); await routines.reload(); }} />}
    </div>
  );
}

function RoutineRow({ routine, action }: { routine: Routine; action: React.ReactNode }) {
  return (
    <li>
      <div className="grow"><b>{routine.name}</b><div className="muted">{routine.exercises.map((e) => `${e.exerciseName} ${e.targetSets}×${e.targetReps}`).join(' · ') || 'No exercises'}</div></div>
      {action}
    </li>
  );
}

function RoutineForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const exercises = useAsync(() => api.workouts.exercises(), [api]);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<{ exerciseId: string; targetSets: number; targetReps: number }[]>([]);
  const [pick, setPick] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    if (await runner.run(() => api.workouts.createRoutine({ name: name.trim(), exercises: rows }))) await onSaved();
  }
  const nameOf = (id: string) => exercises.data?.find((x) => x.id === id)?.name ?? id;

  return (
    <Modal title="New routine" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {rows.map((r, i) => (
          <div key={i} className="set-row" style={{ gridTemplateColumns: '1fr 70px 70px 28px' }}>
            <span>{nameOf(r.exerciseId)}</span>
            <input type="number" min={1} value={r.targetSets} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, targetSets: Number(e.target.value) } : x)))} />
            <input type="number" min={1} value={r.targetReps} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, targetReps: Number(e.target.value) } : x)))} />
            <button type="button" className="link" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div className="add"><Select value={pick} onChange={setPick} options={(exercises.data ?? []).map((x) => ({ value: x.id, label: x.name }))} placeholder="Add an exercise…" /><button type="button" className="ghost" disabled={!pick} onClick={() => { setRows([...rows, { exerciseId: pick, targetSets: 3, targetReps: 10 }]); setPick(''); }}>Add</button></div>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!name.trim() || rows.length === 0 || runner.busy}>Create routine</button></div>
      </form>
    </Modal>
  );
}

function ExercisesTab() {
  const api = useApi();
  const runner = useRunner();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | ''>('');
  const exercises = useAsync(() => api.workouts.exercises({ q: q.trim() || undefined, category: category || undefined }), [api, q, category]);
  const [creating, setCreating] = useState(false);
  return (
    <div className="stack">
      <div className="add"><input placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} /><div style={{ minWidth: 180 }}><Select value={category} onChange={setCategory} options={opts(EXERCISE_CATEGORIES)} placeholder="All categories" /></div><button className="primary" onClick={() => setCreating(true)}>+ Custom</button></div>
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${(exercises.data ?? []).length} exercises`}>
        <ul className="list">{(exercises.data ?? []).map((e) => <li key={e.id}><span className="grow">{e.name}</span><span className="pill">{pretty(e.category)}</span><span className="pill">{pretty(e.equipment)}</span>{e.custom && <button className="link" onClick={() => void runner.run(() => api.workouts.deleteExercise(e.id), exercises.reload)}>Delete</button>}</li>)}</ul>
      </Panel>
      {creating && <ExerciseForm onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); await exercises.reload(); }} />}
    </div>
  );
}

function ExerciseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('CHEST');
  const [equipment, setEquipment] = useState<Equipment>('BARBELL');
  const [instructions, setInstructions] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await runner.run(() => api.workouts.createExercise({ name: name.trim(), category, equipment, instructions: instructions.trim() || null }))) await onSaved();
  }
  return (
    <Modal title="Custom exercise" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="cols"><Field label="Category"><Select value={category} onChange={(v) => v && setCategory(v)} options={opts(EXERCISE_CATEGORIES)} /></Field><Field label="Equipment"><Select value={equipment} onChange={(v) => v && setEquipment(v)} options={opts(EQUIPMENT)} /></Field></div>
        <Field label="Instructions"><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!name.trim() || runner.busy}>Create</button></div>
      </form>
    </Modal>
  );
}

function HistoryTab() {
  const api = useApi();
  const runner = useRunner();
  const sessions = useAsync(() => api.workouts.sessions({ status: 'COMPLETED' }), [api]);
  return (
    <Panel title="Completed workouts">
      {runner.error && <ErrorNote message={runner.error} />}
      {(sessions.data ?? []).length === 0 && !sessions.loading ? <Empty>No workouts logged yet.</Empty> : (
        <ul className="list">{(sessions.data ?? []).map((s) => (
          <li key={s.id}><div className="grow"><b>{s.name}</b><div className="muted">{(s.completedAt ?? '').slice(0, 10)} · {duration(s.durationSeconds)} · {s.completedSets} sets · {Math.round(s.volume)} kg</div></div>{s.prCount > 0 && <span className="pill warn">🏆 {s.prCount}</span>}<button className="link" onClick={() => void runner.run(() => api.workouts.deleteSession(s.id), sessions.reload)}>Delete</button></li>
        ))}</ul>
      )}
    </Panel>
  );
}

function RecordsTab() {
  const api = useApi();
  const records = useAsync(() => api.workouts.records(), [api]);
  return (
    <Panel title="Personal records">
      {(records.data ?? []).length === 0 && !records.loading ? <Empty>Finish a workout with weights to set your first record.</Empty> : (
        <ul className="list">{(records.data ?? []).map((r) => <li key={r.exerciseId}><span className="grow">{r.exerciseName}</span><span className="pill">{pretty(r.category)}</span><b>{r.best.weight} kg × {r.best.reps}</b><small className="muted">{r.best.achievedAt.slice(0, 10)}</small></li>)}</ul>
      )}
    </Panel>
  );
}

function BodyTab() {
  const api = useApi();
  const runner = useRunner();
  const rows = useAsync(() => api.workouts.measurements(), [api]);
  const [form, setForm] = useState({ weightKg: '', chestCm: '', waistCm: '', armsCm: '', legsCm: '', bodyFatPct: '' });
  const n = (v: string) => (v === '' ? null : Number(v));
  const list = [...(rows.data ?? [])].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));

  async function add(e: FormEvent) {
    e.preventDefault();
    const ok = await runner.run(() => api.workouts.createMeasurement({ measuredOn: dayKey(new Date()), weightKg: n(form.weightKg), chestCm: n(form.chestCm), waistCm: n(form.waistCm), armsCm: n(form.armsCm), legsCm: n(form.legsCm), bodyFatPct: n(form.bodyFatPct) }), rows.reload);
    if (ok) setForm({ weightKg: '', chestCm: '', waistCm: '', armsCm: '', legsCm: '', bodyFatPct: '' });
  }
  const weights = [...list].reverse().filter((m) => m.weightKg != null).slice(-12);

  return (
    <div className="stack">
      <Panel title="Log today">
        <form className="stack" onSubmit={add}>
          <div className="cols">
            {([['weightKg', 'Weight (kg)'], ['bodyFatPct', 'Body fat %'], ['chestCm', 'Chest (cm)'], ['waistCm', 'Waist (cm)'], ['armsCm', 'Arms (cm)'], ['legsCm', 'Legs (cm)']] as const).map(([key, label]) => (
              <Field key={key} label={label}><input type="number" step="any" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>
            ))}
          </div>
          {runner.error && <ErrorNote message={runner.error} />}
          <div className="actions"><button className="primary" disabled={Object.values(form).every((v) => v === '') || runner.busy}>Save</button></div>
        </form>
      </Panel>
      {weights.length > 1 && <Panel title="Weight trend"><Bars rows={weights.map((m) => ({ label: m.measuredOn, value: m.weightKg! }))} format={(v) => `${v.toFixed(1)} kg`} /></Panel>}
      <Panel title="History">
        {list.length === 0 ? <Empty>No measurements yet.</Empty> : <ul className="list">{list.map((m) => <li key={m.id}><small className="muted" style={{ width: 90 }}>{m.measuredOn}</small><span className="grow">{[m.weightKg != null && `${m.weightKg} kg`, m.bodyFatPct != null && `${m.bodyFatPct}% fat`, m.waistCm != null && `waist ${m.waistCm}`, m.chestCm != null && `chest ${m.chestCm}`].filter(Boolean).join(' · ')}</span><button className="link" onClick={() => void runner.run(() => api.workouts.deleteMeasurement(m.id), rows.reload)}>Delete</button></li>)}</ul>}
      </Panel>
    </div>
  );
}

function AnalyticsTab() {
  const api = useApi();
  const analytics = useAsync(() => api.workouts.analytics(12), [api]);
  if (analytics.error && !analytics.data) return <ErrorNote message={analytics.error} onRetry={analytics.reload} />;
  const a = analytics.data;
  return (
    <div className="stack">
      <Panel title="Last 12 weeks">
        <div className="stats">
          <Stat label="Sessions" value={a?.totalSessions ?? '—'} sub={a ? `${a.sessionsPerWeek.toFixed(1)}/week` : undefined} />
          <Stat label="This week" value={a ? `${a.currentWeekSessions}/${a.weeklyTarget}` : '—'} />
          <Stat label="Avg duration" value={a ? `${Math.round(a.averageDurationMinutes)} min` : '—'} />
          <Stat label="Records" value={a?.personalRecords ?? '—'} />
          <Stat label="Streak" value={a ? `${a.currentStreakWeeks}w` : '—'} sub={a ? `best ${a.longestStreakWeeks}w` : undefined} />
        </div>
      </Panel>
      <Panel title="Sessions per week">{a?.weeks.length ? <Bars rows={a.weeks.map((w) => ({ label: w.weekStart, value: w.sessions }))} /> : <Empty>No data yet.</Empty>}</Panel>
      <Panel title="Volume per week">{a?.weeks.length ? <Bars rows={a.weeks.map((w) => ({ label: w.weekStart, value: w.volume }))} format={(v) => `${Math.round(v).toLocaleString()} kg`} /> : <Empty>No data yet.</Empty>}</Panel>
    </div>
  );
}
