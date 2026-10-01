import type { ColumnOrderState, ColumnSizingState, SortingState, VisibilityState } from '@tanstack/react-table';
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
 * per table. Filters and the search box are deliberately not saved: coming back to a table that
 * looks empty because of last week's filter is worse than losing them.
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
