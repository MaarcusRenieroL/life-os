import type { Table } from '@tanstack/react-table';
import { ChevronDown, ListFilter, Search, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { columnTitle, describeFilter } from './column-utils';
import { FilterControl } from './data-grid-filters';

function isActive(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
}

/**
 * Filters live in a side panel: every filterable column is a section you can open, results update as
 * you go, and the footer says how many rows match. Filters that are set also show as removable chips
 * beside the button, so what the table is narrowed by is always visible.
 */
export function FacetFilters<TData>({ table, total }: { table: Table<TData>; total: number }) {
  const filterable = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  if (filterable.length === 0) return null;

  const active = filterable.filter((c) => isActive(c.getFilterValue()));
  const shown = filterable.filter((c) => columnTitle(c).toLowerCase().includes(query.trim().toLowerCase()));
  const matching = table.getFilteredRowModel().rows.length;
  const toggle = (id: string) => setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <ListFilter /> Filters
            {active.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 rounded-sm px-1 text-[10px] font-normal">{active.length}</Badge>}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              {active.length === 0 ? 'Narrow the table by any column.' : `${active.length} filter${active.length === 1 ? '' : 's'} applied.`}
            </SheetDescription>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a column…" aria-label="Find a column" className="pl-8" />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No column matches.</p>}
            {shown.map((column) => {
              const isOpen = open.includes(column.id) || (query.trim() !== '' && shown.length <= 3);
              const set = isActive(column.getFilterValue());
              return (
                <div key={column.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm hover:bg-accent"
                    aria-expanded={isOpen}
                    onClick={() => toggle(column.id)}
                  >
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

          <SheetFooter className="flex-row items-center justify-between border-t">
            <Button variant="ghost" size="sm" disabled={active.length === 0} onClick={() => active.forEach((c) => c.setFilterValue(undefined))}>
              Clear all
            </Button>
            <span className="text-xs text-muted-foreground">{matching} of {total} rows</span>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
