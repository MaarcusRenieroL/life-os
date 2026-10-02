import { JOB_BOARDS, SENIORITY_LEVELS, type DiscoveredJob, type DiscoveryPreferences, type JobBoard, type SeniorityLevel } from '@life-os/core';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { Text } from '@/text';

import { Btn, Chips, Empty, Field, Input, opts, Pill, Row, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

// ------------------------------------------------------------------ openings
/** New roles found at the companies you watch, best fit first. */
export function OpeningsTab({ onPromoted }: { onPromoted: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const [min, setMin] = useState('');
  const openings = useAsync(() => api.jobTools.openings({ minScore: min ? Number(min) : undefined, limit: 100 }), min);
  const [open, setOpen] = useState<DiscoveredJob | null>(null);
  const list = (openings.data ?? []).filter((j) => j.status === 'NEW');
  return (
    <>
      <View style={{ marginBottom: 10 }}><Chips value={min} onChange={setMin} clearable options={[{ value: '50', label: '50+ fit' }, { value: '65', label: '65+ fit' }, { value: '80', label: '80+ fit' }]} /></View>
      {openings.error && !openings.data ? <ErrorNote message={openings.error} onRetry={openings.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${list.length} new openings`}>
        {list.length === 0 && !openings.loading ? <Empty>No new openings. Add companies under Watchlist and scan them.</Empty> : list.map((j) => (
          <Row key={j.id} onPress={() => setOpen(j)}>
            <View style={{ flex: 1 }}><Text style={[s.body, { fontWeight: '700' }]}>{j.title}</Text><Muted style={{ fontSize: 12 }}>{j.company}{j.location ? ` · ${j.location}` : ''}</Muted></View>
            {j.fitScore != null ? <Pill label={`${Math.round(j.fitScore)}/100`} color={j.fitScore >= 70 ? C.accent : C.muted} /> : null}
          </Row>
        ))}
      </Panel>
      {open ? (
        <Sheet title={open.title} onClose={() => setOpen(null)}>
          <Muted>{open.company}{open.location ? ` · ${open.location}` : ''}</Muted>
          {open.fitScore != null ? <Text style={[s.body, { marginVertical: 8 }]}>Fit {Math.round(open.fitScore)}/100{open.fitExplanation?.matchedSkills?.length ? ` · matches ${open.fitExplanation.matchedSkills.join(', ')}` : ''}</Text> : null}
          {open.description ? <Text style={[s.body, { marginBottom: 10 }]} numberOfLines={12}>{open.description}</Text> : null}
          <View style={{ gap: 10 }}>
            <Btn label="Add to my jobs" disabled={runner.busy} onPress={() => void runner.run(() => api.jobTools.promote(open.id), async () => { setOpen(null); await openings.reload(); onPromoted(); })} />
            {open.url ? <Btn kind="ghost" label="Open the posting" onPress={() => void Linking.openURL(open.url!)} /> : null}
            <Btn kind="ghost" label="Not interested" disabled={runner.busy} onPress={() => void runner.run(() => api.jobTools.dismiss(open.id), async () => { setOpen(null); await openings.reload(); })} />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ discovery (watchlist + preferences)
export function DiscoveryTab() {
  const api = useApi();
  const runner = useRunner();
  const companies = useAsync(() => api.jobTools.companies(), api);
  const prefs = useAsync(() => api.jobTools.preferences(), api);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn label="+ Watch a company" onPress={() => setAdding(true)} />
        <Btn kind="ghost" label="Scan all now" disabled={runner.busy} onPress={() => void runner.run(() => api.jobTools.scanAll(), async () => setNote('Scanning in the background - check Openings in a minute.'))} />
      </View>
      {note ? <Muted style={{ marginBottom: 8 }}>{note}</Muted> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${companies.data?.length ?? 0} watched companies`}>
        {companies.data?.length === 0 ? <Empty>No companies yet.</Empty> : companies.data?.map((c) => (
          <Row key={c.id}>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>{c.name}</Text>
              <Muted style={{ fontSize: 11 }}>{c.board.toLowerCase()} · {c.slug}{c.lastOpenCount != null ? ` · ${c.lastOpenCount} open` : ''}</Muted>
              {c.lastFetchError ? <Text style={{ color: C.destructive, fontSize: 11 }}>{c.lastFetchError}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Btn kind="ghost" label="Scan" onPress={() => void runner.run(async () => { const r = await api.jobTools.scanCompany(c.id); setNote(`${c.name}: ${r.newOpenings} new, ${r.closedOpenings} closed.`); }, companies.reload)} style={{ paddingVertical: 4, paddingHorizontal: 10 }} />
                <Btn kind="danger" label="Remove" onPress={() => void runner.run(() => api.jobTools.removeCompany(c.id), companies.reload)} style={{ paddingVertical: 4, paddingHorizontal: 10 }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Muted style={{ fontSize: 10 }}>Active</Muted><Switch value={c.active} onValueChange={(v) => void runner.run(() => api.jobTools.updateCompany(c.id, { active: v }), companies.reload)} trackColor={{ true: C.accent }} />
              <Muted style={{ fontSize: 10 }}>Alerts</Muted><Switch value={c.alert} onValueChange={(v) => void runner.run(() => api.jobTools.updateCompany(c.id, { alert: v }), companies.reload)} trackColor={{ true: C.accent }} />
            </View>
          </Row>
        ))}
      </Panel>
      {prefs.data ? <PreferencesPanel prefs={prefs.data} onSaved={prefs.reload} /> : null}
      {adding ? <AddCompanySheet onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await companies.reload(); }} /> : null}
    </>
  );
}

const list = (text: string) => text.split(',').map((x) => x.trim()).filter(Boolean);

function PreferencesPanel({ prefs, onSaved }: { prefs: DiscoveryPreferences; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [include, setInclude] = useState(prefs.titleInclude.join(', '));
  const [exclude, setExclude] = useState(prefs.titleExclude.join(', '));
  const [locations, setLocations] = useState(prefs.locations.join(', '));
  const [senior, setSenior] = useState<SeniorityLevel | ''>(prefs.maxSeniority ?? '');
  const [alertMin, setAlertMin] = useState(String(prefs.alertMinScore));
  return (
    <Panel title="What to look for">
      <Field label="Titles to include"><Input value={include} onChangeText={setInclude} autoCapitalize="none" placeholder="backend, platform, java" /></Field>
      <Field label="Titles to skip"><Input value={exclude} onChangeText={setExclude} autoCapitalize="none" placeholder="manager, intern" /></Field>
      <Field label="Locations"><Input value={locations} onChangeText={setLocations} placeholder="Chennai, Remote" /></Field>
      <Field label="Highest seniority"><Chips value={senior} onChange={setSenior} options={opts(SENIORITY_LEVELS)} clearable /></Field>
      <Field label="Alert me at fit score"><Input value={alertMin} onChangeText={setAlertMin} keyboardType="numeric" /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Save preferences" disabled={runner.busy} onPress={() => void runner.run(() => api.jobTools.savePreferences({ titleInclude: list(include), titleExclude: list(exclude), locations: list(locations), maxSeniority: senior || null, alertMinScore: Number(alertMin) || 0 }), onSaved)} />
    </Panel>
  );
}

function AddCompanySheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [board, setBoard] = useState<JobBoard>('GREENHOUSE');
  const [slug, setSlug] = useState('');
  return (
    <Sheet title="Watch a company" onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} /></Field>
      <Field label="Job board"><Chips value={board} onChange={(v) => v && setBoard(v)} options={JOB_BOARDS.map((b) => ({ value: b.value, label: b.label }))} /></Field>
      <Field label="Board slug"><Input value={slug} onChangeText={setSlug} autoCapitalize="none" /></Field>
      <Muted style={{ marginBottom: 10, fontSize: 12 }}>{JOB_BOARDS.find((b) => b.value === board)?.hint}</Muted>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Add" disabled={!name.trim() || !slug.trim() || runner.busy} onPress={() => void runner.run(() => api.jobTools.addCompany({ name: name.trim(), board, slug: slug.trim(), alert: true }), onSaved)} />
    </Sheet>
  );
}

// ------------------------------------------------------------------ resume + career profile (onboarding)
export function ResumeTab() {
  const api = useApi();
  const runner = useRunner();
  const bundle = useAsync(() => api.jobTools.profile(), api);
  const resume = useAsync(() => api.jobTools.resume().catch(() => null), api);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<'job' | 'project' | null>(null);
  const b = bundle.data;

  async function upload(seed: boolean) {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' } as unknown as Blob);
    if (seed) await api.jobTools.seedFromResume(form);
    else await api.jobTools.uploadResume(form);
  }

  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Your resume">
        {resume.data ? <><Text style={s.body}>{resume.data.fileName}</Text><Muted style={{ fontSize: 12 }}>{Math.max(1, Math.round(resume.data.fileSize / 1024))} KB · uploaded {resume.data.createdAt.slice(0, 10)} · {resume.data.extractionStatus?.toLowerCase() ?? 'ready'}</Muted></> : <Empty>No resume yet. Upload one to score jobs against it.</Empty>}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Btn label={resume.data ? 'Replace resume' : 'Upload resume'} disabled={runner.busy} onPress={() => void runner.run(() => upload(false), async () => { await resume.reload(); })} />
          <Btn kind="ghost" label="Fill profile from it" disabled={runner.busy} onPress={() => void runner.run(() => upload(true), bundle.reload)} />
        </View>
      </Panel>
      <Panel title="Career profile">
        {b?.profile ? (
          <>
            <Text style={[s.body, { fontWeight: '700' }]}>{b.profile.fullName ?? '—'}</Text>
            <Muted>{[b.profile.email, b.profile.phone, b.profile.location].filter(Boolean).join(' · ')}</Muted>
            {b.profile.summary ? <Text style={[s.body, { marginTop: 6 }]}>{b.profile.summary}</Text> : null}
          </>
        ) : <Empty>Not filled in yet.</Empty>}
        <Btn kind="ghost" label={b?.profile ? 'Edit profile' : 'Set up profile'} onPress={() => setEditing(true)} style={{ marginTop: 10 }} />
      </Panel>
      <Panel title={`Experience · ${b?.experiences.length ?? 0}`}>
        {b?.experiences.map((e) => <Row key={e.id}><View style={{ flex: 1 }}><Text style={s.body}>{e.title} · {e.company}</Text><Muted style={{ fontSize: 11 }}>{e.startDate ?? '?'} – {e.current ? 'now' : (e.endDate ?? '?')}</Muted></View><Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.jobTools.deleteExperience(e.id), bundle.reload)} style={{ paddingVertical: 4, paddingHorizontal: 8 }} /></Row>)}
        <Btn kind="ghost" label="+ Add experience" onPress={() => setAdding('job')} style={{ marginTop: 8 }} />
      </Panel>
      <Panel title={`Projects · ${b?.projects.length ?? 0}`}>
        {b?.projects.map((p) => <Row key={p.id}><View style={{ flex: 1 }}><Text style={s.body}>{p.name}</Text><Muted style={{ fontSize: 11 }}>{p.techStack?.join(', ')}</Muted></View><Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.jobTools.deleteProject(p.id), bundle.reload)} style={{ paddingVertical: 4, paddingHorizontal: 8 }} /></Row>)}
        <Btn kind="ghost" label="+ Add project" onPress={() => setAdding('project')} style={{ marginTop: 8 }} />
      </Panel>
      <Panel title={`Skills · ${b?.skills.length ?? 0}`}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{b?.skills.length ? b.skills.map((k) => <Pill key={k.id} label={k.name} color={C.cyan} />) : <Empty>Skills are read from your resume.</Empty>}</View></Panel>
      {editing ? <ProfileSheet bundle={b} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await bundle.reload(); }} /> : null}
      {adding ? <EntrySheet kind={adding} onClose={() => setAdding(null)} onSaved={async () => { setAdding(null); await bundle.reload(); }} /> : null}
    </>
  );
}

function ProfileSheet({ bundle, onClose, onSaved }: { bundle: ReturnType<typeof useAsync<import('@life-os/core').CareerProfileBundle>>['data']; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const p = bundle?.profile;
  const [f, setF] = useState({ fullName: p?.fullName ?? '', email: p?.email ?? '', phone: p?.phone ?? '', location: p?.location ?? '', githubUrl: p?.githubUrl ?? '', linkedinUrl: p?.linkedinUrl ?? '', portfolioUrl: p?.portfolioUrl ?? '', summary: p?.summary ?? '' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Sheet title="Career profile" onClose={onClose}>
      {(['fullName', 'email', 'phone', 'location', 'githubUrl', 'linkedinUrl', 'portfolioUrl'] as const).map((k) => <Field key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}><Input value={f[k]} onChangeText={set(k)} autoCapitalize="none" /></Field>)}
      <Field label="Summary"><Input value={f.summary} onChangeText={set('summary')} multiline style={{ minHeight: 90 }} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Save" disabled={runner.busy} onPress={() => void runner.run(() => api.jobTools.saveProfile(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as never), onSaved)} />
    </Sheet>
  );
}

function EntrySheet({ kind, onClose, onSaved }: { kind: 'job' | 'project'; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [current, setCurrent] = useState(false);
  const [bullets, setBullets] = useState('');
  const lines = bullets.split('\n').map((x) => x.trim()).filter(Boolean);
  const save = async () => { await (kind === 'job'
    ? api.jobTools.addExperience({ title: a.trim(), company: b.trim(), location: null, startDate: start || null, endDate: current ? null : end || null, current, bullets: lines, displayOrder: 0 })
    : api.jobTools.addProject({ name: a.trim(), description: null, techStack: list(b), link: null, startDate: start || null, endDate: end || null, bullets: lines, displayOrder: 0 })); };
  return (
    <Sheet title={kind === 'job' ? 'Add experience' : 'Add project'} onClose={onClose}>
      <Field label={kind === 'job' ? 'Title' : 'Name'}><Input value={a} onChangeText={setA} /></Field>
      <Field label={kind === 'job' ? 'Company' : 'Tech (comma separated)'}><Input value={b} onChangeText={setB} /></Field>
      <Field label="Start (YYYY-MM-DD)"><Input value={start} onChangeText={setStart} autoCapitalize="none" /></Field>
      {kind === 'job' ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><Text style={s.body}>I work here now</Text><Switch value={current} onValueChange={setCurrent} trackColor={{ true: C.accent }} /></View> : null}
      {!current ? <Field label="End (YYYY-MM-DD)"><Input value={end} onChangeText={setEnd} autoCapitalize="none" /></Field> : null}
      <Field label="Highlights (one per line)"><Input value={bullets} onChangeText={setBullets} multiline style={{ minHeight: 90 }} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Save" disabled={!a.trim() || runner.busy} onPress={() => void runner.run(save, onSaved)} />
    </Sheet>
  );
}
