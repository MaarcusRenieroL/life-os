import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { coreApi } from '@/features/core/core-api';
import { habitsApi } from '@/features/habits/habits-api';
import { dayKey, toQuests, type Quest } from '@/features/player/player-model';
import { questKey } from '@/features/player/player-theme';
import { TodayView } from '@/features/player/today-view';
import { playCue } from '@/features/player/sound';
import { usePlayer } from '@/features/player/use-player';
import { tasksApi } from '@/features/tasks/tasks-api';

/** How long a finished quest lingers (struck through, reward rising) before the board refreshes without it. */
const LINGER_MS = 1100;
const COMBO_WINDOW_MS = 90_000;

/** The live combo count, or 0 once the window since the last clear has passed. */
function liveCombo(combo: { count: number; at: number }): number {
  return Date.now() - combo.at < COMBO_WINDOW_MS ? combo.count : 0;
}

/**
 * The cross-module "what needs me" board. Tasks and habits can be finished right here; anything
 * else (a bill, an interview, a flagged note) links to the module that owns it. A module that's
 * down or slow just contributes zero quests (see core's TodayService) instead of breaking the page.
 */
export function TodayPage() {
  const queryClient = useQueryClient();
  const player = usePlayer();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['core', 'today'], queryFn: coreApi.getToday, retry: false, throwOnError: false });
  const quests = useMemo(() => toQuests(items), [items]);

  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // Finishing quests back to back builds a combo; a pause of COMBO_WINDOW_MS lets it lapse.
  const [combo, setCombo] = useState({ count: 0, at: 0 });

  const complete = useMutation({
    mutationFn: async (quest: Quest): Promise<void> => {
      if (quest.item.type === 'habit_due') {
        await habitsApi.upsertLog(quest.item.entityId!, { logDate: dayKey(new Date()), status: 'COMPLETED' });
      } else {
        await tasksApi.complete(quest.item.entityId!);
      }
    },
    onMutate: (quest) => setPendingKey(questKey(quest)),
    onSuccess: (_result, quest) => {
      const key = questKey(quest);
      playCue('clear');
      setCombo((prev) => ({ count: Date.now() - prev.at < COMBO_WINDOW_MS ? prev.count + 1 : 1, at: Date.now() }));
      setCleared((prev) => new Set(prev).add(key));
      setTimeout(() => {
        setCleared((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        // The finished quest leaves the board, and the XP/level/streak move.
        for (const k of ['core', 'player', 'tasks', 'habits']) void queryClient.invalidateQueries({ queryKey: [k] });
      }, LINGER_MS);
    },
    onError: () => toast.error("Couldn't complete that one. Try again."),
    onSettled: () => setPendingKey(null),
  });

  return (
    <TodayView
      quests={quests}
      loading={isLoading}
      cleared={cleared}
      pendingKey={pendingKey}
      onComplete={(q) => complete.mutate(q)}
      clearedToday={(player.today?.tasksCompleted ?? 0) + (player.today?.habitsCompleted ?? 0)}
      xpToday={player.earnedToday}
      challenge={{ challenge: player.challenge, done: player.challengeDone, progress: player.challengeProgress }}
      combo={liveCombo(combo)}
    />
  );
}
