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
  // One request for every category a page needs, instead of one per category. The dashboard,
  // budgets, analytics and report pages all used to Promise.all over getCategoryComparison, which
  // was up to ~20 requests per page - see the shared query key in category-comparison-query.ts.
  getCategoryComparisons(categoryIds: string[]): Promise<CategoryComparison[]> {
    return unwrap(api.get(`${baseUrl}/categories`, { params: { categoryIds: categoryIds.join(',') } }));
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
