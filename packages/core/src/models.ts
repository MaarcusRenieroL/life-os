// Wire types for the modules the native apps use. Hand-mirrored from apps/web/src/features/*/types.ts,
// trimmed to the fields the native screens read.

export type LifeArea = 'CAREER' | 'HEALTH' | 'FINANCE' | 'LEARNING' | 'RELATIONSHIPS' | 'PERSONAL';
export const LIFE_AREAS: LifeArea[] = ['CAREER', 'HEALTH', 'FINANCE', 'LEARNING', 'RELATIONSHIPS', 'PERSONAL'];

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
}

// ---------------------------------------------------------------- tasks
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskView = 'PLAIN' | 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'INBOX' | 'COMPLETED';
export type RecurrencePattern = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  allDay?: boolean;
  area?: LifeArea | null;
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
  tags?: string[] | null;
  estimateMinutes?: number | null;
  completedAt: string | null;
  recurrencePattern?: RecurrencePattern | null;
  recurrencePaused?: boolean;
}

export interface TaskFilters {
  view?: TaskView;
  status?: TaskStatus;
  priority?: TaskPriority;
  area?: LifeArea;
  projectId?: string;
  goalId?: string;
  tag?: string;
  q?: string;
  upcomingDays?: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  allDay?: boolean;
  area?: LifeArea | null;
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
  tags?: string[];
  estimateMinutes?: number | null;
}

export type TaskPatch = Partial<TaskInput> & { status?: TaskStatus };

export interface NamedRef {
  id: string;
  name: string;
}

// ---------------------------------------------------------------- habits
export type HabitType = 'BINARY' | 'COUNT' | 'DURATION' | 'NEGATIVE';
export type HabitFrequencyType = 'DAILY' | 'WEEKLY_DAYS' | 'X_PER_WEEK' | 'X_PER_MONTH' | 'CUSTOM_INTERVAL';
export type HabitStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type HabitLogStatus = 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'PARTIAL';

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type?: HabitType;
  frequencyType?: HabitFrequencyType;
  frequencyConfig?: Record<string, unknown>;
  targetValue?: number | null;
  targetUnit?: string | null;
  status?: HabitStatus;
  startDate?: string;
  icon?: string | null;
  color?: string | null;
  why?: string | null;
}

export interface HabitLog {
  id: string;
  logDate: string;
  status: HabitLogStatus | string;
  value?: number | null;
  note?: string | null;
}

export interface TodayHabitEntry {
  habit: Habit;
  todayLog: HabitLog | null;
}

export interface HabitStreak {
  currentStreak: number;
  longestStreak: number;
}

export interface HabitInput {
  name: string;
  description?: string | null;
  type: HabitType;
  category?: string | null;
  frequencyType: HabitFrequencyType;
  frequencyConfig: Record<string, unknown>;
  targetValue?: number | null;
  targetUnit?: string | null;
  startDate: string;
  why?: string | null;
}

export interface HabitPerformance {
  habitId: string;
  name: string;
  completions: number;
  scheduledOccurrences: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
}

export interface HabitAnalytics {
  healthScore?: { score: number };
  trend?: { weekStart: string; score: number }[];
  habitPerformance?: HabitPerformance[];
  dayOfWeekPattern?: { dayOfWeek: number; score: number }[];
}

// ---------------------------------------------------------------- goals
export type GoalStatus = 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type GoalMetricType = 'WEIGHT' | 'SAVINGS' | 'COUNT' | 'PERCENTAGE' | 'HOURS';
export const GOAL_STATUSES: GoalStatus[] = ['ON_TRACK', 'ACTIVE', 'AT_RISK', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

export interface GoalSummary {
  id: string;
  name: string;
  description: string | null;
  area: LifeArea | null;
  priority: number;
  status: GoalStatus;
  startDate: string | null;
  targetDate: string | null;
  reviewDue: boolean;
  blocked: boolean;
  progress: { overallPct: number; expectedPct: number | null; milestonesDone: number; milestonesTotal: number; tasksDone: number; tasksTotal: number };
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate: string | null;
  completed: boolean;
}

export interface GoalMetric {
  id: string;
  name: string;
  metricType: GoalMetricType;
  unit: string | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  progressPct: number;
}

export interface GoalReview {
  id: string;
  reviewDate: string;
  progressSummary: string | null;
  blockers: string | null;
  nextSteps: string | null;
  progressSnapshot: number;
  statusSnapshot: GoalStatus;
}

export interface GoalDetail {
  goal: GoalSummary;
  milestones: GoalMilestone[];
  metrics: GoalMetric[];
  reviews: GoalReview[];
  tasks: { id: string; title: string; status: TaskStatus; dueDate: string | null }[];
}

export interface GoalInput {
  name: string;
  description?: string | null;
  area?: LifeArea | null;
  priority?: number;
  startDate?: string | null;
  targetDate?: string | null;
}

// ---------------------------------------------------------------- calendar
export type EventCategory = 'WORK' | 'PERSONAL' | 'FOCUS' | 'GYM' | 'JOB' | 'OTHER';
export const EVENT_CATEGORIES: EventCategory[] = ['WORK', 'PERSONAL', 'FOCUS', 'GYM', 'JOB', 'OTHER'];

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: EventCategory;
  color: string | null;
  allDay: boolean;
  startAt: string | null;
  endAt: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface EventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  category?: EventCategory;
  allDay?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface FreeSlot {
  startAt: string;
  endAt: string;
  durationMinutes: number;
}

// ---------------------------------------------------------------- notes
export type NoteType = 'GENERAL' | 'MEETING' | 'BOOK' | 'LEARNING' | 'TECHNICAL' | 'SNIPPET' | 'RESEARCH' | 'CHECKLIST' | 'TRAVEL' | 'DECISION' | 'JOURNAL';
export const NOTE_TYPES: NoteType[] = ['GENERAL', 'MEETING', 'BOOK', 'LEARNING', 'TECHNICAL', 'SNIPPET', 'RESEARCH', 'CHECKLIST', 'TRAVEL', 'DECISION', 'JOURNAL'];

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface NoteSummary {
  id: string;
  title: string;
  description: string | null;
  noteType: NoteType;
  tags: Tag[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  updatedAt: string;
}

export interface Note extends NoteSummary {
  content: string | null;
  wordCount: number;
  readingTimeMinutes: number;
  createdAt: string;
}

export interface NoteFilters {
  sort?: 'title' | 'created' | 'modified' | 'manual';
  order?: 'asc' | 'desc';
  folder?: string;
  tag?: string;
  noteType?: NoteType;
  archived?: boolean;
  favorite?: boolean;
  pinned?: boolean;
  page?: number;
  size?: number;
}

export interface NoteFolder {
  id: string;
  name: string;
  noteCount: number;
  children: NoteFolder[];
}

export interface TrashedNote {
  id: string;
  title: string;
  deletedAt: string;
  purgesAt: string;
}

// ---------------------------------------------------------------- workouts
export type ExerciseCategory = 'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'LEGS' | 'CORE' | 'CARDIO' | 'FULL_BODY';
export const EXERCISE_CATEGORIES: ExerciseCategory[] = ['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'CARDIO', 'FULL_BODY'];
export type Equipment = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'KETTLEBELL' | 'BAND' | 'OTHER';
export const EQUIPMENT: Equipment[] = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER'];

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  instructions: string | null;
  custom: boolean;
}

export interface RoutineExercise {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  position: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  template: boolean;
  exercises: RoutineExercise[];
}

export interface RoutineInput {
  name: string;
  description?: string | null;
  exercises: { exerciseId: string; targetSets?: number; targetReps?: number; targetWeight?: number | null; restSeconds?: number }[];
}

export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface SessionSummary {
  id: string;
  name: string;
  status: SessionStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  totalSets: number;
  completedSets: number;
  volume: number;
  prCount: number;
}

export interface SessionSet {
  id: string;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  restSeconds: number | null;
  completed: boolean;
  pr: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  previousBest: number | null;
  sets: SessionSet[];
}

export interface SessionDetail {
  session: SessionSummary;
  exercises: SessionExercise[];
}

export interface SetUpdate {
  actualReps: number | null;
  actualWeight: number | null;
  restSeconds: number | null;
  completed: boolean;
}

export interface ExerciseRecords {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  best: { weight: number; reps: number; achievedAt: string };
}

export interface Measurement {
  id: string;
  measuredOn: string;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  armsCm: number | null;
  legsCm: number | null;
  bodyFatPct: number | null;
  notes: string | null;
}

export type MeasurementInput = Partial<Omit<Measurement, 'id' | 'measuredOn'>> & { measuredOn?: string | null };

export interface WorkoutAnalytics {
  totalSessions: number;
  sessionsPerWeek: number;
  averageDurationMinutes: number;
  personalRecords: number;
  currentWeekSessions: number;
  weeklyTarget: number;
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  weeks: { weekStart: string; sessions: number; volume: number; minutes: number }[];
}

// ---------------------------------------------------------------- finance
export type AccountType = 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH';
export const ACCOUNT_TYPES: AccountType[] = ['SAVINGS', 'CHECKING', 'CREDIT_CARD', 'INVESTMENT', 'CASH'];
export type CategoryType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';
export type TransactionType = 'DEBIT' | 'CREDIT' | 'TRANSFER';
export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface FinanceAccount {
  id: string;
  accountName: string;
  accountType: AccountType;
  bankName: string | null;
  accountNumberLastFour: string;
  currencyCode: string;
  currentBalance: number;
  transactionCount: number;
  isActive: boolean;
  isPrimary: boolean;
}

export interface AccountInput {
  accountName: string;
  accountType: AccountType;
  bankName?: string;
  accountNumber: string;
  currencyCode: string;
  currentBalance?: number;
  isPrimary: boolean;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  isActive: boolean;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  categoryIds: string[];
  notes: string | null;
  isTransfer: boolean;
  isDuplicate: boolean;
  status: string;
}

export interface TransactionInput {
  accountId: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: TransactionType;
  notes?: string;
}

export interface TransactionFilters {
  search?: string;
  status?: 'NEEDS_REVIEW' | 'CATEGORIZED' | 'DUPLICATE';
  categoryId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  budgetAmount: number;
  period: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  endDate: string | null;
  alertThreshold: number;
}

export interface BudgetInput {
  categoryId: string;
  budgetAmount: number;
  period: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  alertThreshold: number;
  alertEnabled: boolean;
}

export interface CategoryComparison {
  categoryId: string;
  currentMonthSpend: number;
  lastMonthSpend: number;
  difference: number;
  percentageChange: number;
}

export interface FinanceSummary {
  totalIncome: number | null;
  totalExpenses: number | null;
  savings: number;
  fixedMonthlyIncome: number | null;
}

export interface FinanceOverview {
  cycleStart: string;
  cycleEnd: string;
  payCycleStartDay: number;
  daysLeft: number;
  incomeSoFar: number;
  expectedIncome: number;
  spentSoFar: number;
  upcomingBills: number;
  safeToSpend: number;
  safeToSpendPerDay: number;
  netWorth: number;
}

export interface MonthlyTrend {
  month: string;
  totalSpend: number;
}

export interface MerchantSpend {
  merchant: string;
  totalSpend: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  monthlyCost: number;
  yearlyCost: number;
  nextBillingDate: string;
  daysUntilRenewal: number | null;
  status: SubscriptionStatus;
  wasteful: boolean;
  usageRating: number | null;
}

export interface SubscriptionSummary {
  activeCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  wastefulCount: number;
  wastefulMonthly: number;
  renewingSoonCount: number;
  renewingSoonTotal: number;
}

export interface SubscriptionInput {
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  notes?: string;
}

// ---------------------------------------------------------------- jobs
export type JobStatus =
  | 'INTERESTED'
  | 'WAITING_FOR_REFERRAL'
  | 'REFERRED'
  | 'APPLIED'
  | 'INTERVIEWING'
  | 'WAITING_FOR_HR'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'NO_LONGER_ACCEPTING'
  | 'NOT_INTERESTED';

/** Pipeline order, not alphabetical. */
/** Words for the statuses whose enum names read badly on their own. */
export const JOB_STATUS_NAMES: Partial<Record<JobStatus, string>> = { NO_LONGER_ACCEPTING: 'No longer accepting applications', NOT_INTERESTED: 'Not interested' };

export const JOB_STATUSES: JobStatus[] = ['INTERESTED', 'WAITING_FOR_REFERRAL', 'REFERRED', 'APPLIED', 'INTERVIEWING', 'WAITING_FOR_HR', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'REJECTED', 'WITHDRAWN', 'NO_LONGER_ACCEPTING', 'NOT_INTERESTED'];

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workModel: 'ONSITE' | 'HYBRID' | 'REMOTE' | null;
  url: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  requiredSkills: string[] | null;
  fitScore: number | null;
  status: JobStatus | null;
  createdAt: string;
  notes: string | null;
  appliedAt: string | null;
  followUpAt: string | null;
  deadline: string | null;
}

export interface JobInterview {
  id: string;
  roundType?: string;
  scheduledAt?: string | null;
  [key: string]: unknown;
}

export interface JobAnalytics {
  totalApplications: number;
  responseRatePct: number;
  rejectionRatePct: number;
  interviewConversionRatePct: number;
  offerRatePct: number;
}

export type MatchType = 'EXACT' | 'CONTAINS' | 'REGEX';
export type MatchField = 'MERCHANT_NAME' | 'DESCRIPTION';

export interface CategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  displayOrder: number;
}

export interface CategorizationRule {
  id: string;
  categoryId: string;
  matchType: MatchType;
  matchField: MatchField;
  matchValue: string;
  priority: number;
  isActive: boolean;
  hitCount: number;
  autoLearned: boolean;
}

export interface RuleInput {
  categoryId: string;
  matchType: MatchType;
  matchField: MatchField;
  matchValue: string;
  priority: number;
}

export interface Merchant {
  id: string;
  name: string;
  categoryId: string | null;
  transactionCount: number;
  lastTransactionDate: string | null;
  averageTransactionAmount: number | null;
  isRecognized: boolean;
}
