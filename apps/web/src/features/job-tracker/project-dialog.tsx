import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { careerProfileApi } from './career-profile-api';
import type { ProjectEntry } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ProjectEntry | null;
  nextDisplayOrder: number;
  onSaved: () => void;
}

export function ProjectDialog({ open, onOpenChange, editing, nextDisplayOrder, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [techStackText, setTechStackText] = useState('');
  const [link, setLink] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [bulletsText, setBulletsText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setTechStackText((editing?.techStack ?? []).join(', '));
    setLink(editing?.link ?? '');
    setStartDate(editing?.startDate ?? null);
    setEndDate(editing?.endDate ?? null);
    setBulletsText((editing?.bullets ?? []).join('\n'));
  }, [open, editing]);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const request = {
        name: name.trim(),
        description: description.trim() || null,
        techStack: techStackText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        link: link.trim() || null,
        startDate,
        endDate,
        bullets: bulletsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        displayOrder: editing?.displayOrder ?? nextDisplayOrder,
      };
      if (editing) {
        await careerProfileApi.updateProject(editing.id, request);
      } else {
        await careerProfileApi.createProject(request);
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
          <DialogTitle>{editing ? 'Edit project' : 'Add project'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Link</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Tech stack (comma separated)</Label>
            <Input value={techStackText} onChange={(e) => setTechStackText(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Start date</Label>
            <div className="mt-1">
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
          </div>
          <div>
            <Label>End date</Label>
            <div className="mt-1">
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label>Bullets (one per line)</Label>
            <Textarea value={bulletsText} onChange={(e) => setBulletsText(e.target.value)} className="mt-1" rows={4} />
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
