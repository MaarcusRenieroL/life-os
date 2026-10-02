import type { Table } from '@tanstack/react-table';
import { Bookmark, ChevronDown, ListFilter, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { AdaptivePanel } from './adaptive-panel';
import { columnTitle, describeFilter } from './column-utils';
import { FilterControl } from './data-grid-filters';
import type { GridView } from './data-grid-views';

function isActive(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
}

/**
 * Filters live in a panel (a drawer on large screens, a modal on small ones): quick filters and your
 * saved ones at the top, then every filterable column as a section you can open. Results update as you
 * go and the footer says how many rows match. Filters that are set also show as removable chips beside
 * the button, so what the table is narrowed by is always visible.
 */
export function FacetFilters<TData>({
  table,
  total,
  presets,
  saved,
  activeId,
  onApply,
  onSave,
  onRemove,
}: {
  table: Table<TData>;
  total: number;
  /** Ready-made filter sets a page offers ("Needs attention", "Paused"). */
  presets: GridView[];
  /** Filter sets the user saved for this table. */
  saved: GridView[];
  activeId: string;
  onApply: (view: GridView) => void;
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const filterable = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openColumns, setOpenColumns] = useState<string[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  if (filterable.length === 0) return null;

  const active = filterable.filter((c) => isActive(c.getFilterValue()));
  const shown = filterable.filter((c) => columnTitle(c).toLowerCase().includes(query.trim().toLowerCase()));
  const matching = table.getFilteredRowModel().rows.length;
  const toggle = (id: string) => setOpenColumns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function commitSave() {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
    setName('');
    setNaming(false);
  }

  const chip = (view: GridView, removable: boolean) => (
    <span key={view.id} className="inline-flex items-center">
      <button
        type="button"
        onClick={() => onApply(view)}
        className={`rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent ${activeId === view.id ? 'border-primary bg-primary/10 text-primary' : ''} ${removable ? 'rounded-r-none border-r-0' : ''}`}
      >
        {view.name}
      </button>
      {removable && (
        <button
          type="button"
          aria-label={`Delete saved filter ${view.name}`}
          onClick={() => onRemove(view.id)}
          className={`rounded-md rounded-l-none border px-1.5 py-1 text-muted-foreground transition-colors hover:text-destructive ${activeId === view.id ? 'border-primary' : ''}`}
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </span>
  );

  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        <ListFilter /> Filters
        {active.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 rounded-sm px-1 text-[10px] font-normal">{active.length}</Badge>}
      </Button>

      <AdaptivePanel
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        description={active.length === 0 ? 'Narrow the table by any column.' : `${active.length} filter${active.length === 1 ? '' : 's'} applied.`}
        footer={
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" disabled={active.length === 0} onClick={() => active.forEach((c) => c.setFilterValue(undefined))}>
              Clear all
            </Button>
            <span className="text-xs text-muted-foreground">{matching} of {total} rows</span>
          </div>
        }
      >
        <div className="border-b px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            <Bookmark className="size-3.5" /> Saved filters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((v) => chip(v, false))}
            {saved.map((v) => chip(v, true))}
          </div>
          <div className="mt-2">
            {naming ? (
              <div className="flex gap-1.5">
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitSave();
                    if (e.key === 'Escape') setNaming(false);
                  }}
                  placeholder="Name this filter"
                  aria-label="Name this filter"
                  className="h-8"
                />
                <Button size="sm" onClick={commitSave} disabled={!name.trim()}>Save</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" disabled={active.length === 0} onClick={() => setNaming(true)}>
                <Bookmark /> Save current filters
              </Button>
            )}
          </div>
        </div>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a column…" aria-label="Find a column" className="pl-8" />
          </div>
        </div>

        <div className="px-2 py-1">
          {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No column matches.</p>}
          {shown.map((column) => {
            const isOpen = openColumns.includes(column.id) || (query.trim() !== '' && shown.length <= 3);
            const set = isActive(column.getFilterValue());
            return (
              <div key={column.id} className="border-b last:border-b-0">
                <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm hover:bg-accent" aria-expanded={isOpen} onClick={() => toggle(column.id)}>
                  <span className="flex-1 font-medium">{columnTitle(column)}</span>
                  {set && (
                    <span className="max-w-40 truncate rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                      {describeFilter(column.columnDef.meta!.filter!, column.getFilterValue(), column.columnDef.meta?.format)}
                    </span>
                  )}
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-2 pb-3">
                    <FilterControl column={column} />
                    {set && (
                      <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={() => column.setFilterValue(undefined)}>
                        Clear {columnTitle(column).toLowerCase()}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AdaptivePanel>

      {active.map((column) => (
        <Badge key={column.id} variant="secondary" className="h-8 gap-1.5 rounded-md pr-1 pl-2.5 font-normal">
          <span className="text-muted-foreground">{columnTitle(column)}</span>
          <span className="max-w-40 truncate font-medium">{describeFilter(column.columnDef.meta!.filter!, column.getFilterValue(), column.columnDef.meta?.format)}</span>
          <button type="button" aria-label={`Clear ${columnTitle(column)} filter`} className="rounded p-0.5 hover:bg-background/60" onClick={() => column.setFilterValue(undefined)}>
            <X className="size-3.5" />
          </button>
        </Badge>
      ))}
    </>
  );
}
