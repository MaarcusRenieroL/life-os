import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { FormattedText } from '@/components/formatted-text';
import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { ApplicationTrackingForm } from './application-tracking-form';
import { CoverLetterCard } from './cover-letter-card';
import { EmailEventReviewList } from './email-event-review-list';
import { FitBreakdown } from './fit-breakdown';
import { FitScoreBadge } from './fit-score-badge';
import { toFitView } from './fit-view';
import { InterviewTrackingSection } from './interview-tracking-section';
import { jobApi } from './job-api';
import { ReferralTrackingSection } from './referral-tracking-section';
import { JOB_STATUS_LABELS, JOB_STATUSES, type JobListing, type JobStatus } from './types';

function formatSalary(job: JobListing): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const currency = job.currency ? `${job.currency} ` : '';
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${currency}${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`;
  }
  return `${currency}${(job.salaryMin ?? job.salaryMax)!.toLocaleString()}`;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

function fitScoreSourceLabel(source: JobListing['fitScoreSource']): string | null {
  switch (source) {
    case 'OVERRIDE_RESUME':
      return 'the resume uploaded for this job';
    case 'LIBRARY':
      return 'your resume library';
    default:
      return null;
  }
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => jobApi.get(jobId!),
    enabled: !!jobId,
  });

  const { data: pendingEvents = [] } = useQuery({
    queryKey: ['jobs', 'email-events', 'needs-review'],
    queryFn: jobApi.needsReviewEmailEvents,
  });
  const pendingForJob = pendingEvents.filter((e) => e.matchedJobId === jobId);

  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const rescoreMutation = useMutation({
    mutationFn: () => jobApi.rescore(jobId!),
    // The endpoint only returns the score/explanation, not which source produced them (library,
    // tailored resume, or an override) - refetch the full job rather than hand-patching fields,
    // so the "scored against" label never goes stale relative to what the server actually used.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
    },
  });

  const overrideFileInputRef = useRef<HTMLInputElement>(null);

  const uploadOverrideMutation = useMutation({
    mutationFn: (file: File) => jobApi.uploadResumeOverride(jobId!, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(['jobs', jobId], updated);
      toast.success('Resume attached to this job — fit score recomputed against it');
    },
    onError: () => toast.error('Could not read that resume PDF'),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: () => jobApi.deleteResumeOverride(jobId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['jobs', jobId], updated);
      toast.success('Removed the resume attached to this job');
    },
  });

  function pickOverrideFile() {
    overrideFileInputRef.current?.click();
  }

  async function removeOverrideResume() {
    const ok = await confirm({
      title: 'Remove this resume?',
      description: 'The fit score recomputes against your resume library once it\'s gone.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    deleteOverrideMutation.mutate();
  }

  function onOverrideFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      uploadOverrideMutation.mutate(file);
    }
  }

  const suggestionsMutation = useMutation({
    mutationFn: () => jobApi.getAtsSuggestions(jobId!),
    onSuccess: (updated) => {
      setSuggestionsError(null);
      queryClient.setQueryData(['jobs', jobId], updated);
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not get suggestions for this job. Try again.';
      setSuggestionsError(message);
    },
  });

  async function setStatus(status: JobStatus) {
    if (!jobId) return;
    const updated = await jobApi.setStatus(jobId, status);
    queryClient.setQueryData(['jobs', jobId], updated);
  }

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <Link to="/jobs/list" className="text-sm text-muted-foreground hover:underline">
          ← Jobs
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  const fit = toFitView(job.fitScore, job.fitExplanation);
  const salary = formatSalary(job);

  return (
    <div>
      <Link to="/jobs/list" className="text-sm text-muted-foreground hover:underline">
        ← Jobs
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.company} · {job.location || 'Location n/a'} · {job.workModel ? titleCase(job.workModel) : '—'}
            {job.url && (
              <>
                {' · '}
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  source
                </a>
              </>
            )}
          </p>
        </div>
        {fit.score !== null && <FitScoreBadge score={fit.score} />}
      </div>

      {pendingForJob.length > 0 && (
        <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3.5">
          <SectionHeading className="mb-2.5">Detected from Gmail — needs your confirmation</SectionHeading>
          <EmailEventReviewList jobId={jobId} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionHeading>fit score</SectionHeading>
                <Button variant="outline" size="sm" onClick={() => rescoreMutation.mutate()} disabled={rescoreMutation.isPending}>
                  {rescoreMutation.isPending ? 'Re-scoring…' : 'Re-score'}
                </Button>
              </div>
              {fitScoreSourceLabel(job.fitScoreSource) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Scored against {fitScoreSourceLabel(job.fitScoreSource)}
                </p>
              )}
              <FitBreakdown fit={fit} />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3">
                <div className="text-sm text-muted-foreground">
                  {job.overrideResumeFileName ? (
                    <>
                      Using <span className="font-medium text-foreground">{job.overrideResumeFileName}</span> for this
                      job's fit score
                      {job.overrideResumeUploadedAt &&
                        ` · uploaded ${new Date(job.overrideResumeUploadedAt).toLocaleDateString()}`}
                    </>
                  ) : (
                    "Built a resume elsewhere for this job? Upload it to score against it directly."
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={overrideFileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={onOverrideFileChosen}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pickOverrideFile}
                    disabled={uploadOverrideMutation.isPending}
                  >
                    {uploadOverrideMutation.isPending
                      ? 'Uploading…'
                      : job.overrideResumeFileName
                        ? 'Replace resume'
                        : 'Upload resume for this job'}
                  </Button>
                  {job.overrideResumeFileName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeOverrideResume()}
                      disabled={deleteOverrideMutation.isPending}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <SectionHeading>ats suggestions</SectionHeading>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => suggestionsMutation.mutate()}
                  disabled={suggestionsMutation.isPending}
                >
                  {suggestionsMutation.isPending
                    ? 'Analyzing…'
                    : job.atsSuggestions
                      ? 'Refresh suggestions'
                      : 'Get suggestions'}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Wording edits to make by hand in your own resume - nothing here rewrites or generates a resume for you.
              </p>

              {suggestionsError && <p className="mt-2 text-sm text-destructive">{suggestionsError}</p>}

              {job.atsSuggestions && job.atsSuggestions.length > 0 && (
                <div className="mt-4 flex flex-col gap-4">
                  <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                    {job.atsSuggestions.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>

                  {job.atsSuggestionGaps && job.atsSuggestionGaps.length > 0 && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs font-medium text-destructive">Gaps vs. job description</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {job.atsSuggestionGaps.map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading className="mb-2.5">interviews</SectionHeading>
              <InterviewTrackingSection jobId={jobId!} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading className="mb-2.5">referrals</SectionHeading>
              <ReferralTrackingSection jobId={jobId!} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading>description</SectionHeading>
              <div className="mt-2">
                {job.jobDescriptionText ? (
                  <FormattedText text={job.jobDescriptionText} />
                ) : (
                  <p className="text-sm text-muted-foreground">No description on file.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading className="mb-2.5">cover letter</SectionHeading>
              <CoverLetterCard job={job} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardContent>
              <SectionHeading className="mb-2.5">status</SectionHeading>
              <Select value={job.status ?? 'INTERESTED'} onValueChange={(v) => void setStatus(v as JobStatus)}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading className="mb-2.5">application</SectionHeading>
              <ApplicationTrackingForm job={job} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading className="mb-3">details</SectionHeading>
              <dl className="flex flex-col gap-3.5 text-sm">
                <DetailRow label="Company" value={job.company} />
                <DetailRow label="Location" value={job.location} />
                <DetailRow label="Work model" value={job.workModel ? titleCase(job.workModel) : null} />
                <DetailRow label="Seniority" value={job.seniorityLevel ? titleCase(job.seniorityLevel) : null} />
                <DetailRow label="Salary" value={salary} />
                <DetailRow
                  label="Visa sponsorship"
                  value={job.visaSponsorship && job.visaSponsorship !== 'UNKNOWN' ? titleCase(job.visaSponsorship) : null}
                />
                <DetailRow label="Industry" value={job.industry} />
                <DetailRow label="Company size" value={job.companySize ? titleCase(job.companySize) : null} />
                <DetailRow label="Deadline" value={job.deadline} />
                <DetailRow label="Added" value={job.createdAt.slice(0, 10)} />
              </dl>
            </CardContent>
          </Card>

          {(job.requiredSkills?.length || job.niceToHaveSkills?.length) && (
            <Card>
              <CardContent>
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div>
                    <SectionHeading className="mb-2">required skills</SectionHeading>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="outline" className="h-auto max-w-full text-left whitespace-normal">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {job.niceToHaveSkills && job.niceToHaveSkills.length > 0 && (
                  <div className={job.requiredSkills?.length ? 'mt-4' : undefined}>
                    <SectionHeading className="mb-2">nice to have</SectionHeading>
                    <div className="flex flex-wrap gap-1.5">
                      {job.niceToHaveSkills.map((skill) => (
                        <Badge key={skill} variant="outline" className="h-auto max-w-full text-left whitespace-normal text-muted-foreground">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
