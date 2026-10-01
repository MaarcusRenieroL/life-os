// The website's Home page (apps/web/src/features/player/home-view.tsx), one column.
import { MEDAL_HEX, RANK_HEX, toQuests, type AchievementState, type HeatCell, type Quest } from '@life-os/core';
import { useRouter, type Href } from 'expo-router';
import { Briefcase, Calendar as CalendarIcon, Check, ChartNoAxesCombined, Coins, Dumbbell, ListChecks, ListTodo, Sparkles, StickyNote, Target, Timer, Trophy, Wallet, type LucideIcon } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AttributeMeter, AttributeRadar, HudHeading, HudLabel, HudPanel, LevelBadge, RankChip, StreakFlame, XpBar } from '@/hud';
import { usePlayer } from '@/lib/player';
import { useApi, useSession } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { Text } from '@/text';
import { C, F, inr } from '@/theme';

const TIER_ACCENT = { main: C.magenta, daily: C.cyan, side: C.violet } as const;
const MODULE_ICON: Record<string, LucideIcon> = { tasks: ListTodo, 'habit-tracker': ListChecks, finance: Wallet, calendar: CalendarIcon, notes: StickyNote, 'job-tracker': Briefcase };

const HEAT = ['transparent', '#4fcb6f38', '#4fcb6f73', '#4fcb6fb8', '#7ee89a'];

function QuestRow({ quest }: { quest: Quest }) {
  const accent = TIER_ACCENT[quest.tier];
  const Icon = MODULE_ICON[quest.item.module] ?? Sparkles;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: `${accent}38`, borderLeftWidth: 3, borderLeftColor: accent, backgroundColor: '#16161899' }}>
      <Icon size={18} color={accent} />
      <Text numberOfLines={1} style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '500' }}>{quest.item.title}</Text>
      <View style={{ borderWidth: 1, borderColor: `${C.gold}66`, backgroundColor: `${C.gold}1a`, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ color: C.gold, fontFamily: F.displayBold, fontSize: 11 }}>+{quest.xp}</Text>
      </View>
    </View>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <View style={{ width: '48%', flexGrow: 1, borderWidth: 1, borderColor: C.line, backgroundColor: '#0d0d0f66', padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon size={14} color={C.muted} /><HudLabel>{label}</HudLabel></View>
      <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 24, marginTop: 4 }}>{value}</Text>
      {sub ? <Text style={{ color: C.muted, fontSize: 11 }}>{sub}</Text> : null}
    </View>
  );
}

function Medal({ a, size = 44 }: { a: AchievementState; size?: number }) {
  const color = a.tier > 0 ? MEDAL_HEX[Math.min(a.tier, 4) - 1] : C.line;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}1f` }}>
      <Trophy size={size * 0.42} color={color} />
    </View>
  );
}

function CampaignLog({ grid }: { grid: HeatCell[][] }) {
  return (
    <HudPanel>
      <HudHeading>campaign log</HudHeading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {grid.map((week, w) => (
            <View key={w} style={{ gap: 3 }}>
              {week.map((cell) => (
                <View key={cell.date} style={{ width: 14, height: 14, borderRadius: 2, borderWidth: 1, borderColor: cell.future ? 'transparent' : '#ffffff1a', backgroundColor: cell.future ? 'transparent' : HEAT[cell.intensity], ...(cell.intensity === 4 ? { shadowColor: '#7ee89a', shadowOpacity: 0.7, shadowRadius: 6 } : null) }} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </HudPanel>
  );
}

export default function Home() {
  const api = useApi();
  const router = useRouter();
  const { settings } = useSession();
  const { player, reload } = usePlayer();
  const today = useAsync(() => api.today(), api);
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
  const go = (href: string) => router.navigate(href as Href);

  const portals: { label: string; href: string; icon: LucideIcon; status: string }[] = [
    { label: 'Tasks', href: '/tasks', icon: ListTodo, status: `${(today.data ?? []).filter((i) => i.module === 'tasks').length} on the board` },
    { label: 'Calendar', href: '/calendar', icon: CalendarIcon, status: 'enter' },
    { label: 'Job Tracker', href: '/jobs', icon: Briefcase, status: 'enter' },
    { label: 'Notes', href: '/notes', icon: StickyNote, status: 'enter' },
    { label: 'Finance', href: '/finance', icon: Wallet, status: 'enter' },
    { label: 'Habits', href: '/habits', icon: ListChecks, status: player.streak.current > 0 ? `${player.streak.current}-day streak` : 'start a streak' },
    { label: 'Goals', href: '/goals', icon: Target, status: 'enter' },
    { label: 'Workouts', href: '/workouts', icon: Dumbbell, status: 'enter' },
    { label: 'Trophies', href: '/trophies', icon: Trophy, status: `${player.achievements.reduce((n, a) => n + a.tier, 0)} medals earned` },
    { label: 'Analytics', href: '/analytics', icon: ChartNoAxesCombined, status: 'enter' },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={today.loading} tintColor={C.accent} onRefresh={() => void Promise.all([today.reload(), reload()])} />}>
      {/* Status */}
      <HudPanel accent={rankColor}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <LevelBadge level={player.ready ? player.progress.level : '–'} rank={player.rank} size={84} />
          <View style={{ flex: 1, gap: 6 }}>
            <HudLabel>{greeting}</HudLabel>
            <Text numberOfLines={1} style={{ color: C.text, fontFamily: F.displayBold, fontSize: 28 }}>{name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <RankChip rank={player.rank} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <Text style={{ color: C.muted, fontSize: 12 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <StreakFlame days={player.streak.current} safe={player.streak.activeToday} />
        </View>
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <HudLabel>experience</HudLabel>
            <Text style={{ color: C.muted, fontFamily: F.display, fontSize: 12 }}><Text style={{ color: C.text, fontFamily: F.displayBold }}>{player.progress.into.toLocaleString()}</Text> / {player.progress.span.toLocaleString()} XP <Text style={{ color: C.accent }}>→ LV {player.progress.level + 1}</Text></Text>
          </View>
          <XpBar pct={player.progress.pct} color={rankColor} height={10} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: C.muted, fontSize: 12 }}><Text style={{ color: C.gold, fontFamily: F.displayBold }}>+{player.earnedToday}</Text> XP earned today</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>Best streak {player.streak.longest} days</Text>
          </View>
        </View>
      </HudPanel>

      <HudPanel>
        <HudHeading>attributes</HudHeading>
        <AttributeRadar attributes={player.attributes} size={Math.min(280, 300)} />
      </HudPanel>

      {/* Quests */}
      <HudPanel accent={C.cyan}>
        <HudHeading aside={<Pressable onPress={() => go('/quests')}><HudLabel color={C.cyan}>quest board →</HudLabel></Pressable>}>today&apos;s quests</HudHeading>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Text style={{ color: C.muted, fontSize: 12 }}><Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 16 }}>+{player.earnedToday}</Text> XP today</Text>
          <View style={{ width: 1, height: 12, backgroundColor: C.line }} />
          <Text style={{ color: C.muted, fontSize: 12 }}><Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 16 }}>{quests.length}</Text> remaining</Text>
        </View>
        {quests.length === 0 ? (
          <Text style={{ color: C.accent, textAlign: 'center', padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: `${C.accent}66`, backgroundColor: `${C.accent}0d` }}>All clear. Nothing left on the board.</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {quests.slice(0, 5).map((q, i) => <QuestRow key={`${q.item.module}-${q.item.entityId ?? i}`} quest={q} />)}
            {quests.length > 5 ? <Pressable onPress={() => go('/quests')}><HudLabel>+{quests.length - 5} more</HudLabel></Pressable> : null}
          </View>
        )}
      </HudPanel>

      <HudPanel accent={C.gold}>
        <HudHeading>this week</HudHeading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat icon={ListTodo} label="tasks done" value={week ? `${week.tasksCompleted}` : '—'} sub={week ? `${week.tasksDue} due` : undefined} />
          <Stat icon={Timer} label="focus" value={week ? `${week.focusHours.toFixed(1)}h` : '—'} />
          <Stat icon={Dumbbell} label="workouts" value={week ? `${week.workouts}` : '—'} sub={week ? `${week.workoutMinutes} min` : undefined} />
          <Stat icon={Coins} label="spent" value={week ? inr(week.spending) : '—'} sub={week?.previousSpending != null ? `last wk ${inr(week.previousSpending)}` : undefined} />
        </View>
      </HudPanel>

      {/* Daily challenge */}
      <HudPanel accent={C.gold} style={player.challengeDone ? { borderColor: `${C.gold}80` } : undefined}>
        <HudHeading>daily challenge</HudHeading>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View style={{ width: 48, height: 48, borderWidth: 1, borderColor: player.challengeDone ? C.gold : '#ebebec33', backgroundColor: player.challengeDone ? `${C.gold}26` : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {player.challengeDone ? <Check size={24} color={C.gold} strokeWidth={3} /> : <Target size={24} color={C.muted} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 18 }}>{player.challenge.title}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{player.challengeDone ? 'Challenge won. Come back tomorrow for a new one.' : player.challenge.hint}</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: player.challengeDone ? C.gold : `${C.gold}66`, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ color: C.gold, fontFamily: F.displayBold, fontSize: 13 }}>+50 XP</Text></View>
        </View>
        {!player.challengeDone ? (
          <View style={{ marginTop: 12 }}>
            <XpBar pct={chalPct} color={C.gold} />
            <Text style={{ color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 4 }}>{Math.min(chalValue, chalTarget)} / {chalTarget}</Text>
          </View>
        ) : null}
      </HudPanel>

      <HudPanel accent={C.violet}>
        <HudHeading aside={<Pressable onPress={() => go('/trophies')}><HudLabel color={C.violet}>trophy room →</HudLabel></Pressable>}>almost there</HudHeading>
        {almost.length === 0 ? <Text style={{ color: C.muted }}>Every medal earned. Legendary.</Text> : almost.map((a) => (
          <View key={a.def.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Medal a={a} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{a.def.name}</Text>
                <Text style={{ color: C.muted, fontFamily: F.display, fontSize: 11 }}>{a.value} / {a.next}</Text>
              </View>
              <View style={{ marginTop: 6 }}><XpBar pct={a.pct} color={MEDAL_HEX[Math.min(a.tier, 3)]} height={6} /></View>
            </View>
          </View>
        ))}
      </HudPanel>

      <HudPanel>
        <HudHeading>stats</HudHeading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 14 }}>
          {player.attributes.map((a) => <View key={a.key} style={{ width: '47%', flexGrow: 1 }}><AttributeMeter attribute={a} /></View>)}
        </View>
      </HudPanel>

      <HudPanel accent={C.magenta}>
        <HudHeading aside={<Pressable onPress={() => go('/goals')}><HudLabel color={C.magenta}>all goals →</HudLabel></Pressable>}>boss fights</HudHeading>
        {bosses.length === 0 ? <Text style={{ color: C.muted }}>No active bosses. <Text style={{ color: C.magenta }} onPress={() => go('/goals')}>Set a goal</Text> to give this week a target.</Text> : bosses.map((g) => {
          const progress = Math.round(g.progressPct ?? 0);
          const hp = Math.max(0, 100 - progress);
          const behind = g.expectedPct != null && progress + 5 < g.expectedPct;
          return (
            <View key={g.name} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{g.name}</Text>
                <HudLabel color={behind ? C.destructive : C.accent}>{behind ? 'falling behind' : 'on pace'}</HudLabel>
              </View>
              <XpBar pct={hp} color={C.magenta} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: C.muted, fontSize: 11 }}>boss hp {hp}%</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{g.targetDate ? `by ${new Date(g.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : `${progress}% done`}</Text>
              </View>
            </View>
          );
        })}
      </HudPanel>

      <CampaignLog grid={player.heatmap} />

      {/* Portals */}
      <HudHeading>portals</HudHeading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {portals.map((p) => (
          <Pressable key={p.href} onPress={() => go(p.href)} style={{ width: '47.5%', flexGrow: 1 }}>
            <HudPanel padding={14} style={{ marginBottom: 0 }}>
              <p.icon size={20} color={C.accent} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', marginTop: 8 }}>{p.label}</Text>
              <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{p.status}</Text>
            </HudPanel>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
