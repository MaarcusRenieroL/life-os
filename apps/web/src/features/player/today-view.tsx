import { Trophy } from 'lucide-react';

import { HudHeading, HudLabel, HudPanel } from './hud';
import { groupQuests, type Quest, type QuestTier } from './player-model';
import { questKey, TIER } from './player-theme';
import { QuestCard } from './quest-card';

export interface TodayViewProps {
  quests: Quest[];
  loading: boolean;
  /** Quest keys finished a moment ago - shown struck through with their reward before disappearing. */
  cleared: ReadonlySet<string>;
  pendingKey: string | null;
  onComplete: (quest: Quest) => void;
  clearedToday: number;
  xpToday: number;
}

const TIERS: QuestTier[] = ['main', 'daily', 'side'];

/** A ring showing how much of today's board is done. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" className="text-foreground/10" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)', filter: 'drop-shadow(0 0 6px var(--primary))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-2xl leading-none font-bold tabular-nums">{pct}%</div>
          <div className="hud-label mt-0.5" style={{ fontSize: '0.5rem' }}>
            cleared
          </div>
        </div>
      </div>
    </div>
  );
}

export function TodayView({ quests, loading, cleared, pendingKey, onComplete, clearedToday, xpToday }: TodayViewProps) {
  const groups = groupQuests(quests);
  const remaining = quests.filter((q) => !cleared.has(questKey(q))).length;
  const total = clearedToday + remaining;
  const potential = quests.reduce((sum, q) => sum + q.xp, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <HudPanel className="animate-hud-in p-5">
        <div className="flex flex-wrap items-center gap-6">
          <ProgressRing done={clearedToday} total={total} />
          <div className="min-w-0 flex-1 basis-56">
            <HudLabel>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</HudLabel>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Quest board</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {remaining === 0 ? 'Every quest cleared.' : `${remaining} quest${remaining === 1 ? '' : 's'} left - the best move is at the top of each list.`}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="font-display text-2xl font-bold text-hud-gold tabular-nums">+{xpToday}</div>
              <HudLabel>xp today</HudLabel>
            </div>
            <div>
              <div className="font-display text-2xl font-bold tabular-nums">{potential}</div>
              <HudLabel>xp available</HudLabel>
            </div>
          </div>
        </div>
      </HudPanel>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading the board…</p>
      ) : quests.length === 0 ? (
        <HudPanel accent="var(--hud-gold)" className="animate-hud-pop p-10 text-center">
          <Trophy className="mx-auto size-10 text-hud-gold" />
          <h2 className="mt-3 font-display text-2xl font-bold text-hud-gold text-glow">All clear</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nothing needs you right now. Go touch grass, or get ahead on a goal.</p>
        </HudPanel>
      ) : (
        TIERS.filter((t) => groups[t].length > 0).map((tier, ti) => (
          <section key={tier} className="animate-hud-in" style={{ animationDelay: `${(ti + 1) * 80}ms` }}>
            <HudHeading
              aside={
                <span className="hud-label" style={{ color: TIER[tier].accent }}>
                  {groups[tier].length}
                </span>
              }
            >
              <span style={{ color: TIER[tier].accent }}>{TIER[tier].label}</span>
              <span className="ml-3 hidden font-sans text-[11px] font-normal tracking-normal normal-case text-muted-foreground sm:inline">{TIER[tier].hint}</span>
            </HudHeading>
            <div className="flex flex-col gap-1.5">
              {groups[tier].map((quest) => {
                const key = questKey(quest);
                return <QuestCard key={key} quest={quest} onComplete={onComplete} pending={pendingKey === key} cleared={cleared.has(key)} />;
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
