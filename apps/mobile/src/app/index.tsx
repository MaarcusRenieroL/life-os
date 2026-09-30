import { RANK_HEX, groupQuests, toQuests, type HeatCell } from '@life-os/core';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { usePlayer } from '@/lib/player';
import { useApi } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { C, inr } from '@/theme';
import { Bar, Muted, Panel, Xp, s } from '@/ui';

const HEAT = ['#161a1f', '#14382b', '#1d6b4d', '#2fae79', '#7dffc3'];

function Heatmap({ grid }: { grid: HeatCell[][] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {grid.map((week, i) => (
        <View key={i} style={{ gap: 3 }}>
          {week.map((cell) => (
            <View key={cell.date} style={{ width: 17, height: 17, borderRadius: 3, backgroundColor: cell.future ? 'transparent' : HEAT[cell.intensity] }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const api = useApi();
  const { player, reload } = usePlayer();
  const today = useAsync(() => api.today(), [api]);
  const groups = groupQuests(toQuests(today.data ?? []));
  const [value, target] = player.challengeProgress;
  const almost = player.achievements.filter((a) => a.next != null).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const week = player.week;
  const stat = (label: string, v: string | number, sub?: string) => (
    <View style={{ flex: 1 }}>
      <Muted>{label}</Muted>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>{v}</Text>
      {sub ? <Muted>{sub}</Muted> : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={today.loading} tintColor={C.accent} onRefresh={() => void Promise.all([today.reload(), reload()])} />}>
      <Panel title="Daily challenge" accent={player.challengeDone ? C.gold : undefined}>
        <Text style={s.h2}>{player.challenge.title}</Text>
        <Muted style={{ marginVertical: 6 }}>{player.challengeDone ? 'Challenge won. +50 XP banked.' : player.challenge.hint}</Muted>
        <Bar pct={target ? (value / target) * 100 : 0} color={C.gold} />
        <Muted style={{ marginTop: 4 }}>{value} / {target}</Muted>
      </Panel>

      <Panel title="This week">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {stat('Tasks', week?.tasksCompleted ?? '—', week ? `${week.tasksDue} due` : undefined)}
          {stat('Focus', week ? `${week.focusHours}h` : '—')}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {stat('Workouts', week?.workouts ?? '—')}
          {stat('Spent', inr(week?.spending))}
        </View>
      </Panel>

      <Panel title="Attributes">
        {player.attributes.map((a) => (
          <View key={a.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <Text style={{ color: C.muted, width: 34, fontSize: 11, letterSpacing: 1 }}>{a.key}</Text>
            <View style={{ flex: 1 }}><Bar pct={a.value ?? 0} color={a.value == null ? C.line : RANK_HEX[player.rank.letter]} /></View>
            <Text style={{ color: C.text, width: 28, textAlign: 'right', fontSize: 12 }}>{a.value ?? '—'}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="Today's quests">
        {[...groups.main, ...groups.daily].slice(0, 5).map((q) => (
          <View key={`${q.item.type}:${q.item.entityId}:${q.item.title}`} style={s.row}>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: q.tier === 'main' ? C.magenta : C.cyan }} />
            <Text style={s.body} numberOfLines={1}>{q.item.title}</Text>
            <Xp value={q.xp} />
          </View>
        ))}
        {today.data && today.data.length === 0 ? <Muted>Nothing on the board. Enjoy it.</Muted> : null}
      </Panel>

      <Panel title="Almost there">
        {almost.map((a) => (
          <View key={a.def.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{a.def.name}</Text>
              <Muted>{a.value} / {a.next} {a.def.unit}</Muted>
            </View>
            <Bar pct={a.pct} color={C.gold} />
          </View>
        ))}
      </Panel>

      <Panel title="Campaign log"><Heatmap grid={player.heatmap} /></Panel>
    </ScrollView>
  );
}
