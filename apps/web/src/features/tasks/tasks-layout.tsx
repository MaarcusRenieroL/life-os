import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

import { TaskFormDialog } from './task-form-dialog';

const TABS = [
  { label: 'Today', to: '/tasks', end: true },
  { label: 'Upcoming', to: '/tasks/upcoming', end: false },
  { label: 'List', to: '/tasks/list', end: false },
  { label: 'Board', to: '/tasks/board', end: false },
  { label: 'Completed', to: '/tasks/completed', end: false },
  { label: 'Analytics', to: '/tasks/analytics', end: false },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function TasksLayout() {
  const queryClient = useQueryClient();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // "N: New task" - the module-specific keyboard shortcut from the spec's shared shortcuts list.
  // Ignored while typing anywhere (an input, a textarea, a contenteditable) so it doesn't fire
  // while the user is just typing the letter "n" into a task title or search box.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setQuickCreateOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
      <TaskFormDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        editing={null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
      />
    </div>
  );
}
