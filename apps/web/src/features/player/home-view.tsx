import { formatDistanceToNow } from 'date-fns';
import { Coins, Dumbbell, ListTodo, Timer, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { PeriodSummary } from '@/features/analytics/types';
import { useVisibleNavItems } from '@/features/modules/use-modules';

import { AttributeMeter, AttributeRadar, HudHeading, HudLabel, HudPanel, LevelBadge, RankChip, StreakFlame, XpBar } from './hud';
import { AlmostThere, CampaignLog, DailyChallengeCard } from './game-panels';
import type { AchievementState, Attribute, Challenge, HeatCell, LevelProgress, Quest, Rank, Streak } from './player-model';
import { RANK_COLOR } from './player-theme';
import { QuestCard } from './quest-card';

export interface HomeViewProps {
  name: string;
  greeting: string;
  progress: LevelProgress;
  rank: Rank;
  streak: Streak;
  xpToday: number;
  attributes: Attribute[];
  week?: PeriodSummary;
  quests: Quest[];
  clearedToday: number;
  /** One short status line per module path, shown under its portal. */
  portalStatus: Record<string, string>;
  /** Paths that have something waiting, lit up with a badge. */
  portalAlerts: Record<string, number>;
  activity: { id: string; text: string; at: string }[];
  attention: { title: string; meta: string; link: string }[];
  aiCostUsd?: number;
  challenge: { challenge: Challenge; done: boolean; progress: [number, number] };
  achievements: AchievementState[];
  heatmap: HeatCell[][];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function HomeView(p: HomeViewProps) {
  const navItems = useVisibleNavItems();
  const rankColor = RANK_COLOR[p.rank.letter];
  const nextLevel = p.progress.level + 1;
  const remaining = p.quests.length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      {/* -- Status -------------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <HudPanel accent={rankColor} className="animate-hud-in p-5">
          <div className="flex flex-wrap items-center gap-5">
            <LevelBadge level={p.progress.level} rank={p.rank} size={92} />
            <div className="min-w-0 flex-1 basis-56">
              <HudLabel>{p.greeting}</HudLabel>
              <h1 className="mt-1 truncate font-display text-3xl font-bold tracking-tight">{p.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <RankChip rank={p.rank} />
                <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <StreakFlame days={p.streak.current} safe={p.streak.activeToday} />
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <HudLabel>experience</HudLabel>
              <span className="font-display text-xs tabular-nums text-muted-foreground">
                <b className="text-foreground">{p.progress.into.toLocaleString()}</b> / {p.progress.span.toLocaleString()} XP
                <span className="ml-2 text-primary">→ LV {nextLevel}</span>
              </span>
            </div>
            <XpBar pct={p.progress.pct} color={rankColor} className="h-2.5" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <b className="font-display text-hud-gold">+{p.xpToday}</b> XP earned today
              </span>
              <span>Best streak {p.streak.longest} days</span>
            </div>
          </div>
        </HudPanel>

        <HudPanel className="animate-hud-in p-5" style={{ animationDelay: '60ms' }}>
          <HudHeading>attributes</HudHeading>
          <AttributeRadar attributes={p.attributes} />
        </HudPanel>
      </div>

      {/* -- Quests + report ---------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <HudPanel accent="var(--hud-cyan)" className="animate-hud-in p-5" style={{ animationDelay: '120ms' }}>
          <HudHeading
            aside={
              <Link to="/today" className="hud-label text-hud-cyan hover:underline">
                quest board →
              </Link>
            }
          >
            today&apos;s quests
          </HudHeading>
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              <b className="font-display text-base text-foreground">{p.clearedToday}</b> cleared
            </span>
            <span className="h-3 w-px bg-border" />
            <span>
              <b className="font-display text-base text-foreground">{remaining}</b> remaining
            </span>
          </div>
          {remaining === 0 ? (
            <p className="border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary">All clear. Nothing left on the board.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {p.quests.slice(0, 5).map((q, i) => (
                <QuestCard key={`${q.item.module}-${q.item.entityId ?? i}`} quest={q} compact />
              ))}
              {remaining > 5 && (
                <Link to="/today" className="hud-label pt-1 text-center text-muted-foreground hover:text-primary">
                  +{remaining - 5} more
                </Link>
              )}
            </div>
          )}
        </HudPanel>

        <HudPanel accent="var(--hud-gold)" className="animate-hud-in p-5" style={{ animationDelay: '180ms' }}>
          <HudHeading>this week</HudHeading>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat icon={ListTodo} label="tasks done" value={p.week ? `${p.week.tasksCompleted}` : '—'} sub={p.week ? `${p.week.tasksDue} due` : undefined} />
            <Stat icon={Timer} label="focus" value={p.week ? `${p.week.focusHours.toFixed(1)}h` : '—'} />
            <Stat icon={Dumbbell} label="workouts" value={p.week ? `${p.week.workouts}` : '—'} sub={p.week ? `${p.week.workoutMinutes} min` : undefined} />
            <Stat icon={Coins} label="spent" value={p.week ? inr(p.week.spending) : '—'} sub={p.week?.previousSpending != null ? `last wk ${inr(p.week.previousSpending)}` : undefined} />
          </div>
        </HudPanel>
      </div>

      {/* -- Daily challenge + nearest medals ------------------------------ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DailyChallengeCard {...p.challenge} />
        <AlmostThere achievements={p.achievements} />
      </div>

      {/* -- Attributes detail + boss fights ------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <HudPanel className="animate-hud-in p-5" style={{ animationDelay: '220ms' }}>
          <HudHeading>stats</HudHeading>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
            {p.attributes.map((a) => (
              <AttributeMeter key={a.key} attribute={a} />
            ))}
          </div>
        </HudPanel>

        <HudPanel accent="var(--hud-magenta)" className="animate-hud-in p-5" style={{ animationDelay: '260ms' }}>
          <HudHeading
            aside={
              <Link to="/goals" className="hud-label text-hud-magenta hover:underline">
                all goals →
              </Link>
            }
          >
            boss fights
          </HudHeading>
          <BossFights goals={p.week?.goals ?? []} />
        </HudPanel>
      </div>

      <CampaignLog grid={p.heatmap} />

      {/* -- Alerts + activity --------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <HudPanel accent="var(--destructive)" className="animate-hud-in p-5" style={{ animationDelay: '300ms' }}>
          <HudHeading>alerts</HudHeading>
          {p.attention.length === 0 ? (
            <p className="text-sm text-primary">✓ All systems nominal.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {p.attention.map((a) => (
                <li key={a.title}>
                  <Link to={a.link} className="flex items-start gap-2.5 text-sm hover:text-primary">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span className="flex-1">{a.title}</span>
                    <span className="hud-label shrink-0">{a.meta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HudPanel>

        <HudPanel className="animate-hud-in p-5" style={{ animationDelay: '340ms' }}>
          <HudHeading
            aside={
              <Link to="/vault/audit-log" className="hud-label hover:text-primary">
                full log →
              </Link>
            }
          >
            activity log
          </HudHeading>
          {p.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 font-mono text-xs">
              {p.activity.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="text-primary">›</span>
                  <span className="flex-1 truncate">{e.text}</span>
                  <span className="shrink-0 text-muted-foreground">{formatDistanceToNow(new Date(e.at), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </HudPanel>
      </div>

      {/* -- Portals ------------------------------------------------------- */}
      <div>
        <HudHeading>portals</HudHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {navItems.filter((n) => n.to !== '/home' && n.to !== '/today').map((n, i) => {
            const alerts = p.portalAlerts[n.to] ?? 0;
            return (
              <Link key={n.to} to={n.to} className="animate-hud-in" style={{ animationDelay: `${380 + i * 25}ms` }}>
                <HudPanel interactive className="relative flex h-full flex-col gap-2 p-3.5">
                  <n.icon className="size-5 text-primary" />
                  <div className="text-sm font-semibold">{n.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.portalStatus[n.to] ?? 'enter'}</div>
                  {alerts > 0 && (
                    <span className="absolute top-2 right-2 grid min-w-5 place-items-center bg-destructive px-1 font-display text-[10px] font-bold text-white">{alerts}</span>
                  )}
                </HudPanel>
              </Link>
            );
          })}
        </div>
        {p.aiCostUsd != null && <p className="hud-label mt-4 text-right">claude usage this month · ${p.aiCostUsd.toFixed(2)}</p>}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <HudLabel>{label}</HudLabel>
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** A goal as a boss: its health bar drains as you make progress. */
function BossFights({ goals }: { goals: PeriodSummary['goals'] }) {
  const active = goals.filter((g) => g.status === 'ACTIVE' || g.status === 'IN_PROGRESS' || g.progressPct != null).slice(0, 4);
  if (active.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active bosses. <Link to="/goals" className="text-hud-magenta hover:underline">Set a goal</Link> to give this week a target.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {active.map((g) => {
        const progress = Math.round(g.progressPct ?? 0);
        const hp = Math.max(0, 100 - progress);
        const behind = g.expectedPct != null && progress + 5 < g.expectedPct;
        return (
          <div key={g.name}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{g.name}</span>
              <span className={`hud-label shrink-0 ${behind ? 'text-destructive' : 'text-primary'}`}>{behind ? 'falling behind' : 'on pace'}</span>
            </div>
            <XpBar pct={hp} color="var(--hud-magenta)" />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>boss hp {hp}%</span>
              <span>{g.targetDate ? `by ${new Date(g.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : `${progress}% done`}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
