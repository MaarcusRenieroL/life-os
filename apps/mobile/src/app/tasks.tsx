import type { Task } from '@life-os/core';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { useApi } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { C } from '@/theme';
import { Check, ErrorNote, Muted, Panel, s } from '@/ui';

const ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
const PRIORITY_COLOR = { URGENT: C.magenta, HIGH: C.gold, MEDIUM: C.muted, LOW: C.muted } as const;

export default function Tasks() {
  const api = useApi();
  const tasks = useAsync(() => api.tasks.list(), [api]);
  const [title, setTitle] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const all = tasks.data ?? [];
  const open = all.filter((t) => t.status !== 'DONE').sort((a, b) => ORDER[a.priority] - ORDER[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
  const done = all.filter((t) => t.status === 'DONE');

  async function toggle(task: Task) {
    const finishing = task.status !== 'DONE';
    tasks.mutate((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status: finishing ? 'DONE' : 'TODO' } : t)));
    try {
      await (finishing ? api.tasks.complete(task.id) : api.tasks.reopen(task.id));
    } catch (e) {
      tasks.mutate((prev) => prev?.map((t) => (t.id === task.id ? task : t)));
      setFailure(e instanceof Error ? e.message : 'Could not update the task');
    }
  }

  async function add() {
    const text = title.trim();
    if (!text) return;
    setTitle('');
    try {
      const created = await api.tasks.create(text);
      tasks.mutate((prev) => [created, ...(prev ?? [])]);
    } catch (e) {
      setTitle(text);
      setFailure(e instanceof Error ? e.message : 'Could not add the task');
    }
  }

  const row = (t: Task) => (
    <View key={t.id} style={s.row}>
      {t.status === 'DONE' ? (
        <Pressable onPress={() => void toggle(t)} hitSlop={10} style={[s.check, { backgroundColor: C.accent, borderColor: C.accent }]}><Text style={{ fontWeight: '800', color: '#06120d' }}>✓</Text></Pressable>
      ) : (
        <Check on={false} onPress={() => void toggle(t)} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[s.body, t.status === 'DONE' && { textDecorationLine: 'line-through', color: C.muted }]}>{t.title}</Text>
        <Text style={{ color: PRIORITY_COLOR[t.priority], fontSize: 11 }}>{t.priority}{t.dueDate ? ` · ${t.dueDate}` : ''}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={tasks.loading} tintColor={C.accent} onRefresh={() => void tasks.reload()} />}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput style={[s.input, { flex: 1 }]} value={title} onChangeText={setTitle} placeholder="Add a task…" placeholderTextColor={C.muted} returnKeyType="done" onSubmitEditing={() => void add()} />
        <Pressable style={[s.primary, { paddingHorizontal: 18 }, !title.trim() && { opacity: 0.45 }]} disabled={!title.trim()} onPress={() => void add()}><Text style={s.primaryText}>ADD</Text></Pressable>
      </View>
      {failure ? <ErrorNote message={failure} /> : null}
      {tasks.error && !tasks.data ? <ErrorNote message={tasks.error} onRetry={tasks.reload} /> : null}
      <Panel title={`Open · ${open.length}`}>{open.length === 0 ? <Muted>Inbox zero.</Muted> : open.map(row)}</Panel>
      {done.length > 0 ? (
        <Panel title={`Completed · ${done.length}`}>
          <Pressable onPress={() => setShowDone((v) => !v)}><Text style={{ color: C.accent }}>{showDone ? 'Hide' : 'Show'}</Text></Pressable>
          {showDone ? done.map(row) : null}
        </Panel>
      ) : null}
    </ScrollView>
  );
}
