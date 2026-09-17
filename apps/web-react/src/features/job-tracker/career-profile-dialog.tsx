import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { careerProfileApi } from './career-profile-api';
import type { CareerProfile } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CareerProfile | null;
  onSaved: () => void;
}

export function CareerProfileDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.fullName ?? '');
    setEmail(profile?.email ?? '');
    setPhone(profile?.phone ?? '');
    setLocation(profile?.location ?? '');
    setGithubUrl(profile?.githubUrl ?? '');
    setLinkedinUrl(profile?.linkedinUrl ?? '');
    setPortfolioUrl(profile?.portfolioUrl ?? '');
    setSummary(profile?.summary ?? '');
  }, [open, profile]);

  async function submit() {
    if (!fullName.trim() || saving) return;
    setSaving(true);
    try {
      await careerProfileApi.upsertProfile({
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        location: location.trim() || null,
        githubUrl: githubUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        summary: summary.trim() || null,
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact & summary</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>GitHub URL</Label>
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>LinkedIn URL</Label>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Portfolio / site URL</Label>
            <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
