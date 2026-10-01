import { api, unwrap } from '@/lib/api-client';

import type { ImportFailure } from './types';

const baseUrl = '/v1/finance/import-failures';

/** Bank alerts that could not be booked (no account yet, unreadable format), waiting for you. */
export const importFailureApi = {
  list(): Promise<ImportFailure[]> {
    return unwrap(api.get(baseUrl));
  },
  count(): Promise<number> {
    return unwrap(api.get(`${baseUrl}/count`));
  },
  async retry(id: string): Promise<void> {
    await api.post(`${baseUrl}/${id}/retry`, {});
  },
  async dismiss(id: string): Promise<void> {
    await api.post(`${baseUrl}/${id}/dismiss`, {});
  },
};
