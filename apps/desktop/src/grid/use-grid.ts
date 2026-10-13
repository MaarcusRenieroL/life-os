import { applyView, cycleSort, defaultState, layoutOf, restoreLayout, setFilter, viewOf, type GridColumnDef, type GridState, type GridView, type SortState } from '@life-os/core';
import { useCallback, useEffect, useRef, useState } from 'react';

function read<V>(store: Storage, key: string): V | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as V) : null;
  } catch {
    return null;
  }
}
function write(store: Storage, key: string, value: unknown) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the grid just forgets */
  }
}

export interface UseGridOptions {
  sorting?: SortState[];
  filters?: Record<string, unknown>;
  pageSize?: number;
  hidden?: Record<string, boolean>;
}

/**
 * A grid's state. Layout (sort, hidden/ordered/resized columns, page size, density) survives launches; filters,
 * search and the active view survive navigating away and back, but only for this session - a filter from last
 * week should never make a table look empty on a fresh start.
 */
export function useGrid<T>(tableId: string, columns: GridColumnDef<T>[], options: UseGridOptions = {}) {
  const layoutKey = `lifeos.table.${tableId}`;
  const filterKey = `lifeos.filters.${tableId}`;
  const viewsKey = `lifeos.views.${tableId}`;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const defaults = useRef<GridState>(
    defaultState(columns, {
      sorting: options.sorting ?? [],
      filters: options.filters ?? {},
      pageSize: options.pageSize ?? 20,
      ...(options.hidden ? { hidden: { ...Object.fromEntries(columns.filter((c) => c.hidden).map((c) => [c.id, true])), ...options.hidden } } : {}),
    }),
  );

  const [state, setState] = useState<GridState>(() => {
    const restored = restoreLayout(columns, defaults.current, read(localStorage, layoutKey));
    const session = read<{ filters: Record<string, unknown>; search: string; view: string }>(sessionStorage, filterKey);
    return session ? { ...restored, filters: session.filters ?? {}, search: session.search ?? '', view: session.view ?? 'all' } : restored;
  });
  const [saved, setSaved] = useState<GridView[]>(() => read<GridView[]>(localStorage, viewsKey) ?? []);

  useEffect(() => write(localStorage, layoutKey, layoutOf(state)), [layoutKey, state.sorting, state.hidden, state.order, state.widths, state.pageSize, state.density]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => write(sessionStorage, filterKey, { filters: state.filters, search: state.search, view: state.view }), [filterKey, state.filters, state.search, state.view]);
  useEffect(() => write(localStorage, viewsKey, saved), [viewsKey, saved]);

  const patch = useCallback((p: Partial<GridState>) => setState((s) => ({ ...s, ...p })), []);

  return {
    state,
    patch,
    saved,
    defaults: defaults.current,
    setSearch: (search: string) => patch({ search, page: 0, view: 'custom' }),
    setColumnFilter: (id: string, value: unknown) => setState((s) => ({ ...s, filters: setFilter(s.filters, id, value), page: 0, view: 'custom' })),
    toggleSort: (id: string, multi = false) => setState((s) => ({ ...s, sorting: cycleSort(s.sorting, id, multi) })),
    clearFilters: () => patch({ filters: {}, search: '', page: 0, view: 'all' }),
    resetLayout: () => setState((s) => ({ ...defaults.current, filters: s.filters, search: s.search, view: s.view })),
    applyView: (view: GridView) => setState((s) => applyView(s, view, defaults.current)),
    saveView: (name: string) => {
      const id = `v-${Date.now().toString(36)}`;
      setSaved((v) => [...v, viewOf(id, name, state)]);
      patch({ view: id });
    },
    removeView: (id: string) => {
      setSaved((v) => v.filter((x) => x.id !== id));
      if (state.view === id) patch({ view: 'all' });
    },
  };
}
