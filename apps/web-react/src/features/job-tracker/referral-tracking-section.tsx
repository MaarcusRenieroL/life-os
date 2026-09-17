import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { referralApi } from './job-api';
import { ReferralDialog } from './referral-dialog';
import { REFERRAL_STATUS_LABELS, type Referral } from './types';

const STATUS_BADGE_CLASS: Record<string, string> = {
  REFERRED: 'border-green-500/40 text-green-600 dark:text-green-400',
  DECLINED: 'border-red-500/40 text-red-600 dark:text-red-400',
  RESPONDED: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
  NOT_CONTACTED: 'text-muted-foreground',
};

export function ReferralTrackingSection({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['jobs', jobId, 'referrals'];
  const { data: referrals = [] } = useQuery({ queryKey, queryFn: () => referralApi.list(jobId) });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Referral | null>(null);
  const [draftingFor, setDraftingFor] = useState<string | null>(null);

  function refetch() {
    void queryClient.invalidateQueries({ queryKey });
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(referral: Referral) {
    setEditing(referral);
    setDialogOpen(true);
  }

  async function draftMessage(referral: Referral) {
    setDraftingFor(referral.id);
    try {
      await referralApi.generateDraftMessage(jobId, referral.id);
      refetch();
      toast.success('Referral message drafted');
    } catch {
      toast.error('Could not draft a referral message');
    } finally {
      setDraftingFor(null);
    }
  }

  async function copyMessage(referral: Referral) {
    if (!referral.draftMessage) return;
    await navigator.clipboard.writeText(referral.draftMessage);
    toast.success('Copied');
  }

  async function remove(referral: Referral) {
    if (!confirm(`Delete referral contact "${referral.contactName}"?`)) return;
    await referralApi.delete(jobId, referral.id);
    refetch();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {referrals.length === 0 ? 'No referral contacts yet.' : `${referrals.length} contact${referrals.length === 1 ? '' : 's'}`}
        </p>
        <Button size="sm" variant="outline" onClick={openAdd}>
          Add contact
        </Button>
      </div>

      {referrals.length > 0 && (
        <div className="flex flex-col gap-3">
          {referrals.map((referral) => (
            <div key={referral.id} className="rounded-md border p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{referral.contactName}</span>
                    {referral.status && (
                      <Badge variant="outline" className={STATUS_BADGE_CLASS[referral.status] ?? ''}>
                        {REFERRAL_STATUS_LABELS[referral.status]}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {referral.contactTitle ?? 'Role unknown'}
                    {referral.relationship ? ` · ${referral.relationship}` : ''}
                    {referral.contactLinkedinUrl && (
                      <>
                        {' · '}
                        <a href={referral.contactLinkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          LinkedIn
                        </a>
                      </>
                    )}
                    {referral.followUpAt && ` · follow up ${new Date(referral.followUpAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(referral)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(referral)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                {referral.draftMessage ? (
                  <>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Draft message</p>
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-sans text-sm leading-relaxed text-muted-foreground">
                      {referral.draftMessage}
                    </pre>
                    <div className="mt-1.5 flex gap-3">
                      <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => void copyMessage(referral)}>
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => void draftMessage(referral)}
                        disabled={draftingFor === referral.id}
                      >
                        {draftingFor === referral.id ? 'Redrafting…' : 'Redraft'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void draftMessage(referral)}
                    disabled={draftingFor === referral.id}
                  >
                    {draftingFor === referral.id ? 'Drafting…' : 'Draft referral message'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReferralDialog open={dialogOpen} onOpenChange={setDialogOpen} jobId={jobId} editing={editing} onSaved={refetch} />
    </div>
  );
}
