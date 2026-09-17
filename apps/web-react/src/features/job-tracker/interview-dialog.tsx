import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/date-time-picker';
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

import { interviewApi } from './job-api';
import {
  INTERVIEW_RESULT_LABELS,
  INTERVIEW_RESULTS,
  INTERVIEW_ROUND_TYPE_LABELS,
  INTERVIEW_ROUND_TYPES,
  type Interview,
  type InterviewResultStatus,
  type InterviewRoundType,
} from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  editing: Interview | null;
  onSaved: () => void;
}

export function InterviewDialog({ open, onOpenChange, jobId, editing, onSaved }: Props) {
  const [roundType, setRoundType] = useState<InterviewRoundType>('RECRUITER_SCREENING');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [interviewerName, setInterviewerName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [preparationNotes, setPreparationNotes] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState('');
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [result, setResult] = useState<InterviewResultStatus>('PENDING');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRoundType(editing?.roundType ?? 'RECRUITER_SCREENING');
    setScheduledAt(editing?.scheduledAt ?? null);
    setInterviewerName(editing?.interviewerName ?? '');
    setMeetingLink(editing?.meetingLink ?? '');
    setPreparationNotes(editing?.preparationNotes ?? '');
    setQuestionsAsked(editing?.questionsAsked ?? '');
    setPerformanceNotes(editing?.performanceNotes ?? '');
    setResult(editing?.result ?? 'PENDING');
  }, [open, editing]);

  async function submit() {
    if (saving) return;
    setSaving(true);
    try {
      const request = {
        roundType,
        scheduledAt,
        interviewerName: interviewerName || null,
        meetingLink: meetingLink || null,
        preparationNotes: preparationNotes || null,
        questionsAsked: questionsAsked || null,
        performanceNotes: performanceNotes || null,
        result,
      };
      if (editing) {
        await interviewApi.update(jobId, editing.id, request);
      } else {
        await interviewApi.create(jobId, request);
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
          <DialogTitle>{editing ? 'Edit interview' : 'Add interview'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Round</Label>
              <Select value={roundType} onValueChange={(v) => setRoundType(v as InterviewRoundType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVIEW_ROUND_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{INTERVIEW_ROUND_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Result</Label>
              <Select value={result} onValueChange={(v) => setResult(v as InterviewResultStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVIEW_RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>{INTERVIEW_RESULT_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Scheduled at</Label>
            <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Interviewer</Label>
              <Input value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Meeting link</Label>
              <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Preparation notes</Label>
            <Textarea rows={2} value={preparationNotes} onChange={(e) => setPreparationNotes(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Questions asked</Label>
            <Textarea rows={2} value={questionsAsked} onChange={(e) => setQuestionsAsked(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Performance notes</Label>
            <Textarea rows={2} value={performanceNotes} onChange={(e) => setPerformanceNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
