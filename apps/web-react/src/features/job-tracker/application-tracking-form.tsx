import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { jobApi } from './job-api';
import type { JobListing } from './types';

/** Notes, applied date, rejection reason, and offer details - one form, one save, since these are
 * all just "things the candidate jots down about this application" rather than separate concerns
 * each needing their own save button. */
export function ApplicationTrackingForm({ job }: { job: JobListing }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(job.notes ?? '');
  const [appliedAt, setAppliedAt] = useState(job.appliedAt ?? '');
  const [rejectionReason, setRejectionReason] = useState(job.rejectionReason ?? '');
  const [offerAmount, setOfferAmount] = useState(job.offerAmount?.toString() ?? '');
  const [offerDeadline, setOfferDeadline] = useState(job.offerDeadline ?? '');
  const [offerNotes, setOfferNotes] = useState(job.offerNotes ?? '');
  const [saving, setSaving] = useState(false);

  const showOffer = job.status === 'OFFER_ACCEPTED' || job.status === 'OFFER_REJECTED';
  const showRejection = job.status === 'REJECTED' || job.status === 'OFFER_REJECTED';

  async function save() {
    setSaving(true);
    try {
      const updated = await jobApi.updateDetails(job.id, {
        notes: notes || null,
        appliedAt: appliedAt || null,
        rejectionReason: rejectionReason || null,
        offerAmount: offerAmount ? Number(offerAmount) : null,
        offerDeadline: offerDeadline || null,
        offerNotes: offerNotes || null,
      });
      queryClient.setQueryData(['jobs', job.id], updated);
      toast.success('Saved');
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="appliedAt" className="mb-1.5 block text-[11px] text-muted-foreground">
          APPLIED ON
        </Label>
        <Input id="appliedAt" type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="notes" className="mb-1.5 block text-[11px] text-muted-foreground">
          NOTES
        </Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contacts, interview impressions, anything worth remembering…" />
      </div>

      {showRejection && (
        <div>
          <Label htmlFor="rejectionReason" className="mb-1.5 block text-[11px] text-muted-foreground">
            REJECTION REASON
          </Label>
          <Textarea
            id="rejectionReason"
            rows={2}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Auto-filled from the rejection email when detected, or write your own"
          />
        </div>
      )}

      {showOffer && (
        <>
          <SectionHeading className="mt-1">offer details</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="offerAmount" className="mb-1.5 block text-[11px] text-muted-foreground">
                AMOUNT
              </Label>
              <Input id="offerAmount" type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="offerDeadline" className="mb-1.5 block text-[11px] text-muted-foreground">
                RESPOND BY
              </Label>
              <Input id="offerDeadline" type="date" value={offerDeadline} onChange={(e) => setOfferDeadline(e.target.value)} />
            </div>
          </div>
          <Textarea rows={2} value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} placeholder="Benefits, negotiation notes…" />
        </>
      )}

      <Button size="sm" onClick={() => void save()} disabled={saving} className="self-start">
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}
