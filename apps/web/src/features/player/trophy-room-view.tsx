import { HudHeading, HudLabel, HudPanel, XpBar } from './hud';
import { Medal, MedalTierText } from './medal';
import type { AchievementState } from './player-model';
import { MEDAL_COLOR } from './player-theme';

export function TrophyRoomView({ achievements }: { achievements: AchievementState[] }) {
  const earned = achievements.reduce((n, a) => n + a.tier, 0);
  const total = achievements.reduce((n, a) => n + a.def.tiers.length, 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <HudPanel accent="var(--hud-gold)" className="animate-hud-in p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1 basis-60">
            <HudLabel>achievements</HudLabel>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Trophy room</h1>
            <p className="mt-1 text-sm text-muted-foreground">Medals are earned automatically from what you do. Each has up to four tiers.</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1.5 flex items-baseline justify-between">
              <HudLabel>medals</HudLabel>
              <span className="font-display text-sm tabular-nums">
                <b className="text-hud-gold">{earned}</b> / {total}
              </span>
            </div>
            <XpBar pct={total === 0 ? 0 : (earned / total) * 100} color="var(--hud-gold)" className="h-2.5" />
          </div>
        </div>
      </HudPanel>

      <div>
        <HudHeading>medals</HudHeading>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {achievements.map((a, i) => (
            <HudPanel key={a.def.id} accent={a.tier > 0 ? MEDAL_COLOR[a.tier - 1] : undefined} className="animate-hud-in flex flex-col items-center p-5 text-center" style={{ animationDelay: `${i * 50}ms` }}>
              <Medal achievement={a} size={84} />
              <div className="mt-3 font-display text-base font-bold">{a.def.name}</div>
              <MedalTierText tier={a.tier} className="mt-0.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">{a.def.blurb}</p>

              <div className="mt-3 flex w-full items-center justify-center gap-1.5">
                {a.def.tiers.map((t, ti) => (
                  <span
                    key={t}
                    title={`${t} ${a.def.unit}`}
                    className="h-1.5 flex-1 max-w-10 rounded-[1px]"
                    style={{ background: ti < a.tier ? MEDAL_COLOR[ti] : 'color-mix(in oklab, var(--foreground) 12%, transparent)' }}
                  />
                ))}
              </div>
              <div className="mt-2 font-display text-sm tabular-nums">
                <b>{a.value.toLocaleString()}</b>
                {a.next != null ? <span className="text-muted-foreground"> / {a.next.toLocaleString()} {a.def.unit}</span> : <span className="text-hud-gold"> · maxed</span>}
              </div>
              {a.next != null && <XpBar pct={a.pct} color={MEDAL_COLOR[Math.min(a.tier, 3)]} className="mt-2 h-1.5 w-full" />}
            </HudPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
