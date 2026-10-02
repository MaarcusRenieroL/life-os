import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

/** Everything a view remembers about a table. Every part is optional: a view only sets what it names. */
export interface GridView {
  id: string;
  name: string;
  search?: string;
  filters?: ColumnFiltersState;
  sorting?: SortingState;
  visibility?: VisibilityState;
}

const KEY = (tableId: string) => `lifeos.views.${tableId}`;

function readViews(tableId: string): GridView[] {
  try {
    const raw = localStorage.getItem(KEY(tableId));
    return raw ? (JSON.parse(raw) as GridView[]) : [];
  } catch {
    return [];
  }
}

/** The user's saved filter sets for a table, in this browser. */
export function useSavedViews(tableId: string) {
  const [views, setViews] = useState<GridView[]>(() => readViews(tableId));
  useEffect(() => {
    try {
      localStorage.setItem(KEY(tableId), JSON.stringify(views));
    } catch {
      /* storage unavailable: the views just won't persist */
    }
  }, [tableId, views]);

  return {
    views,
    save: (view: GridView) => setViews((prev) => [...prev.filter((v) => v.id !== view.id), view]),
    remove: (id: string) => setViews((prev) => prev.filter((v) => v.id !== id)),
  };
}
