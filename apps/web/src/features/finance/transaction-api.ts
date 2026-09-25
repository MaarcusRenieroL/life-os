import { api, unwrap } from '@/lib/api-client';

import type {
  CreateTransactionRequest,
  DisputeTransactionRequest,
  MergeTransactionsRequest,
  SpringPage,
  TransactionFilters,
  TransactionResponse,
  UpdateTransactionCategoriesRequest,
  UpdateTransactionRequest,
} from './types';

const baseUrl = '/v1/finance/transactions';

export const transactionApi = {
  getTransactions(page = 0, size = 50, filters?: TransactionFilters): Promise<SpringPage<TransactionResponse>> {
    return unwrap(api.get(baseUrl, { params: { page, size, ...filters } }));
  },
  // Just the count, for the "N need review" badges - callers used to fetch a 50-row page of full
  // transactions and filter it client-side, which also undercounted past 50 uncategorized rows.
  getNeedsReviewCount(): Promise<number> {
    return unwrap(api.get(`${baseUrl}/needs-review-count`));
  },
  getTransaction(id: string): Promise<TransactionResponse> {
    return unwrap(api.get(`${baseUrl}/${id}`));
  },
  createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  updateTransaction(id: string, request: UpdateTransactionRequest): Promise<TransactionResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
  rename(id: string, correctedName: string): Promise<TransactionResponse> {
    return unwrap(api.put(`${baseUrl}/${id}/rename`, { correctedName }));
  },
  merge(id: string, request: MergeTransactionsRequest): Promise<TransactionResponse> {
    return unwrap(api.put(`${baseUrl}/${id}/merge`, request));
  },
  dispute(id: string, request: DisputeTransactionRequest): Promise<TransactionResponse> {
    return unwrap(api.put(`${baseUrl}/${id}/dispute`, request));
  },
  updateCategories(id: string, request: UpdateTransactionCategoriesRequest): Promise<TransactionResponse> {
    return unwrap(api.put(`${baseUrl}/${id}/categories`, request));
  },
};
