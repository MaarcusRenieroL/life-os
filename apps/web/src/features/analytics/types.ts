// Mirrors core's analytics API (/v1/core/analytics).

export interface DailySnapshot {
  date: string;
  tasksCompleted: number;
  focusHours: number;
  habitsCompleted: number;
  habitsScheduled: number;
  spending: number;
  workouts: number;
  mood: number | null;
  energy: number | null;
}

export interface GoalBreakdown {
  milestone: number | null;
  task: number | null;
  habit: number | null;
  metric: number | null;
  workout: number | null;
  goalCount: number;
}

export interface GoalLine {
  name: string;
  status: string;
  progressPct: number | null;
  expectedPct: number | null;
  targetDate: string | null;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface PeriodSummary {
  period: 'WEEK' | 'MONTH';
  from: string;
  to: string;
  tasksCompleted: number;
  tasksDue: number;
  taskCompletionPct: number | null;
  habitConsistencyPct: number | null;
  focusHours: number;
  workouts: number;
  workoutMinutes: number;
  spending: number;
  income: number;
  previousSpending: number | null;
  previousTasksCompleted: number;
  applicationsApplied: number;
  applicationsSaved: number;
  interviews: number;
  journalEntries: number;
  averageMood: number | null;
  averageEnergy: number | null;
  milestonesCompleted: number;
  weightChangeKg: number | null;
  spendingByCategory: CategoryAmount[];
  goals: GoalLine[];
  goalBreakdown: GoalBreakdown;
  unavailableModules: string[];
}

export interface TrendPoint {
  date: string;
  tasksCompleted: number;
  habitPct: number | null;
  spending: number;
  weightKg: number | null;
  mood: number | null;
  workouts: number;
}

export interface Anomaly {
  type: string;
  severity: 'INFO' | 'WARN' | 'ALERT';
  title: string;
  detail: string;
}

export interface Insight {
  title: string;
  detail: string;
  correlation: number;
  sampleSize: number;
}

export interface Dashboard {
  today: DailySnapshot;
  week: PeriodSummary;
  anomalies: Anomaly[];
  insights: Insight[];
  unavailableModules: string[];
}
