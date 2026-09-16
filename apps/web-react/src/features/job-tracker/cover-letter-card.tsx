import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { jobApi } from './job-api';
import type { JobListing } from './types';

export function CoverLetterCard({ job }: { job: JobListing }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const updated = await jobApi.generateCoverLetter(job.id);
      queryClient.setQueryData(['jobs', job.id], updated);
      toast.success('Cover letter drafted');
    } catch {
      toast.error('Could not draft cover letter');
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!job.coverLetterText) return;
    await navigator.clipboard.writeText(job.coverLetterText);
    toast.success('Copied');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {job.coverLetterText ? 'Drafted from your resume and this job description.' : 'Draft a cover letter grounded in your actual resume.'}
        </p>
        <div className="flex shrink-0 gap-2">
          {job.coverLetterText && (
            <Button size="sm" variant="outline" onClick={() => void copy()}>
              Copy
            </Button>
          )}
          <Button size="sm" onClick={() => void generate()} disabled={generating}>
            {generating ? 'Drafting…' : job.coverLetterText ? 'Re-draft' : 'Draft cover letter'}
          </Button>
        </div>
      </div>

      {job.coverLetterText && (
        <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 font-sans text-sm leading-relaxed">
          {job.coverLetterText}
        </pre>
      )}
    </div>
  );
}
