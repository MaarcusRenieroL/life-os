import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ApplicationTrackingForm } from './application-tracking-form';
import { CoverLetterCard } from './cover-letter-card';
import { EmailEventReviewList } from './email-event-review-list';
import { FitBreakdown } from './fit-breakdown';
import { FitScoreBadge } from './fit-score-badge';
import { toFitView } from './fit-view';
import { InterviewTrackingSection } from './interview-tracking-section';
import { jobApi } from './job-api';
import { downloadLatex, LatexCodeBlock } from './latex-code-block';
import { ReferralTrackingSection } from './referral-tracking-section';
import { TailoredResumePdf } from './tailored-resume-pdf';
import { TailoringVersionHistory } from './tailoring-version-history';
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

  const [tailorError, setTailorError] = useState<string | null>(null);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

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
    onSuccess: () => {
      setTailorError(null);
      // Tailoring also re-scores fit (skills the tailored wording surfaces get merged into the
      // library) and appends a new version - refetch rather than patch individual fields so all
      // of that comes back in sync.
      void queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['jobs', jobId, 'tailor-resume', 'versions'] });
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

  async function copyText(tab: string, text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedTab(null), 2000);
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

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <SectionHeading>fit score</SectionHeading>
                <Button variant="outline" size="sm" onClick={() => rescoreMutation.mutate()} disabled={rescoreMutation.isPending}>
                  {rescoreMutation.isPending ? 'Re-scoring…' : 'Re-score'}
                </Button>
              </div>
              <FitBreakdown fit={fit} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <SectionHeading>tailor your resume</SectionHeading>
                <div className="flex items-center gap-2">
                  {job.tailoredLatexResume && <TailoringVersionHistory jobId={jobId!} jobTitle={job.title} />}
                  <Button variant="outline" size="sm" onClick={() => tailorMutation.mutate()} disabled={tailorMutation.isPending}>
                    {tailorMutation.isPending ? 'Tailoring…' : job.tailoredLatexResume ? 'Re-tailor' : 'Tailor resume for this job'}
                  </Button>
                </div>
              </div>

              {tailorError && <p className="mt-2 text-sm text-destructive">{tailorError}</p>}

              {job.tailoredLatexResume && (
                <Tabs defaultValue="improvements" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="improvements">Improvements</TabsTrigger>
                    <TabsTrigger value="latex">LaTeX</TabsTrigger>
                    <TabsTrigger value="pdf">PDF</TabsTrigger>
                  </TabsList>

                  <TabsContent value="improvements">
                    <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                      {(job.tailoredImprovementPoints ?? []).map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="latex">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void copyText('latex', job.tailoredLatexResume ?? '', 'LaTeX')}
                      >
                        {copiedTab === 'latex' ? 'Copied ✓' : 'Copy .tex'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadLatex(job.tailoredLatexResume ?? '', `${job.title}-resume.tex`)}
                      >
                        Download .tex
                      </Button>
                    </div>
                    <div className="mt-2">
                      <LatexCodeBlock source={job.tailoredLatexResume} />
                    </div>
                  </TabsContent>

                  <TabsContent value="pdf">
                    <TailoredResumePdf
                      jobId={jobId!}
                      latexResume={job.tailoredLatexResume}
                      fileName={`${job.title}-resume.pdf`}
                    />
                  </TabsContent>
                </Tabs>
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
              <dl className="flex flex-col gap-2.5 text-sm">
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
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
