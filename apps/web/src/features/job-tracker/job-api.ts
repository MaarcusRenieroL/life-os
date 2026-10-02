import { api, unwrap } from '@/lib/api-client';

import type {
  ImportCandidate,
  ImportItem,
  AiUsageSummary,
  EmailEvent,
  Interview,
  JobAnalytics,
  JobFitResult,
  JobListing,
  JobStatus,
  KnownPerson,
  UpdateJobDetailsRequest,
  UpsertInterviewRequest,
} from './types';

export interface ReviewEmailEventRequest {
  action: 'APPROVE' | 'DISMISS';
  jobId?: string;
  status?: JobStatus;
}

const baseUrl = '/v1/jobs';

export const jobApi = {
  list(): Promise<JobListing[]> {
    return unwrap(api.get(baseUrl));
  },

  get(jobId: string): Promise<JobListing> {
    return unwrap(api.get(`${baseUrl}/${jobId}`));
  },

  /**
   * Add a job from a pasted URL. Pass `jobDescriptionText` on the retry when the first call
   * returned 422 (the site blocked a server-side read).
   */
  fromLink(url: string, jobDescriptionText?: string): Promise<JobListing> {
    return unwrap(api.post(`${baseUrl}/from-link`, { url, jobDescriptionText }));
  },

  /** Reads applications out of text pasted from a job board's Applied jobs page. Saves nothing. */
  previewImport(text: string): Promise<ImportCandidate[]> {
    return unwrap(api.post(`${baseUrl}/import/preview`, { text }));
  },

  /** Saves the confirmed rows as APPLIED jobs; rows already tracked are skipped. */
  importApplied(source: string, items: ImportItem[]): Promise<{ created: number; skipped: number }> {
    return unwrap(api.post(`${baseUrl}/import`, { source, items }));
  },

  /** Fills in a job created from an email (company + title only) from its posting link, then rescores it. */
  attachLink(jobId: string, url?: string, jobDescriptionText?: string): Promise<JobListing> {
    return unwrap(api.post(`${baseUrl}/${jobId}/link`, { url, jobDescriptionText }));
  },

  setStatus(jobId: string, status: JobStatus): Promise<JobListing> {
    return unwrap(api.patch(`${baseUrl}/${jobId}`, { status }));
  },

  updateDetails(jobId: string, request: UpdateJobDetailsRequest): Promise<JobListing> {
    return unwrap(api.patch(`${baseUrl}/${jobId}/details`, request));
  },

  generateCoverLetter(jobId: string): Promise<JobListing> {
    return unwrap(api.post(`${baseUrl}/${jobId}/cover-letter`, {}));
  },

  /** The candidate's standard referral ask for this job; `contactName` personalises the greeting. */
  referralMessage(jobId: string, contactName?: string): Promise<string> {
    return unwrap(api.get(`${baseUrl}/${jobId}/referral-message`, { params: { contactName } }));
  },

  /** People noted at this job's company; shared by every role there. */
  knownPeople(jobId: string): Promise<KnownPerson[]> {
    return unwrap(api.get(`${baseUrl}/${jobId}/known-people`));
  },

  saveKnownPeople(jobId: string, people: KnownPerson[]): Promise<KnownPerson[]> {
    return unwrap(api.put(`${baseUrl}/${jobId}/known-people`, people));
  },

  rescore(jobId: string): Promise<JobFitResult> {
    return unwrap(api.post(`${baseUrl}/${jobId}/rescore`, {}));
  },

  uploadResumeOverride(jobId: string, file: File): Promise<JobListing> {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap(api.post(`${baseUrl}/${jobId}/resume-override`, formData));
  },

  deleteResumeOverride(jobId: string): Promise<JobListing> {
    return unwrap(api.delete(`${baseUrl}/${jobId}/resume-override`));
  },

  /** Wording-edit suggestions the candidate applies to their own resume by hand - no resume is
   * generated or rewritten. */
  getAtsSuggestions(jobId: string): Promise<JobListing> {
    return unwrap(api.post(`${baseUrl}/${jobId}/ats-suggestions`, {}));
  },

  async delete(jobId: string): Promise<void> {
    await api.delete(`${baseUrl}/${jobId}`);
  },

  needsReviewEmailEvents(): Promise<EmailEvent[]> {
    return unwrap(api.get(`${baseUrl}/email-events/needs-review`));
  },

  reviewEmailEvent(eventId: string, request: ReviewEmailEventRequest): Promise<EmailEvent> {
    return unwrap(api.post(`${baseUrl}/email-events/${eventId}/review`, request));
  },
};

export const interviewApi = {
  list(jobId: string): Promise<Interview[]> {
    return unwrap(api.get(`${baseUrl}/${jobId}/interviews`));
  },

  create(jobId: string, request: UpsertInterviewRequest): Promise<Interview> {
    return unwrap(api.post(`${baseUrl}/${jobId}/interviews`, request));
  },

  update(jobId: string, interviewId: string, request: UpsertInterviewRequest): Promise<Interview> {
    return unwrap(api.put(`${baseUrl}/${jobId}/interviews/${interviewId}`, request));
  },

  generatePrepTopics(jobId: string, interviewId: string): Promise<Interview> {
    return unwrap(api.post(`${baseUrl}/${jobId}/interviews/${interviewId}/prep-topics`, {}));
  },

  async delete(jobId: string, interviewId: string): Promise<void> {
    await api.delete(`${baseUrl}/${jobId}/interviews/${interviewId}`);
  },
};

export const jobEmailApi = {
  /** Pulls the last week of job emails through the classifier now instead of at the next poll. */
  syncNow(): Promise<number> {
    return unwrap(api.post('/v1/batches/gmail/jobs/sync-recent', {}));
  },
};

export const jobAnalyticsApi = {
  get(): Promise<JobAnalytics> {
    return unwrap(api.get(`${baseUrl}/analytics`));
  },
};

export const aiUsageApi = {
  getSummary(): Promise<AiUsageSummary> {
    return unwrap(api.get(`${baseUrl}/ai-usage/summary`));
  },
};
