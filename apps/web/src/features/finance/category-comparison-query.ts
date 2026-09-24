import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { analyticsApi } from './analytics-api';
import type { CategoryComparison, CategoryResponse } from './types';

/**
 * This-month vs. last-month spend comparisons for every one of the user's categories, in a single
 * request under a single cache key.
 *
 * All four finance pages (dashboard, budgets, analytics, report) need some subset of these. Each
 * used to `Promise.all` one request per category - up to ~20 per page - and key the result on its
 * own subset of ids (dashboard/budgets on expense ∪ budgeted, analytics/report on expense only), so
 * navigating between pages re-ran the entire fan-out instead of reusing a cache entry.
 *
 * Asking for every category id, sorted, means the key is identical on all four pages, so they share
 * one entry and one request. Each page then filters the result down to the categories it displays -
 * the extra ids cost nothing, since the backend aggregates all of them in one grouped query.
 */
export function useCategoryComparisons(categories: CategoryResponse[]): CategoryComparison[] {
  // Memoized (and sorted) so this array's identity is stable across unrelated re-renders - it feeds
  // the query key and, downstream, the pages' expensive spend/rollup memos.
  const allCategoryIds = useMemo(() => categories.map((c) => c.id).sort(), [categories]);

  const { data: comparisons = [] } = useQuery({
    queryKey: ['finance', 'category-comparisons', allCategoryIds],
    queryFn: () => analyticsApi.getCategoryComparisons(allCategoryIds),
    enabled: allCategoryIds.length > 0,
  });

  return comparisons;
}
