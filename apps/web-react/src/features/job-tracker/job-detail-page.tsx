import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { FitBreakdown } from './fit-breakdown';
import { toFitView } from './fit-view';
import { jobApi } from './job-api';
import { JOB_STATUSES, type JobStatus, type ResumeTailoringResult } from './types';

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => jobApi.get(jobId!),
    enabled: !!jobId,
  });

  const [tailorResult, setTailorResult] = useState<ResumeTailoringResult | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rescoreMutation = useMutation({
    mutationFn: () => jobApi.rescore(jobId!),
    onSuccess: (result) => {
      queryClient.setQueryData(['jobs', jobId], (current: typeof job) =>
        current ? { ...current, fitScore: result.score, fitExplanation: result.explanation } : current,
      );
    },
  });

  const tailorMutation = useMutation({
    mutationFn: () => jobApi.tailorResume(jobId!),
    onSuccess: (result) => {
      setTailorResult(result);
      setTailorError(null);
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not tailor a resume for this job. Try again.';
      setTailorError(message);
    },
  });

  async function setStatus(status: JobStatus) {
    if (!jobId) return;
    const updated = await jobApi.setStatus(jobId, status);
    queryClient.setQueryData(['jobs', jobId], updated);
  }

  async function copyLatex() {
    if (!tailorResult) return;
    await navigator.clipboard.writeText(tailorResult.latexResume);
    setCopied(true);
    toast.success('LaTeX copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/jobs" className="text-sm text-muted-foreground hover:underline">
          ← Jobs
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  const fit = toFitView(job.fitScore, job.fitExplanation);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/jobs" className="text-sm text-muted-foreground hover:underline">
        ← Jobs
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{job.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {job.company} · {job.location || 'Location n/a'} · {job.workModel || '—'}
        {job.url && (
          <>
            {' · '}
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              source
            </a>
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="text-sm text-muted-foreground">Status</span>
        <select
          value={job.status ?? 'INTERESTED'}
          onChange={(e) => void setStatus(e.target.value as JobStatus)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => rescoreMutation.mutate()} disabled={rescoreMutation.isPending}>
          {rescoreMutation.isPending ? 'Re-scoring…' : 'Re-score'}
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent>
          <h2 className="text-base font-semibold">
            Fit score: {fit.score ?? '—'}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </h2>
          <FitBreakdown fit={fit} />

          <Button
            className="mt-3"
            variant="outline"
            onClick={() => tailorMutation.mutate()}
            disabled={tailorMutation.isPending}
          >
            {tailorMutation.isPending ? 'Tailoring resume…' : 'Tailor resume for this job'}
          </Button>

          {tailorError && <p className="mt-2 text-sm text-destructive">{tailorError}</p>}

          {tailorResult && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Improve your resume for this role</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {tailorResult.improvementPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">LaTeX resume (paste into Overleaf)</h3>
                <Button variant="outline" size="sm" onClick={() => void copyLatex()}>
                  {copied ? 'Copied ✓' : 'Copy .tex'}
                </Button>
              </div>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-xs text-muted-foreground">
                {tailorResult.latexResume}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="text-base font-semibold">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {job.jobDescriptionText || 'No description on file.'}
        </p>
      </section>
    </div>
  );
}
