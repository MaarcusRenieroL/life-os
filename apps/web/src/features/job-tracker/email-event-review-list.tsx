import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { jobApi } from './job-api';
import { EMAIL_EVENT_TYPE_LABELS, JOB_STATUS_LABELS, JOB_STATUSES, type EmailEvent, type JobStatus } from './types';

const CONFIDENCE_TONE: Record<EmailEvent['confidence'], string> = {
  HIGH: 'border-primary/40 bg-primary/15 text-primary',
  MEDIUM: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500',
  LOW: 'border-destructive/40 bg-destructive/10 text-destructive',
};

interface Override {
  jobId?: string;
  status?: JobStatus;
}

/** Renders the queue of email-detected signals that need a human decision before being applied -
 * an ambiguous/low-confidence match, or an offer (accept/reject is never inferred from an email).
 * Reused as a Job Tracker-wide panel, filtered to one job on its detail page, and (via the count
 * alone) as a Home "needs attention" entry. */
export function EmailEventReviewList({ jobId }: { jobId?: string }) {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['jobs', 'email-events', 'needs-review'],
    queryFn: jobApi.needsReviewEmailEvents,
  });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: jobApi.list });
  const [overrides, setOverrides] = useState<Record<string, Override>>({});

  const filtered = jobId ? events.filter((e) => e.matchedJobId === jobId) : events;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['jobs', 'email-events', 'needs-review'] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  }

  function setOverride(eventId: string, patch: Override) {
    setOverrides((current) => ({ ...current, [eventId]: { ...current[eventId], ...patch } }));
  }

  async function approve(event: EmailEvent) {
    const override = overrides[event.id];
    const targetJobId = override?.jobId ?? event.matchedJobId ?? undefined;
    const targetStatus = override?.status ?? event.suggestedStatus ?? undefined;
    if (!targetJobId) {
      toast.error('Select which job this email is about');
      return;
    }
    if (!targetStatus) {
      toast.error('Choose a status to apply');
      return;
    }
    await jobApi.reviewEmailEvent(event.id, { action: 'APPROVE', jobId: targetJobId, status: targetStatus });
    invalidate();
    toast.success('Status updated');
  }

  async function dismiss(event: EmailEvent) {
    await jobApi.reviewEmailEvent(event.id, { action: 'DISMISS' });
    invalidate();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (filtered.length === 0) {
    return <EmptyState message="Nothing needs review right now." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((event) => (
        <div key={event.id} className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{EMAIL_EVENT_TYPE_LABELS[event.detectedType]}</span>
            <Badge variant="outline" className={CONFIDENCE_TONE[event.confidence]}>{event.confidence}</Badge>
          </div>
          {event.subject && <p className="mt-1 truncate text-xs text-muted-foreground">{event.subject}</p>}
          {event.snippet && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">{event.snippet}</p>}

          <div className="mt-2.5 flex flex-col gap-2">
            {event.matchedJobTitle ? (
              <span className="text-xs">
                Job: <span className="font-medium">{event.matchedJobTitle}</span> · {event.matchedJobCompany}
              </span>
            ) : (
              <Select
                value={overrides[event.id]?.jobId ?? ''}
                onValueChange={(v) => setOverride(event.id, { jobId: v })}
              >
                <SelectTrigger size="sm" className="text-xs"><SelectValue placeholder="Which job is this about?" /></SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>{job.title} · {job.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {event.suggestedStatus ? (
              <span className="text-xs">
                Suggested status: <span className="font-medium">{JOB_STATUS_LABELS[event.suggestedStatus]}</span>
              </span>
            ) : (
              <Select
                value={overrides[event.id]?.status ?? ''}
                onValueChange={(v) => setOverride(event.id, { status: v as JobStatus })}
              >
                <SelectTrigger size="sm" className="text-xs"><SelectValue placeholder="Choose a status" /></SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="mt-2.5 flex gap-2">
            <Button size="sm" onClick={() => void approve(event)}>Approve</Button>
            <Button size="sm" variant="ghost" onClick={() => void dismiss(event)}>Dismiss</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
