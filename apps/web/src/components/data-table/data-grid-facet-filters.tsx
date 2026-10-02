import type { Column, Table } from '@tanstack/react-table';
import { PlusCircle, SlidersHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

import { columnTitle, describeFilter } from './column-utils';
import { FilterControl, FilterList } from './data-grid-filters';

/** At most this many columns get their own pill in the toolbar; the rest live under "More". */
const PILLS = 4;

function isActive(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
}

/** One column's filter as a dashed pill (like tablecn / Linear): "+ Status", or "Status | Done, Open" when set. */
function FacetPill<TData>({ column }: { column: Column<TData, unknown> }) {
  const meta = column.columnDef.meta!;
  const value = column.getFilterValue();
  const active = isActive(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle />
          {columnTitle(column)}
          {active && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="max-w-40 truncate rounded-sm px-1.5 font-normal">
                {describeFilter(meta.filter!, value, meta.format)}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <FilterControl column={column} />
        {active && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => column.setFilterValue(undefined)}>
            Clear filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The filter pills for a table's filterable columns, plus a "More" popover for the rest. */
export function FacetFilters<TData>({ table }: { table: Table<TData> }) {
  const filterable = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  if (filterable.length === 0) return null;

  // Columns that already have a filter set always get a pill, so an active filter is never hidden.
  const active = filterable.filter((c) => isActive(c.getFilterValue()));
  const rest = filterable.filter((c) => !active.includes(c));
  const pills = [...active, ...rest.slice(0, Math.max(0, PILLS - active.length))];
  const more = filterable.filter((c) => !pills.includes(c));

  return (
    <>
      {pills.map((column) => (
        <FacetPill key={column.id} column={column} />
      ))}
      {more.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <SlidersHorizontal /> More filters
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <FilterList table={table} only={more.map((c) => c.id)} />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
