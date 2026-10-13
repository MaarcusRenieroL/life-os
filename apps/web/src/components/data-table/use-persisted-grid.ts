import type { ColumnFiltersState, ColumnOrderState, ColumnSizingState, SortingState, VisibilityState } from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Density } from './data-table';

export interface GridLayout {
  sorting: SortingState;
  visibility: VisibilityState;
  order: ColumnOrderState;
  sizing: ColumnSizingState;
  pageSize: number;
  density: Density;
}

const KEY = (tableId: string) => `lifeos.table.${tableId}`;

function read(tableId: string): Partial<GridLayout> {
  try {
    const raw = localStorage.getItem(KEY(tableId));
    return raw ? (JSON.parse(raw) as Partial<GridLayout>) : {};
  } catch {
    return {};
  }
}

/**
 * A table's layout (sort, hidden/reordered/resized columns, page size, density) survives reloads,
 * per table. Filters live separately (see `usePersistedFilters`) and only for the browser session.
 */
export function usePersistedGrid(tableId: string, defaults: GridLayout) {
  const [layout, setLayout] = useState<GridLayout>(() => ({ ...defaults, ...read(tableId) }));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY(tableId), JSON.stringify(layout));
    } catch {
      /* private mode / full storage: the layout just won't persist */
    }
  }, [tableId, layout]);

  const patch = useCallback(<K extends keyof GridLayout>(key: K, value: GridLayout[K] | ((prev: GridLayout[K]) => GridLayout[K])) => {
    setLayout((prev) => ({ ...prev, [key]: typeof value === 'function' ? (value as (p: GridLayout[K]) => GridLayout[K])(prev[key]) : value }));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY(tableId));
    } catch {
      /* ignore */
    }
    setLayout(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  return { layout, patch, reset };
}

export interface GridFilters {
  filters: ColumnFiltersState;
  search: string;
  view: string;
}

const FILTER_KEY = (tableId: string) => `lifeos.filters.${tableId}`;

function readFilters(tableId: string, defaults: GridFilters): GridFilters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY(tableId));
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<GridFilters>) } : defaults;
  } catch {
    return defaults;
  }
}

/**
 * Filters, the search box and the active view survive navigating away (a row's detail page) and back,
 * and reloads. They are kept per browser session, not forever, so a filter from last week never makes
 * a table look empty on a fresh visit; "Reset" clears them.
 */
export function usePersistedFilters(tableId: string, defaults: GridFilters) {
  const [state, setState] = useState<GridFilters>(() => readFilters(tableId, defaults));

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY(tableId), JSON.stringify(state));
    } catch {
      /* private mode / full storage: filters just won't persist */
    }
  }, [tableId, state]);

  const setFilters = useCallback((value: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
    setState((prev) => ({ ...prev, filters: typeof value === 'function' ? value(prev.filters) : value }));
  }, []);
  const setSearch = useCallback((value: unknown | ((prev: unknown) => unknown)) => {
    setState((prev) => ({ ...prev, search: String(typeof value === 'function' ? (value as (p: string) => unknown)(prev.search) : value ?? '') }));
  }, []);
  const setView = useCallback((view: string) => setState((prev) => ({ ...prev, view })), []);

  return { filters: state.filters, search: state.search, view: state.view, setFilters, setSearch, setView };
}
