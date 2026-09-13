import { api, unwrap } from '@/lib/api-client';

import type { RecurringPatternResponse } from './types';

const baseUrl = '/v1/finance/recurring-patterns';

export const recurringPatternApi = {
  getPatterns(): Promise<RecurringPatternResponse[]> {
    return unwrap(api.get(baseUrl));
  },
  updateCategory(id: string, categoryId: string): Promise<RecurringPatternResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, { categoryId }));
  },
  async dismiss(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
