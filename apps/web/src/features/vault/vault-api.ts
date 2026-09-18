import { api, unwrap } from '@/lib/api-client';

import type {
  BulkImportResult,
  HealthSummary,
  MasterPasswordRequest,
  RecoveryCodesResponse,
  RecoveryCodeStatus,
  VaultEntryDetail,
  VaultEntrySummary,
  VaultEntryWriteRequest,
  VaultExport,
  VaultStatus,
} from './types';

const baseUrl = '/v1/vault';

export const vaultApi = {
  getStatus(): Promise<VaultStatus> {
    return unwrap(api.get(`${baseUrl}/status`));
  },

  async setup(request: MasterPasswordRequest): Promise<void> {
    await api.post(`${baseUrl}/setup`, request);
  },

  async verify(request: MasterPasswordRequest): Promise<void> {
    await api.post(`${baseUrl}/verify`, request);
  },

  getEntries(): Promise<VaultEntrySummary[]> {
    return unwrap(api.get(`${baseUrl}/entries`));
  },

  getEntry(id: string): Promise<VaultEntryDetail> {
    return unwrap(api.get(`${baseUrl}/entry/${id}`));
  },

  async createEntry(request: VaultEntryWriteRequest): Promise<void> {
    await api.post(`${baseUrl}/entry`, request);
  },

  async updateEntry(id: string, request: VaultEntryWriteRequest): Promise<void> {
    await api.put(`${baseUrl}/entry/${id}`, request);
  },

  async deleteEntry(id: string): Promise<void> {
    await api.delete(`${baseUrl}/entry/${id}`);
  },

  getHealthSummary(): Promise<HealthSummary> {
    return unwrap(api.get(`${baseUrl}/health/summary`));
  },

  async changeMasterPassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post(`${baseUrl}/master-password/change`, { currentPassword, newPassword });
  },

  generateRecoveryCodes(currentPassword: string): Promise<RecoveryCodesResponse> {
    return unwrap(api.post(`${baseUrl}/recovery-codes/generate`, { currentPassword }));
  },

  listRecoveryCodes(): Promise<RecoveryCodeStatus[]> {
    return unwrap(api.get(`${baseUrl}/recovery-codes`));
  },

  async resetWithRecoveryCode(code: string, newMasterPassword: string): Promise<void> {
    await api.post(`${baseUrl}/recovery-codes/reset`, { code, newMasterPassword });
  },

  exportVault(): Promise<VaultExport> {
    return unwrap(api.get(`${baseUrl}/export`));
  },

  bulkCreateEntries(entries: VaultEntryWriteRequest[]): Promise<BulkImportResult> {
    return unwrap(api.post(`${baseUrl}/entries/bulk`, { entries }));
  },

  async deleteAccount(): Promise<void> {
    await api.delete(`${baseUrl}/account`);
  },
};
