import { api, unwrap } from '@/lib/api-client';

import type {
  EmailEvent,
  Interview,
  JobFitResult,
  JobListing,
  JobStatus,
  JobTailoringVersion,
  ResumeTailoringResult,
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
