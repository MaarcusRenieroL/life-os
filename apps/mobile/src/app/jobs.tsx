import { JOB_STATUSES, type JobListing, type JobStatus } from '@life-os/core';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Bars, Btn, Chips, DateInput, Empty, Field, Input, opts, Pill, pretty, Row, Screen, Seg, Sheet, Stat, StatGrid } from '@/kit';
import { DiscoveryTab, OpeningsTab, ResumeTab } from '@/modules/jobs-extra';
import { tabFrom, useOpenRequest } from '@/lib/open-from';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

type TabId = 'dashboard' | 'list' | 'openings' | 'discovery' | 'resumes' | 'add' | 'analytics';
const TABS = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'list', label: 'Jobs' }, { id: 'openings', label: 'Openings' }, { id: 'discovery', label: 'Watchlist' }, { id: 'resumes', label: 'Resume & profile' }, { id: 'add', label: 'Add a job' }, { id: 'analytics', label: 'Analytics' }] as const;
const fit = (n: number | null) => (n == null ? null : <Pill label={`${n}% fit`} color={n >= 75 ? C.accent : n >= 55 ? C.gold : C.muted} />);
const CLOSED: JobStatus[] = ['REJECTED', 'WITHDRAWN', 'OFFER_REJECTED', 'OFFER_ACCEPTED', 'NO_LONGER_ACCEPTING', 'NOT_INTERESTED'];

export default function Jobs() {
  const api = useApi();
  const [tab, setTab] = useState<TabId>('dashboard');
  const jobs = useAsync(() => api.jobs.list(), api);
  const [open, setOpen] = useState<JobListing | null>(null);
  useOpenRequest((r) => {
    if (r.kind === 'job' && r.id) void api.jobs.list().then((all) => setOpen(all.find((j) => j.id === r.id) ?? null)).catch(() => {});
    else { const t = tabFrom(r, TABS); if (t) setTab(t); }
  });
  const list = jobs.data ?? [];
  return (
    <Screen title="Job tracker" onRefresh={() => void jobs.reload()} refreshing={jobs.loading}>
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {jobs.error && !jobs.data ? <ErrorNote message={jobs.error} onRetry={jobs.reload} /> : null}
      {tab === 'dashboard' ? <Dashboard jobs={list} onOpen={setOpen} /> : null}
      {tab === 'list' ? <List jobs={list} onOpen={setOpen} /> : null}
      {tab === 'openings' ? <OpeningsTab onPromoted={() => void jobs.reload()} /> : null}
      {tab === 'discovery' ? <DiscoveryTab /> : null}
      {tab === 'resumes' ? <ResumeTab /> : null}
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
  const columns: Col<JobListing>[] = [
    { id: 'title', title: 'Role', value: (j) => j.title, filter: { type: 'text' }, cell: (j) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flexShrink: 1 }}>{j.title}</Text> },
    { id: 'company', title: 'Company', value: (j) => j.company, filter: { type: 'select' } },
    { id: 'status', title: 'Status', value: (j) => pretty(j.status ?? 'INTERESTED'), filter: { type: 'select' } },
    { id: 'fit', title: 'Fit', value: (j) => j.fitScore, align: 'right', filter: { type: 'number' }, cell: (j) => fit(j.fitScore) ?? <Muted>—</Muted>, format: (v) => (v == null ? '—' : `${v}%`) },
    { id: 'location', title: 'Location', value: (j) => j.location ?? '', filter: { type: 'select' } },
    { id: 'model', title: 'Work model', value: (j) => (j.workModel ? pretty(j.workModel) : ''), filter: { type: 'select' }, hidden: true },
    { id: 'salary', title: 'Salary', value: (j) => j.salaryMax ?? j.salaryMin, align: 'right', filter: { type: 'number' }, cell: (j) => <Text style={{ color: C.text, fontSize: 13 }}>{j.salaryMin || j.salaryMax ? `${j.currency ?? ''} ${[j.salaryMin, j.salaryMax].filter(Boolean).join('–')}`.trim() : '—'}</Text>, hidden: true },
    { id: 'skills', title: 'Skills', value: (j) => j.requiredSkills ?? [], filter: { type: 'select' }, hidden: true },
    { id: 'applied', title: 'Applied', value: (j) => (j.appliedAt ?? '').slice(0, 10), filter: { type: 'date' }, hidden: true },
    { id: 'followUp', title: 'Follow up', value: (j) => (j.followUpAt ?? '').slice(0, 10), filter: { type: 'date' }, hidden: true },
    { id: 'deadline', title: 'Deadline', value: (j) => (j.deadline ?? '').slice(0, 10), filter: { type: 'date' }, hidden: true },
    { id: 'added', title: 'Added', value: (j) => j.createdAt.slice(0, 10), filter: { type: 'date' }, hidden: true },
  ];
  return (
    <DataGrid
      tableId="jobs.list"
      data={jobs}
      columns={columns}
      getRowId={(j) => j.id}
      initialSorting={[{ id: 'added', desc: true }]}
      emptyMessage="No jobs match."
      searchPlaceholder="Search title, company, location…"
      exportName="jobs"
      onRowClick={onOpen}
      drawer={false}
      views={[
        { id: 'applied', name: 'Applied', filters: { status: ['Applied'] } },
        { id: 'interview', name: 'Interviewing', filters: { status: ['Interviewing', 'Waiting for hr'] } },
        { id: 'followup', name: 'Needs follow-up', filters: { followUp: ['1970-01-01', new Date().toISOString().slice(0, 10)] } },
      ]}
    />
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
