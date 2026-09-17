import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { FitBreakdown } from './fit-breakdown';
import { FitScoreBadge } from './fit-score-badge';
import { toFitView } from './fit-view';
import { jobApi } from './job-api';
import type { JobListing } from './types';

export function AddJobPage() {
  const navigate = useNavigate();

  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsText, setNeedsText] = useState(false);
  const [job, setJob] = useState<JobListing | null>(null);

  async function analyze() {
    if (!url.trim() && !pastedText.trim()) {
      setError('Paste a job link first.');
      return;
    }
    setBusy(true);
    setError('');
    setJob(null);

    try {
      const created = await jobApi.fromLink(url.trim(), pastedText.trim() || undefined);
      setNeedsText(false);
      setPastedText('');
      setJob(created);
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })
        .response;
      if (response?.status === 422) {
        setNeedsText(true);
        setError(response.data?.message ?? "That site blocked the read — paste the description below.");
      } else {
        setError(response?.data?.message ?? 'Could not add that job.');
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setUrl('');
    setPastedText('');
    setJob(null);
    setError('');
    setNeedsText(false);
  }

  const fit = job ? toFitView(job.fitScore, job.fitExplanation) : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Add a Job</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste a job link (LinkedIn, Naukri, Indeed, a company careers page). It's parsed and scored
        against your saved resume, then added to your Jobs list.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void analyze()}
          placeholder="https://www.linkedin.com/jobs/view/…"
        />

        {needsText && (
          <>
            <p className="text-sm text-muted-foreground">
              That site blocks automated reads. Open the posting, copy its description, and paste it
              here:
            </p>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={8}
              placeholder="Paste the full job description…"
            />
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void analyze()} disabled={busy}>
            {busy ? 'Analyzing…' : needsText ? 'Analyze pasted text' : 'Analyze job'}
          </Button>
          {(job || needsText) && (
            <Button variant="outline" onClick={reset}>
              Clear
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {job && fit && (
        <Card className="mt-6">
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{job.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ''}
                  {job.workModel ? ` · ${job.workModel}` : ''}
                </p>
              </div>
              {fit.score !== null && <FitScoreBadge score={fit.score} />}
            </div>

            <FitBreakdown fit={fit} />

            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate(`/jobs/${job.id}`)}>
                Open job
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
