import { api, unwrap } from '@/lib/api-client';

import type { BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest } from './types';

const baseUrl = '/v1/finance/budgets';

export const budgetApi = {
  getBudgets(): Promise<BudgetResponse[]> {
    return unwrap(api.get(baseUrl));
  },
  createBudget(request: CreateBudgetRequest): Promise<BudgetResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  updateBudget(id: string, request: UpdateBudgetRequest): Promise<BudgetResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async deleteBudget(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
