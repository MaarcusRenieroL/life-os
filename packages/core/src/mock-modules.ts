import { dayKey, shiftDay } from './player-model';
import type { CalendarEvent, Exercise, FinanceAccount, FinanceCategory, FinanceTransaction, GoalDetail, GoalSummary, Habit, NoteSummary, Routine, SessionDetail } from './models';

/** Fixture data and routes for the module screens (goals, calendar, notes, workouts, finance, ...). */
export function createModuleMock() {
  const today = dayKey(new Date());
  const at = (day: string, time: string) => new Date(`${day}T${time}`).toISOString();
  const page = <T>(content: T[]) => ({ content, totalElements: content.length, totalPages: 1, number: 0, last: true });

  const goalProgress = (overallPct: number) => ({ overallPct, expectedPct: 50, milestonesDone: 2, milestonesTotal: 5, tasksDone: 4, tasksTotal: 9 });
  const goals: GoalSummary[] = [
    { id: 'g1', name: 'Ship Life OS 1.0', description: 'Release web + backend', area: 'CAREER', priority: 1, status: 'ON_TRACK', startDate: shiftDay(today, -60), targetDate: shiftDay(today, 30), reviewDue: true, blocked: false, progress: goalProgress(64) },
    { id: 'g2', name: 'Run a half marathon', description: null, area: 'HEALTH', priority: 2, status: 'AT_RISK', startDate: shiftDay(today, -30), targetDate: shiftDay(today, 90), reviewDue: false, blocked: false, progress: goalProgress(22) },
  ];
  const goalDetail = (g: GoalSummary): GoalDetail => ({
    goal: g,
    milestones: [{ id: 'm1', title: 'Finance audit', targetDate: null, completed: true }, { id: 'm2', title: 'Native apps', targetDate: shiftDay(today, 10), completed: false }],
    metrics: [{ id: 'mt1', name: 'Weekly km', metricType: 'COUNT', unit: 'km', startValue: 0, targetValue: 40, currentValue: 12, progressPct: 30 }],
    reviews: [], tasks: [{ id: 't2', title: 'Review pull request', status: 'TODO', dueDate: today }],
  });

  const events: CalendarEvent[] = [
    { id: 'e1', title: 'Standup', description: null, location: 'Zoom', category: 'WORK', color: null, allDay: false, startAt: at(today, '09:30'), endAt: at(today, '09:45'), startDate: null, endDate: null },
    { id: 'e2', title: 'Gym', description: null, location: null, category: 'GYM', color: null, allDay: false, startAt: at(shiftDay(today, 1), '18:00'), endAt: at(shiftDay(today, 1), '19:00'), startDate: null, endDate: null },
    { id: 'e3', title: 'Mum’s birthday', description: null, location: null, category: 'PERSONAL', color: null, allDay: true, startAt: null, endAt: null, startDate: shiftDay(today, 3), endDate: shiftDay(today, 3) },
  ];

  const notes: NoteSummary[] = [
    { id: 'n1', title: 'Architecture notes', description: 'Services and Kafka topics', noteType: 'TECHNICAL', tags: [{ id: 'tg1', name: 'dev', color: null }], isPinned: true, isFavorite: false, isArchived: false, updatedAt: new Date().toISOString() },
    { id: 'n2', title: 'Reading list', description: null, noteType: 'BOOK', tags: [], isPinned: false, isFavorite: true, isArchived: false, updatedAt: new Date().toISOString() },
  ];
  const noteBody = (n: NoteSummary) => ({ ...n, content: `# ${n.title}\n\nSome content.`, wordCount: 4, readingTimeMinutes: 1, createdAt: n.updatedAt });

  const exercises: Exercise[] = [
    { id: 'x1', name: 'Bench Press', category: 'CHEST', equipment: 'BARBELL', instructions: null, custom: false },
    { id: 'x2', name: 'Squat', category: 'LEGS', equipment: 'BARBELL', instructions: null, custom: false },
    { id: 'x3', name: 'Pull-up', category: 'BACK', equipment: 'BODYWEIGHT', instructions: null, custom: false },
  ];
  const routines: Routine[] = [{ id: 'r1', name: 'Push day', description: null, template: false, exercises: [{ exerciseId: 'x1', exerciseName: 'Bench Press', category: 'CHEST', position: 0, targetSets: 3, targetReps: 8, targetWeight: 60, restSeconds: 90 }] }];
  let session: SessionDetail | null = null;
  const startSession = (name: string): SessionDetail => ({
    session: { id: 's1', name, status: 'IN_PROGRESS', scheduledFor: null, startedAt: new Date().toISOString(), completedAt: null, durationSeconds: null, notes: null, totalSets: 2, completedSets: 0, volume: 0, prCount: 0 },
    exercises: [{ exerciseId: 'x1', exerciseName: 'Bench Press', category: 'CHEST', previousBest: 62.5, sets: [1, 2].map((n) => ({ id: `set${n}`, setNumber: n, targetReps: 8, targetWeight: 60, actualReps: null, actualWeight: null, restSeconds: 90, completed: false, pr: false })) }],
  });

  const accounts: FinanceAccount[] = [
    { id: 'a1', accountName: 'HDFC Savings', accountType: 'SAVINGS', bankName: 'HDFC', accountNumberLastFour: '1234', currencyCode: 'INR', currentBalance: 184200, transactionCount: 42, isActive: true, isPrimary: true },
    { id: 'a2', accountName: 'ICICI Credit Card', accountType: 'CREDIT_CARD', bankName: 'ICICI', accountNumberLastFour: '9876', currencyCode: 'INR', currentBalance: 12500, transactionCount: 17, isActive: true, isPrimary: false },
  ];
  const categories: FinanceCategory[] = [
    { id: 'c1', name: 'Groceries', type: 'EXPENSE', color: '#3ddc97', icon: '🛒', isActive: true },
    { id: 'c2', name: 'Dining', type: 'EXPENSE', color: '#f2b84b', icon: '🍜', isActive: true },
    { id: 'c3', name: 'Salary', type: 'INCOME', color: '#35c6e8', icon: '💼', isActive: true },
  ];
  const txns: FinanceTransaction[] = [
    { id: 'f1', accountId: 'a1', transactionDate: today, description: 'BigBasket', amount: 1840, type: 'DEBIT', categoryId: 'c1', categoryIds: ['c1'], notes: null, isTransfer: false, isDuplicate: false, status: 'ACTIVE' },
    { id: 'f2', accountId: 'a2', transactionDate: shiftDay(today, -1), description: 'Blue Tokai', amount: 420, type: 'DEBIT', categoryId: null, categoryIds: [], notes: null, isTransfer: false, isDuplicate: false, status: 'PENDING' },
    { id: 'f3', accountId: 'a1', transactionDate: shiftDay(today, -3), description: 'Salary', amount: 60000, type: 'CREDIT', categoryId: 'c3', categoryIds: ['c3'], notes: null, isTransfer: false, isDuplicate: false, status: 'ACTIVE' },
  ];
  const habitList: Habit[] = [
    { id: 'h1', name: 'Morning workout', description: null, category: 'Health', type: 'BINARY', frequencyType: 'DAILY', frequencyConfig: {}, status: 'ACTIVE', startDate: shiftDay(today, -40) },
    { id: 'h2', name: 'Read 20 pages', description: null, category: 'Mind', type: 'COUNT', frequencyType: 'DAILY', frequencyConfig: {}, targetValue: 20, targetUnit: 'pages', status: 'ACTIVE', startDate: shiftDay(today, -40) },
  ];

  let inbox = [
    { id: 'n1', module: 'tasks', type: 'task_overdue', title: 'Submit tax documents is overdue', body: 'Overdue by 2 days', metadata: { taskId: 't1' }, read: false, occurredAt: new Date(Date.now() - 3_600_000).toISOString() },
    { id: 'n2', module: 'finance-tracker', type: 'SUBSCRIPTION_RENEWING', title: 'HDFC Credit Card bill due tomorrow', body: '~₹12,500 expected', read: false, occurredAt: new Date(Date.now() - 7_200_000).toISOString() },
    { id: 'n3', module: 'habit-tracker', type: 'HABIT_STREAK_AT_RISK', title: 'Meditate streak hit 10 days', body: null, metadata: { habitId: 'h1' }, read: true, occurredAt: new Date(Date.now() - 86_400_000).toISOString() },
    { id: 'n4', module: 'core', type: 'ai_fallback', title: 'Ollama could not read an email', body: null, read: false, requiresAiFallbackApproval: true, aiFallbackApproved: null, occurredAt: new Date(Date.now() - 90_000_000).toISOString() },
  ] as Array<Record<string, unknown> & { id: string; read: boolean }>;
  const pending = (n: Record<string, unknown>) => n.requiresAiFallbackApproval === true && n.aiFallbackApproved == null;

  return function route(path: string, method: string): unknown | undefined {
    const g = (re: RegExp) => re.exec(path);
    if (path === '/v1/core/notifications' && method === 'GET') return page(inbox);
    if (path === '/v1/core/notifications/unread-count') return { count: inbox.filter((n) => !n.read).length };
    if (path === '/v1/core/notifications/read-all') { inbox = inbox.map((n) => ({ ...n, read: true })); return null; }
    const nr = g(/^\/v1\/core\/notifications\/([^/]+)\/read$/);
    if (nr) { inbox = inbox.map((n) => (n.id === nr[1] ? { ...n, read: true } : n)); return null; }
    if (method === 'DELETE' && path === '/v1/core/notifications/read') { const before = inbox.length; inbox = inbox.filter((n) => !n.read || pending(n)); return { deleted: before - inbox.length }; }
    if (method === 'DELETE' && path === '/v1/core/notifications') { const before = inbox.length; inbox = inbox.filter(pending); return { deleted: before - inbox.length }; }
    const nd = g(/^\/v1\/core\/notifications\/([^/]+)$/);
    if (method === 'DELETE' && nd) { inbox = inbox.filter((n) => n.id !== nd[1]); return null; }
    if (method === 'GET') {
      if (path === '/v1/tasks/projects' || path === '/v1/tasks/goals') return [{ id: 'p1', name: 'Life OS', createdAt: today }];
      if (g(/^\/v1\/tasks\/[^/]+\/subtasks$/)) return [];
      if (path === '/v1/habits') return habitList;
      if (g(/^\/v1\/habits\/[^/]+\/streak$/)) return { currentStreak: 6, longestStreak: 14 };
      if (path === '/v1/habits/analytics') return { healthScore: { score: 78 }, trend: [0, 1, 2, 3].map((i) => ({ weekStart: shiftDay(today, -7 * (3 - i)), score: 60 + i * 8 })), habitPerformance: habitList.map((h, i) => ({ habitId: h.id, name: h.name, completions: 20 - i * 5, scheduledOccurrences: 28, completionRate: 71 - i * 20, currentStreak: 6, longestStreak: 14 })) };
      if (path === '/v1/goals') return goals;
      const gd = g(/^\/v1\/goals\/([^/]+)$/);
      if (gd) return goalDetail(goals.find((x) => x.id === gd[1]) ?? goals[0]);
      if (path === '/v1/calendar/events') return events;
      if (path === '/v1/calendar/events/free-slots') return [{ startAt: at(today, '10:00'), endAt: at(today, '12:30'), durationMinutes: 150 }];
      if (path === '/v1/notes') return page(notes);
      const nd = g(/^\/v1\/notes\/([^/]+)$/);
      if (nd) return noteBody(notes.find((n) => n.id === nd[1]) ?? notes[0]);
      if (path === '/v1/notes/trash') return [];
      if (path === '/v1/folders') return [{ id: 'fo1', name: 'Work', noteCount: 1, children: [] }];
      if (path === '/v1/tags') return [{ id: 'tg1', name: 'dev', color: null }];
      if (path === '/v1/workouts/exercises') return exercises;
      if (path === '/v1/workouts/routines') return routines;
      if (path === '/v1/workouts/routines/templates') return [{ id: 'rt1', name: 'Full body A', description: null, template: true, exercises: [] }];
      if (path === '/v1/workouts/sessions/current') return session;
      if (path === '/v1/workouts/sessions') return [];
      if (path === '/v1/workouts/records') return [{ exerciseId: 'x1', exerciseName: 'Bench Press', category: 'CHEST', best: { weight: 62.5, reps: 5, achievedAt: today } }];
      if (path === '/v1/workouts/measurements') return [{ id: 'ms1', measuredOn: today, weightKg: 74.2, chestCm: null, waistCm: 82, armsCm: null, legsCm: null, bodyFatPct: 16, notes: null }];
      if (path === '/v1/workouts/analytics') return { totalSessions: 21, sessionsPerWeek: 1.8, averageDurationMinutes: 52, personalRecords: 4, currentWeekSessions: 2, weeklyTarget: 3, currentStreakWeeks: 3, longestStreakWeeks: 6, weeks: [0, 1, 2, 3].map((i) => ({ weekStart: shiftDay(today, -7 * (3 - i)), sessions: 1 + (i % 3), volume: 4000 + i * 900, minutes: 150 })) };
      if (path === '/v1/finance/analytics/overview') return { cycleStart: shiftDay(today, -12), cycleEnd: shiftDay(today, 18), payCycleStartDay: 1, daysLeft: 18, incomeSoFar: 60000, expectedIncome: 60000, spentSoFar: 38200, upcomingBills: 9600, safeToSpend: 12200, safeToSpendPerDay: 677, netWorth: 171700 };
      if (path === '/v1/finance/analytics/trends') return ['May', 'Jun', 'Jul', 'Aug', 'Sep'].map((month, i) => ({ month, totalSpend: 32000 + i * 2100 }));
      if (path === '/v1/finance/analytics/merchants') return [{ merchant: 'BigBasket', totalSpend: 9200 }, { merchant: 'Swiggy', totalSpend: 6400 }];
      if (path === '/v1/finance/analytics/categories') return [{ categoryId: 'c1', currentMonthSpend: 7200, lastMonthSpend: 6100, difference: 1100, percentageChange: 18 }];
      if (path === '/v1/finance/accounts') return accounts;
      if (path === '/v1/finance/categories') return categories;
      if (path === '/v1/finance/transactions') return page(txns);
      if (path === '/v1/finance/transactions/needs-review-count') return 1;
      if (path === '/v1/finance/budgets') return [{ id: 'b1', categoryId: 'c1', budgetAmount: 9000, period: 'MONTHLY', startDate: today, endDate: null, alertThreshold: 80 }];
      if (path === '/v1/finance/subscriptions') return [{ id: 'sb1', name: 'Netflix', amount: 649, billingCycle: 'MONTHLY', monthlyCost: 649, yearlyCost: 7788, nextBillingDate: shiftDay(today, 5), daysUntilRenewal: 5, status: 'ACTIVE', wasteful: true, usageRating: 1 }];
      if (path === '/v1/finance/subscriptions/summary') return { activeCount: 1, monthlyTotal: 649, yearlyTotal: 7788, wastefulCount: 1, wastefulMonthly: 649, renewingSoonCount: 1, renewingSoonTotal: 649 };
      if (g(/^\/v1\/jobs\/[^/]+\/interviews$/)) return [];
      if (path === '/v1/jobs/analytics') return { totalApplications: 14, responseRatePct: 43, rejectionRatePct: 29, interviewConversionRatePct: 21, offerRatePct: 7 };
    }
    if (method === 'POST' && path === '/v1/workouts/sessions/start') { session = startSession('Push day'); return session; }
    if (method === 'POST' && g(/^\/v1\/workouts\/sessions\/[^/]+\/complete$/)) { session = null; return null; }
    if (method === 'PUT' && g(/^\/v1\/workouts\/sessions\/[^/]+\/sets\//) && session) return session;
    if (method !== 'GET') return {};
    return undefined;
  };
}
