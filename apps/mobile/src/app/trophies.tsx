import { MEDAL_HEX, TIER_NAMES } from '@life-os/core';
import { Text, View } from 'react-native';

import { Screen } from '@/kit';
import { usePlayer } from '@/lib/player';
import { C } from '@/theme';
import { Bar, Muted, Panel, s } from '@/ui';

export default function Trophies() {
  const { player } = usePlayer();
  const earned = player.achievements.reduce((sum, a) => sum + a.tier, 0);
  const total = player.achievements.reduce((sum, a) => sum + a.def.tiers.length, 0);
  return (
    <Screen title="Trophies">
      <Panel title="Trophy room">
        <Text style={s.h2}>{earned} / {total} medals</Text>
        <View style={{ marginTop: 8 }}><Bar pct={(earned / total) * 100} color={C.gold} /></View>
      </Panel>
      {player.achievements.map((a) => {
        const color = a.tier > 0 ? MEDAL_HEX[a.tier - 1] : C.line;
        return (
          <Panel key={a.def.id} accent={a.tier > 0 ? color : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{a.def.name}</Text>
              <Text style={{ color: a.tier > 0 ? color : C.muted, fontSize: 12 }}>{a.tier > 0 ? TIER_NAMES[a.tier - 1] : 'Locked'}</Text>
            </View>
            <Muted style={{ marginBottom: 8 }}>{a.def.blurb}</Muted>
            <Bar pct={a.pct} color={color} />
            <Muted style={{ marginTop: 4 }}>{a.value.toLocaleString()}{a.next != null ? ` / ${a.next.toLocaleString()}` : ''} {a.def.unit}</Muted>
          </Panel>
        );
      })}
    </Screen>
  );
}
