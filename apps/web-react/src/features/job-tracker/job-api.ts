import { api, unwrap } from '@/lib/api-client';

import type { EmailEvent, JobFitResult, JobListing, JobStatus, ResumeTailoringResult } from './types';

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

  rescore(jobId: string): Promise<JobFitResult> {
    return unwrap(api.post(`${baseUrl}/${jobId}/rescore`, {}));
  },

  tailorResume(jobId: string): Promise<ResumeTailoringResult> {
    return unwrap(api.post(`${baseUrl}/${jobId}/tailor-resume`, {}));
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
