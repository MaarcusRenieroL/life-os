import { api, unwrap } from '@/lib/api-client';

import type { AccountResponse, CreateAccountRequest, ReconcileAccountRequest, UpdateAccountRequest } from './types';

const baseUrl = '/v1/finance/accounts';

export const accountApi = {
  getAccounts(): Promise<AccountResponse[]> {
    return unwrap(api.get(baseUrl));
  },
  createAccount(request: CreateAccountRequest): Promise<AccountResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  updateAccount(id: string, request: UpdateAccountRequest): Promise<AccountResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async deleteAccount(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
  reconcileAccount(id: string, request: ReconcileAccountRequest): Promise<AccountResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/reconcile`, request));
  },
};
