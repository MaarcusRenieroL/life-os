import { useQuery } from '@tanstack/react-query';

import { accountApi } from '@/features/finance/account-api';
import { analyticsApi } from '@/features/finance/analytics-api';
import { budgetApi } from '@/features/finance/budget-api';
import { importApi } from '@/features/finance/import-api';
import { calendarApi } from '@/features/calendar/calendar-api';
import { goalsApi } from '@/features/goals/goals-api';
import { habitsApi } from '@/features/habits/habits-api';
import { careerProfileApi } from '@/features/job-tracker/career-profile-api';
import { jobApi } from '@/features/job-tracker/job-api';
import { notesApi } from '@/features/notes/notes-api';
import { tasksApi } from '@/features/tasks/tasks-api';
import { vaultApi } from '@/features/vault/vault-api';
import { workoutsApi } from '@/features/workouts/workouts-api';

export interface SetupStep {
  id: string;
  title: string;
  detail: string;
  /** Read from real data: true once the thing exists, so the checklist ticks itself. */
  done: boolean;
  /** Worth doing but not needed before the module is useful. */
  optional?: boolean;
  to: string;
  cta: string;
}

export interface ModuleSetupDef {
  code: string;
  title: string;
  blurb: string;
  /** Called as a hook; returns the steps with their live completion state. */
  useSteps: () => { steps: SetupStep[]; loading: boolean };
}

const LONG = 60_000;

function useHasAny<T>(key: string[], load: () => Promise<T[] | { length: number }>) {
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: load, staleTime: LONG });
  return { has: (data?.length ?? 0) > 0, loading: isLoading };
}

/** A mailbox is connected for a purpose, or a single mailbox serves every purpose. */
function useMailbox(purpose: 'FINANCE' | 'JOBS') {
  const { data, isLoading } = useQuery({ queryKey: ['gmail-status'], queryFn: importApi.getGmailStatus, staleTime: LONG });
  const mailboxes = data?.mailboxes ?? [];
  return { connected: mailboxes.some((m) => m.purpose === purpose) || (mailboxes.length === 1 && mailboxes[0] != null), loading: isLoading };
}

/**
 * What "set up" means for each module. A module is useful the moment its required steps are done;
 * optional ones just make it better. Everything is derived from what already exists, so doing the
 * thing anywhere in the app (not only from this checklist) ticks it off.
 */
export const MODULE_SETUP: Record<string, ModuleSetupDef> = {
  FN: {
    code: 'FN',
    title: 'Finance',
    blurb: 'Track every rupee: accounts, bank alerts, budgets and a month that starts when your salary lands.',
    useSteps() {
      const accounts = useHasAny(['finance', 'accounts'], accountApi.getAccounts);
      const mailbox = useMailbox('FINANCE');
      const { data: dashboard, isLoading: dashboardLoading } = useQuery({ queryKey: ['finance', 'dashboard'], queryFn: analyticsApi.getDashboardSummary, staleTime: LONG });
      const budgets = useHasAny(['finance', 'budgets'], budgetApi.getBudgets);
      return {
        loading: accounts.loading || mailbox.loading || dashboardLoading || budgets.loading,
        steps: [
          { id: 'accounts', title: 'Add your accounts', detail: 'Savings, cards, wallets. Enter what each holds today as its opening balance.', done: accounts.has, to: '/finance/accounts', cta: 'Add an account' },
          { id: 'salary', title: 'Set your salary', detail: 'It drives your savings rate and "safe to spend". Set the day it lands and each month starts then.', done: dashboard?.fixedMonthlyIncome != null, to: '/finance/dashboard', cta: 'Set salary' },
          { id: 'mailbox', title: 'Connect the Gmail that gets bank alerts', detail: 'Debit and credit alerts are read automatically so you never type a transaction.', done: mailbox.connected, to: '/settings#integrations', cta: 'Connect Gmail', optional: true },
          { id: 'budget', title: 'Create a budget', detail: 'Cap a category, such as food. You are alerted once when you near it.', done: budgets.has, to: '/finance/budgets', cta: 'New budget', optional: true },
        ],
      };
    },
  },
  JT: {
    code: 'JT',
    title: 'Job Tracker',
    blurb: 'Your applications, scored against your profile, filled in from your emails.',
    useSteps() {
      const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['career-profile'], queryFn: careerProfileApi.get, staleTime: LONG });
      const mailbox = useMailbox('JOBS');
      const jobs = useHasAny(['jobs', 'list'], jobApi.list);
      return {
        loading: profileLoading || mailbox.loading || jobs.loading,
        steps: [
          { id: 'profile', title: 'Build your career profile', detail: 'Upload a resume or enter it by hand; jobs are scored against it.', done: !!profile?.onboarded, to: '/jobs/onboarding', cta: 'Start profile' },
          { id: 'mailbox', title: 'Connect the Gmail that gets job emails', detail: 'Application confirmations, interview invites and rejections update the tracker on their own.', done: mailbox.connected, to: '/settings#integrations', cta: 'Connect Gmail', optional: true },
          { id: 'jobs', title: 'Bring in your applications', detail: 'Paste a job link, or import the jobs you applied to elsewhere.', done: jobs.has, to: '/jobs/list', cta: 'Open jobs', optional: true },
        ],
      };
    },
  },
  TK: {
    code: 'TK',
    title: 'Tasks',
    blurb: 'Everything you need to do, with due dates, priorities and recurring chores.',
    useSteps() {
      const tasks = useHasAny(['tasks', 'any'], () => tasksApi.list());
      return { loading: tasks.loading, steps: [{ id: 'first', title: 'Add your first task', detail: 'Anything works. Press ⌘K anywhere to capture one from a single line.', done: tasks.has, to: '/tasks', cta: 'Add a task' }] };
    },
  },
  HB: {
    code: 'HB',
    title: 'Habits',
    blurb: 'Daily routines with streaks, so the small things compound.',
    useSteps() {
      const habits = useHasAny(['habits', 'list', 'any'], () => habitsApi.list());
      return { loading: habits.loading, steps: [{ id: 'first', title: 'Create your first habit', detail: 'Pick one you can do every day, such as drinking water or reading.', done: habits.has, to: '/habits', cta: 'Add a habit' }] };
    },
  },
  GL: {
    code: 'GL',
    title: 'Goals',
    blurb: 'Big targets with milestones, fed by your tasks and habits.',
    useSteps() {
      const goals = useHasAny(['goals', 'any'], () => goalsApi.list());
      return { loading: goals.loading, steps: [{ id: 'first', title: 'Set a goal', detail: 'A goal gets progress automatically from the tasks and habits you link to it.', done: goals.has, to: '/goals', cta: 'Add a goal' }] };
    },
  },
  CL: {
    code: 'CL',
    title: 'Calendar',
    blurb: 'Events, interviews and due dates in one place.',
    useSteps() {
      const events = useHasAny(['calendar', 'any'], () => calendarApi.list());
      return { loading: events.loading, steps: [{ id: 'first', title: 'Add an event', detail: 'Interviews from the job tracker and task due dates appear here on their own.', done: events.has, to: '/calendar', cta: 'Open calendar' }] };
    },
  },
  NT: {
    code: 'NT',
    title: 'Notes',
    blurb: 'Notes and a journal, linked to everything else.',
    useSteps() {
      const notes = useHasAny(['notes', 'recent', 'any'], () => notesApi.recent(1));
      return { loading: notes.loading, steps: [{ id: 'first', title: 'Write your first note', detail: 'Markdown, tags and links between notes.', done: notes.has, to: '/notes', cta: 'New note' }] };
    },
  },
  WK: {
    code: 'WK',
    title: 'Workouts',
    blurb: 'Log sessions, track records and body measurements.',
    useSteps() {
      const routines = useHasAny(['workouts', 'routines', 'any'], workoutsApi.routines);
      return { loading: routines.loading, steps: [{ id: 'routine', title: 'Pick a routine', detail: 'Copy a starter template or build your own.', done: routines.has, to: '/workouts', cta: 'Open workouts' }] };
    },
  },
  PM: {
    code: 'PM',
    title: 'Password Manager',
    blurb: 'An encrypted vault for passwords and cards.',
    useSteps() {
      const { data, isLoading } = useQuery({ queryKey: ['vault', 'status'], queryFn: vaultApi.getStatus, staleTime: LONG });
      return { loading: isLoading, steps: [{ id: 'master', title: 'Create your master password', detail: 'It encrypts the vault and cannot be recovered, so choose one you will remember.', done: !!data?.hasMasterPassword, to: '/vault', cta: 'Create it' }] };
    },
  },
};

/** Modules that have a setup checklist. Analytics, for one, fills itself from the others. */
export const SETUP_MODULE_CODES = Object.keys(MODULE_SETUP);
