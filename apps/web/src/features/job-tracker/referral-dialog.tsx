import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { referralApi } from './job-api';
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUSES,
  type Referral,
  type ReferralStatus,
} from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  editing: Referral | null;
  onSaved: () => void;
}

export function ReferralDialog({ open, onOpenChange, jobId, editing, onSaved }: Props) {
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactLinkedinUrl, setContactLinkedinUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [status, setStatus] = useState<ReferralStatus>('NOT_CONTACTED');
  const [notes, setNotes] = useState('');
  const [contactedAt, setContactedAt] = useState<string | null>(null);
  const [followUpAt, setFollowUpAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContactName(editing?.contactName ?? '');
    setContactTitle(editing?.contactTitle ?? '');
    setContactLinkedinUrl(editing?.contactLinkedinUrl ?? '');
    setContactEmail(editing?.contactEmail ?? '');
    setRelationship(editing?.relationship ?? '');
    setStatus(editing?.status ?? 'NOT_CONTACTED');
    setNotes(editing?.notes ?? '');
    setContactedAt(editing?.contactedAt ?? null);
    setFollowUpAt(editing?.followUpAt ?? null);
  }, [open, editing]);

  async function submit() {
    if (!contactName.trim() || saving) return;
    setSaving(true);
    try {
      const request = {
        contactName: contactName.trim(),
        contactTitle: contactTitle || null,
        contactLinkedinUrl: contactLinkedinUrl || null,
        contactEmail: contactEmail || null,
        relationship: relationship || null,
        status,
        notes: notes || null,
        contactedAt,
        followUpAt,
      };
      if (editing) {
        await referralApi.update(jobId, editing.id, request);
      } else {
        await referralApi.create(jobId, request);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit referral contact' : 'Add referral contact'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Contact name</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">LinkedIn URL</Label>
              <Input value={contactLinkedinUrl} onChange={(e) => setContactLinkedinUrl(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">How you know them</Label>
            <Input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. college alumni, former colleague, cold outreach"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ReferralStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REFERRAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{REFERRAL_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Contacted on</Label>
              <DatePicker value={contactedAt} onChange={setContactedAt} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Follow up on</Label>
            <DatePicker value={followUpAt} onChange={setFollowUpAt} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !contactName.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
