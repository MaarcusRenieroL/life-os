import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

import { EventFormDialog } from './event-form-dialog';

const TABS = [
  { label: 'Month', to: '/calendar', end: true },
  { label: 'Week', to: '/calendar/week', end: false },
  { label: 'Day', to: '/calendar/day', end: false },
  { label: 'Agenda', to: '/calendar/agenda', end: false },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function CalendarLayout() {
  const queryClient = useQueryClient();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // "E: New event" - the module-specific keyboard shortcut from the spec's shared shortcuts list.
  // Ignored while typing anywhere, same reasoning as the tasks module's "N" shortcut.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'e' || e.metaKey || e.ctrlKey || e.altKey) return;
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
      <EventFormDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        editing={null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['calendar'] })}
      />
    </div>
  );
}
