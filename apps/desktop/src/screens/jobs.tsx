import { JOB_STATUSES, type JobListing, type JobStatus } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { openExternal } from '../lib/runtime';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Bars, Empty, ErrorNote, Field, Modal, opts, Panel, pretty, Select, Stat, Tabs } from '../ui';

type TabId = 'dashboard' | 'list' | 'add' | 'analytics';
const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'list', label: 'Jobs' },
  { id: 'add', label: 'Add a job' },
  { id: 'analytics', label: 'Analytics' },
] as const;

const fit = (n: number | null) => (n == null ? null : <span className={`pill ${n >= 75 ? 'good' : n >= 55 ? 'warn' : ''}`}>{n}% fit</span>);

export function JobsScreen() {
  const api = useApi();
  const [tab, setTab] = useState<TabId>('dashboard');
  const jobs = useAsync(() => api.jobs.list(), [api]);
  const [open, setOpen] = useState<JobListing | null>(null);
  const list = jobs.data ?? [];

  if (jobs.error && !jobs.data) return <ErrorNote message={jobs.error} onRetry={jobs.reload} />;

  return (
    <div className="stack">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'dashboard' && <Dashboard jobs={list} onOpen={setOpen} />}
      {tab === 'list' && <JobList jobs={list} onOpen={setOpen} />}
      {tab === 'add' && <AddJob onAdded={async (job) => { await jobs.reload(); setTab('list'); setOpen(job); }} />}
      {tab === 'analytics' && <Analytics />}
      {open && <JobModal job={open} onClose={() => setOpen(null)} onChanged={async () => { await jobs.reload(); }} onUpdated={setOpen} />}
    </div>
  );
}

function Dashboard({ jobs, onOpen }: { jobs: JobListing[]; onOpen: (j: JobListing) => void }) {
  const count = (s: JobStatus) => jobs.filter((j) => j.status === s).length;
  const active = jobs.filter((j) => j.status && !['REJECTED', 'WITHDRAWN', 'OFFER_REJECTED', 'OFFER_ACCEPTED', 'NO_LONGER_ACCEPTING', 'NOT_INTERESTED'].includes(j.status));
  const followUps = jobs.filter((j) => j.followUpAt && active.includes(j)).sort((a, b) => a.followUpAt!.localeCompare(b.followUpAt!)).slice(0, 5);
  return (
    <div className="stack">
      <Panel title="Pipeline">
        <div className="pipeline">{JOB_STATUSES.filter((s) => count(s)).map((s) => <div key={s} className="stage"><b>{count(s)}</b><small>{pretty(s)}</small></div>)}</div>
        {jobs.length === 0 && <Empty>No applications yet. Paste a posting link under “Add a job”.</Empty>}
      </Panel>
      <div className="grid">
        <Panel title="Follow up">{followUps.length === 0 ? <Empty>Nothing to follow up on.</Empty> : <ul className="list">{followUps.map((j) => <li key={j.id} className="clickable" onClick={() => onOpen(j)}><span className="grow">{j.title} <span className="muted">at {j.company}</span></span><small className="muted">{j.followUpAt!.slice(0, 10)}</small></li>)}</ul>}</Panel>
        <Panel title="Best matches">
          <ul className="list">{[...active].filter((j) => j.fitScore != null).sort((a, b) => b.fitScore! - a.fitScore!).slice(0, 5).map((j) => <li key={j.id} className="clickable" onClick={() => onOpen(j)}><span className="grow">{j.title} <span className="muted">at {j.company}</span></span>{fit(j.fitScore)}</li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}

function JobList({ jobs, onOpen }: { jobs: JobListing[]; onOpen: (j: JobListing) => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const shown = jobs.filter((j) => (!status || j.status === status) && `${j.title} ${j.company} ${j.location ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="stack">
      <div className="add"><input placeholder="Search title, company, location…" value={q} onChange={(e) => setQ(e.target.value)} /><div style={{ minWidth: 220 }}><Select value={status} onChange={setStatus} options={opts(JOB_STATUSES)} placeholder="Any status" /></div></div>
      <Panel title={`Jobs · ${shown.length}`}>
        {shown.length === 0 ? <Empty>No jobs match.</Empty> : <ul className="list">{shown.map((j) => (
          <li key={j.id} className="clickable" onClick={() => onOpen(j)}>
            <div className="grow"><b>{j.title}</b> <span className="muted">at {j.company}</span><div className="muted">{[j.location, j.workModel && pretty(j.workModel)].filter(Boolean).join(' · ')}</div></div>
            {fit(j.fitScore)}<span className="pill">{pretty(j.status ?? 'INTERESTED')}</span>
          </li>
        ))}</ul>}
      </Panel>
    </div>
  );
}

function AddJob({ onAdded }: { onAdded: (job: JobListing) => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [needsText, setNeedsText] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const job = await runner.run(() => api.jobs.fromLink(url.trim(), needsText ? text.trim() : undefined));
    if (job) await onAdded(job);
    else setNeedsText(true);
  }

  return (
    <Panel title="Add a job from a link">
      <form className="stack" onSubmit={add}>
        <Field label="Posting URL"><input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
        {needsText && <Field label="The site blocked reading it. Paste the job description instead"><textarea value={text} onChange={(e) => setText(e.target.value)} /></Field>}
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!url.trim() || runner.busy || (needsText && !text.trim())}>{runner.busy ? 'Reading the posting…' : 'Add job'}</button></div>
      </form>
    </Panel>
  );
}

function Analytics() {
  const api = useApi();
  const a = useAsync(() => api.jobs.analytics(), [api]);
  if (a.error && !a.data) return <ErrorNote message={a.error} onRetry={a.reload} />;
  const d = a.data;
  const pct = (n: number | undefined) => (n == null ? '—' : `${n.toFixed(0)}%`);
  return (
    <Panel title="Funnel">
      <div className="stats"><Stat label="Applications" value={d?.totalApplications ?? '—'} /><Stat label="Response rate" value={pct(d?.responseRatePct)} /><Stat label="Interview rate" value={pct(d?.interviewConversionRatePct)} /><Stat label="Offer rate" value={pct(d?.offerRatePct)} /><Stat label="Rejection rate" value={pct(d?.rejectionRatePct)} /></div>
      {d && <Bars rows={[{ label: 'Responded', value: d.responseRatePct }, { label: 'Interviewed', value: d.interviewConversionRatePct }, { label: 'Offers', value: d.offerRatePct }, { label: 'Rejected', value: d.rejectionRatePct }]} format={(n) => `${n.toFixed(0)}%`} />}
    </Panel>
  );
}

function JobModal({ job, onClose, onChanged, onUpdated }: { job: JobListing; onClose: () => void; onChanged: () => Promise<void>; onUpdated: (j: JobListing) => void }) {
  const api = useApi();
  const runner = useRunner();
  const interviews = useAsync(() => api.jobs.interviews(job.id), [api, job.id]);
  const [notes, setNotes] = useState(job.notes ?? '');
  const [appliedAt, setAppliedAt] = useState(job.appliedAt?.slice(0, 10) ?? '');
  const [followUp, setFollowUp] = useState(job.followUpAt?.slice(0, 10) ?? '');

  const setStatus = async (status: JobStatus) => {
    const next = await runner.run(() => api.jobs.setStatus(job.id, status), onChanged);
    if (next) onUpdated(next);
  };
  const saveDetails = async () => {
    const next = await runner.run(() => api.jobs.updateDetails(job.id, { notes: notes.trim() || null, appliedAt: appliedAt || null, followUpAt: followUp || null }), onChanged);
    if (next) onUpdated(next);
  };

  return (
    <Modal title={`${job.title} · ${job.company}`} onClose={onClose} wide>
      <div className="stack">
        <div className="row"><span className="muted">{[job.location, job.workModel && pretty(job.workModel), job.salaryMin && `${job.currency ?? ''} ${job.salaryMin}–${job.salaryMax ?? ''}`].filter(Boolean).join(' · ') || 'No details parsed'}</span>{fit(job.fitScore)}</div>
        <Field label="Status"><Select value={job.status ?? 'INTERESTED'} onChange={(v) => v && void setStatus(v)} options={opts(JOB_STATUSES)} /></Field>
        {job.requiredSkills?.length ? <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>{job.requiredSkills.map((s) => <span key={s} className="pill">{s}</span>)}</div> : null}
        <div className="cols"><Field label="Applied on"><input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} /></Field><Field label="Follow up on"><input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field></div>
        <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Panel title={`Interviews · ${interviews.data?.length ?? 0}`}>{(interviews.data ?? []).length === 0 ? <Empty>None scheduled. Add interviews on the web app.</Empty> : <ul className="list">{(interviews.data ?? []).map((i) => <li key={i.id}><span className="grow">{pretty(String(i.roundType ?? 'Interview'))}</span><small className="muted">{String(i.scheduledAt ?? '').slice(0, 16).replace('T', ' ')}</small></li>)}</ul>}</Panel>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions">
          {job.url && <button className="ghost" onClick={() => void openExternal(job.url!)}>Open posting</button>}
          <button className="ghost" onClick={() => void runner.run(() => api.jobs.rescore(job.id), onChanged)}>Rescore</button>
          <button className="danger" onClick={() => void runner.run(() => api.jobs.remove(job.id), async () => { await onChanged(); onClose(); })}>Delete</button>
          <button className="primary" disabled={runner.busy} onClick={() => void saveDetails()}>Save</button>
        </div>
      </div>
    </Modal>
  );
}
