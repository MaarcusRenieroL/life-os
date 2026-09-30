import { RANK_HEX } from '@life-os/core';

import { usePlayer } from './lib/player';

/** The always-visible status strip: level, rank, XP bar and streak. */
export function PlayerBar() {
  const { player, loading } = usePlayer();
  const { progress, rank, streak } = player;
  const color = RANK_HEX[rank.letter];
  const pct = Math.min(100, Math.round(progress.pct));

  return (
    <header className="player-bar">
      <div className="lv" style={{ borderColor: color, color }}>
        <small>LV</small>
        {loading && !player.ready ? '–' : progress.level}
      </div>
      <div className="bar-body">
        <div className="bar-top">
          <b style={{ color }}>
            {rank.letter} · {rank.title}
          </b>
          <span>
            {progress.into.toLocaleString()} / {progress.span.toLocaleString()} XP
          </span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div className="chip">🔥 {streak.current}<small>day streak</small></div>
      <div className="chip gold">+{player.earnedToday}<small>XP today</small></div>
    </header>
  );
}
