import { JOB_STATUSES, type JobListing, type JobStatus } from '@life-os/core';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Text } from '@/text';

import { Bars, Btn, Chips, DateInput, Empty, Field, Input, opts, Pill, pretty, Row, Screen, Seg, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

type TabId = 'dashboard' | 'list' | 'add' | 'analytics';
const TABS = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'list', label: 'Jobs' }, { id: 'add', label: 'Add a job' }, { id: 'analytics', label: 'Analytics' }] as const;
const fit = (n: number | null) => (n == null ? null : <Pill label={`${n}% fit`} color={n >= 75 ? C.accent : n >= 55 ? C.gold : C.muted} />);
const CLOSED: JobStatus[] = ['REJECTED', 'WITHDRAWN', 'OFFER_REJECTED', 'OFFER_ACCEPTED', 'NO_LONGER_ACCEPTING', 'NOT_INTERESTED'];

export default function Jobs() {
  const api = useApi();
  const [tab, setTab] = useState<TabId>('dashboard');
  const jobs = useAsync(() => api.jobs.list(), api);
  const [open, setOpen] = useState<JobListing | null>(null);
  const list = jobs.data ?? [];
  return (
    <Screen title="Job tracker" onRefresh={() => void jobs.reload()} refreshing={jobs.loading}>
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {jobs.error && !jobs.data ? <ErrorNote message={jobs.error} onRetry={jobs.reload} /> : null}
      {tab === 'dashboard' ? <Dashboard jobs={list} onOpen={setOpen} /> : null}
      {tab === 'list' ? <List jobs={list} onOpen={setOpen} /> : null}
      {tab === 'add' ? <Add onAdded={async (j) => { await jobs.reload(); setTab('list'); setOpen(j); }} /> : null}
      {tab === 'analytics' ? <Analytics /> : null}
      {open ? <JobSheet job={open} onClose={() => setOpen(null)} onChanged={jobs.reload} onUpdated={setOpen} /> : null}
    </Screen>
  );
}

function Dashboard({ jobs, onOpen }: { jobs: JobListing[]; onOpen: (j: JobListing) => void }) {
  const active = jobs.filter((j) => j.status && !CLOSED.includes(j.status));
  const followUps = active.filter((j) => j.followUpAt).sort((a, b) => a.followUpAt!.localeCompare(b.followUpAt!)).slice(0, 5);
  const best = [...active].filter((j) => j.fitScore != null).sort((a, b) => b.fitScore! - a.fitScore!).slice(0, 5);
  return (
    <>
      <Panel title="Pipeline">
        {jobs.length === 0 ? <Empty>No applications yet. Paste a posting link under “Add a job”.</Empty> : <StatGrid>{JOB_STATUSES.filter((st) => jobs.some((j) => j.status === st)).map((st) => <Stat key={st} label={pretty(st)} value={jobs.filter((j) => j.status === st).length} />)}</StatGrid>}
      </Panel>
      <Panel title="Follow up">{followUps.length === 0 ? <Empty>Nothing to follow up on.</Empty> : followUps.map((j) => <Row key={j.id} onPress={() => onOpen(j)}><Text style={s.body}>{j.title} · {j.company}</Text><Muted>{j.followUpAt!.slice(0, 10)}</Muted></Row>)}</Panel>
      <Panel title="Best matches">{best.length === 0 ? <Empty>No scored jobs yet.</Empty> : best.map((j) => <Row key={j.id} onPress={() => onOpen(j)}><Text style={s.body}>{j.title} · {j.company}</Text>{fit(j.fitScore)}</Row>)}</Panel>
    </>
  );
}

function List({ jobs, onOpen }: { jobs: JobListing[]; onOpen: (j: JobListing) => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const shown = jobs.filter((j) => (!status || j.status === status) && `${j.title} ${j.company} ${j.location ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Input value={q} onChangeText={setQ} placeholder="Search title, company, location…" style={{ marginBottom: 10 }} />
      <View style={{ marginBottom: 12 }}><Chips value={status} onChange={setStatus} options={opts(JOB_STATUSES)} clearable /></View>
      <Panel title={`Jobs · ${shown.length}`}>
        {shown.length === 0 ? <Empty>No jobs match.</Empty> : shown.map((j) => (
          <Row key={j.id} onPress={() => onOpen(j)}>
            <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{j.title}</Text><Muted>{j.company}{j.location ? ` · ${j.location}` : ''}</Muted><Muted style={{ fontSize: 11 }}>{pretty(j.status ?? 'INTERESTED')}</Muted></View>
            {fit(j.fitScore)}
          </Row>
        ))}
      </Panel>
    </>
  );
}

function Add({ onAdded }: { onAdded: (j: JobListing) => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [needsText, setNeedsText] = useState(false);
  async function add() {
    const job = await runner.run(() => api.jobs.fromLink(url.trim(), needsText ? text.trim() : undefined));
    if (job) await onAdded(job);
    else setNeedsText(true);
  }
  return (
    <Panel title="Add a job from a link">
      <Field label="Posting URL"><Input value={url} onChangeText={setUrl} placeholder="https://…" autoCapitalize="none" keyboardType="url" /></Field>
      {needsText ? <Field label="The site blocked reading it. Paste the job description instead"><Input value={text} onChangeText={setText} multiline /></Field> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label={runner.busy ? 'Reading the posting…' : 'Add job'} disabled={!url.trim() || runner.busy || (needsText && !text.trim())} onPress={() => void add()} />
    </Panel>
  );
}

function Analytics() {
  const api = useApi();
  const a = useAsync(() => api.jobs.analytics(), api);
  if (a.error && !a.data) return <ErrorNote message={a.error} onRetry={a.reload} />;
  const d = a.data;
  const pct = (n: number | undefined) => (n == null ? '—' : `${n.toFixed(0)}%`);
  return (
    <Panel title="Funnel">
      <StatGrid><Stat label="Applications" value={d?.totalApplications ?? '—'} /><Stat label="Response rate" value={pct(d?.responseRatePct)} /><Stat label="Interview rate" value={pct(d?.interviewConversionRatePct)} /><Stat label="Offer rate" value={pct(d?.offerRatePct)} /></StatGrid>
      {d ? <Bars rows={[{ label: 'Responded', value: d.responseRatePct }, { label: 'Interviewed', value: d.interviewConversionRatePct }, { label: 'Offers', value: d.offerRatePct }, { label: 'Rejected', value: d.rejectionRatePct }]} format={(n) => `${n.toFixed(0)}%`} /> : null}
    </Panel>
  );
}

function JobSheet({ job, onClose, onChanged, onUpdated }: { job: JobListing; onClose: () => void; onChanged: () => Promise<void>; onUpdated: (j: JobListing) => void }) {
  const api = useApi();
  const runner = useRunner();
  const interviews = useAsync(() => api.jobs.interviews(job.id), job.id);
  const [notes, setNotes] = useState(job.notes ?? '');
  const [appliedAt, setAppliedAt] = useState(job.appliedAt?.slice(0, 10) ?? '');
  const [followUp, setFollowUp] = useState(job.followUpAt?.slice(0, 10) ?? '');
  const setStatus = async (status: JobStatus) => { const next = await runner.run(() => api.jobs.setStatus(job.id, status), onChanged); if (next) onUpdated(next); };
  const save = async () => { const next = await runner.run(() => api.jobs.updateDetails(job.id, { notes: notes.trim() || null, appliedAt: appliedAt || null, followUpAt: followUp || null }), onChanged); if (next) onUpdated(next); };
  return (
    <Sheet title={`${job.title} · ${job.company}`} onClose={onClose}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}><Muted>{[job.location, job.workModel && pretty(job.workModel)].filter(Boolean).join(' · ') || 'No details parsed'}</Muted>{fit(job.fitScore)}</View>
      <Field label="Status"><Chips value={job.status ?? 'INTERESTED'} onChange={(v) => v && void setStatus(v)} options={opts(JOB_STATUSES)} /></Field>
      {job.requiredSkills?.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>{job.requiredSkills.map((sk) => <Pill key={sk} label={sk} />)}</View> : null}
      <Field label="Applied on"><DateInput value={appliedAt} onChange={setAppliedAt} /></Field>
      <Field label="Follow up on"><DateInput value={followUp} onChange={setFollowUp} /></Field>
      <Field label="Notes"><Input value={notes} onChangeText={setNotes} multiline /></Field>
      <Panel title={`Interviews · ${interviews.data?.length ?? 0}`}>{(interviews.data ?? []).length === 0 ? <Empty>None scheduled. Add interviews on the web app.</Empty> : (interviews.data ?? []).map((i) => <Row key={i.id}><Text style={s.body}>{pretty(String(i.roundType ?? 'Interview'))}</Text><Muted>{String(i.scheduledAt ?? '').slice(0, 16).replace('T', ' ')}</Muted></Row>)}</Panel>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <View style={{ gap: 10 }}>
        <Btn label="Save" disabled={runner.busy} onPress={() => void save()} />
        {job.url ? <Btn kind="ghost" label="Open posting" onPress={() => void Linking.openURL(job.url!)} /> : null}
        <Btn kind="ghost" label="Rescore" onPress={() => void runner.run(() => api.jobs.rescore(job.id), onChanged)} />
        <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.jobs.remove(job.id), async () => { await onChanged(); onClose(); })} />
      </View>
    </Sheet>
  );
}
