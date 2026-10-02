import { JOB_BOARDS, SENIORITY_LEVELS, type CareerProfileBundle, type DiscoveredJob, type DiscoveryPreferences, type JobBoard, type SeniorityLevel } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { openExternal } from '../lib/runtime';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote, Field, Modal, opts, Panel, Select } from '../ui';

const list = (text: string) => text.split(',').map((x) => x.trim()).filter(Boolean);

// ------------------------------------------------------------------ openings
export function OpeningsTab({ onPromoted }: { onPromoted: () => void }) {
  const api = useApi();
  const runner = useRunner();
  const [min, setMin] = useState('');
  const openings = useAsync(() => api.jobTools.openings({ minScore: min ? Number(min) : undefined, limit: 100 }), [api, min]);
  const [open, setOpen] = useState<DiscoveredJob | null>(null);
  const rows = (openings.data ?? []).filter((j) => j.status === 'NEW');
  return (
    <>
      <div className="row"><Select value={min} onChange={setMin} options={[{ value: '50', label: '50+ fit' }, { value: '65', label: '65+ fit' }, { value: '80', label: '80+ fit' }]} placeholder="Any fit" /></div>
      {openings.error && !openings.data && <ErrorNote message={openings.error} onRetry={openings.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${rows.length} new openings`}>
        {rows.length === 0 && !openings.loading ? <Empty>No new openings. Add companies under Watchlist and scan them.</Empty> : (
          <ul className="list">
            {rows.map((j) => (
              <li key={j.id} className="clickable" onClick={() => setOpen(j)}>
                <span className="grow"><b>{j.title}</b><div className="muted">{j.company}{j.location ? ` · ${j.location}` : ''}</div></span>
                {j.fitScore != null && <span className={`pill ${j.fitScore >= 70 ? 'good' : ''}`}>{Math.round(j.fitScore)}/100</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)} wide>
          <div className="stack">
            <p className="muted">{open.company}{open.location ? ` · ${open.location}` : ''}</p>
            {open.fitScore != null && <p>Fit {Math.round(open.fitScore)}/100{open.fitExplanation?.matchedSkills?.length ? ` · matches ${open.fitExplanation.matchedSkills.join(', ')}` : ''}</p>}
            {open.description && <p style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto' }}>{open.description}</p>}
            <div className="actions">
              <button className="ghost" disabled={runner.busy} onClick={() => void runner.run(() => api.jobTools.dismiss(open.id), async () => { setOpen(null); await openings.reload(); })}>Not interested</button>
              {open.url && <button className="ghost" onClick={() => void openExternal(open.url!)}>Open the posting</button>}
              <button className="primary" disabled={runner.busy} onClick={() => void runner.run(() => api.jobTools.promote(open.id), async () => { setOpen(null); await openings.reload(); onPromoted(); })}>Add to my jobs</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------------ discovery (watchlist + preferences)
export function DiscoveryTab() {
  const api = useApi();
  const runner = useRunner();
  const companies = useAsync(() => api.jobTools.companies(), [api]);
  const prefs = useAsync(() => api.jobTools.preferences(), [api]);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <span className="grow" />
        <button className="ghost" disabled={runner.busy} onClick={() => void runner.run(() => api.jobTools.scanAll(), async () => setNote('Scanning in the background - check Openings in a minute.'))}>Scan all now</button>
        <button className="primary" onClick={() => setAdding(true)}>+ Watch a company</button>
      </div>
      {note && <p className="muted">{note}</p>}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${companies.data?.length ?? 0} watched companies`}>
        {companies.data?.length === 0 ? <Empty>No companies yet.</Empty> : (
          <ul className="list">
            {companies.data?.map((c) => (
              <li key={c.id}>
                <span className="grow"><b>{c.name}</b><div className="muted">{c.board.toLowerCase()} · {c.slug}{c.lastOpenCount != null ? ` · ${c.lastOpenCount} open` : ''}</div>{c.lastFetchError && <div className="error">{c.lastFetchError}</div>}</span>
                <label className="muted"><input type="checkbox" checked={c.active} onChange={(e) => void runner.run(() => api.jobTools.updateCompany(c.id, { active: e.target.checked }), companies.reload)} /> Active</label>
                <label className="muted"><input type="checkbox" checked={c.alert} onChange={(e) => void runner.run(() => api.jobTools.updateCompany(c.id, { alert: e.target.checked }), companies.reload)} /> Alerts</label>
                <button className="ghost" onClick={() => void runner.run(async () => { const r = await api.jobTools.scanCompany(c.id); setNote(`${c.name}: ${r.newOpenings} new, ${r.closedOpenings} closed.`); }, companies.reload)}>Scan</button>
                <button className="danger" onClick={() => void runner.run(() => api.jobTools.removeCompany(c.id), companies.reload)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {prefs.data && <PreferencesPanel prefs={prefs.data} onSaved={prefs.reload} />}
      {adding && <AddCompanyModal onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await companies.reload(); }} />}
    </>
  );
}

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
      <form className="stack" onSubmit={(e: FormEvent) => { e.preventDefault(); void runner.run(() => api.jobTools.savePreferences({ titleInclude: list(include), titleExclude: list(exclude), locations: list(locations), maxSeniority: senior || null, alertMinScore: Number(alertMin) || 0 }), onSaved); }}>
        <div className="cols">
          <Field label="Titles to include"><input value={include} onChange={(e) => setInclude(e.target.value)} placeholder="backend, platform, java" /></Field>
          <Field label="Titles to skip"><input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="manager, intern" /></Field>
          <Field label="Locations"><input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Chennai, Remote" /></Field>
          <Field label="Highest seniority"><Select value={senior} onChange={setSenior} options={opts(SENIORITY_LEVELS)} placeholder="Any" /></Field>
          <Field label="Alert me at fit score"><input type="number" value={alertMin} onChange={(e) => setAlertMin(e.target.value)} /></Field>
        </div>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={runner.busy}>Save preferences</button></div>
      </form>
    </Panel>
  );
}

function AddCompanyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [board, setBoard] = useState<JobBoard>('GREENHOUSE');
  const [slug, setSlug] = useState('');
  return (
    <Modal title="Watch a company" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.jobTools.addCompany({ name: name.trim(), board, slug: slug.trim(), alert: true }), onSaved); }}>
        <div className="cols">
          <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Job board"><Select value={board} onChange={(v) => v && setBoard(v)} options={JOB_BOARDS.map((b) => ({ value: b.value, label: b.label }))} /></Field>
          <Field label="Board slug"><input value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
        </div>
        <p className="muted">{JOB_BOARDS.find((b) => b.value === board)?.hint}</p>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!name.trim() || !slug.trim() || runner.busy}>Add</button></div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ resume + career profile
export function ResumeTab() {
  const api = useApi();
  const runner = useRunner();
  const bundle = useAsync(() => api.jobTools.profile(), [api]);
  const resume = useAsync(() => api.jobTools.resume().catch(() => null), [api]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<'job' | 'project' | null>(null);
  const b = bundle.data;

  async function upload(file: File, seed: boolean) {
    const form = new FormData();
    form.append('file', file);
    if (seed) await api.jobTools.seedFromResume(form);
    else await api.jobTools.uploadResume(form);
  }

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <div className="grid">
        <Panel title="Your resume">
          {resume.data ? <><div>{resume.data.fileName}</div><small className="muted">{Math.max(1, Math.round(resume.data.fileSize / 1024))} KB · uploaded {resume.data.createdAt.slice(0, 10)} · {resume.data.extractionStatus?.toLowerCase() ?? 'ready'}</small></> : <Empty>No resume yet. Upload one to score jobs against it.</Empty>}
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <label className="ghost" style={{ cursor: 'pointer' }}>{resume.data ? 'Replace resume' : 'Upload resume'}<input type="file" accept=".pdf,.docx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void runner.run(() => upload(f, false), async () => { await resume.reload(); }); e.target.value = ''; }} /></label>
            <label className="ghost" style={{ cursor: 'pointer' }}>Fill profile from a resume<input type="file" accept=".pdf,.docx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void runner.run(() => upload(f, true), bundle.reload); e.target.value = ''; }} /></label>
          </div>
        </Panel>
        <Panel title="Career profile">
          {b?.profile ? <><b>{b.profile.fullName ?? '—'}</b><div className="muted">{[b.profile.email, b.profile.phone, b.profile.location].filter(Boolean).join(' · ')}</div>{b.profile.summary && <p>{b.profile.summary}</p>}</> : <Empty>Not filled in yet.</Empty>}
          <div className="actions"><button className="ghost" onClick={() => setEditing(true)}>{b?.profile ? 'Edit profile' : 'Set up profile'}</button></div>
        </Panel>
      </div>
      <div className="grid">
        <Panel title={`Experience · ${b?.experiences.length ?? 0}`} action={<button className="link" onClick={() => setAdding('job')}>+ Add</button>}>
          {b?.experiences.length ? <ul className="list">{b.experiences.map((e) => <li key={e.id}><span className="grow"><b>{e.title} · {e.company}</b><div className="muted">{e.startDate ?? '?'} – {e.current ? 'now' : (e.endDate ?? '?')}</div></span><button className="danger" onClick={() => void runner.run(() => api.jobTools.deleteExperience(e.id), bundle.reload)}>Delete</button></li>)}</ul> : <Empty>None yet.</Empty>}
        </Panel>
        <Panel title={`Projects · ${b?.projects.length ?? 0}`} action={<button className="link" onClick={() => setAdding('project')}>+ Add</button>}>
          {b?.projects.length ? <ul className="list">{b.projects.map((p) => <li key={p.id}><span className="grow"><b>{p.name}</b><div className="muted">{p.techStack?.join(', ')}</div></span><button className="danger" onClick={() => void runner.run(() => api.jobTools.deleteProject(p.id), bundle.reload)}>Delete</button></li>)}</ul> : <Empty>None yet.</Empty>}
        </Panel>
      </div>
      <Panel title={`Skills · ${b?.skills.length ?? 0}`}>{b?.skills.length ? <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{b.skills.map((k) => <span key={k.id} className="pill">{k.name}</span>)}</div> : <Empty>Skills are read from your resume.</Empty>}</Panel>
      {editing && <ProfileModal bundle={b} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await bundle.reload(); }} />}
      {adding && <EntryModal kind={adding} onClose={() => setAdding(null)} onSaved={async () => { setAdding(null); await bundle.reload(); }} />}
    </div>
  );
}

function ProfileModal({ bundle, onClose, onSaved }: { bundle: CareerProfileBundle | undefined; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const p = bundle?.profile;
  const [f, setF] = useState({ fullName: p?.fullName ?? '', email: p?.email ?? '', phone: p?.phone ?? '', location: p?.location ?? '', githubUrl: p?.githubUrl ?? '', linkedinUrl: p?.linkedinUrl ?? '', portfolioUrl: p?.portfolioUrl ?? '', summary: p?.summary ?? '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Career profile" onClose={onClose} wide>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.jobTools.saveProfile(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as never), onSaved); }}>
        <div className="cols">
          {(['fullName', 'email', 'phone', 'location', 'githubUrl', 'linkedinUrl', 'portfolioUrl'] as const).map((k) => <Field key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}><input value={f[k]} onChange={set(k)} /></Field>)}
        </div>
        <Field label="Summary"><textarea rows={4} value={f.summary} onChange={set('summary')} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={runner.busy}>Save</button></div>
      </form>
    </Modal>
  );
}

function EntryModal({ kind, onClose, onSaved }: { kind: 'job' | 'project'; onClose: () => void; onSaved: () => Promise<void> }) {
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
    <Modal title={kind === 'job' ? 'Add experience' : 'Add project'} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(save, onSaved); }}>
        <div className="cols">
          <Field label={kind === 'job' ? 'Title' : 'Name'}><input autoFocus value={a} onChange={(e) => setA(e.target.value)} /></Field>
          <Field label={kind === 'job' ? 'Company' : 'Tech (comma separated)'}><input value={b} onChange={(e) => setB(e.target.value)} /></Field>
          <Field label="Start"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          {!current && <Field label="End"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>}
          {kind === 'job' && <Field label="I work here now"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /></Field>}
        </div>
        <Field label="Highlights (one per line)"><textarea rows={5} value={bullets} onChange={(e) => setBullets(e.target.value)} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!a.trim() || runner.busy}>Save</button></div>
      </form>
    </Modal>
  );
}
