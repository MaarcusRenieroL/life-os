import { api, unwrap } from '@/lib/api-client';

import type {
  AiUsageSummary,
  EmailEvent,
  Interview,
  JobAnalytics,
  JobFitResult,
  JobListing,
  JobStatus,
  JobTailoringVersion,
  Referral,
  ResumeTailoringResult,
  UpdateJobDetailsRequest,
  UpsertInterviewRequest,
  UpsertReferralRequest,
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

  setStatus(jobId: string, status: JobStatus): Promise<JobListing> {
    return unwrap(api.patch(`${baseUrl}/${jobId}`, { status }));
  },

  updateDetails(jobId: string, request: UpdateJobDetailsRequest): Promise<JobListing> {
    return unwrap(api.patch(`${baseUrl}/${jobId}/details`, request));
  },

  generateCoverLetter(jobId: string): Promise<JobListing> {
    return unwrap(api.post(`${baseUrl}/${jobId}/cover-letter`, {}));
  },

  rescore(jobId: string): Promise<JobFitResult> {
    return unwrap(api.post(`${baseUrl}/${jobId}/rescore`, {}));
  },

  rescoreWithTailoredResume(jobId: string): Promise<JobFitResult> {
    return unwrap(api.post(`${baseUrl}/${jobId}/rescore-tailored`, {}));
  },

  tailorResume(jobId: string): Promise<ResumeTailoringResult> {
    return unwrap(api.post(`${baseUrl}/${jobId}/tailor-resume`, {}));
  },

  async tailorResumePdf(jobId: string): Promise<Blob> {
    const response = await api.get(`${baseUrl}/${jobId}/tailor-resume/pdf`, { responseType: 'blob' });
    return response.data;
  },

  tailoringVersions(jobId: string): Promise<JobTailoringVersion[]> {
    return unwrap(api.get(`${baseUrl}/${jobId}/tailor-resume/versions`));
  },

  async tailoringVersionPdf(jobId: string, versionId: string): Promise<Blob> {
    const response = await api.get(`${baseUrl}/${jobId}/tailor-resume/versions/${versionId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
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

export const referralApi = {
  list(jobId: string): Promise<Referral[]> {
    return unwrap(api.get(`${baseUrl}/${jobId}/referrals`));
  },

  create(jobId: string, request: UpsertReferralRequest): Promise<Referral> {
    return unwrap(api.post(`${baseUrl}/${jobId}/referrals`, request));
  },

  update(jobId: string, referralId: string, request: UpsertReferralRequest): Promise<Referral> {
    return unwrap(api.put(`${baseUrl}/${jobId}/referrals/${referralId}`, request));
  },

  generateDraftMessage(jobId: string, referralId: string): Promise<Referral> {
    return unwrap(api.post(`${baseUrl}/${jobId}/referrals/${referralId}/draft-message`, {}));
  },

  async delete(jobId: string, referralId: string): Promise<void> {
    await api.delete(`${baseUrl}/${jobId}/referrals/${referralId}`);
  },

  upcomingFollowUps(): Promise<Referral[]> {
    return unwrap(api.get(`${baseUrl}/referrals/upcoming-follow-ups`));
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
