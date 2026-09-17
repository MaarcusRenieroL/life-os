import { api, unwrap } from '@/lib/api-client';

export interface BackupSummaryResponse {
  id: string;
  createdAt: string;
}

// Also lives in the "batches" microservice, not vault.
const baseUrl = '/v1/batches/backup';

export const backupApi = {
  getLatest(): Promise<BackupSummaryResponse | null> {
    return unwrap(api.get(`${baseUrl}/latest`));
  },

  async runBackup(): Promise<void> {
    await api.post(`${baseUrl}/run`, {});
  },

  async restoreBackup(): Promise<void> {
    await api.post(`${baseUrl}/restore`, {});
  },
};
