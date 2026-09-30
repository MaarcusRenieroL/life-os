import { attributesFrom, levelFor, rankFor, toQuests } from '@/features/player/player-model';
import type { PeriodSummary } from '@/features/analytics/types';
import type { TodayItem } from '@/features/core/core-api';
import { HomeView } from '@/features/player/home-view';
import { TodayView } from '@/features/player/today-view';

/**
 * Dev-only preview (route /dev/hud, absent from production builds): the real pages, rendered with
 * fixed mock data so the look can be reviewed without a login or a running backend.
 */
const iso = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const items: TodayItem[] = [
  { module: 'tasks', type: 'task_overdue', title: 'Submit tax documents', description: 'Overdue by 2 days', dueAt: iso(-50), entityId: 't1', priority: 'urgent' },
  { module: 'finance', type: 'bill_due', title: 'HDFC Credit Card bill', description: '~₹12,500 expected', dueAt: iso(20), entityId: 'b1', priority: 'info' },
  { module: 'job-tracker', type: 'interview_upcoming', title: 'Interview: Technical at Acme', description: null, dueAt: iso(30), entityId: 'i1', priority: 'warning' },
  { module: 'habit-tracker', type: 'habit_due', title: 'Morning workout', description: 'Daily', dueAt: null, entityId: 'h1', priority: 'info' },
  { module: 'habit-tracker', type: 'habit_due', title: 'Read 20 pages', description: 'Daily', dueAt: null, entityId: 'h2', priority: 'info' },
  { module: 'tasks', type: 'task_due', title: 'Review pull request #58', description: 'Due today', dueAt: iso(3), entityId: 't2', priority: 'info' },
  { module: 'calendar', type: 'event_today', title: 'Team sync', description: '4:00 PM', dueAt: iso(5), entityId: 'e1', priority: 'info' },
  { module: 'notes', type: 'note_followup', title: 'Follow up: architecture notes', description: null, dueAt: iso(72), entityId: 'n1', priority: 'info' },
];

const week = {
  tasksCompleted: 14, tasksDue: 18, taskCompletionPct: 78, habitConsistencyPct: 86, focusHours: 7.5, workouts: 3, workoutMinutes: 165,
  spending: 8400, income: 60000, previousSpending: 9100, applicationsApplied: 3, interviews: 1, journalEntries: 3,
  goals: [
    { name: 'Ship Life OS release 1', status: 'ACTIVE', progressPct: 62, expectedPct: 70, targetDate: '2026-10-31' },
    { name: 'Land an interview', status: 'ACTIVE', progressPct: 40, expectedPct: 35, targetDate: '2026-11-15' },
    { name: 'Run a 10K', status: 'ACTIVE', progressPct: 18, expectedPct: 30, targetDate: '2026-12-01' },
  ],
} as unknown as PeriodSummary;

export function HudGallery() {
  const progress = levelFor(9_640);
  const quests = toQuests(items);
  const view = new URLSearchParams(location.search).get('view') ?? 'home';

  return (
    <div className="dark hud-bg min-h-screen bg-background p-6 text-foreground">
      {view === 'today' ? (
        <TodayView quests={quests} loading={false} cleared={new Set(['tasks:task_due:t2'])} pendingKey={null} onComplete={() => {}} clearedToday={6} xpToday={145} />
      ) : (
        <HomeView
          name="Maarcus"
          greeting="Good evening"
          progress={progress}
          rank={rankFor(progress.level)}
          streak={{ current: 12, longest: 21, activeToday: true }}
          xpToday={145}
          attributes={attributesFrom(week)}
          week={week}
          quests={quests}
          clearedToday={6}
          portalStatus={{ '/tasks': '5 on the board', '/finance': '₹1,24,300 balance', '/jobs': '53 tracked', '/notes': '38 notes', '/habits': '12-day streak', '/vault': '41 items', '/email': '2 awaiting your OK' }}
          portalAlerts={{ '/finance': 3, '/jobs': 1, '/email': 2 }}
          activity={[
            { id: '1', text: 'Vault entry updated: GitHub', at: iso(-1) },
            { id: '2', text: 'Logged in from new device', at: iso(-5) },
            { id: '3', text: 'Recurring pattern detected: Netflix', at: iso(-26) },
          ]}
          attention={[
            { title: '3 transactions need review', meta: 'finance', link: '/finance' },
            { title: '2 email actions waiting for your OK', meta: 'email', link: '/email' },
          ]}
          aiCostUsd={1.42}
        />
      )}
    </div>
  );
}
