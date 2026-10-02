// The website's Home page (apps/web/src/features/player/home-view.tsx).
import { MEDAL_HEX, RANK_HEX, toQuests, type Quest } from '@life-os/core';
import { Briefcase, Calendar as CalendarIcon, Check, ChartNoAxesCombined, Coins, Dumbbell, ListChecks, ListTodo, Sparkles, StickyNote, Target, Timer, Trophy, Wallet, type LucideIcon } from 'lucide-react';

import { AttributeMeter, AttributeRadar, HudHeading, HudLabel, HudPanel, LevelBadge, Medal, RankChip, Stat, StreakFlame, XpBar } from '../hud';
import { useNav } from '../lib/nav';
import { usePlayer } from '../lib/player';
import { useApi, useSession } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { inr } from '../ui';

const TIER_ACCENT = { main: 'var(--hud-magenta)', daily: 'var(--hud-cyan)', side: 'var(--hud-violet)' } as const;
const MODULE_ICON: Record<string, LucideIcon> = { tasks: ListTodo, 'habit-tracker': ListChecks, finance: Wallet, calendar: CalendarIcon, notes: StickyNote, 'job-tracker': Briefcase };
const HEAT = ['transparent', 'oklch(0.75 0.17 149 / 22%)', 'oklch(0.75 0.17 149 / 45%)', 'oklch(0.75 0.17 149 / 72%)', 'oklch(0.85 0.19 149)'];

function QuestRow({ quest }: { quest: Quest }) {
  const accent = TIER_ACCENT[quest.tier];
  const Icon = MODULE_ICON[quest.item.module] ?? Sparkles;
  return (
    <div className="quest" style={{ borderColor: `color-mix(in oklab, ${accent} 22%, var(--border))`, borderLeftColor: accent }}>
      <Icon size={18} style={{ color: accent, flexShrink: 0 }} />
      <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{quest.item.title}</span>
      <span className="quest-xp">+{quest.xp}</span>
    </div>
  );
}

export function HomeScreen() {
  const api = useApi();
  const go = useNav();
  const { settings } = useSession();
  const { player } = usePlayer();
  const today = useAsync(() => api.today(), [api]);
  const quests = toQuests(today.data ?? []);
  const week = player.week;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = (settings.email || 'Player').split(/[\s@]/)[0];
  const rankColor = RANK_HEX[player.rank.letter];
  const [chalValue, chalTarget] = player.challengeProgress;
  const chalPct = Math.min(100, Math.round((chalValue / (chalTarget || 1)) * 100));
  const almost = player.achievements.filter((a) => a.next != null).sort((x, y) => y.pct - x.pct).slice(0, 3);
  const bosses = (week?.goals ?? []).filter((g) => g.status === 'ACTIVE' || g.status === 'IN_PROGRESS' || g.progressPct != null).slice(0, 4);
  const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

  const portals: { label: string; screen: string; icon: LucideIcon; status: string }[] = [
    { label: 'Tasks', screen: 'tasks', icon: ListTodo, status: `${(today.data ?? []).filter((i) => i.module === 'tasks').length} on the board` },
    { label: 'Calendar', screen: 'calendar', icon: CalendarIcon, status: 'enter' },
    { label: 'Job Tracker', screen: 'jobs', icon: Briefcase, status: 'enter' },
    { label: 'Notes', screen: 'notes', icon: StickyNote, status: 'enter' },
    { label: 'Finance', screen: 'finance', icon: Wallet, status: 'enter' },
    { label: 'Habits', screen: 'habits', icon: ListChecks, status: player.streak.current > 0 ? `${player.streak.current}-day streak` : 'start a streak' },
    { label: 'Goals', screen: 'goals', icon: Target, status: 'enter' },
    { label: 'Workouts', screen: 'workouts', icon: Dumbbell, status: 'enter' },
    { label: 'Trophies', screen: 'trophies', icon: Trophy, status: `${player.achievements.reduce((n, a) => n + a.tier, 0)} medals earned` },
    { label: 'Analytics', screen: 'analytics', icon: ChartNoAxesCombined, status: 'enter' },
  ];

  return (
    <div className="home">
      <div className="cols-2">
        <HudPanel accent={rankColor}>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <LevelBadge level={player.ready ? player.progress.level : '–'} rank={player.rank} size={92} />
            <div className="grow" style={{ flexBasis: 224 }}>
              <HudLabel>{greeting}</HudLabel>
              <h1>{name}</h1>
              <div className="row" style={{ justifyContent: 'flex-start', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <RankChip rank={player.rank} />
                <small className="muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</small>
              </div>
            </div>
            <StreakFlame days={player.streak.current} safe={player.streak.activeToday} />
          </div>
          <div style={{ marginTop: 20 }}>
            <div className="row" style={{ alignItems: 'baseline', marginBottom: 6 }}>
              <HudLabel>experience</HudLabel>
              <small className="muted" style={{ fontFamily: 'var(--font-display)' }}><b style={{ color: 'var(--foreground)' }}>{player.progress.into.toLocaleString()}</b> / {player.progress.span.toLocaleString()} XP <span className="good" style={{ marginLeft: 8 }}>→ LV {player.progress.level + 1}</span></small>
            </div>
            <XpBar pct={player.progress.pct} color={rankColor} height={10} />
            <div className="row muted" style={{ marginTop: 8, fontSize: 12 }}>
              <span><b style={{ color: 'var(--hud-gold)', fontFamily: 'var(--font-display)' }}>+{player.earnedToday}</b> XP earned today</span>
              <span>Best streak {player.streak.longest} days</span>
            </div>
          </div>
        </HudPanel>
        <HudPanel style={delay(60)}>
          <HudHeading>attributes</HudHeading>
          <AttributeRadar attributes={player.attributes} />
        </HudPanel>
      </div>

      <div className="cols-2">
        <HudPanel accent="var(--hud-cyan)" style={delay(120)}>
          <HudHeading aside={<button className="link-label" onClick={() => go('quests')}><HudLabel color="var(--hud-cyan)">quest board →</HudLabel></button>}>today&apos;s quests</HudHeading>
          <div className="row muted" style={{ justifyContent: 'flex-start', gap: 12, marginBottom: 12, fontSize: 12 }}>
            <span><b style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)', fontSize: 16 }}>+{player.earnedToday}</b> XP today</span>
            <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <span><b style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)', fontSize: 16 }}>{quests.length}</b> remaining</span>
          </div>
          {quests.length === 0 ? <p className="dashed-ok">All clear. Nothing left on the board.</p> : (
            <div className="stack" style={{ gap: 6 }}>
              {quests.slice(0, 5).map((q, i) => <QuestRow key={`${q.item.module}-${q.item.entityId ?? i}`} quest={q} />)}
              {quests.length > 5 && <button className="link-label" style={{ textAlign: 'center', padding: '4px 0' }} onClick={() => go('quests')}><HudLabel>+{quests.length - 5} more</HudLabel></button>}
            </div>
          )}
        </HudPanel>
        <HudPanel accent="var(--hud-gold)" style={delay(180)}>
          <HudHeading>this week</HudHeading>
          <div className="stat-grid">
            <Stat icon={ListTodo} label="tasks done" value={week ? `${week.tasksCompleted}` : '—'} sub={week ? `${week.tasksDue} due` : undefined} />
            <Stat icon={Timer} label="focus" value={week ? `${week.focusHours.toFixed(1)}h` : '—'} />
            <Stat icon={Dumbbell} label="workouts" value={week ? `${week.workouts}` : '—'} sub={week ? `${week.workoutMinutes} min` : undefined} />
            <Stat icon={Coins} label="spent" value={week ? inr(week.spending) : '—'} sub={week?.previousSpending != null ? `last wk ${inr(week.previousSpending)}` : undefined} />
          </div>
        </HudPanel>
      </div>

      <div className="cols-eq">
        <HudPanel accent="var(--hud-gold)" style={player.challengeDone ? { borderColor: 'color-mix(in oklab, var(--hud-gold) 50%, transparent)' } : undefined}>
          <HudHeading>daily challenge</HudHeading>
          <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', flexShrink: 0, border: `1px solid ${player.challengeDone ? 'var(--hud-gold)' : 'color-mix(in oklab, var(--foreground) 20%, transparent)'}`, background: player.challengeDone ? 'color-mix(in oklab, var(--hud-gold) 15%, transparent)' : 'none', color: player.challengeDone ? 'var(--hud-gold)' : 'var(--muted-foreground)' }}>
              {player.challengeDone ? <Check size={24} strokeWidth={3} /> : <Target size={24} />}
            </div>
            <div className="grow"><div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{player.challenge.title}</div><p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>{player.challengeDone ? 'Challenge won. Come back tomorrow for a new one.' : player.challenge.hint}</p></div>
            <span className="quest-xp" style={{ fontSize: 13, padding: '4px 8px' }}>+50 XP</span>
          </div>
          {!player.challengeDone && <div style={{ marginTop: 12 }}><XpBar pct={chalPct} color="var(--hud-gold)" /><div className="muted" style={{ textAlign: 'right', fontSize: 11, marginTop: 4 }}>{Math.min(chalValue, chalTarget)} / {chalTarget}</div></div>}
        </HudPanel>
        <HudPanel accent="var(--hud-violet)">
          <HudHeading aside={<button className="link-label" onClick={() => go('trophies')}><HudLabel color="var(--hud-violet)">trophy room →</HudLabel></button>}>almost there</HudHeading>
          {almost.length === 0 ? <p className="muted">Every medal earned. Legendary.</p> : (
            <div className="stack" style={{ gap: 14 }}>
              {almost.map((a) => (
                <div key={a.def.id} className="row" style={{ justifyContent: 'flex-start', gap: 12 }}>
                  <Medal a={a} />
                  <div className="grow">
                    <div className="row"><span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.def.name}</span><small className="muted" style={{ fontFamily: 'var(--font-display)' }}>{a.value} / {a.next}</small></div>
                    <div style={{ marginTop: 6 }}><XpBar pct={a.pct} color={MEDAL_HEX[Math.min(a.tier, 3)]} height={6} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </HudPanel>
      </div>

      <div className="cols-rev">
        <HudPanel style={delay(220)}>
          <HudHeading>stats</HudHeading>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 14 }}>{player.attributes.map((a) => <AttributeMeter key={a.key} attribute={a} />)}</div>
        </HudPanel>
        <HudPanel accent="var(--hud-magenta)" style={delay(260)}>
          <HudHeading aside={<button className="link-label" onClick={() => go('goals')}><HudLabel color="var(--hud-magenta)">all goals →</HudLabel></button>}>boss fights</HudHeading>
          {bosses.length === 0 ? <p className="muted">No active bosses. <button className="link-label" style={{ color: 'var(--hud-magenta)' }} onClick={() => go('goals')}>Set a goal</button> to give this week a target.</p> : (
            <div className="stack" style={{ gap: 16 }}>
              {bosses.map((g) => {
                const progress = Math.round(g.progressPct ?? 0);
                const hp = Math.max(0, 100 - progress);
                const behind = g.expectedPct != null && progress + 5 < g.expectedPct;
                return (
                  <div key={g.name}>
                    <div className="row" style={{ marginBottom: 4 }}><span style={{ fontWeight: 500 }}>{g.name}</span><HudLabel color={behind ? 'var(--destructive)' : 'var(--primary)'}>{behind ? 'falling behind' : 'on pace'}</HudLabel></div>
                    <XpBar pct={hp} color="var(--hud-magenta)" />
                    <div className="row muted" style={{ marginTop: 4, fontSize: 11 }}><span>boss hp {hp}%</span><span>{g.targetDate ? `by ${new Date(g.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : `${progress}% done`}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </HudPanel>
      </div>

      <HudPanel>
        <HudHeading>campaign log</HudHeading>
        <div className="heat" style={{ overflowX: 'auto', paddingBottom: 4 }}>
          {player.heatmap.map((week, w) => (
            <div key={w} className="heat-col" style={{ gap: 3 }}>
              {week.map((cell) => <i key={cell.date} className="heat-cell" title={cell.future ? cell.date : `${cell.date} · ${cell.xp} XP`} style={{ background: cell.future ? 'transparent' : HEAT[cell.intensity], borderColor: cell.future ? 'transparent' : undefined, boxShadow: cell.intensity === 4 ? '0 0 8px oklch(0.85 0.19 149 / 70%)' : undefined }} />)}
            </div>
          ))}
        </div>
      </HudPanel>

      <div>
        <HudHeading>portals</HudHeading>
        <div className="portal-grid">
          {portals.map((p, i) => (
            <button key={p.screen} className="portal" style={{ animation: 'hud-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: `${380 + i * 25}ms`, color: 'inherit', font: 'inherit' }} onClick={() => go(p.screen)}>
              <p.icon size={20} style={{ color: 'var(--primary)' }} />
              <div style={{ fontWeight: 600 }}>{p.label}</div>
              <div className="muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.status}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
