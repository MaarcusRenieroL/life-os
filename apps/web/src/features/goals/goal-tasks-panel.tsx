import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, Circle, Plus, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tasksApi } from '@/features/tasks/tasks-api';
import { cn } from '@/lib/utils';

import { goalsApi } from './goals-api';
import type { GoalLinkedTask } from './types';

/** Tasks that count toward this goal's progress. Linking works both ways: from here, or from the
 * goal picker on the task form - it's the same task.goalId either way. */
export function GoalTasksPanel({
  goalId,
  tasks,
  onChanged,
}: {
  goalId: string;
  tasks: GoalLinkedTask[];
  onChanged: () => void;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  // Candidate tasks to link: everything not done and not already on this goal.
  const { data: allTasks = [] } = useQuery({ queryKey: ['tasks', 'list', 'for-goal-picker'], queryFn: () => tasksApi.list() });
  const linkedIds = new Set(tasks.map((t) => t.id));
  const options = allTasks
    .filter((t) => t.status !== 'DONE' && !linkedIds.has(t.id) && t.recurrencePattern == null)
    .map((t) => ({ id: t.id, label: t.title }));

  async function run(action: () => Promise<unknown>, failure: string) {
    try {
      await action();
      onChanged();
    } catch {
      toast.error(failure);
    }
  }

  async function createTask() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    await run(async () => {
      await tasksApi.create({ title, goalId });
      setNewTitle('');
    }, 'Could not create the task. Please try again.');
    setAdding(false);
  }

  return (
    <div>
      {tasks.length === 0 ? (
        <EmptyState message="No tasks linked yet." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {tasks.map((task) => {
            const done = task.status === 'DONE';
            return (
              <li key={task.id} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  aria-label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => void run(() => (done ? tasksApi.reopen(task.id) : tasksApi.complete(task.id)), 'Could not update the task.')}
                >
                  {done ? <Check className="size-5 text-primary" /> : <Circle className="size-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <Link to="/tasks/list" className={cn('block truncate text-sm hover:underline', done && 'text-muted-foreground line-through')}>
                    {task.title}
                  </Link>
                  {task.dueDate && <p className="text-xs text-muted-foreground">Due {format(parseISO(task.dueDate), 'MMM d')}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Unlink “${task.title}”`}
                  onClick={() => void run(() => goalsApi.unlinkTask(goalId, task.id), 'Could not unlink the task.')}
                >
                  <Unlink className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void createTask();
          }}
        >
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New task for this goal…" aria-label="New task title" />
          <Button type="submit" variant="outline" disabled={adding || !newTitle.trim()}>
            <Plus /> Add
          </Button>
        </form>
        <div>
          <SearchableSelect
            options={options}
            value={null}
            onChange={(id) => id && void run(() => goalsApi.linkTask(goalId, id), 'Could not link the task.')}
            placeholder="Link existing task…"
            searchPlaceholder="Search tasks…"
            emptyMessage="No tasks to link."
          />
        </div>
      </div>
    </div>
  );
}
