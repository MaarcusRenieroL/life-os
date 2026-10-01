import { useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Empty, ErrorNote, Panel } from '../ui';

export function HabitsScreen() {
  const api = useApi();
  const habits = useAsync(() => api.habits.today(), [api]);
  const [failure, setFailure] = useState<string | null>(null);
  const list = habits.data ?? [];
  const done = list.filter((h) => h.todayLog?.status === 'COMPLETED').length;

  async function complete(id: string) {
    habits.mutate((prev) => prev?.map((h) => (h.habit.id === id ? { ...h, todayLog: { id: 'pending', logDate: '', status: 'COMPLETED' } } : h)));
    try {
      await api.habits.complete(id);
    } catch (e) {
      await habits.reload();
      setFailure(e instanceof Error ? e.message : 'Could not log that habit');
    }
  }

  if (habits.error && !habits.data) return <ErrorNote message={habits.error} onRetry={habits.reload} />;

  return (
    <Panel title={`Habits today · ${done} of ${list.length}`}>
      {failure && <ErrorNote message={failure} />}
      {list.length === 0 && !habits.loading ? <Empty>No habits scheduled today.</Empty> : (
        <ul className="list">
          {list.map(({ habit, todayLog }) => {
            const on = todayLog?.status === 'COMPLETED';
            return (
              <li key={habit.id} className={on ? 'done' : ''}>
                <button className={`check${on ? ' on' : ''}`} disabled={on} onClick={() => void complete(habit.id)} aria-label="Log habit">{on ? '✓' : ''}</button>
                <span className="grow">{habit.name}</span>
                {habit.category && <small className="muted">{habit.category}</small>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
