import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { jobApi } from './job-api';
import type { JobListing } from './types';

/**
 * Jobs created from a confirmation email only know the company and title. Pasting the posting's link
 * here has the server read it, fill in the details and score it against the candidate's profile.
 * LinkedIn often blocks server reads; the server then answers 422 and the description can be pasted
 * instead.
 */
export function AttachLinkDialog({
  job,
  open,
  onOpenChange,
  onAttached,
}: {
  job: Pick<JobListing, 'id' | 'title' | 'company'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached: (updated: JobListing) => void;
}) {
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [needsText, setNeedsText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function close(next: boolean) {
    if (busy) return;
    if (!next) {
      setUrl('');
      setPastedText('');
      setNeedsText(false);
      setError('');
    }
    onOpenChange(next);
  }

  async function submit() {
    if (!job) return;
    const link = url.trim();
    const text = pastedText.trim();
    if (!link && !text) {
      setError(needsText ? 'Paste the job description first.' : 'Paste the LinkedIn link first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await jobApi.attachLink(job.id, link || undefined, text || undefined);
      onAttached(updated);
      close(true);
      onOpenChange(false);
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      if (response?.status === 422) {
        setNeedsText(true);
        setError(response.data?.message ?? 'That site blocked the read - paste the job description below.');
      } else {
        setError(response?.data?.message ?? 'Could not read that posting.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add the LinkedIn link</DialogTitle>
          <DialogDescription>
            {job ? `${job.title} at ${job.company}` : ''} - paste the posting's link and the details, skills and fit score are filled in for you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="attachLinkUrl">LinkedIn link</Label>
            <Input
              id="attachLinkUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/…"
              autoFocus
              disabled={busy}
              onKeyDown={(e) => e.key === 'Enter' && !needsText && void submit()}
            />
          </div>

          {needsText && (
            <div>
              <Label htmlFor="attachLinkText">Job description</Label>
              <Textarea
                id="attachLinkText"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Open the posting on LinkedIn, select the whole description and paste it here."
                rows={8}
                disabled={busy}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {busy && <p className="text-sm text-muted-foreground">Reading the posting and scoring it against your profile…</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? 'Working…' : needsText ? 'Use this description' : 'Fill in the details'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
