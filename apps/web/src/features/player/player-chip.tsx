import { Link } from 'react-router-dom';

import { LevelBadge, XpBar } from './hud';
import { RANK_COLOR } from './player-theme';
import { usePlayer } from './use-player';

/** Level, rank and XP in the header, on every page, linking to the full status screen. */
export function PlayerChip() {
  const { ready, progress, rank, streak } = usePlayer();
  if (!ready) return null;
  return (
    <Link to="/home" className="flex items-center gap-2.5 px-1 transition-opacity hover:opacity-90" title={`${progress.into} / ${progress.span} XP to level ${progress.level + 1}`}>
      <LevelBadge level={progress.level} rank={rank} size={34} />
      <div className="hidden w-28 sm:block">
        <div className="flex items-baseline justify-between">
          <span className="hud-label" style={{ color: RANK_COLOR[rank.letter], fontSize: '0.6rem' }}>
            {rank.letter}-rank
          </span>
          {streak.current > 0 && <span className="font-display text-[11px] font-semibold text-orange-400 tabular-nums">🔥{streak.current}</span>}
        </div>
        <XpBar pct={progress.pct} color={RANK_COLOR[rank.letter]} className="mt-1 h-1.5" />
      </div>
    </Link>
  );
}
