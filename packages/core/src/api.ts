import type { Client } from './client';
import { dayKey } from './player-model';
import type {
  AccountInput, Budget, BudgetInput, CalendarEvent, CategoryComparison, EventInput, Exercise, ExerciseRecords, FinanceAccount, FinanceCategory,
  FinanceOverview, FinanceSummary, FinanceTransaction, FreeSlot, GoalDetail, GoalInput, GoalMetric, GoalMilestone, GoalReview, GoalStatus, GoalSummary,
  Habit, HabitAnalytics, HabitInput, HabitLog, HabitLogStatus, HabitStreak, JobAnalytics, JobInterview, JobListing, JobStatus, Measurement,
  MeasurementInput, MerchantSpend, MonthlyTrend, NamedRef, Note, NoteFilters, NoteFolder, NoteSummary, NoteType, Page, Routine, RoutineInput,
  SessionDetail, SessionSummary, SetUpdate, Subscription, SubscriptionInput, SubscriptionSummary, Tag, Task, TaskFilters, TaskInput, TaskPatch,
  TodayHabitEntry, CategoryInput, CategorizationRule, RuleInput, Merchant, TransactionFilters, TransactionInput, TrashedNote, WorkoutAnalytics, ExerciseCategory, Equipment, SubscriptionStatus,
} from './models';
import type { Dashboard, TodayItem, TrendPoint } from './types';
import { createExtraApis } from './api-extra';

export * from './models';

export interface QuickCaptureResult {
  [key: string]: unknown;
}

/** Kept for the Jobs overview card, which only needs the list fields. */
export type JobSummary = JobListing;

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The slice of the backend the native apps use. Paths mirror the feature api files in apps/web. */
export function createApis(client: Client) {
  const { get, post, put, patch, delete: del } = client;
  return {
    ...createExtraApis(client),
    today: () => get<TodayItem[]>('/v1/core/today'),
    trends: (days = 365) => get<TrendPoint[]>('/v1/core/analytics/trends', { days, bucket: 'DAY' }),
    dashboard: () => get<Dashboard>('/v1/core/analytics/dashboard'),
    quickCapture: (text: string) => post<QuickCaptureResult>('/v1/core/quick-capture', { text, useClaudeFallback: false }),

    tasks: {
      list: (filters: TaskFilters = {}) => get<Task[]>('/v1/tasks', { ...filters }),
      get: (id: string) => get<Task>(`/v1/tasks/${id}`),
      subtasks: (id: string) => get<Task[]>(`/v1/tasks/${id}/subtasks`),
      create: (input: TaskInput | string, dueDate?: string) => post<Task>('/v1/tasks', typeof input === 'string' ? { title: input, dueDate: dueDate ?? null } : input),
      update: (id: string, patchBody: TaskPatch) => put<Task>(`/v1/tasks/${id}`, patchBody),
      remove: (id: string) => del<void>(`/v1/tasks/${id}`),
      complete: (id: string) => post<Task>(`/v1/tasks/${id}/complete`),
      reopen: (id: string) => post<Task>(`/v1/tasks/${id}/reopen`),
      snooze: (id: string, newDueDate: string) => post<Task>(`/v1/tasks/${id}/snooze`, { newDueDate }),
      duplicate: (id: string) => post<Task>(`/v1/tasks/${id}/duplicate`),
      projects: () => get<NamedRef[]>('/v1/tasks/projects'),
      goals: () => get<NamedRef[]>('/v1/tasks/goals'),
    },

    habits: {
      list: (status?: string) => get<Habit[]>('/v1/habits', { status }),
      today: () => get<TodayHabitEntry[]>('/v1/habits/today'),
      create: (input: HabitInput) => post<Habit>('/v1/habits', input),
      update: (id: string, input: Partial<HabitInput>) => put<Habit>(`/v1/habits/${id}`, input),
      remove: (id: string) => del<void>(`/v1/habits/${id}`),
      pause: (id: string) => post<Habit>(`/v1/habits/${id}/pause`),
      resume: (id: string) => post<Habit>(`/v1/habits/${id}/resume`),
      streak: (id: string) => get<HabitStreak>(`/v1/habits/${id}/streak`),
      logs: (id: string, from?: string, to?: string) => get<HabitLog[]>(`/v1/habits/${id}/logs`, { from, to }),
      log: (id: string, status: HabitLogStatus, extra: { value?: number; note?: string; logDate?: string } = {}) =>
        post<HabitLog>(`/v1/habits/${id}/logs`, { logDate: extra.logDate ?? dayKey(new Date()), status, value: extra.value, note: extra.note }),
      complete: (habitId: string) => post<HabitLog>(`/v1/habits/${habitId}/logs`, { logDate: dayKey(new Date()), status: 'COMPLETED' }),
      deleteLog: (id: string, logId: string) => del<void>(`/v1/habits/${id}/logs/${logId}`),
      analytics: (weeks?: number) => get<HabitAnalytics>('/v1/habits/analytics', { weeks }),
    },

    goals: {
      list: (filters: { area?: string; status?: GoalStatus; q?: string; includeArchived?: boolean } = {}) => get<GoalSummary[]>('/v1/goals', { ...filters }),
      get: (id: string) => get<GoalDetail>(`/v1/goals/${id}`),
      create: (input: GoalInput) => post<GoalSummary>('/v1/goals', input),
      update: (id: string, input: GoalInput) => put<GoalSummary>(`/v1/goals/${id}`, input),
      setStatus: (id: string, status: GoalStatus) => post<GoalSummary>(`/v1/goals/${id}/status`, { status }),
      remove: (id: string) => del<void>(`/v1/goals/${id}`),
      addMilestone: (id: string, title: string, targetDate?: string | null) => post<GoalMilestone>(`/v1/goals/${id}/milestones`, { title, targetDate: targetDate ?? null }),
      setMilestone: (id: string, m: GoalMilestone, completed: boolean) => put<GoalMilestone>(`/v1/goals/${id}/milestones/${m.id}`, { title: m.title, targetDate: m.targetDate, completed }),
      deleteMilestone: (id: string, milestoneId: string) => del<void>(`/v1/goals/${id}/milestones/${milestoneId}`),
      logMetric: (id: string, metricId: string, value: number, note?: string) => post<GoalMetric>(`/v1/goals/${id}/metrics/${metricId}/entries`, { value, note: note ?? null }),
      review: (id: string, body: { progressSummary?: string; blockers?: string; nextSteps?: string; notes?: string }) => post<GoalReview>(`/v1/goals/${id}/reviews`, body),
      linkTask: (id: string, taskId: string) => put<GoalSummary>(`/v1/goals/${id}/tasks/${taskId}`, {}),
      unlinkTask: (id: string, taskId: string) => del<GoalSummary>(`/v1/goals/${id}/tasks/${taskId}`),
    },

    calendar: {
      /** `from` and `to` are local YYYY-MM-DD days (inclusive); the backend wants instants. */
      list: (from: string, to: string) => get<CalendarEvent[]>('/v1/calendar/events', { from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59.999`).toISOString() }),
      freeSlots: (date: string, minDurationMinutes = 30) => get<FreeSlot[]>('/v1/calendar/events/free-slots', { date, minDurationMinutes }),
      create: (input: EventInput) => post<CalendarEvent>('/v1/calendar/events', input),
      update: (id: string, input: Partial<EventInput>) => put<CalendarEvent>(`/v1/calendar/events/${id}`, input),
      remove: (id: string) => del<void>(`/v1/calendar/events/${id}`),
      duplicate: (id: string) => post<CalendarEvent>(`/v1/calendar/events/${id}/duplicate`),
    },

    notes: {
      list: (filters: NoteFilters = {}) => get<Page<NoteSummary>>('/v1/notes', { ...filters }),
      recent: (limit = 10) => get<NoteSummary[]>('/v1/notes/recent', { limit }),
      get: (id: string) => get<Note>(`/v1/notes/${id}`),
      create: (title: string, content = '', noteType: NoteType = 'GENERAL', folderId?: string) => post<Note>('/v1/notes', { title, content, noteType, folderId }),
      update: (id: string, body: { title?: string; content?: string; noteType?: NoteType; isPinned?: boolean; isFavorite?: boolean; isArchived?: boolean }) => put<Note>(`/v1/notes/${id}`, body),
      remove: (id: string) => del<void>(`/v1/notes/${id}`),
      trash: () => get<TrashedNote[]>('/v1/notes/trash'),
      restore: (id: string) => post<Note>(`/v1/notes/${id}/restore`),
      purge: (id: string) => del<void>(`/v1/notes/${id}/permanent`),
      folders: () => get<NoteFolder[]>('/v1/folders'),
      tags: () => get<Tag[]>('/v1/tags'),
      addTag: (id: string, tagId: string) => post<Note>(`/v1/notes/${id}/tags`, { tagId }),
      removeTag: (id: string, tagId: string) => del<Note>(`/v1/notes/${id}/tags/${tagId}`),
    },

    workouts: {
      exercises: (filters: { q?: string; category?: ExerciseCategory; equipment?: Equipment } = {}) => get<Exercise[]>('/v1/workouts/exercises', { ...filters }),
      createExercise: (body: { name: string; category: ExerciseCategory; equipment: Equipment; instructions?: string | null }) => post<Exercise>('/v1/workouts/exercises', body),
      deleteExercise: (id: string) => del<void>(`/v1/workouts/exercises/${id}`),
      routines: () => get<Routine[]>('/v1/workouts/routines'),
      templates: () => get<Routine[]>('/v1/workouts/routines/templates'),
      copyTemplate: (id: string) => post<Routine>(`/v1/workouts/routines/templates/${id}/copy`),
      createRoutine: (body: RoutineInput) => post<Routine>('/v1/workouts/routines', body),
      deleteRoutine: (id: string) => del<void>(`/v1/workouts/routines/${id}`),
      sessions: (params: { status?: string; from?: string; to?: string } = {}) => get<SessionSummary[]>('/v1/workouts/sessions', { ...params }),
      current: () => get<SessionDetail | null>('/v1/workouts/sessions/current'),
      session: (id: string) => get<SessionDetail>(`/v1/workouts/sessions/${id}`),
      start: (body: { routineId?: string | null; name?: string | null }) => post<SessionDetail>('/v1/workouts/sessions/start', body),
      complete: (id: string, notes?: string) => post<SessionDetail>(`/v1/workouts/sessions/${id}/complete`, { notes: notes?.trim() || null }),
      deleteSession: (id: string) => del<void>(`/v1/workouts/sessions/${id}`),
      addSet: (sessionId: string, exerciseId: string) => post<SessionDetail>(`/v1/workouts/sessions/${sessionId}/sets`, { exerciseId }),
      updateSet: (sessionId: string, setId: string, body: SetUpdate) => put<SessionDetail>(`/v1/workouts/sessions/${sessionId}/sets/${setId}`, body),
      deleteSet: (sessionId: string, setId: string) => del<SessionDetail>(`/v1/workouts/sessions/${sessionId}/sets/${setId}`),
      records: () => get<ExerciseRecords[]>('/v1/workouts/records'),
      measurements: () => get<Measurement[]>('/v1/workouts/measurements'),
      createMeasurement: (body: MeasurementInput) => post<Measurement>('/v1/workouts/measurements', body),
      deleteMeasurement: (id: string) => del<void>(`/v1/workouts/measurements/${id}`),
      analytics: (weeks = 12, target = 3) => get<WorkoutAnalytics>('/v1/workouts/analytics', { weeks, target, zone: zone() }),
    },

    jobs: {
      list: () => get<JobListing[]>('/v1/jobs'),
      get: (id: string) => get<JobListing>(`/v1/jobs/${id}`),
      fromLink: (url: string, jobDescriptionText?: string) => post<JobListing>('/v1/jobs/from-link', { url, jobDescriptionText }),
      setStatus: (id: string, status: JobStatus) => patch<JobListing>(`/v1/jobs/${id}`, { status }),
      updateDetails: (id: string, body: { notes: string | null; appliedAt: string | null; followUpAt?: string | null }) => patch<JobListing>(`/v1/jobs/${id}/details`, body),
      rescore: (id: string) => post<unknown>(`/v1/jobs/${id}/rescore`),
      remove: (id: string) => del<void>(`/v1/jobs/${id}`),
      interviews: (id: string) => get<JobInterview[]>(`/v1/jobs/${id}/interviews`),
      analytics: () => get<JobAnalytics>('/v1/jobs/analytics'),
    },

    finance: {
      summary: () => get<FinanceSummary>('/v1/finance/analytics/dashboard'),
      overview: () => get<FinanceOverview>('/v1/finance/analytics/overview'),
      trends: () => get<MonthlyTrend[]>('/v1/finance/analytics/trends'),
      topMerchants: (limit = 10) => get<MerchantSpend[]>('/v1/finance/analytics/merchants', { limit }),
      comparisons: (categoryIds: string[]) => get<CategoryComparison[]>('/v1/finance/analytics/categories', { categoryIds: categoryIds.join(',') }),
      accounts: () => get<FinanceAccount[]>('/v1/finance/accounts'),
      createAccount: (body: AccountInput) => post<FinanceAccount>('/v1/finance/accounts', body),
      deleteAccount: (id: string) => del<void>(`/v1/finance/accounts/${id}`),
      categories: () => get<FinanceCategory[]>('/v1/finance/categories'),
      createCategory: (body: CategoryInput) => post<FinanceCategory>('/v1/finance/categories', body),
      updateCategory: (id: string, body: Partial<CategoryInput> & { isActive?: boolean }) => put<FinanceCategory>(`/v1/finance/categories/${id}`, body),
      deleteCategory: (id: string) => del<void>(`/v1/finance/categories/${id}`),
      rules: () => get<CategorizationRule[]>('/v1/finance/categorization-rules'),
      createRule: (body: RuleInput) => post<CategorizationRule>('/v1/finance/categorization-rules', body),
      updateRule: (id: string, body: Partial<RuleInput> & { isActive?: boolean }) => put<CategorizationRule>(`/v1/finance/categorization-rules/${id}`, body),
      deleteRule: (id: string) => del<void>(`/v1/finance/categorization-rules/${id}`),
      merchants: () => get<Merchant[]>('/v1/finance/merchants'),
      deleteMerchant: (id: string) => del<void>(`/v1/finance/merchants/${id}`),
      transactions: (page = 0, size = 50, filters: TransactionFilters = {}) => get<Page<FinanceTransaction>>('/v1/finance/transactions', { page, size, ...filters }),
      needsReviewCount: () => get<number>('/v1/finance/transactions/needs-review-count'),
      createTransaction: (body: TransactionInput) => post<FinanceTransaction>('/v1/finance/transactions', body),
      setCategories: (id: string, categoryIds: string[]) => put<FinanceTransaction>(`/v1/finance/transactions/${id}/categories`, { categoryIds }),
      deleteTransaction: (id: string) => del<void>(`/v1/finance/transactions/${id}`),
      budgets: () => get<Budget[]>('/v1/finance/budgets'),
      createBudget: (body: BudgetInput) => post<Budget>('/v1/finance/budgets', body),
      deleteBudget: (id: string) => del<void>(`/v1/finance/budgets/${id}`),
      subscriptions: (status?: SubscriptionStatus) => get<Subscription[]>('/v1/finance/subscriptions', { status }),
      subscriptionSummary: () => get<SubscriptionSummary>('/v1/finance/subscriptions/summary'),
      createSubscription: (body: SubscriptionInput) => post<Subscription>('/v1/finance/subscriptions', body),
      subscriptionAction: (id: string, action: 'pause' | 'resume' | 'cancel' | 'log-use' | 'charge') => post<Subscription>(`/v1/finance/subscriptions/${id}/${action}`),
      deleteSubscription: (id: string) => del<void>(`/v1/finance/subscriptions/${id}`),
    },
  };
}

export type Apis = ReturnType<typeof createApis>;
