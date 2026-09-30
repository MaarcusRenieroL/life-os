import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useApi } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { C } from '@/theme';
import { Check, ErrorNote, Muted, Panel, s, success } from '@/ui';

export default function Habits() {
  const api = useApi();
  const habits = useAsync(() => api.habits.today(), api);
  const [failure, setFailure] = useState<string | null>(null);
  const list = habits.data ?? [];
  const done = list.filter((h) => h.todayLog?.status === 'COMPLETED').length;

  async function complete(id: string) {
    habits.mutate((prev) => prev?.map((h) => (h.habit.id === id ? { ...h, todayLog: { id: 'pending', logDate: '', status: 'COMPLETED' } } : h)));
    try {
      await api.habits.complete(id);
      success();
    } catch (e) {
      await habits.reload();
      setFailure(e instanceof Error ? e.message : 'Could not log that habit');
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={habits.loading} tintColor={C.accent} onRefresh={() => void habits.reload()} />}>
      <Panel title={`Habits today · ${done} of ${list.length}`}>
        {failure ? <ErrorNote message={failure} /> : null}
        {habits.error && !habits.data ? <ErrorNote message={habits.error} onRetry={habits.reload} /> : null}
        {list.length === 0 && !habits.loading && !habits.error ? <Muted>No habits scheduled today.</Muted> : null}
        {list.map(({ habit, todayLog }) => (
          <View key={habit.id} style={s.row}>
            <Check on={todayLog?.status === 'COMPLETED'} onPress={() => void complete(habit.id)} />
            <Text style={s.body}>{habit.name}</Text>
            {habit.category ? <Text style={{ color: C.muted, fontSize: 12 }}>{habit.category}</Text> : null}
          </View>
        ))}
      </Panel>
    </ScrollView>
  );
}
