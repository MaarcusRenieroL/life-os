import { api, unwrap } from '@/lib/api-client';

import type { Resume } from './types';

const baseUrl = '/v1/resumes';

export const resumeApi = {
  /** The candidate's current (most recently uploaded) base resume, or throws if none uploaded. */
  current(): Promise<Resume> {
    return unwrap(api.get(baseUrl));
  },

  async downloadPdf(resumeId: string): Promise<Blob> {
    const response = await api.get(`${baseUrl}/${resumeId}/download`, { responseType: 'blob' });
    return response.data;
  },
};
