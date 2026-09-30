import { groupQuests, toQuests, type Quest, type QuestTier } from '@life-os/core';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useApi } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { C } from '@/theme';
import { Check, ErrorNote, Muted, Panel, Xp, s, success } from '@/ui';

const TIERS: { id: QuestTier; label: string }[] = [
  { id: 'main', label: 'Main quests · do these first' },
  { id: 'daily', label: "Daily quests · today's routine" },
  { id: 'side', label: 'Side quests · coming up' },
];

const keyOf = (q: Quest) => `${q.item.module}:${q.item.type}:${q.item.entityId ?? q.item.title}`;

export default function Quests() {
  const api = useApi();
  const today = useAsync(() => api.today(), api);
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
      success();
      setCleared((prev) => new Set(prev).add(key));
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not complete that quest');
    } finally {
      setPending(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={today.loading} tintColor={C.accent} onRefresh={() => void today.reload()} />}>
      <Panel title="Quest board">
        <Text style={s.h2}>{done} of {quests.length} cleared</Text>
        <Text style={{ color: C.gold, marginTop: 4 }}>{quests.filter((q) => !cleared.has(keyOf(q))).reduce((sum, q) => sum + q.xp, 0)} XP available</Text>
        {failure ? <ErrorNote message={failure} /> : null}
      </Panel>
      {today.error && !today.data ? <ErrorNote message={today.error} onRetry={today.reload} /> : null}
      {quests.length === 0 && !today.loading && !today.error ? <Muted>No quests today. The board is clear.</Muted> : null}
      {TIERS.map(({ id, label }) =>
        groups[id].length === 0 ? null : (
          <Panel key={id} title={label}>
            {groups[id].map((q) => {
              const key = keyOf(q);
              const isDone = cleared.has(key);
              return (
                <View key={key} style={s.row}>
                  <Check on={isDone} disabled={!q.completable || pending === key} onPress={() => void complete(q)} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, isDone && { textDecorationLine: 'line-through', color: C.muted }]}>{q.item.title}</Text>
                    {q.item.description ? <Muted>{q.item.description}</Muted> : null}
                  </View>
                  <Xp value={q.xp} />
                </View>
              );
            })}
          </Panel>
        ),
      )}
    </ScrollView>
  );
}
