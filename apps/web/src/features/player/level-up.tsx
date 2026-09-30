import { useEffect, useState } from 'react';

import { HudLabel, HudPanel, LevelBadge } from './hud';
import { rankFor } from './player-model';
import { RANK_COLOR } from './player-theme';
import { usePlayer } from './use-player';

const STORAGE_KEY = 'lifeos.player.level';

function read(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null; // private mode / blocked storage: the celebration just doesn't remember
  }
}

/**
 * Fires once when the level goes up. The last seen level lives in the browser, so it only ever
 * celebrates a rise you were around for - never on a first visit, and never twice for the same one.
 */
export function LevelUpBanner() {
  const { ready, progress } = usePlayer();
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const seen = read();
    try {
      localStorage.setItem(STORAGE_KEY, String(progress.level));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to server data arriving
    if (seen != null && progress.level > seen) setShown(progress.level);
  }, [ready, progress.level]);

  if (shown == null) return null;
  const rank = rankFor(shown);
  const color = RANK_COLOR[rank.letter];

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 backdrop-blur-sm" onClick={() => setShown(null)}>
      <HudPanel accent={color} className="animate-hud-pop w-[min(92vw,26rem)] p-8 text-center">
        <HudLabel className="text-glow" >level up</HudLabel>
        <div className="my-5 flex justify-center">
          <LevelBadge level={shown} rank={rank} size={130} />
        </div>
        <h2 className="font-display text-2xl font-bold text-glow" style={{ color }}>
          Rank {rank.letter} · {rank.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">You leveled up. Keep the streak alive.</p>
        <button type="button" className="hud-label mt-6 border px-4 py-2 hover:border-primary hover:text-primary" onClick={() => setShown(null)}>
          continue
        </button>
      </HudPanel>
    </div>
  );
}
