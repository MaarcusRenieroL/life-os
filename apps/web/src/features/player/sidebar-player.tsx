import { Link } from 'react-router-dom';

import { LevelBadge, XpBar } from './hud';
import { RANK_COLOR } from './player-theme';
import { usePlayer } from './use-player';

/** Your level at the top of the sidebar; hidden when the sidebar collapses to icons. */
export function SidebarPlayer() {
  const { ready, progress, rank, streak, challengeDone } = usePlayer();
  if (!ready) return null;
  const color = RANK_COLOR[rank.letter];
  return (
    <Link to="/home" className="hud-panel mx-2 mt-2 flex items-center gap-3 p-2.5 group-data-[collapsible=icon]:hidden" style={{ ['--hud-accent' as string]: color }}>
      <LevelBadge level={progress.level} rank={rank} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="hud-label" style={{ color }}>{rank.title}</span>
          {streak.current > 0 && <span className="font-display text-[11px] font-semibold text-orange-400">🔥{streak.current}</span>}
        </div>
        <XpBar pct={progress.pct} color={color} className="mt-1.5 h-1.5" />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{progress.into} / {progress.span} XP</span>
          {challengeDone && <span className="text-hud-gold">★ challenge</span>}
        </div>
      </div>
    </Link>
  );
}
