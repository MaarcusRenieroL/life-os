import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CalendarClock, Inbox, Plus, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { FitScoreBadge } from './fit-score-badge';
import { aiUsageApi, jobAnalyticsApi, jobApi, referralApi } from './job-api';
import { JOB_STATUS_LABELS, JOB_STATUSES, type JobListing, type JobStatus } from './types';

const ACTIVE_STATUSES: JobStatus[] = ['INTERESTED', 'WAITING_FOR_REFERRAL', 'REFERRED', 'APPLIED', 'INTERVIEWING', 'WAITING_FOR_HR'];
const CLOSED_STATUSES: JobStatus[] = ['OFFER_ACCEPTED', 'OFFER_REJECTED', 'REJECTED', 'WITHDRAWN'];

const STATUS_BAR_CLASS: Record<JobStatus, string> = {
  INTERESTED: 'bg-foreground/25',
  WAITING_FOR_REFERRAL: 'bg-foreground/25',
  REFERRED: 'bg-foreground/25',
  APPLIED: 'bg-blue-500',
  INTERVIEWING: 'bg-primary',
  WAITING_FOR_HR: 'bg-primary',
  OFFER_ACCEPTED: 'bg-primary',
  OFFER_REJECTED: 'bg-destructive',
  REJECTED: 'bg-destructive',
  WITHDRAWN: 'bg-foreground/25',
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function JobDashboardPage() {
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs', 'list'], queryFn: jobApi.list });
  const { data: analytics } = useQuery({ queryKey: ['jobs', 'analytics'], queryFn: jobAnalyticsApi.get });
  const { data: pendingEmails = [] } = useQuery({
    queryKey: ['jobs', 'email-events', 'needs-review'],
    queryFn: jobApi.needsReviewEmailEvents,
  });
  const { data: aiUsage } = useQuery({ queryKey: ['jobs', 'ai-usage', 'summary'], queryFn: aiUsageApi.getSummary });
  const { data: referralFollowUps = [] } = useQuery({
    queryKey: ['jobs', 'referrals', 'upcoming-follow-ups'],
    queryFn: referralApi.upcomingFollowUps,
  });

  const activeJobs = useMemo(() => jobs.filter((j) => j.status && ACTIVE_STATUSES.includes(j.status)), [jobs]);
  const closedJobs = useMemo(() => jobs.filter((j) => j.status && CLOSED_STATUSES.includes(j.status)), [jobs]);

  const statusCounts = useMemo(() => {
    const counts = new Map<JobStatus, number>();
    for (const status of JOB_STATUSES) counts.set(status, 0);
    for (const job of jobs) {
      if (job.status) counts.set(job.status, (counts.get(job.status) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return JOB_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0, pct: ((counts.get(status) ?? 0) / max) * 100 })).filter(
      (row) => row.count > 0,
    );
  }, [jobs]);

  const avgFitScore = useMemo(() => {
    const scored = jobs.filter((j) => j.fitScore !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, j) => sum + (j.fitScore ?? 0), 0) / scored.length);
  }, [jobs]);

  const upcomingDeadlines = useMemo(
    () =>
      jobs
        .filter((j) => j.deadline && j.status && ACTIVE_STATUSES.includes(j.status) && j.status !== 'APPLIED')
        .map((j) => ({ job: j, days: daysUntil(j.deadline!) }))
        .filter((d) => d.days >= 0 && d.days <= 14)
        .sort((a, b) => a.days - b.days),
    [jobs],
  );

  const recentJobs = useMemo(() => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [jobs]);

  const dueFollowUps = useMemo(() => {
    const jobFollowUps = jobs
      .filter((j) => j.followUpAt)
      .map((j) => ({ kind: 'job' as const, id: j.id, label: `Follow up on ${j.title}`, days: daysUntil(j.followUpAt!), link: `/jobs/${j.id}` }));
    const contactFollowUps = referralFollowUps
      .filter((r) => r.followUpAt)
      .map((r) => ({ kind: 'referral' as const, id: r.id, label: `Follow up with ${r.contactName}`, days: daysUntil(r.followUpAt!), link: `/jobs/${r.jobId}` }));
    return [...jobFollowUps, ...contactFollowUps].filter((f) => f.days <= 7).sort((a, b) => a.days - b.days);
  }, [jobs, referralFollowUps]);

  const attentionCount = pendingEmails.length + upcomingDeadlines.length + dueFollowUps.length;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your pipeline…</p>;
  }

  if (jobs.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          No jobs tracked yet. <Link to="/jobs/discovery" className="text-primary hover:underline">Add your first job</Link> to see your pipeline here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          {attentionCount > 0 && (
            <p className="text-xs text-primary">{attentionCount} item{attentionCount === 1 ? '' : 's'} need your attention</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/jobs/list">View all jobs</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/jobs/discovery"><Plus className="size-3.5" />Add a job</Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile label="Active pipeline" value={String(activeJobs.length)} />
        <StatTile label="Total tracked" value={String(jobs.length)} />
        <StatTile label="Avg fit score" value={avgFitScore !== null ? String(avgFitScore) : '—'} />
        <StatTile label="Response rate" value={analytics ? `${analytics.responseRatePct}%` : '—'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionHeading>Pipeline by stage</SectionHeading>
            <Link to="/jobs/list" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              See all <ArrowRight className="size-3" />
            </Link>
          </div>
          {statusCounts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {statusCounts.map((row) => (
                <li key={row.status}>
                  <div className="flex justify-between text-xs">
                    <span>{JOB_STATUS_LABELS[row.status]}</span>
                    <span className="text-muted-foreground">{row.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className={`h-1.5 rounded-full ${STATUS_BAR_CLASS[row.status]}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5">
          <SectionHeading>Needs your attention</SectionHeading>
          <ul className="mt-3 flex flex-col gap-2.5">
            {pendingEmails.length > 0 && (
              <li>
                <Link to="/jobs" className="flex items-start gap-2 text-sm hover:text-primary">
                  <Inbox className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>{pendingEmails.length} email{pendingEmails.length === 1 ? '' : 's'} detected — confirm or dismiss</span>
                </Link>
              </li>
            )}
            {upcomingDeadlines.map(({ job, days }) => (
              <li key={job.id}>
                <Link to={`/jobs/${job.id}`} className="flex items-start gap-2 text-sm hover:text-primary">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-yellow-500" />
                  <span>
                    {job.title} application closes {days === 0 ? 'today' : `in ${days}d`}
                  </span>
                </Link>
              </li>
            ))}
            {dueFollowUps.map((f) => (
              <li key={`${f.kind}-${f.id}`}>
                <Link to={f.link} className="flex items-start gap-2 text-sm hover:text-primary">
                  <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                  <span>
                    {f.label} {f.days < 0 ? `— ${-f.days}d overdue` : f.days === 0 ? '— today' : `in ${f.days}d`}
                  </span>
                </Link>
              </li>
            ))}
            {attentionCount === 0 && (
              <li className="text-sm text-muted-foreground">
                <span className="text-primary">✓</span> nothing needs attention right now
              </li>
            )}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <SectionHeading>Recently added</SectionHeading>
            <Link to="/jobs/list" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              See all <ArrowRight className="size-3" />
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {recentJobs.map((job: JobListing) => (
              <li key={job.id}>
                <Link
                  to={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                      {job.status ? JOB_STATUS_LABELS[job.status] : '—'}
                    </Badge>
                    {job.fitScore !== null && <FitScoreBadge score={job.fitScore} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <SectionHeading>This month</SectionHeading>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="size-3.5" />Applications</span>
              <span className="font-medium">{analytics?.totalApplications ?? '—'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Interview conversion</span>
              <span className="font-medium">{analytics ? `${analytics.interviewConversionRatePct}%` : '—'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Offer rate</span>
              <span className="font-medium">{analytics ? `${analytics.offerRatePct}%` : '—'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Closed out</span>
              <span className="font-medium">{closedJobs.length}</span>
            </li>
            <li className="flex items-center justify-between border-t pt-2.5">
              <span className="text-muted-foreground">Claude usage</span>
              <span className="font-medium">{aiUsage ? `$${aiUsage.costThisMonthUsd.toFixed(2)}` : '—'}</span>
            </li>
          </ul>
          <Link to="/jobs/analytics" className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
            Full analytics <ArrowRight className="size-3" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
