import { api, unwrap } from '@/lib/api-client';

import type {
  GoalDetail,
  GoalListFilters,
  GoalLinkType,
  GoalMetric,
  GoalMetricEntry,
  GoalMilestone,
  GoalReview,
  GoalStatus,
  GoalSummary,
  LogMetricEntryRequest,
  SaveGoalRequest,
  SaveMetricRequest,
  SaveMilestoneRequest,
  SubmitGoalReviewRequest,
} from './types';

const baseUrl = '/v1/goals';

export const goalsApi = {
  list(filters: GoalListFilters = {}): Promise<GoalSummary[]> {
    return unwrap(api.get(baseUrl, { params: filters }));
  },

  get(id: string): Promise<GoalDetail> {
    return unwrap(api.get(`${baseUrl}/${id}`));
  },

  create(request: SaveGoalRequest): Promise<GoalSummary> {
    return unwrap(api.post(baseUrl, request));
  },

  update(id: string, request: SaveGoalRequest): Promise<GoalSummary> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },

  setStatus(id: string, status: GoalStatus): Promise<GoalSummary> {
    return unwrap(api.post(`${baseUrl}/${id}/status`, { status }));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },

  linkTask(id: string, taskId: string): Promise<GoalSummary> {
    return unwrap(api.put(`${baseUrl}/${id}/tasks/${taskId}`));
  },

  unlinkTask(id: string, taskId: string): Promise<GoalSummary> {
    return unwrap(api.delete(`${baseUrl}/${id}/tasks/${taskId}`));
  },

  addMilestone(id: string, request: SaveMilestoneRequest): Promise<GoalMilestone> {
    return unwrap(api.post(`${baseUrl}/${id}/milestones`, request));
  },

  updateMilestone(id: string, milestoneId: string, request: SaveMilestoneRequest): Promise<GoalMilestone> {
    return unwrap(api.put(`${baseUrl}/${id}/milestones/${milestoneId}`, request));
  },

  async deleteMilestone(id: string, milestoneId: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}/milestones/${milestoneId}`);
  },

  addMetric(id: string, request: SaveMetricRequest): Promise<GoalMetric> {
    return unwrap(api.post(`${baseUrl}/${id}/metrics`, request));
  },

  updateMetric(id: string, metricId: string, request: SaveMetricRequest): Promise<GoalMetric> {
    return unwrap(api.put(`${baseUrl}/${id}/metrics/${metricId}`, request));
  },

  async deleteMetric(id: string, metricId: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}/metrics/${metricId}`);
  },

  metricEntries(id: string, metricId: string): Promise<GoalMetricEntry[]> {
    return unwrap(api.get(`${baseUrl}/${id}/metrics/${metricId}/entries`));
  },

  logMetricEntry(id: string, metricId: string, request: LogMetricEntryRequest): Promise<GoalMetric> {
    return unwrap(api.post(`${baseUrl}/${id}/metrics/${metricId}/entries`, request));
  },

  deleteMetricEntry(id: string, metricId: string, entryId: string): Promise<GoalMetric> {
    return unwrap(api.delete(`${baseUrl}/${id}/metrics/${metricId}/entries/${entryId}`));
  },

  async addLink(id: string, targetGoalId: string, linkType: GoalLinkType): Promise<void> {
    await api.post(`${baseUrl}/${id}/links`, { targetGoalId, linkType });
  },

  async deleteLink(id: string, linkId: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}/links/${linkId}`);
  },

  submitReview(id: string, request: SubmitGoalReviewRequest): Promise<GoalReview> {
    return unwrap(api.post(`${baseUrl}/${id}/reviews`, request));
  },
};
