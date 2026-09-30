// Mirrors the Goals API served at /v1/goals (see GoalModuleController on the backend).

import type { LifeArea } from '@/features/tasks/types';

export type GoalStatus = 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export const GOAL_STATUSES: GoalStatus[] = ['ON_TRACK', 'ACTIVE', 'AT_RISK', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  ACTIVE: 'Active',
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

/** 1 is the most important. */
export const GOAL_PRIORITIES = [1, 2, 3, 4] as const;

export const GOAL_PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 · Critical',
  2: 'P2 · High',
  3: 'P3 · Medium',
  4: 'P4 · Low',
};

export type GoalReviewFrequency = 'BIWEEKLY' | 'MONTHLY';

export const GOAL_REVIEW_FREQUENCY_LABELS: Record<GoalReviewFrequency, string> = {
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
};

export type GoalMetricType = 'WEIGHT' | 'SAVINGS' | 'COUNT' | 'PERCENTAGE' | 'HOURS';

export const GOAL_METRIC_TYPES: GoalMetricType[] = ['WEIGHT', 'SAVINGS', 'COUNT', 'PERCENTAGE', 'HOURS'];

export const GOAL_METRIC_TYPE_LABELS: Record<GoalMetricType, string> = {
  WEIGHT: 'Weight',
  SAVINGS: 'Savings',
  COUNT: 'Count',
  PERCENTAGE: 'Percentage',
  HOURS: 'Hours',
};

export const GOAL_METRIC_DEFAULT_UNITS: Record<GoalMetricType, string> = {
  WEIGHT: 'kg',
  SAVINGS: '$',
  COUNT: '',
  PERCENTAGE: '%',
  HOURS: 'h',
};

export type GoalLinkType = 'BLOCKS' | 'SUPPORTS';

export type GoalLinkRelation = 'BLOCKS' | 'BLOCKED_BY' | 'SUPPORTS' | 'SUPPORTED_BY';

export const GOAL_LINK_RELATION_LABELS: Record<GoalLinkRelation, string> = {
  BLOCKS: 'Blocks',
  BLOCKED_BY: 'Blocked by',
  SUPPORTS: 'Supports',
  SUPPORTED_BY: 'Supported by',
};

/** Percentages are null when that component has nothing to measure for the goal. */
export interface GoalProgressBreakdown {
  overallPct: number;
  milestonePct: number | null;
  taskPct: number | null;
  habitPct: number | null;
  metricPct: number | null;
  expectedPct: number | null;
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
  activeHabits: number;
  metricsCount: number;
}

export interface GoalSummary {
  id: string;
  name: string;
  description: string | null;
  area: LifeArea | null;
  priority: number;
  status: GoalStatus;
  startDate: string | null;
  targetDate: string | null;
  reviewFrequency: GoalReviewFrequency | null;
  nextReviewDate: string | null;
  reviewDue: boolean;
  blocked: boolean;
  completedAt: string | null;
  createdAt: string;
  progress: GoalProgressBreakdown;
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface GoalMetricEntry {
  id: string;
  value: number;
  note: string | null;
  recordedOn: string;
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
  /** Newest first. */
  entries: GoalMetricEntry[];
}

export interface GoalLink {
  id: string;
  relation: GoalLinkRelation;
  otherGoalId: string;
  otherGoalName: string;
  otherGoalStatus: GoalStatus;
}

export interface GoalReview {
  id: string;
  reviewDate: string;
  progressSummary: string | null;
  blockers: string | null;
  nextSteps: string | null;
  notes: string | null;
  progressSnapshot: number;
  statusSnapshot: GoalStatus;
}

export interface GoalLinkedTask {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  dueDate: string | null;
}

export interface GoalDetail {
  goal: GoalSummary;
  milestones: GoalMilestone[];
  metrics: GoalMetric[];
  links: GoalLink[];
  reviews: GoalReview[];
  tasks: GoalLinkedTask[];
}

export interface GoalListFilters {
  area?: LifeArea;
  status?: GoalStatus;
  priority?: number;
  q?: string;
  includeArchived?: boolean;
}

export interface SaveGoalRequest {
  name: string;
  description?: string | null;
  area?: LifeArea | null;
  priority?: number;
  startDate?: string | null;
  targetDate?: string | null;
  reviewFrequency?: GoalReviewFrequency | null;
}

export interface SaveMilestoneRequest {
  title: string;
  targetDate?: string | null;
  completed?: boolean;
}

export interface SaveMetricRequest {
  name: string;
  metricType: GoalMetricType;
  unit?: string | null;
  startValue?: number;
  targetValue: number;
}

export interface LogMetricEntryRequest {
  value: number;
  note?: string | null;
  recordedOn?: string | null;
}

export interface SubmitGoalReviewRequest {
  progressSummary?: string | null;
  blockers?: string | null;
  nextSteps?: string | null;
  notes?: string | null;
  reviewDate?: string | null;
}
