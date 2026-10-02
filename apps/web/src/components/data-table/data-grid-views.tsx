import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import { Check, Layers, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
const OPEN_KEY = (tableId: string) => `lifeos.views.open.${tableId}`;

function readViews(tableId: string): GridView[] {
  try {
    const raw = localStorage.getItem(KEY(tableId));
    return raw ? (JSON.parse(raw) as GridView[]) : [];
  } catch {
    return [];
  }
}

/** The user's saved views for a table, in this browser. */
export function useSavedViews(tableId: string) {
  const [views, setViews] = useState<GridView[]>(() => readViews(tableId));
  const [open, setOpenState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OPEN_KEY(tableId)) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY(tableId), JSON.stringify(views));
    } catch {
      /* storage unavailable: the views just won't persist */
    }
  }, [tableId, views]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      try {
        localStorage.setItem(OPEN_KEY(tableId), next ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [tableId],
  );

  return {
    views,
    open,
    setOpen,
    save: (view: GridView) => setViews((prev) => [...prev.filter((v) => v.id !== view.id), view]),
    remove: (id: string) => setViews((prev) => prev.filter((v) => v.id !== id)),
  };
}

/**
 * The Jira-style side list of views: the built-in ones a page offers, then the ones you saved. A view
 * is a named combination of search, filters, sorting and visible columns; click to apply it, or save
 * whatever the table currently shows as a new one.
 */
export function DataGridViews({
  builtIn,
  saved,
  activeId,
  onApply,
  onSave,
  onRemove,
}: {
  builtIn: GridView[];
  saved: GridView[];
  activeId: string;
  onApply: (view: GridView) => void;
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  function commit() {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
    setName('');
    setNaming(false);
  }

  const row = (view: GridView, removable: boolean) => (
    <li key={view.id} className="group flex items-center">
      <button
        type="button"
        onClick={() => onApply(view)}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${activeId === view.id ? 'bg-accent font-medium' : 'text-muted-foreground'}`}
      >
        {activeId === view.id ? <Check className="size-3.5 shrink-0" /> : <span className="size-3.5 shrink-0" />}
        <span className="truncate">{view.name}</span>
      </button>
      {removable && (
        <Button variant="ghost" size="icon-sm" className="size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Delete view ${view.name}`} onClick={() => onRemove(view.id)}>
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </li>
  );

  return (
    <aside className="w-full shrink-0 rounded-lg border bg-card p-2 @3xl:w-52" aria-label="Views">
      <p className="hidden items-center gap-1.5 px-2 pb-1 text-[11px] @3xl:flex font-medium tracking-wider text-muted-foreground uppercase">
        <Layers className="size-3.5" /> Views
      </p>
      <ul className="flex gap-0.5 overflow-x-auto @3xl:flex-col @3xl:overflow-visible">
        {builtIn.map((v) => row(v, false))}
        {saved.length > 0 && <li className="mx-1 my-1 border-l @3xl:mx-2 @3xl:border-t @3xl:border-l-0" aria-hidden />}
        {saved.map((v) => row(v, true))}
      </ul>
      <div className="mt-2 border-t pt-2">
        {naming ? (
          <div className="flex gap-1">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setNaming(false);
              }}
              placeholder="View name"
              aria-label="View name"
              className="h-8"
            />
            <Button size="sm" onClick={commit} disabled={!name.trim()}>Save</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNaming(true)}>
            <Plus /> Save current as view
          </Button>
        )}
      </div>
    </aside>
  );
}
