import { useEffect } from 'react';
import { toast } from 'sonner';

import { newlyUnlocked } from './player-model';
import { MEDAL_COLOR, medalLabel } from './player-theme';
import { playCue } from './sound';
import { usePlayer } from './use-player';

const KEY = 'lifeos.player.medals';

function read(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

/**
 * Announces medals earned since you last looked. The first ever load just records where you stand -
 * it would be silly to fire eight toasts for things earned before this existed.
 */
export function AchievementWatcher() {
  const { ready, achievements } = usePlayer();

  useEffect(() => {
    if (!ready) return;
    const seen = read();
    const current = Object.fromEntries(achievements.map((a) => [a.def.id, a.tier]));
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
    if (seen == null) return;
    const fresh = newlyUnlocked(seen, achievements);
    if (fresh.length === 0) return;
    playCue('medal');
    for (const medal of fresh) {
      toast(`Medal unlocked: ${medal.name}`, {
        description: `${medalLabel(medal.tier)} tier`,
        style: { borderColor: MEDAL_COLOR[medal.tier - 1] },
        duration: 7000,
      });
    }
  }, [ready, achievements]);

  return null;
}
