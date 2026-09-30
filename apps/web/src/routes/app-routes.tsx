import { Navigate, createBrowserRouter, type LazyRouteFunction, type RouteObject } from 'react-router-dom';

import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { FinanceLayout } from '@/features/finance/finance-layout';
import { AnalyticsLayout } from '@/features/analytics/analytics-layout';
import { GoalsLayout } from '@/features/goals/goals-layout';
import { HabitsLayout } from '@/features/habits/habits-layout';
import { JobTrackerLayout } from '@/features/job-tracker/job-tracker-layout';
import { JobTrackerOnboardingGuard } from '@/features/job-tracker/job-tracker-onboarding-guard';
import { NotesLayout } from '@/features/notes/notes-layout';
import { CalendarLayout } from '@/features/calendar/calendar-layout';
import { WorkoutsLayout } from '@/features/workouts/workouts-layout';
import { TasksLayout } from '@/features/tasks/tasks-layout';
import { VaultLayout } from '@/features/vault/vault-layout';
import { VaultUnlockGuard } from '@/features/vault/vault-unlock-guard';
import { VaultStateProvider } from '@/features/vault/vault-state';
import { AppShell } from '@/layout/app-shell';
import { NotFoundPage } from '@/routes/not-found-page';
import { RouteErrorBoundary } from '@/routes/route-error-boundary';

// Every leaf page is a separate lazy-loaded chunk (Vite splits on the dynamic
// import automatically) so the initial bundle isn't the whole app - only
// layouts/guards/login, which are needed immediately, stay eager imports.
function page<T extends string>(
  loader: () => Promise<Record<T, React.ComponentType>>,
  name: T,
): LazyRouteFunction<RouteObject> {
  return async () => ({ Component: (await loader())[name] });
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: (
          <VaultStateProvider>
            <AppShell />
          </VaultStateProvider>
        ),
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: 'today', lazy: page(() => import('@/features/today/today-page'), 'TodayPage') },
          { path: 'home', lazy: page(() => import('@/features/home/home-page'), 'HomePage') },
          { path: 'settings', lazy: page(() => import('@/features/settings/settings-page'), 'SettingsPage') },
          { path: 'vault', lazy: page(() => import('@/features/vault/vault-unlock-page'), 'VaultUnlockPage') },
          {
            element: <VaultUnlockGuard />,
            children: [
              {
                element: <VaultLayout />,
                children: [
                  { path: 'vault/entries', lazy: page(() => import('@/features/vault/vault-entry-list-page'), 'VaultEntryListPage') },
                  { path: 'vault/health', lazy: page(() => import('@/features/vault/vault-health-page'), 'VaultHealthPage') },
                  { path: 'vault/cards', lazy: page(() => import('@/features/cards/card-list-page'), 'CardListPage') },
                  { path: 'vault/security', lazy: page(() => import('@/features/security/security-page'), 'SecurityPage') },
                  { path: 'vault/audit-log', lazy: page(() => import('@/features/audit-log/audit-log-page'), 'AuditLogPage') },
                  { path: 'vault/data', lazy: page(() => import('@/features/data-management/data-management-page'), 'DataManagementPage') },
                ],
              },
            ],
          },
          {
            path: 'jobs/onboarding',
            lazy: page(
              () => import('@/features/job-tracker/job-tracker-onboarding-page'),
              'JobTrackerOnboardingPage',
            ),
          },
          {
            element: <JobTrackerOnboardingGuard />,
            children: [
              {
                path: 'jobs',
                element: <JobTrackerLayout />,
                children: [
                  { index: true, lazy: page(() => import('@/features/job-tracker/job-dashboard-page'), 'JobDashboardPage') },
                  { path: 'list', lazy: page(() => import('@/features/job-tracker/jobs-list-page'), 'JobsListPage') },
                  { path: 'openings', lazy: page(() => import('@/features/job-tracker/openings-page'), 'OpeningsPage') },
                  { path: 'discovery', lazy: page(() => import('@/features/job-tracker/add-job-page'), 'AddJobPage') },
                  { path: 'resumes', lazy: page(() => import('@/features/job-tracker/resume-page'), 'ResumePage') },
                  { path: 'analytics', lazy: page(() => import('@/features/job-tracker/job-analytics-page'), 'JobAnalyticsPage') },
                ],
              },
              { path: 'jobs/:jobId', lazy: page(() => import('@/features/job-tracker/job-detail-page'), 'JobDetailPage') },
            ],
          },
          {
            path: 'notes',
            element: <NotesLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/notes/notes-list-page'), 'NotesListPage') },
              { path: 'journal', lazy: page(() => import('@/features/notes/journal-page'), 'JournalPage') },
              { path: 'journal/:noteId', lazy: page(() => import('@/features/notes/journal-editor-page'), 'JournalEditorPage') },
              { path: 'search', lazy: page(() => import('@/features/notes/note-search-page'), 'NoteSearchPage') },
              { path: 'templates', lazy: page(() => import('@/features/notes/note-templates-page'), 'NoteTemplatesPage') },
              { path: 'graph', lazy: page(() => import('@/features/notes/notes-graph-page'), 'NotesGraphPage') },
              { path: 'attachments', lazy: page(() => import('@/features/notes/notes-attachments-page'), 'NotesAttachmentsPage') },
              { path: 'settings', lazy: page(() => import('@/features/notes/notes-settings-page'), 'NotesSettingsPage') },
            ],
          },
          // Must stay after the static notes/* subpaths above so it doesn't shadow them.
          { path: 'notes/:id', lazy: page(() => import('@/features/notes/note-editor-page'), 'NoteEditorPage') },
          {
            path: 'finance',
            element: <FinanceLayout />,
            children: [
              { index: true, element: <Navigate to="/finance/dashboard" replace /> },
              { path: 'dashboard', lazy: page(() => import('@/features/finance/dashboard-page'), 'FinanceDashboardPage') },
              { path: 'transactions', lazy: page(() => import('@/features/finance/transactions-page'), 'TransactionsPage') },
              { path: 'subscriptions', lazy: page(() => import('@/features/finance/subscriptions-page'), 'SubscriptionsPage') },
              { path: 'budgets', lazy: page(() => import('@/features/finance/budgets-page'), 'BudgetsPage') },
              { path: 'analytics', lazy: page(() => import('@/features/finance/analytics-page'), 'AnalyticsPage') },
              { path: 'report', lazy: page(() => import('@/features/finance/report-page'), 'ReportPage') },
              { path: 'import', lazy: page(() => import('@/features/finance/import-page'), 'ImportPage') },
              { path: 'rules', lazy: page(() => import('@/features/finance/rules-page'), 'RulesPage') },
              { path: 'accounts', lazy: page(() => import('@/features/finance/accounts-page'), 'AccountsPage') },
              { path: 'categories', lazy: page(() => import('@/features/finance/categories-page'), 'CategoriesPage') },
              { path: 'merchants', lazy: page(() => import('@/features/finance/merchants-page'), 'MerchantsPage') },
            ],
          },
          // Must stay after the static finance/* subpaths above so it doesn't shadow them.
          { path: 'finance/transactions/:id', lazy: page(() => import('@/features/finance/transaction-detail-page'), 'TransactionDetailPage') },
          {
            path: 'habits',
            element: <HabitsLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/habits/habits-today-page'), 'HabitsTodayPage') },
              { path: 'list', lazy: page(() => import('@/features/habits/habits-list-page'), 'HabitsListPage') },
              { path: 'weekly', lazy: page(() => import('@/features/habits/habits-weekly-grid-page'), 'HabitsWeeklyGridPage') },
              { path: 'calendar', lazy: page(() => import('@/features/habits/habits-calendar-view'), 'HabitsCalendarView') },
              { path: 'analytics', lazy: page(() => import('@/features/habits/habits-analytics-page'), 'HabitsAnalyticsPage') },
            ],
          },
          // Must stay after the static habits/* subpaths above so it doesn't shadow them.
          { path: 'habits/:id', lazy: page(() => import('@/features/habits/habit-detail-page'), 'HabitDetailPage') },
          {
            path: 'tasks',
            element: <TasksLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/tasks/tasks-today-page'), 'TasksTodayPage') },
              { path: 'upcoming', lazy: page(() => import('@/features/tasks/tasks-upcoming-page'), 'TasksUpcomingPage') },
              { path: 'list', lazy: page(() => import('@/features/tasks/tasks-list-page'), 'TasksListPage') },
              { path: 'board', lazy: page(() => import('@/features/tasks/tasks-board-page'), 'TasksBoardPage') },
              { path: 'completed', lazy: page(() => import('@/features/tasks/tasks-completed-page'), 'TasksCompletedPage') },
              { path: 'analytics', lazy: page(() => import('@/features/tasks/tasks-analytics-page'), 'TasksAnalyticsPage') },
            ],
          },
          {
            path: 'goals',
            element: <GoalsLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/goals/goals-list-page'), 'GoalsListPage') },
              { path: 'timeline', lazy: page(() => import('@/features/goals/goals-timeline-page'), 'GoalsTimelinePage') },
              { path: 'reviews', lazy: page(() => import('@/features/goals/goals-reviews-page'), 'GoalsReviewsPage') },
            ],
          },
          // Must stay after the static goals/* subpaths above so it doesn't shadow them.
          { path: 'goals/:id', lazy: page(() => import('@/features/goals/goal-detail-page'), 'GoalDetailPage') },
          {
            path: 'analytics',
            element: <AnalyticsLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/analytics/overview-page'), 'AnalyticsOverviewPage') },
              { path: 'weekly', lazy: page(() => import('@/features/analytics/summary-page'), 'AnalyticsWeeklyPage') },
              { path: 'monthly', lazy: page(() => import('@/features/analytics/summary-page'), 'AnalyticsMonthlyPage') },
              { path: 'trends', lazy: page(() => import('@/features/analytics/trends-page'), 'AnalyticsTrendsPage') },
              { path: 'insights', lazy: page(() => import('@/features/analytics/insights-page'), 'AnalyticsInsightsPage') },
              { path: 'automation', lazy: page(() => import('@/features/automation/rules-page'), 'AutomationRulesPage') },
              { path: 'templates', lazy: page(() => import('@/features/automation/templates-page'), 'AutomationTemplatesPage') },
              { path: 'history', lazy: page(() => import('@/features/automation/history-page'), 'AutomationHistoryPage') },
            ],
          },
          {
            path: 'workouts',
            element: <WorkoutsLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/workouts/workouts-today-page'), 'WorkoutsTodayPage') },
              { path: 'routines', lazy: page(() => import('@/features/workouts/routines-page'), 'RoutinesPage') },
              { path: 'exercises', lazy: page(() => import('@/features/workouts/exercises-page'), 'ExercisesPage') },
              { path: 'history', lazy: page(() => import('@/features/workouts/history-page'), 'WorkoutHistoryPage') },
              { path: 'records', lazy: page(() => import('@/features/workouts/records-page'), 'RecordsPage') },
              { path: 'body', lazy: page(() => import('@/features/workouts/body-page'), 'BodyPage') },
              { path: 'analytics', lazy: page(() => import('@/features/workouts/analytics-page'), 'WorkoutAnalyticsPage') },
            ],
          },
          // Must stay after the static workouts/* subpaths above so it doesn't shadow them.
          { path: 'workouts/session/:id', lazy: page(() => import('@/features/workouts/session-page'), 'WorkoutSessionPage') },
          {
            path: 'calendar',
            element: <CalendarLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/calendar/calendar-month-page'), 'CalendarMonthPage') },
              { path: 'week', lazy: page(() => import('@/features/calendar/calendar-week-page'), 'CalendarWeekPage') },
              { path: 'day', lazy: page(() => import('@/features/calendar/calendar-day-page'), 'CalendarDayPage') },
              { path: 'agenda', lazy: page(() => import('@/features/calendar/calendar-agenda-page'), 'CalendarAgendaPage') },
            ],
          },
          // Catch-all: any unmatched path inside the shell (bad link, stale bookmark,
          // a deep link to what's really just a client-side tab) gets a styled 404
          // instead of falling through to React Router's raw default error page.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
