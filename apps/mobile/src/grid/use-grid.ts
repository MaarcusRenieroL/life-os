import { applyView, cycleSort, defaultState, layoutOf, restoreLayout, setFilter, viewOf, type GridColumnDef, type GridLayout, type GridState, type GridView, type SortState } from '@life-os/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { readJson, readSession, writeJson, writeSession } from './storage';

export interface UseGridOptions {
  sorting?: SortState[];
  filters?: Record<string, unknown>;
  pageSize?: number;
}

/**
 * A grid's state. Layout (sort, hidden/ordered columns, density) survives launches; filters, search and the
 * active view survive navigating away and back for the session only, so an old filter never makes a table
 * look empty on a fresh start.
 */
export function useGrid<T>(tableId: string, columns: GridColumnDef<T>[], options: UseGridOptions = {}) {
  const layoutKey = `lifeos.table.${tableId}`;
  const viewsKey = `lifeos.views.${tableId}`;
  const filterKey = `filters.${tableId}`;
  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  });

  const [defaults] = useState<GridState>(() => defaultState(columns, { sorting: options.sorting ?? [], filters: options.filters ?? {}, pageSize: options.pageSize ?? 20 }));

  const [state, setState] = useState<GridState>(() => {
    const session = readSession<{ filters: Record<string, unknown>; search: string; view: string }>(filterKey);
    return session ? { ...defaults, filters: session.filters ?? {}, search: session.search ?? '', view: session.view ?? 'all' } : defaults;
  });
  const [saved, setSaved] = useState<GridView[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    let live = true;
    void Promise.all([readJson<Partial<GridLayout>>(layoutKey), readJson<GridView[]>(viewsKey)]).then(([layout, views]) => {
      if (!live) return;
      if (layout) setState((s) => ({ ...restoreLayout(columnsRef.current, defaults, layout), filters: s.filters, search: s.search, view: s.view }));
      if (views) setSaved(views);
      loaded.current = true;
    });
    return () => {
      live = false;
    };
  }, [layoutKey, viewsKey, defaults]);

  useEffect(() => {
    if (loaded.current) writeJson(layoutKey, layoutOf(state));
  }, [layoutKey, state.sorting, state.hidden, state.order, state.pageSize, state.density]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => writeSession(filterKey, { filters: state.filters, search: state.search, view: state.view }), [filterKey, state.filters, state.search, state.view]);

  const patch = useCallback((p: Partial<GridState>) => setState((s) => ({ ...s, ...p })), []);
  const persistViews = (next: GridView[]) => {
    setSaved(next);
    writeJson(viewsKey, next);
  };

  return {
    state,
    patch,
    saved,
    defaults: defaults,
    setSearch: (search: string) => patch({ search, page: 0, view: 'custom' }),
    setColumnFilter: (id: string, value: unknown) => setState((s) => ({ ...s, filters: setFilter(s.filters, id, value), page: 0, view: 'custom' })),
    toggleSort: (id: string) => setState((s) => ({ ...s, sorting: cycleSort(s.sorting, id) })),
    clearFilters: () => patch({ filters: {}, search: '', page: 0, view: 'all' }),
    resetLayout: () => setState((s) => ({ ...defaults, filters: s.filters, search: s.search, view: s.view })),
    applyView: (view: GridView) => setState((s) => applyView(s, view, defaults)),
    saveView: (name: string) => {
      const id = `v-${Date.now().toString(36)}`;
      persistViews([...saved, viewOf(id, name, state)]);
      patch({ view: id });
    },
    removeView: (id: string) => {
      persistViews(saved.filter((x) => x.id !== id));
      if (state.view === id) patch({ view: 'all' });
    },
  };
}

export type Grid = ReturnType<typeof useGrid>;
