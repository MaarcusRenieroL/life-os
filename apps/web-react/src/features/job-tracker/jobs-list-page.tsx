import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { FitScoreBadge } from './fit-score-badge';
import { jobApi } from './job-api';
import { JOB_STATUSES, type JobListing, type JobStatus } from './types';

export function JobsListPage() {
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: jobApi.list });

  async function setStatus(job: JobListing, status: JobStatus) {
    const updated = await jobApi.setStatus(job.id, status);
    queryClient.setQueryData<JobListing[]>(['jobs'], (list) =>
      list?.map((j) => (j.id === updated.id ? updated : j)),
    );
  }

  async function remove(job: JobListing) {
    await jobApi.delete(job.id);
    queryClient.setQueryData<JobListing[]>(['jobs'], (list) =>
      list?.filter((j) => j.id !== job.id),
    );
    toast.success(`Removed ${job.title}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Jobs <span className="text-muted-foreground">({jobs?.length ?? 0})</span>
        </h1>
        <Button render={<Link to="/jobs/discovery" />}>
          <Plus /> Add a job
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !jobs?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No jobs yet. Paste a link on{' '}
          <Link to="/jobs/discovery" className="text-primary underline">
            Add a Job
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-lg border bg-card px-3 py-3 text-sm transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/jobs/${job.id}`} className="font-semibold hover:text-primary">
                    {job.title}
                  </Link>
                  <p className="text-muted-foreground">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                    {job.workModel ? ` · ${job.workModel}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.fitScore !== null && <FitScoreBadge score={job.fitScore} />}
                  <Select value={job.status ?? 'INTERESTED'} onValueChange={(v) => void setStatus(job, v as JobStatus)}>
                    <SelectTrigger size="sm" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void remove(job)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
