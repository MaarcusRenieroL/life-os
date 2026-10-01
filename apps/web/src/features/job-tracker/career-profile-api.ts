import { api, unwrap } from '@/lib/api-client';

import type {
  CareerProfile,
  CareerProfileBundle,
  ProjectEntry,
  UpsertProjectRequest,
  UpsertWorkExperienceRequest,
  WorkExperience,
} from './types';

const baseUrl = '/v1/career-profile';

export interface UpsertCareerProfileRequest {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  summary: string | null;
}

export const careerProfileApi = {
  get(): Promise<CareerProfileBundle> {
    return unwrap(api.get(baseUrl));
  },

  upsertProfile(request: UpsertCareerProfileRequest): Promise<CareerProfile> {
    return unwrap(api.put(baseUrl, request));
  },

  seedFromResume(file: File): Promise<CareerProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap(api.post(`${baseUrl}/seed-from-resume`, formData));
  },

  createExperience(request: UpsertWorkExperienceRequest): Promise<WorkExperience> {
    return unwrap(api.post(`${baseUrl}/work-experiences`, request));
  },

  updateExperience(id: string, request: UpsertWorkExperienceRequest): Promise<WorkExperience> {
    return unwrap(api.put(`${baseUrl}/work-experiences/${id}`, request));
  },

  async deleteExperience(id: string): Promise<void> {
    await api.delete(`${baseUrl}/work-experiences/${id}`);
  },

  createProject(request: UpsertProjectRequest): Promise<ProjectEntry> {
    return unwrap(api.post(`${baseUrl}/projects`, request));
  },

  updateProject(id: string, request: UpsertProjectRequest): Promise<ProjectEntry> {
    return unwrap(api.put(`${baseUrl}/projects/${id}`, request));
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`${baseUrl}/projects/${id}`);
  },
};
