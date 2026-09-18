import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { careerProfileApi } from './career-profile-api';
import type { WorkExperience } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WorkExperience | null;
  nextDisplayOrder: number;
  onSaved: () => void;
}

export function ExperienceDialog({ open, onOpenChange, editing, nextDisplayOrder, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [current, setCurrent] = useState(false);
  const [bulletsText, setBulletsText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setCompany(editing?.company ?? '');
    setLocation(editing?.location ?? '');
    setStartDate(editing?.startDate ?? null);
    setEndDate(editing?.endDate ?? null);
    setCurrent(editing?.current ?? false);
    setBulletsText((editing?.bullets ?? []).join('\n'));
  }, [open, editing]);

  async function submit() {
    if (!title.trim() || !company.trim() || saving) return;
    setSaving(true);
    try {
      const request = {
        title: title.trim(),
        company: company.trim(),
        location: location.trim() || null,
        startDate,
        endDate: current ? null : endDate,
        current,
        bullets: bulletsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        displayOrder: editing?.displayOrder ?? nextDisplayOrder,
      };
      if (editing) {
        await careerProfileApi.updateExperience(editing.id, request);
      } else {
        await careerProfileApi.createExperience(request);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit work experience' : 'Add work experience'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Start date</Label>
            <div className="mt-1">
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
          </div>
          {!current && (
            <div>
              <Label>End date</Label>
              <div className="mt-1">
                <DatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={current} onCheckedChange={(v) => setCurrent(v === true)} />
            I currently work here
          </label>
          <div className="sm:col-span-2">
            <Label>Bullets (one per line)</Label>
            <Textarea value={bulletsText} onChange={(e) => setBulletsText(e.target.value)} className="mt-1" rows={5} />
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
