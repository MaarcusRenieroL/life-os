import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { TaskFormDialog } from './task-form-dialog';
import { TaskList } from './task-list';
import { tasksApi } from './tasks-api';
import type { Task } from './types';

export function TasksUpcomingPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'view', 'UPCOMING'],
    queryFn: () => tasksApi.list({ view: 'UPCOMING', upcomingDays: 14 }),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  function openEdit(task: Task) {
    setEditing(task);
    setFormOpen(true);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Upcoming (next 14 days)</h1>

      <div className="mt-4">
        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          emptyMessage="Nothing coming up in the next 14 days."
          onEdit={openEdit}
        />
      </div>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
      />
    </div>
  );
}
