import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { SectionHeading } from '@/components/section-heading';

import { jobAnalyticsApi } from './job-api';
import { JOB_STATUS_LABELS, type JobStatus } from './types';

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

function formatWeek(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function JobAnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['jobs', 'analytics'], queryFn: jobAnalyticsApi.get });

  const weekBars = useMemo(() => {
    const weeks = data?.applicationsByWeek ?? [];
    const max = Math.max(1, ...weeks.map((w) => w.count));
    return weeks.map((w) => ({ ...w, heightPct: w.count === 0 ? 4 : Math.max((w.count / max) * 100, 8) }));
  }, [data]);

  const sourceRows = useMemo(() => {
    const sources = data?.bestPerformingSources ?? [];
    const max = Math.max(1, ...sources.map((s) => s.responseRatePct));
    return sources.map((s) => ({ ...s, pct: (s.responseRatePct / max) * 100 }));
  }, [data]);

  const skillRows = useMemo(() => {
    const skills = data?.mostCommonMissingSkills ?? [];
    const max = Math.max(1, ...skills.map((s) => s.count));
    return skills.map((s) => ({ ...s, pct: (s.count / max) * 100 }));
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  if (!data || data.totalApplications === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          No applications yet - stats show up once you've marked jobs as Applied.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total applications" value={String(data.totalApplications)} />
        <StatTile label="Response rate" value={`${data.responseRatePct}%`} />
        <StatTile label="Interview conversion" value={`${data.interviewConversionRatePct}%`} />
        <StatTile label="Offer rate" value={`${data.offerRatePct}%`} />
        <StatTile label="Rejection rate" value={`${data.rejectionRatePct}%`} />
        <StatTile label="Referral response rate" value={`${data.referralResponseRatePct}%`} />
      </div>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Applications per week</SectionHeading>
        {weekBars.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Not enough history yet.</p>
        ) : (
          <div className="mt-3 flex h-32 gap-1.5">
            {weekBars.map((w) => (
              <div key={w.weekStart} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-primary/70" style={{ height: `${w.heightPct}%` }} title={`${w.count} applications`} />
                <span className="text-[9px] text-muted-foreground">{formatWeek(w.weekStart)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Best-performing sources</SectionHeading>
        {sourceRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No source data yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {sourceRows.map((s) => (
              <li key={s.source}>
                <div className="flex justify-between text-xs">
                  <span>{titleCase(s.source)} · {s.applications} application{s.applications === 1 ? '' : 's'}</span>
                  <span>{s.responseRatePct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Most common missing skills</SectionHeading>
        {skillRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No gaps detected across your jobs yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {skillRows.map((s) => (
              <li key={s.skill}>
                <div className="flex justify-between text-xs">
                  <span>{s.skill}</span>
                  <span>{s.count}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-yellow-500" style={{ width: `${s.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Average time in each stage</SectionHeading>
        {data.averageTimeInStage.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Not enough transitions yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {data.averageTimeInStage.map((s) => (
              <li key={s.stage} className="flex justify-between">
                <span>{JOB_STATUS_LABELS[s.stage as JobStatus] ?? titleCase(s.stage)}</span>
                <span className="text-muted-foreground">{s.avgDays}d avg · {s.sampleSize} job{s.sampleSize === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
