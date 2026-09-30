import { CalendarDays, CheckCheck, ChevronsUp, Compass, Dumbbell, Flame, Repeat, Target, Lock, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { AchievementState } from './player-model';
import { MEDAL_COLOR, medalLabel } from './player-theme';

const ICON: Record<string, LucideIcon> = {
  tasks: CheckCheck,
  workouts: Dumbbell,
  streak: Flame,
  habits: Repeat,
  reflect: Compass,
  challenge: Target,
  regular: CalendarDays,
  level: ChevronsUp,
};

const HEX = 'polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

/** A hexagonal medal: dim and locked at tier 0, coloured by tier once earned, with a slow shine on gold and above. */
export function Medal({ achievement, size = 64 }: { achievement: AchievementState; size?: number }) {
  const { tier, def } = achievement;
  const Icon = ICON[def.id] ?? Target;
  const color = tier > 0 ? MEDAL_COLOR[tier - 1] : undefined;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0" style={{ clipPath: HEX, background: color ?? 'var(--border)', opacity: tier > 0 ? 1 : 0.6 }} />
      <div className="absolute inset-[2px] grid place-items-center overflow-hidden bg-card" style={{ clipPath: HEX }}>
        {tier > 0 ? (
          <>
            <Icon style={{ color, width: size * 0.42, height: size * 0.42, filter: `drop-shadow(0 0 6px ${color})` }} />
            {tier >= 3 && <span className="animate-hud-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />}
          </>
        ) : (
          <Lock className="text-muted-foreground/50" style={{ width: size * 0.3, height: size * 0.3 }} />
        )}
      </div>
      {tier > 1 && (
        <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-sm border bg-background font-display text-[10px] font-bold" style={{ color, borderColor: color }}>
          {tier}
        </span>
      )}
    </div>
  );
}

export function MedalTierText({ tier, className }: { tier: number; className?: string }) {
  return (
    <span className={cn('hud-label', className)} style={tier > 0 ? { color: MEDAL_COLOR[tier - 1] } : undefined}>
      {medalLabel(tier)}
    </span>
  );
}
