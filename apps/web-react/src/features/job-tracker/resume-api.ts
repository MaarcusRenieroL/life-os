import { api, unwrap } from '@/lib/api-client';

import type { Resume, Skill } from './types';

const baseUrl = '/v1/resumes';

export const resumeApi = {
  /** The single saved resume, or null (404) if none uploaded yet. */
  async current(): Promise<Resume | null> {
    try {
      return await unwrap<Resume>(api.get(baseUrl));
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        return null;
      }
      throw err;
    }
  },

  upload(file: File, label?: string): Promise<Resume> {
    const form = new FormData();
    form.append('file', file);
    if (label) {
      form.append('label', label);
    }
    return unwrap(api.post(`${baseUrl}/upload`, form));
  },

  async delete(resumeId: string): Promise<void> {
    await api.delete(`${baseUrl}/${resumeId}`);
  },

  skillLibrary(): Promise<Skill[]> {
    return unwrap(api.get('/v1/skills'));
  },
};
