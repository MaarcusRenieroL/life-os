import type { PeriodSummary, TrendPoint } from '@/features/analytics/types';
import type { TodayItem } from '@/features/core/core-api';

/*
 * The game layer. Nothing here is stored: XP, level and streaks are worked out from the activity
 * the modules already record (tasks done, habits kept, workouts, reflections), so the numbers can
 * never drift out of sync with reality, can't be cheated, and are retroactive the day this ships.
 * The trade-off is that "lifetime" means the last year the analytics endpoint is asked for.
 */

// -- XP ---------------------------------------------------------------------

const XP_PER = {
  task: 15,
  workout: 50,
  /** A day with every scheduled habit done earns the full amount; partial days earn a share. */
  habitDay: 40,
  /** Logging a mood counts as a reflection. */
  reflection: 10,
} as const;

/** The day's activity as the analytics trend reports it. */
export type DayActivity = Pick<TrendPoint, 'date' | 'tasksCompleted' | 'habitPct' | 'workouts' | 'mood'>;

export function dayXp(day: DayActivity): number {
  const habits = day.habitPct == null ? 0 : Math.round((Math.min(100, Math.max(0, day.habitPct)) / 100) * XP_PER.habitDay);
  const challenge = challengeDone(challengeFor(day.date), day) ? CHALLENGE_BONUS : 0;
  return (
    day.tasksCompleted * XP_PER.task +
    day.workouts * XP_PER.workout +
    habits +
    (day.mood == null ? 0 : XP_PER.reflection) +
    challenge
  );
}

export function totalXp(days: DayActivity[]): number {
  return days.reduce((sum, day) => sum + dayXp(day), 0);
}

// -- Daily challenge --------------------------------------------------------

export const CHALLENGE_BONUS = 50;

export interface Challenge {
  id: 'tasks3' | 'habits' | 'move' | 'reflect' | 'tasks5';
  title: string;
  hint: string;
  /** How far along a day is, as [value, target]. */
  progress: (day: DayActivity) => [number, number];
}

const CHALLENGES: Challenge[] = [
  { id: 'tasks3', title: 'Clear 3 tasks', hint: 'Three quests down before bed.', progress: (d) => [d.tasksCompleted, 3] },
  { id: 'habits', title: 'Keep every habit', hint: 'Every scheduled habit, no skips.', progress: (d) => [d.habitPct === 100 ? 1 : 0, 1] },
  { id: 'move', title: 'Log a workout', hint: 'Any session counts.', progress: (d) => [d.workouts, 1] },
  { id: 'reflect', title: 'Check in with yourself', hint: 'Log your mood or a journal entry.', progress: (d) => [d.mood == null ? 0 : 1, 1] },
  { id: 'tasks5', title: 'Clear 5 tasks', hint: 'A big day. Five quests.', progress: (d) => [d.tasksCompleted, 5] },
];

/** Whole days since 1970 for a YYYY-MM-DD, so the rotation is the same on every device. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The day's challenge. Deterministic, so past days can be scored retroactively like everything else. */
export function challengeFor(date: string): Challenge {
  const n = dayNumber(date);
  return CHALLENGES[Number.isNaN(n) ? 0 : ((n % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
}

export function challengeDone(challenge: Challenge, day: DayActivity): boolean {
  const [value, target] = challenge.progress(day);
  return value >= target;
}

// -- Levels -----------------------------------------------------------------

const MAX_LEVEL = 99;

/** Total XP needed to reach a level: 100, 300, 600, 1000, 1500... (level 1 costs nothing). */
export function xpToReach(level: number): number {
  return 50 * (level - 1) * level;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside this level. */
  into: number;
  /** XP this level costs in total. */
  span: number;
  pct: number;
  total: number;
}

export function levelFor(xp: number): LevelProgress {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (level < MAX_LEVEL && xpToReach(level + 1) <= total) level++;
  const floor = xpToReach(level);
  const span = xpToReach(level + 1) - floor;
  const into = total - floor;
  return { level, into, span, pct: Math.min(100, Math.round((into / span) * 100)), total };
}

// -- Rank -------------------------------------------------------------------

export type RankLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface Rank {
  letter: RankLetter;
  title: string;
}

const RANKS: { from: number; rank: Rank }[] = [
  { from: 41, rank: { letter: 'S', title: 'Legend' } },
  { from: 28, rank: { letter: 'A', title: 'Elite' } },
  { from: 18, rank: { letter: 'B', title: 'Veteran' } },
  { from: 10, rank: { letter: 'C', title: 'Adventurer' } },
  { from: 5, rank: { letter: 'D', title: 'Apprentice' } },
  { from: 1, rank: { letter: 'E', title: 'Rookie' } },
];

export function rankFor(level: number): Rank {
  return (RANKS.find((r) => level >= r.from) ?? RANKS[RANKS.length - 1]).rank;
}

// -- Streaks ----------------------------------------------------------------

export interface Streak {
  current: number;
  longest: number;
  /** Today already counts, so the streak is safe. False means it's still waiting on today's first win. */
  activeToday: boolean;
}

/**
 * A streak is consecutive days with any XP. Today gets a grace: if nothing has happened yet the
 * streak still stands (counted up to yesterday) instead of showing 0 every morning.
 * `days` need not be sorted or contiguous - a missing date is simply a day with no activity.
 */
export function streakOf(days: DayActivity[], today: string): Streak {
  const active = new Set(days.filter((d) => dayXp(d) > 0).map((d) => d.date));
  const activeToday = active.has(today);

  let current = 0;
  for (let cursor = activeToday ? today : shiftDay(today, -1); active.has(cursor); cursor = shiftDay(cursor, -1)) {
    current++;
  }

  let longest = 0;
  let run = 0;
  const ordered = [...active].sort();
  for (let i = 0; i < ordered.length; i++) {
    run = i > 0 && shiftDay(ordered[i - 1], 1) === ordered[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest: Math.max(longest, current), activeToday };
}

/** Local-calendar day arithmetic on YYYY-MM-DD, immune to DST (works at noon, not midnight). */
export function shiftDay(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// -- Attributes -------------------------------------------------------------

export type AttributeKey = 'STR' | 'DIS' | 'FOC' | 'EXE' | 'MND' | 'WLT' | 'CAR';

export interface Attribute {
  key: AttributeKey;
  label: string;
  /** What feeds it, shown on hover so a low score explains itself. */
  source: string;
  /** 0-100, or null when the week has no data for it (shown as unranked, not as zero). */
  value: number | null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** The week in seven numbers. Each is deliberately simple and explainable. */
export function attributesFrom(week: PeriodSummary | undefined): Attribute[] {
  const w = week;
  const savingsShare = w && w.income > 0 ? clamp(((w.income - w.spending) / w.income) * 100) : null;
  return [
    { key: 'STR', label: 'Strength', source: 'Workouts this week vs a target of 3', value: w ? clamp((w.workouts / 3) * 100) : null },
    { key: 'DIS', label: 'Discipline', source: 'Habit consistency this week', value: w?.habitConsistencyPct == null ? null : clamp(w.habitConsistencyPct) },
    { key: 'FOC', label: 'Focus', source: 'Focus hours this week vs a target of 10', value: w ? clamp((w.focusHours / 10) * 100) : null },
    { key: 'EXE', label: 'Execution', source: 'Tasks completed vs tasks due', value: w?.taskCompletionPct == null ? null : clamp(w.taskCompletionPct) },
    { key: 'MND', label: 'Mind', source: 'Journal entries this week (4 = full)', value: w ? clamp((w.journalEntries / 4) * 100) : null },
    { key: 'WLT', label: 'Wealth', source: 'Share of income kept this week', value: savingsShare },
    { key: 'CAR', label: 'Career', source: 'Applications and interviews this week', value: w ? clamp(w.applicationsApplied * 12 + w.interviews * 25) : null },
  ];
}

// -- Quests -----------------------------------------------------------------

export type QuestTier = 'main' | 'daily' | 'side';

export interface Quest {
  item: TodayItem;
  tier: QuestTier;
  xp: number;
  /** Can be finished right here, without leaving the page. */
  completable: boolean;
}

/** What finishing something is worth. Harder or more time-sensitive things pay more. */
export function questXp(item: TodayItem): number {
  const urgent = item.priority === 'urgent';
  switch (item.type) {
    case 'task_overdue':
      return 30;
    case 'task_due':
      return urgent ? 25 : 15;
    case 'habit_due':
      return 20;
    case 'habit_reminder_upcoming':
      return 10;
    case 'interview_upcoming':
      return 40;
    case 'bill_due':
      return 25;
    case 'budget_alert':
      return 15;
    case 'event_today':
      return 10;
    case 'note_followup':
      return 10;
    default:
      return urgent ? 25 : 10;
  }
}

function isCompletable(item: TodayItem): boolean {
  return (item.type === 'task_due' || item.type === 'task_overdue' || item.type === 'habit_due') && !!item.entityId;
}

/**
 * Sorts the day into tiers. Main quests are what will hurt if ignored (overdue, urgent, bills);
 * daily quests are today's routine (habits, things due today); side quests are everything else.
 */
export function toQuests(items: TodayItem[], now: Date = new Date()): Quest[] {
  const today = dayKey(now);
  return items.map((item) => {
    const due = item.dueAt ? new Date(item.dueAt) : null;
    const overdue = !!due && due.getTime() < now.getTime() && dayKey(due) !== today;
    const dueToday = !due || dayKey(due) === today;
    let tier: QuestTier = 'side';
    if (overdue || item.priority === 'urgent' || item.type === 'bill_due' || item.type === 'interview_upcoming') tier = 'main';
    else if (dueToday || item.type === 'habit_due') tier = 'daily';
    return { item, tier, xp: questXp(item), completable: isCompletable(item) };
  });
}

export function groupQuests(quests: Quest[]): Record<QuestTier, Quest[]> {
  const groups: Record<QuestTier, Quest[]> = { main: [], daily: [], side: [] };
  for (const quest of quests) groups[quest.tier].push(quest);
  // Most rewarding first within a tier, so the best move is always at the top.
  for (const tier of Object.keys(groups) as QuestTier[]) groups[tier].sort((a, b) => b.xp - a.xp);
  return groups;
}

// -- Lifetime stats & achievements ------------------------------------------

export interface LifetimeStats {
  tasks: number;
  workouts: number;
  perfectHabitDays: number;
  reflectionDays: number;
  activeDays: number;
  challengesWon: number;
  bestStreak: number;
  level: number;
}

export function lifetimeStats(days: DayActivity[], today: string, level: number): LifetimeStats {
  return {
    tasks: days.reduce((n, d) => n + d.tasksCompleted, 0),
    workouts: days.reduce((n, d) => n + d.workouts, 0),
    perfectHabitDays: days.filter((d) => d.habitPct === 100).length,
    reflectionDays: days.filter((d) => d.mood != null).length,
    activeDays: days.filter((d) => dayXp(d) > 0).length,
    challengesWon: days.filter((d) => challengeDone(challengeFor(d.date), d)).length,
    bestStreak: streakOf(days, today).longest,
    level,
  };
}

export interface AchievementDef {
  id: string;
  name: string;
  blurb: string;
  unit: string;
  /** Thresholds for Bronze, Silver, Gold (and Platinum when there is a fourth). */
  tiers: number[];
  value: (s: LifetimeStats) => number;
}

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'tasks', name: 'Task Slayer', blurb: 'Tasks completed', unit: 'tasks', tiers: [10, 50, 250, 1000], value: (s) => s.tasks },
  { id: 'workouts', name: 'Iron Pilgrim', blurb: 'Workouts logged', unit: 'workouts', tiers: [5, 25, 100], value: (s) => s.workouts },
  { id: 'streak', name: 'Unbroken', blurb: 'Longest daily streak', unit: 'days', tiers: [3, 7, 30, 100], value: (s) => s.bestStreak },
  { id: 'habits', name: 'Creature of Habit', blurb: 'Days with every habit kept', unit: 'days', tiers: [5, 20, 60], value: (s) => s.perfectHabitDays },
  { id: 'reflect', name: 'Inner Compass', blurb: 'Days you checked in with yourself', unit: 'days', tiers: [5, 20, 60], value: (s) => s.reflectionDays },
  { id: 'challenge', name: 'Challenger', blurb: 'Daily challenges won', unit: 'wins', tiers: [5, 20, 60], value: (s) => s.challengesWon },
  { id: 'regular', name: 'Regular', blurb: 'Days you earned XP', unit: 'days', tiers: [10, 50, 200], value: (s) => s.activeDays },
  { id: 'level', name: 'Ascendant', blurb: 'Player level', unit: 'level', tiers: [5, 10, 20, 30], value: (s) => s.level },
];

export interface AchievementState {
  def: AchievementDef;
  value: number;
  /** 0 = locked, 1 = Bronze... */
  tier: number;
  /** The next threshold, or null once every tier is earned. */
  next: number | null;
  /** Progress from the previous threshold toward the next, 0-100 (100 when maxed). */
  pct: number;
}

export function evaluateAchievements(stats: LifetimeStats): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.value(stats);
    const tier = def.tiers.filter((t) => value >= t).length;
    const next = tier < def.tiers.length ? def.tiers[tier] : null;
    const floor = tier === 0 ? 0 : def.tiers[tier - 1];
    const pct = next == null ? 100 : Math.min(100, Math.round(((value - floor) / (next - floor)) * 100));
    return { def, value, tier, next, pct };
  });
}

/** Medals earned since `seen` (id -> tier last acknowledged). */
export function newlyUnlocked(seen: Record<string, number>, now: AchievementState[]): { id: string; name: string; tier: number }[] {
  return now.filter((a) => a.tier > (seen[a.def.id] ?? 0)).map((a) => ({ id: a.def.id, name: a.def.name, tier: a.tier }));
}

// -- Activity heatmap -------------------------------------------------------

export interface HeatCell {
  date: string;
  xp: number;
  /** 0 = nothing, 4 = a huge day. */
  intensity: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export function intensityOf(xp: number): HeatCell['intensity'] {
  if (xp <= 0) return 0;
  if (xp < 50) return 1;
  if (xp < 100) return 2;
  if (xp < 200) return 3;
  return 4;
}

/**
 * `weeks` columns of 7 days (Monday first), ending with the week that contains `today`. Days after
 * today are padded and marked `future` so the last column lines up.
 */
export function activityGrid(days: DayActivity[], today: string, weeks = 12): HeatCell[][] {
  const xpByDate = new Map(days.map((d) => [d.date, dayXp(d)]));
  const weekday = (new Date(`${today}T12:00:00`).getDay() + 6) % 7; // Mon = 0
  const lastMonday = shiftDay(today, -weekday);
  const firstMonday = shiftDay(lastMonday, -7 * (weeks - 1));
  const grid: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = shiftDay(firstMonday, w * 7 + d);
      const xp = xpByDate.get(date) ?? 0;
      column.push({ date, xp, intensity: intensityOf(xp), future: date > today });
    }
    grid.push(column);
  }
  return grid;
}
