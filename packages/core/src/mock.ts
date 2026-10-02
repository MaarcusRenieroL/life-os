import { createModuleMock } from './mock-modules';
import { dayKey, shiftDay } from './player-model';
import type { Task } from './api';
import type { TodayItem, TrendPoint } from './types';

/**
 * A fake gateway for developing the native UIs without a backend or login. `createClient({ fetchImpl })`
 * accepts it; mutations are applied to in-memory state so taps visibly do something.
 */
export function createMockFetch(): typeof fetch {
  const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  const today = dayKey(new Date());

  const items: TodayItem[] = [
    { module: 'tasks', type: 'task_overdue', title: 'Submit tax documents', description: 'Overdue by 2 days', dueAt: hours(-50), entityId: 't1', priority: 'urgent' },
    { module: 'finance', type: 'bill_due', title: 'HDFC Credit Card bill', description: '~₹12,500 expected', dueAt: hours(20), entityId: 'b1', priority: 'info' },
    { module: 'job-tracker', type: 'interview_upcoming', title: 'Interview: Technical at Acme', description: null, dueAt: hours(30), entityId: 'i1', priority: 'warning' },
    { module: 'habit-tracker', type: 'habit_due', title: 'Morning workout', description: 'Daily', dueAt: null, entityId: 'h1', priority: 'info' },
    { module: 'habit-tracker', type: 'habit_due', title: 'Read 20 pages', description: 'Daily', dueAt: null, entityId: 'h2', priority: 'info' },
    { module: 'tasks', type: 'task_due', title: 'Review pull request', description: 'Due today', dueAt: hours(3), entityId: 't2', priority: 'info' },
  ];

  const trends: TrendPoint[] = Array.from({ length: 365 }, (_, i) => {
    const r = (i * 7919) % 11;
    return { date: shiftDay(today, -(364 - i)), tasksCompleted: r < 2 ? 0 : (r % 6) + 1, habitPct: r % 4 === 0 ? 100 : r * 9, spending: r * 300, weightKg: null, mood: r % 3 === 0 ? 4 : null, workouts: r % 5 === 0 ? 1 : 0 };
  });

  const tasks: Task[] = [
    { id: 't1', title: 'Submit tax documents', description: null, status: 'TODO', priority: 'URGENT', dueDate: shiftDay(today, -2), dueTime: null, completedAt: null },
    { id: 't2', title: 'Review pull request', description: null, status: 'TODO', priority: 'HIGH', dueDate: today, dueTime: null, completedAt: null },
    { id: 't3', title: 'Plan next week', description: null, status: 'TODO', priority: 'MEDIUM', dueDate: shiftDay(today, 2), dueTime: null, completedAt: null },
    { id: 't4', title: 'Book dentist', description: null, status: 'DONE', priority: 'LOW', dueDate: shiftDay(today, -1), dueTime: null, completedAt: hours(-20) },
  ];
  const habits = [
    { habit: { id: 'h1', name: 'Morning workout', description: null, category: 'Health' }, todayLog: null as { id: string; logDate: string; status: string } | null },
    { habit: { id: 'h2', name: 'Read 20 pages', description: null, category: 'Mind' }, todayLog: null },
    { habit: { id: 'h3', name: 'Meditate', description: null, category: 'Mind' }, todayLog: { id: 'l3', logDate: today, status: 'COMPLETED' } },
  ];
  const jobs = [
    { id: 'j1', title: 'Backend Engineer', company: 'Acme', status: 'INTERVIEWING', fitScore: 86, createdAt: hours(-200), appliedAt: hours(-180) },
    { id: 'j2', title: 'Software Engineer', company: 'Postman', status: 'APPLIED', fitScore: 74, createdAt: hours(-60), appliedAt: hours(-50) },
    { id: 'j3', title: 'Java Backend Developer', company: 'Citi', status: 'INTERESTED', fitScore: 68, createdAt: hours(-30), appliedAt: null },
  ];
  const week = {
    period: 'WEEK', from: shiftDay(today, -6), to: today, tasksCompleted: 14, tasksDue: 18, taskCompletionPct: 78, habitConsistencyPct: 86, focusHours: 7.5,
    workouts: 3, workoutMinutes: 165, spending: 8400, income: 60000, previousSpending: 9100, previousTasksCompleted: 11, applicationsApplied: 3, applicationsSaved: 4,
    interviews: 1, journalEntries: 3, averageMood: 4, averageEnergy: 3.8, milestonesCompleted: 1, weightChangeKg: null,
    spendingByCategory: [], goals: [], goalBreakdown: { milestone: null, task: null, habit: null, metric: null, workout: null, goalCount: 0 }, unavailableModules: [],
  };

  const moduleRoute = createModuleMock();
  const reply = (data: unknown) => new Response(JSON.stringify({ success: true, message: 'ok', data, timestamp: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  return async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    await new Promise((resolve) => setTimeout(resolve, 120));

    if (path === '/v1/auth/login' || path === '/v1/auth/refresh') return reply({ accessToken: 'mock', refreshToken: 'mock', deviceSessionId: 'mock' });
    if (path === '/v1/auth/logout') return reply(null);
    if (path === '/v1/core/today') return reply(items);
    if (path === '/v1/core/analytics/trends') return reply(trends);
    if (path === '/v1/core/analytics/dashboard') {
      return reply({ today: { date: today, tasksCompleted: 3, focusHours: 1.5, habitsCompleted: 1, habitsScheduled: 3, spending: 450, workouts: 1, mood: 4, energy: 4 }, week, anomalies: [], insights: [], unavailableModules: [] });
    }
    if (path === '/v1/core/quick-capture') return reply({ routed: 'task' });
    if (path === '/v1/tasks' && method === 'GET') return reply(tasks);
    if (path === '/v1/tasks' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { title: string };
      const created: Task = { id: `t${tasks.length + 10}`, title: body.title, description: null, status: 'TODO', priority: 'MEDIUM', dueDate: null, dueTime: null, completedAt: null };
      tasks.unshift(created);
      return reply(created);
    }
    const taskAction = /^\/v1\/tasks\/([^/]+)\/(complete|reopen)$/.exec(path);
    if (taskAction) {
      const task = tasks.find((t) => t.id === taskAction[1]);
      if (task) {
        task.status = taskAction[2] === 'complete' ? 'DONE' : 'TODO';
        task.completedAt = taskAction[2] === 'complete' ? new Date().toISOString() : null;
      }
      return reply(task);
    }
    if (path === '/v1/habits/today') return reply(habits);
    const habitLog = /^\/v1\/habits\/([^/]+)\/logs$/.exec(path);
    if (habitLog) {
      const entry = habits.find((h) => h.habit.id === habitLog[1]);
      if (entry) entry.todayLog = { id: 'l', logDate: today, status: 'COMPLETED' };
      return reply(entry?.todayLog);
    }
    if (path === '/v1/jobs') return reply(jobs);
    if (path === '/v1/finance/analytics/dashboard') return reply({ totalIncome: 60000, totalExpenses: 38200, savings: 21800, fixedMonthlyIncome: 60000 });
    const extra = moduleRoute(path, method);
    if (extra !== undefined) return reply(extra);
    return new Response(JSON.stringify({ message: `mock: no route for ${method} ${path}` }), { status: 404 });
  };
}
