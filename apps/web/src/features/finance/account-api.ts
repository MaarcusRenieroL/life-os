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
  /** An account with transactions is refused unless withTransactions is set, which deletes them too. */
  async deleteAccount(id: string, withTransactions = false): Promise<void> {
    await api.delete(`${baseUrl}/${id}`, { params: withTransactions ? { withTransactions: true } : undefined });
  },
  /** Recomputes the balance from the account's transactions. */
  recalculateAccount(id: string): Promise<AccountResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/recalculate`, {}));
  },
  reconcileAccount(id: string, request: ReconcileAccountRequest): Promise<AccountResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/reconcile`, request));
  },
};
