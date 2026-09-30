import { api, unwrap } from '@/lib/api-client';

import type {
  AddWatchedCompanyRequest,
  DiscoveredJob,
  DiscoveryPreferences,
  WatchedCompany,
} from './discovery-types';
import type { JobListing } from './types';

// Nested under /v1/jobs so the existing gateway/dev-proxy rule covers it.
const baseUrl = '/v1/jobs/discovery';

export interface DiscoveryScanResult {
  companiesScanned: number;
  newOpenings: number;
  closedOpenings: number;
  errors: string[];
}

export const discoveryApi = {
  companies(): Promise<WatchedCompany[]> {
    return unwrap(api.get(`${baseUrl}/companies`));
  },

  addCompany(request: AddWatchedCompanyRequest): Promise<WatchedCompany> {
    return unwrap(api.post(`${baseUrl}/companies`, request));
  },

  updateCompany(id: string, patch: { active?: boolean; alert?: boolean }): Promise<WatchedCompany> {
    return unwrap(api.patch(`${baseUrl}/companies/${id}`, patch));
  },

  async removeCompany(id: string): Promise<void> {
    await api.delete(`${baseUrl}/companies/${id}`);
  },

  scanCompany(id: string): Promise<DiscoveryScanResult> {
    return unwrap(api.post(`${baseUrl}/companies/${id}/scan`, {}));
  },

  /** Starts a background scan of the whole watchlist; resolves false if one is already running. */
  scanAll(): Promise<boolean> {
    return unwrap(api.post(`${baseUrl}/scan`, {}));
  },

  jobs(params: { minScore?: number; companyId?: string; limit?: number } = {}): Promise<DiscoveredJob[]> {
    return unwrap(api.get(`${baseUrl}/jobs`, { params }));
  },

  job(id: string): Promise<DiscoveredJob> {
    return unwrap(api.get(`${baseUrl}/jobs/${id}`));
  },

  promote(id: string): Promise<JobListing> {
    return unwrap(api.post(`${baseUrl}/jobs/${id}/promote`, {}));
  },

  dismiss(id: string): Promise<DiscoveredJob> {
    return unwrap(api.post(`${baseUrl}/jobs/${id}/dismiss`, {}));
  },

  preferences(): Promise<DiscoveryPreferences> {
    return unwrap(api.get(`${baseUrl}/preferences`));
  },

  savePreferences(preferences: DiscoveryPreferences): Promise<DiscoveryPreferences> {
    return unwrap(api.put(`${baseUrl}/preferences`, preferences));
  },
};
