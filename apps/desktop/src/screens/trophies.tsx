import { MEDAL_HEX, TIER_NAMES } from '@life-os/core';

import { usePlayer } from '../lib/player';
import { Bar, Panel } from '../ui';

export function TrophiesScreen() {
  const { player } = usePlayer();
  const earned = player.achievements.reduce((sum, a) => sum + a.tier, 0);
  const total = player.achievements.reduce((sum, a) => sum + a.def.tiers.length, 0);

  return (
    <div className="stack">
      <Panel title="Trophy room">
        <h2>{earned} / {total} medals</h2>
        <Bar pct={(earned / total) * 100} color="var(--gold)" />
      </Panel>
      <div className="grid trophies">
        {player.achievements.map((a) => {
          const color = a.tier > 0 ? MEDAL_HEX[a.tier - 1] : 'var(--line)';
          return (
            <Panel key={a.def.id} accent={a.tier > 0 ? color : undefined}>
              <div className="row"><b>{a.def.name}</b><span className="pill" style={{ color, borderColor: color }}>{a.tier > 0 ? TIER_NAMES[a.tier - 1] : 'Locked'}</span></div>
              <small className="muted">{a.def.blurb}</small>
              <Bar pct={a.pct} color={color} />
              <small className="muted">{a.value.toLocaleString()}{a.next != null ? ` / ${a.next.toLocaleString()}` : ''} {a.def.unit}</small>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
