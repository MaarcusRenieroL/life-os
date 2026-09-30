import { describe, expect, it } from 'vitest';

import type { PeriodSummary } from '@/features/analytics/types';
import type { TodayItem } from '@/features/core/core-api';

import {
  attributesFrom,
  dayXp,
  groupQuests,
  levelFor,
  questXp,
  rankFor,
  shiftDay,
  streakOf,
  toQuests,
  totalXp,
  xpToReach,
  type DayActivity,
} from './player-model';

const day = (date: string, over: Partial<DayActivity> = {}): DayActivity => ({
  date,
  tasksCompleted: 0,
  habitPct: null,
  workouts: 0,
  mood: null,
  ...over,
});

describe('xp', () => {
  it('rewards tasks, workouts, habits and reflection', () => {
    expect(dayXp(day('2026-01-01', { tasksCompleted: 3, workouts: 1, habitPct: 100, mood: 4 }))).toBe(3 * 15 + 50 + 40 + 10);
  });

  it('gives partial habit days a share and ignores missing or out-of-range percentages', () => {
    expect(dayXp(day('d', { habitPct: 50 }))).toBe(20);
    expect(dayXp(day('d', { habitPct: null }))).toBe(0);
    expect(dayXp(day('d', { habitPct: 250 }))).toBe(40);
    expect(dayXp(day('d', { habitPct: -10 }))).toBe(0);
  });

  it('totals a range', () => {
    expect(totalXp([day('a', { tasksCompleted: 1 }), day('b', { workouts: 1 })])).toBe(65);
  });
});

describe('levels', () => {
  it('follows the published curve', () => {
    expect([1, 2, 3, 4, 5, 10].map(xpToReach)).toEqual([0, 100, 300, 600, 1000, 4500]);
  });

  it('starts at level 1 with nothing', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, span: 100, pct: 0 });
    expect(levelFor(-50).level).toBe(1);
  });

  it('crosses a level exactly at its threshold', () => {
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(299).level).toBe(2);
    expect(levelFor(300).level).toBe(3);
  });

  it('reports progress inside the current level', () => {
    expect(levelFor(200)).toMatchObject({ level: 2, into: 100, span: 200, pct: 50 });
  });

  it('never exceeds the level cap', () => {
    expect(levelFor(10_000_000).level).toBe(99);
  });
});

describe('rank', () => {
  it('climbs with level', () => {
    expect([1, 4, 5, 10, 18, 28, 41, 99].map((l) => rankFor(l).letter)).toEqual(['E', 'E', 'D', 'C', 'B', 'A', 'S', 'S']);
  });
});

describe('streaks', () => {
  const active = (date: string) => day(date, { tasksCompleted: 1 });

  it('counts consecutive active days including today', () => {
    const s = streakOf([active('2026-03-08'), active('2026-03-09'), active('2026-03-10')], '2026-03-10');
    expect(s).toEqual({ current: 3, longest: 3, activeToday: true });
  });

  it('keeps the streak alive until today has had a chance', () => {
    const s = streakOf([active('2026-03-08'), active('2026-03-09')], '2026-03-10');
    expect(s).toEqual({ current: 2, longest: 2, activeToday: false });
  });

  it('breaks after a missed day but remembers the longest run', () => {
    const s = streakOf([active('2026-03-01'), active('2026-03-02'), active('2026-03-03'), active('2026-03-08')], '2026-03-10');
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
  });

  it('does not count a day with no XP', () => {
    expect(streakOf([day('2026-03-10')], '2026-03-10').current).toBe(0);
  });

  it('is immune to unsorted input and month boundaries', () => {
    const s = streakOf([active('2026-03-01'), active('2026-02-28'), active('2026-02-27')], '2026-03-01');
    expect(s.current).toBe(3);
  });

  it('shifts days across DST and year boundaries', () => {
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDay('2026-03-08', 1)).toBe('2026-03-09');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('attributes', () => {
  const week = {
    workouts: 3,
    habitConsistencyPct: 80,
    focusHours: 5,
    taskCompletionPct: 60,
    journalEntries: 2,
    income: 1000,
    spending: 400,
    applicationsApplied: 2,
    interviews: 1,
  } as PeriodSummary;

  it('turns a week into seven 0-100 scores', () => {
    const byKey = Object.fromEntries(attributesFrom(week).map((a) => [a.key, a.value]));
    expect(byKey).toEqual({ STR: 100, DIS: 80, FOC: 50, EXE: 60, MND: 50, WLT: 60, CAR: 49 });
  });

  it('leaves an attribute unranked rather than zero when there is no data for it', () => {
    const byKey = Object.fromEntries(attributesFrom({ ...week, habitConsistencyPct: null, taskCompletionPct: null, income: 0 }).map((a) => [a.key, a.value]));
    expect(byKey.DIS).toBeNull();
    expect(byKey.EXE).toBeNull();
    expect(byKey.WLT).toBeNull();
  });

  it('caps at 100 and copes with no week at all', () => {
    expect(attributesFrom({ ...week, workouts: 9, applicationsApplied: 20 }).find((a) => a.key === 'STR')?.value).toBe(100);
    expect(attributesFrom({ ...week, applicationsApplied: 20 }).find((a) => a.key === 'CAR')?.value).toBe(100);
    expect(attributesFrom(undefined).every((a) => a.value === null)).toBe(true);
  });
});

describe('quests', () => {
  const now = new Date('2026-03-10T10:00:00');
  const item = (over: Partial<TodayItem>): TodayItem => ({
    module: 'tasks', type: 'task_due', title: 't', description: null, dueAt: null, entityId: 'id', priority: 'info', ...over,
  });

  it('pays more for harder or time-sensitive quests', () => {
    expect(questXp(item({ type: 'task_overdue' }))).toBeGreaterThan(questXp(item({ type: 'task_due' })));
    expect(questXp(item({ type: 'task_due', priority: 'urgent' }))).toBeGreaterThan(questXp(item({ type: 'task_due' })));
    expect(questXp(item({ type: 'interview_upcoming' }))).toBe(40);
    expect(questXp(item({ type: 'something_new' }))).toBe(10);
  });

  it('tiers the day: what hurts if ignored is a main quest', () => {
    const quests = toQuests(
      [
        item({ type: 'task_overdue', dueAt: '2026-03-08T09:00:00' }),
        item({ module: 'finance', type: 'bill_due', entityId: null }),
        item({ module: 'habit-tracker', type: 'habit_due' }),
        item({ dueAt: '2026-03-10T17:00:00' }),
        item({ dueAt: '2026-03-14T09:00:00' }),
      ],
      now,
    );
    expect(quests.map((q) => q.tier)).toEqual(['main', 'main', 'daily', 'daily', 'side']);
  });

  it('marks only tasks and habits with an id as completable in place', () => {
    const quests = toQuests([item({}), item({ module: 'habit-tracker', type: 'habit_due' }), item({ type: 'task_due', entityId: null }), item({ module: 'finance', type: 'bill_due' })], now);
    expect(quests.map((q) => q.completable)).toEqual([true, true, false, false]);
  });

  it('lists the most rewarding quest first in each tier', () => {
    const groups = groupQuests(toQuests([item({ dueAt: '2026-03-10T09:00:00', type: 'task_due' }), item({ dueAt: '2026-03-10T09:00:00', type: 'habit_due', module: 'habit-tracker' })], now));
    expect(groups.daily.map((q) => q.xp)).toEqual([20, 15]);
  });
});
