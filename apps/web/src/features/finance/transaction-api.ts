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
  /** Every transaction matching the (server-side) filters, fetched page by page, so the table can
   * sort, filter and total across all of them instead of one page. Capped so a runaway account
   * can't make the browser fetch forever. */
  async getAllTransactions(filters?: TransactionFilters): Promise<TransactionResponse[]> {
    const pageSize = 500;
    const maxPages = 20;
    const all: TransactionResponse[] = [];
    for (let page = 0; page < maxPages; page++) {
      const result = await transactionApi.getTransactions(page, pageSize, filters);
      all.push(...result.content);
      if (result.last || result.content.length === 0) break;
    }
    return all;
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
