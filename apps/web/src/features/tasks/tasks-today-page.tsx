import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { TaskFormDialog } from './task-form-dialog';
import { TaskList } from './task-list';
import { tasksApi } from './tasks-api';
import type { Task } from './types';

export function TasksTodayPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'view', 'TODAY'],
    queryFn: () => tasksApi.list({ view: 'TODAY' }),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <Button onClick={openCreate}>
          <Plus /> New task
        </Button>
      </div>

      <div className="mt-4">
        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          emptyMessage="Nothing due today. Enjoy the clear runway."
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
