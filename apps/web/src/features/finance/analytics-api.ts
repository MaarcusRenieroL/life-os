import { api, unwrap } from '@/lib/api-client';

import type { CategoryComparison, DashboardSummary, MerchantSpend, MonthlyTrend } from './types';

const baseUrl = '/v1/finance/analytics';

export const analyticsApi = {
  getDashboardSummary(): Promise<DashboardSummary> {
    return unwrap(api.get(`${baseUrl}/dashboard`));
  },
  getCategoryComparison(categoryId: string): Promise<CategoryComparison> {
    return unwrap(api.get(`${baseUrl}/category/${categoryId}`));
  },
  getTrends(): Promise<MonthlyTrend[]> {
    return unwrap(api.get(`${baseUrl}/trends`));
  },
  getTopMerchants(limit = 10): Promise<MerchantSpend[]> {
    return unwrap(api.get(`${baseUrl}/merchants`, { params: { limit } }));
  },
  updateMonthlyIncome(monthlyIncome: number): Promise<DashboardSummary> {
    return unwrap(api.put(`${baseUrl}/monthly-income`, { monthlyIncome }));
  },
};
