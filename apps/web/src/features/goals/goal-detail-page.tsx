import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Archive, ArrowLeft, CalendarClock, CheckCircle2, Pause, Pencil, Play, Trash2, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/error';

import { GoalAreaBadge, GoalBlockedBadge, GoalPriorityBadge, GoalStatusBadge } from './goal-badges';
import { GoalFormDialog } from './goal-form-dialog';
import { GoalHabitsPanel } from './goal-habits-panel';
import { GoalLinksPanel } from './goal-links-panel';
import { GoalMetricsPanel } from './goal-metrics-panel';
import { GoalMilestonesPanel } from './goal-milestones-panel';
import { GoalReviewDialog } from './goal-review-dialog';
import { GoalReviewsPanel } from './goal-reviews-panel';
import { GoalTasksPanel } from './goal-tasks-panel';
import { GoalTimeline } from './goal-timeline';
import { goalsApi } from './goals-api';
import { ProgressBreakdown } from './progress-breakdown';
import type { GoalStatus } from './types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardContent className="py-4">
        <SectionHeading className="mb-3">{title}</SectionHeading>
        {children}
      </CardContent>
    </Card>
  );
}

export function GoalDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [editOpen, setEditOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['goals', 'detail', id],
    queryFn: () => goalsApi.get(id),
    enabled: id !== '',
  });

  function refresh() {
    // Detail, the list (progress bars) and the task/habit pickers all read this goal's data.
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  async function changeStatus(status: GoalStatus, success: string) {
    try {
      await goalsApi.setStatus(id, status);
      toast.success(success);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the goal. Please try again.'));
    }
  }

  async function remove() {
    if (!data) return;
    const ok = await confirm({
      title: `Delete “${data.goal.name}”?`,
      description: 'Its milestones, metrics and reviews are deleted too. Linked tasks and habits are kept.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await goalsApi.delete(id);
      toast.success('Goal deleted');
      refresh();
      navigate('/goals');
    } catch {
      toast.error('Could not delete the goal. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">This goal couldn’t be found.</p>
        <Button variant="link" className="px-0" asChild>
          <Link to="/goals">Back to goals</Link>
        </Button>
      </div>
    );
  }

  const { goal } = data;
  const paused = goal.status === 'PAUSED';
  const closed = goal.status === 'COMPLETED' || goal.status === 'ARCHIVED';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/goals" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Goals
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{goal.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <GoalStatusBadge status={goal.status} />
              <GoalPriorityBadge priority={goal.priority} />
              <GoalAreaBadge area={goal.area} />
              {goal.blocked && <GoalBlockedBadge />}
              {goal.targetDate && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  Target {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            {closed ? (
              <Button variant="outline" size="sm" onClick={() => void changeStatus('ACTIVE', 'Goal reopened')}>
                <Undo2 /> Reopen
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => void changeStatus(paused ? 'ACTIVE' : 'PAUSED', paused ? 'Goal resumed' : 'Goal paused')}>
                  {paused ? <Play /> : <Pause />} {paused ? 'Resume' : 'Pause'}
                </Button>
                <Button size="sm" onClick={() => void changeStatus('COMPLETED', 'Goal completed - nice work')}>
                  <CheckCircle2 /> Complete
                </Button>
              </>
            )}
            {goal.status !== 'ARCHIVED' && (
              <Button variant="outline" size="sm" onClick={() => void changeStatus('ARCHIVED', 'Goal archived')}>
                <Archive /> Archive
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void remove()}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
        {goal.description && <p className="mt-3 max-w-3xl text-sm whitespace-pre-wrap text-muted-foreground">{goal.description}</p>}
      </div>

      <Section title="progress">
        <ProgressBreakdown progress={goal.progress} />
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="milestones">
          <GoalMilestonesPanel goalId={id} milestones={data.milestones} onChanged={refresh} />
        </Section>
        <Section title="timeline">
          <GoalTimeline goal={goal} milestones={data.milestones} />
        </Section>
        <Section title="metrics">
          <GoalMetricsPanel goalId={id} metrics={data.metrics} onChanged={refresh} />
        </Section>
        <Section title="tasks">
          <GoalTasksPanel goalId={id} tasks={data.tasks} onChanged={refresh} />
        </Section>
        <Section title="habits">
          <GoalHabitsPanel goalId={id} onChanged={refresh} />
        </Section>
        <Section title="linked goals">
          <GoalLinksPanel goalId={id} links={data.links} onChanged={refresh} />
        </Section>
      </div>

      <Section title="reviews">
        <GoalReviewsPanel goal={goal} reviews={data.reviews} onReview={() => setReviewOpen(true)} />
      </Section>

      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} editing={goal} onSaved={refresh} />
      <GoalReviewDialog goal={reviewOpen ? goal : null} onOpenChange={setReviewOpen} onSaved={refresh} />
      {dialog}
    </div>
  );
}
