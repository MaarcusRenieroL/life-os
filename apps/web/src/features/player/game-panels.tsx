import { Check, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { HudHeading, HudPanel, XpBar } from './hud';
import { Medal, MedalTierText } from './medal';
import { CHALLENGE_BONUS, type AchievementState, type Challenge, type HeatCell } from './player-model';
import { MEDAL_COLOR } from './player-theme';

/** Today's rotating challenge: win it for bonus XP. */
export function DailyChallengeCard({ challenge, done, progress }: { challenge: Challenge; done: boolean; progress: [number, number] }) {
  const [value, target] = progress;
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <HudPanel accent="var(--hud-gold)" className={cn('animate-hud-in p-5', done && 'border-hud-gold/50')}>
      <HudHeading>daily challenge</HudHeading>
      <div className="flex items-start gap-4">
        <div className={cn('grid size-12 shrink-0 place-items-center border', done ? 'border-hud-gold bg-hud-gold/15 text-hud-gold' : 'border-foreground/20 text-muted-foreground')}>
          {done ? <Check className="size-6" strokeWidth={3} /> : <Target className="size-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold">{challenge.title}</div>
          <p className="text-xs text-muted-foreground">{done ? 'Challenge won. Come back tomorrow for a new one.' : challenge.hint}</p>
        </div>
        <span className={cn('shrink-0 border px-2 py-1 font-display text-sm font-bold tabular-nums', done ? 'border-hud-gold bg-hud-gold/20 text-hud-gold' : 'border-hud-gold/40 text-hud-gold/80')}>
          +{CHALLENGE_BONUS} XP
        </span>
      </div>
      {!done && (
        <div className="mt-3">
          <XpBar pct={pct} color="var(--hud-gold)" />
          <div className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
            {Math.min(value, target)} / {target}
          </div>
        </div>
      )}
    </HudPanel>
  );
}

const HEAT = ['transparent', 'oklch(0.75 0.17 149 / 22%)', 'oklch(0.75 0.17 149 / 45%)', 'oklch(0.75 0.17 149 / 72%)', 'oklch(0.85 0.19 149)'];

/** The last weeks as a grid - one square a day, brighter the more XP. Your consistency at a glance. */
export function CampaignLog({ grid }: { grid: HeatCell[][] }) {
  return (
    <HudPanel className="animate-hud-in p-5">
      <HudHeading>campaign log</HudHeading>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {grid.map((column, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {column.map((cell) => (
              <div
                key={cell.date}
                title={cell.future ? cell.date : `${cell.date} · ${cell.xp} XP`}
                className={cn('size-3.5 rounded-[2px] border', cell.future ? 'border-transparent' : 'border-foreground/10')}
                style={{
                  background: cell.future ? 'transparent' : HEAT[cell.intensity],
                  boxShadow: cell.intensity === 4 ? '0 0 8px oklch(0.85 0.19 149 / 70%)' : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        less
        {HEAT.map((c, i) => (
          <span key={i} className="size-3 rounded-[2px] border border-foreground/10" style={{ background: c }} />
        ))}
        more
      </div>
    </HudPanel>
  );
}

/** The medals you're closest to earning - a reason to do one more thing. */
export function AlmostThere({ achievements }: { achievements: AchievementState[] }) {
  const close = achievements
    .filter((a) => a.next != null)
    .sort((x, y) => y.pct - x.pct)
    .slice(0, 3);
  return (
    <HudPanel accent="var(--hud-violet)" className="animate-hud-in p-5">
      <HudHeading
        aside={
          <Link to="/achievements" className="hud-label text-hud-violet hover:underline">
            trophy room →
          </Link>
        }
      >
        almost there
      </HudHeading>
      {close.length === 0 ? (
        <p className="text-sm text-muted-foreground">Every medal earned. Legendary.</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {close.map((a) => (
            <li key={a.def.id} className="flex items-center gap-3">
              <Medal achievement={a} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.def.name}</span>
                  <span className="shrink-0 font-display text-[11px] tabular-nums text-muted-foreground">
                    {a.value} / {a.next}
                  </span>
                </div>
                <XpBar pct={a.pct} color={MEDAL_COLOR[Math.min(a.tier, 3)]} className="mt-1 h-1.5" />
                <MedalTierText tier={a.tier + 1} className="mt-1 block" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </HudPanel>
  );
}

