import { RANK_HEX } from '@life-os/core';
import { Text, View } from 'react-native';

import { usePlayer } from '@/lib/player';
import { C } from '@/theme';
import { Bar } from '@/ui';

/** The always-visible status strip: level, rank, XP bar, streak and today's XP. */
export function PlayerBar() {
  const { player } = usePlayer();
  const { progress, rank, streak } = player;
  const color = RANK_HEX[rank.letter];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1, backgroundColor: '#0c0f13' }}>
      <View style={{ width: 46, height: 46, borderWidth: 2, borderColor: color, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: 8, letterSpacing: 2 }}>LV</Text>
        <Text style={{ color, fontSize: 20, fontWeight: '800', marginTop: -2 }}>{player.ready ? progress.level : '–'}</Text>
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{rank.letter} · {rank.title}</Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>{progress.into.toLocaleString()} / {progress.span.toLocaleString()} XP</Text>
        </View>
        <Bar pct={progress.pct} color={color} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: C.text, fontWeight: '800' }}>🔥 {streak.current}</Text>
        <Text style={{ color: C.gold, fontSize: 11 }}>+{player.earnedToday} XP</Text>
      </View>
    </View>
  );
}
