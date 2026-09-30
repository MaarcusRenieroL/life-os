import { groupQuests, toQuests, type Quest, type QuestTier } from '@life-os/core';
import { useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Empty, ErrorNote, Panel } from '../ui';

const TIERS: { id: QuestTier; label: string; hint: string }[] = [
  { id: 'main', label: 'Main quests', hint: 'Do these first - they hurt if ignored' },
  { id: 'daily', label: 'Daily quests', hint: "Today's routine" },
  { id: 'side', label: 'Side quests', hint: 'Coming up' },
];

const keyOf = (q: Quest) => `${q.item.module}:${q.item.type}:${q.item.entityId ?? q.item.title}`;

export function QuestsScreen() {
  const api = useApi();
  const today = useAsync(() => api.today(), [api]);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const quests = toQuests(today.data ?? []);
  const groups = groupQuests(quests);
  const done = quests.filter((q) => cleared.has(keyOf(q))).length;

  async function complete(quest: Quest) {
    const key = keyOf(quest);
    setPending(key);
    setFailure(null);
    try {
      if (quest.item.type === 'habit_due') await api.habits.complete(quest.item.entityId!);
      else await api.tasks.complete(quest.item.entityId!);
      setCleared((prev) => new Set(prev).add(key));
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not complete that quest');
    } finally {
      setPending(null);
    }
  }

  if (today.error && !today.data) return <ErrorNote message={today.error} onRetry={today.reload} />;

  return (
    <div className="stack">
      <Panel title="Quest board">
        <div className="row">
          <h2>{done} of {quests.length} cleared</h2>
          <span className="xp">{quests.filter((q) => !cleared.has(keyOf(q))).reduce((sum, q) => sum + q.xp, 0)} XP available</span>
        </div>
        {failure && <ErrorNote message={failure} />}
      </Panel>
      {quests.length === 0 && !today.loading && <Empty>No quests today. The board is clear.</Empty>}
      {TIERS.map(({ id, label, hint }) =>
        groups[id].length === 0 ? null : (
          <Panel key={id} title={`${label} · ${hint}`}>
            <ul className="list">
              {groups[id].map((q) => {
                const key = keyOf(q);
                const isDone = cleared.has(key);
                return (
                  <li key={key} className={isDone ? 'done' : ''}>
                    <button className={`check${isDone ? ' on' : ''}`} disabled={!q.completable || isDone || pending === key} onClick={() => void complete(q)} aria-label="Complete">
                      {isDone ? '✓' : ''}
                    </button>
                    <span className="grow">
                      {q.item.title}
                      {q.item.description && <small className="muted"> · {q.item.description}</small>}
                    </span>
                    <span className="xp">+{q.xp}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ),
      )}
    </div>
  );
}
