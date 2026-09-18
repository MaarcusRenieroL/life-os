import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { InterviewDialog } from './interview-dialog';
import { interviewApi } from './job-api';
import {
  INTERVIEW_RESULT_LABELS,
  INTERVIEW_ROUND_TYPE_LABELS,
  type Interview,
} from './types';

const RESULT_BADGE_CLASS: Record<string, string> = {
  PASSED: 'border-green-500/40 text-green-600 dark:text-green-400',
  FAILED: 'border-red-500/40 text-red-600 dark:text-red-400',
  CANCELLED: 'border-muted-foreground/30 text-muted-foreground',
  PENDING: '',
};

function formatScheduled(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function InterviewTrackingSection({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['jobs', jobId, 'interviews'];
  const { data: interviews = [] } = useQuery({ queryKey, queryFn: () => interviewApi.list(jobId) });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  function refetch() {
    void queryClient.invalidateQueries({ queryKey });
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(interview: Interview) {
    setEditing(interview);
    setDialogOpen(true);
  }

  async function generatePrepTopics(interview: Interview) {
    setGeneratingFor(interview.id);
    try {
      await interviewApi.generatePrepTopics(jobId, interview.id);
      refetch();
      toast.success('Prep topics generated');
    } catch {
      toast.error('Could not generate prep topics');
    } finally {
      setGeneratingFor(null);
    }
  }

  async function remove(interview: Interview) {
    if (!confirm(`Delete this ${INTERVIEW_ROUND_TYPE_LABELS[interview.roundType ?? 'TECHNICAL']} interview?`)) return;
    await interviewApi.delete(jobId, interview.id);
    refetch();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {interviews.length === 0 ? 'No interviews scheduled yet.' : `${interviews.length} round${interviews.length === 1 ? '' : 's'}`}
        </p>
        <Button size="sm" variant="outline" onClick={openAdd}>
          Add interview
        </Button>
      </div>

      {interviews.length > 0 && (
        <div className="flex flex-col gap-3">
          {interviews.map((interview) => {
            const scheduled = formatScheduled(interview.scheduledAt);
            return (
              <div key={interview.id} className="rounded-md border p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {INTERVIEW_ROUND_TYPE_LABELS[interview.roundType ?? 'TECHNICAL']}
                      </span>
                      {interview.result && interview.result !== 'PENDING' && (
                        <Badge variant="outline" className={RESULT_BADGE_CLASS[interview.result]}>
                          {INTERVIEW_RESULT_LABELS[interview.result]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {scheduled ?? 'Not scheduled'}
                      {interview.interviewerName ? ` · ${interview.interviewerName}` : ''}
                      {interview.meetingLink && (
                        <>
                          {' · '}
                          <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            meeting link
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(interview)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(interview)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  {interview.topics && interview.topics.length > 0 ? (
                    <>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Prep topics</p>
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {interview.topics.map((topic) => (
                          <li key={topic}>{topic}</li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        variant="link"
                        className="mt-1 h-auto p-0 text-xs"
                        onClick={() => void generatePrepTopics(interview)}
                        disabled={generatingFor === interview.id}
                      >
                        {generatingFor === interview.id ? 'Regenerating…' : 'Regenerate'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void generatePrepTopics(interview)}
                      disabled={generatingFor === interview.id}
                    >
                      {generatingFor === interview.id ? 'Generating…' : 'Generate prep topics'}
                    </Button>
                  )}
                </div>

                {(interview.performanceNotes || interview.questionsAsked) && (
                  <div className="mt-3 space-y-1.5 border-t pt-3 text-sm text-muted-foreground">
                    {interview.questionsAsked && <p><span className="font-medium text-foreground">Asked: </span>{interview.questionsAsked}</p>}
                    {interview.performanceNotes && <p><span className="font-medium text-foreground">How it went: </span>{interview.performanceNotes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <InterviewDialog open={dialogOpen} onOpenChange={setDialogOpen} jobId={jobId} editing={editing} onSaved={refetch} />
    </div>
  );
}
