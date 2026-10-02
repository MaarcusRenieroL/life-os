import type { Table } from '@tanstack/react-table';
import { ListFilter, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { columnTitle, describeFilter } from './column-utils';
import { FilterControl } from './data-grid-filters';

function isActive(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
}

/**
 * One "Filter" button instead of a pill per column: it opens a small builder where each row is a
 * column and its value, with "Add filter" for more. Filters that are set show as removable chips
 * beside the button, so what the table is narrowed by is always visible.
 */
export function FacetFilters<TData>({ table }: { table: Table<TData> }) {
  const filterable = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  // Rows the user has added but not given a value yet; rows with a value come from the table itself.
  const [pending, setPending] = useState<string[]>([]);
  if (filterable.length === 0) return null;

  const active = filterable.filter((c) => isActive(c.getFilterValue()));
  const rowIds = [...active.map((c) => c.id), ...pending.filter((id) => !active.some((c) => c.id === id))];
  const rows = rowIds.map((id) => filterable.find((c) => c.id === id)).filter((c) => !!c);
  const unused = filterable.filter((c) => !rowIds.includes(c.id));

  function changeColumn(from: string, to: string) {
    table.getColumn(from)?.setFilterValue(undefined);
    setPending((prev) => [...prev.filter((id) => id !== from && id !== to), to]);
  }

  function removeRow(id: string) {
    table.getColumn(id)?.setFilterValue(undefined);
    setPending((prev) => prev.filter((p) => p !== id));
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <ListFilter /> Filter
            {active.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 rounded-sm px-1 text-[10px] font-normal">{active.length}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[26rem] max-w-[calc(100vw-2rem)] p-3">
          <p className="text-sm font-medium">{rows.length ? 'Show rows where' : 'No filters applied'}</p>
          <p className="mb-3 text-xs text-muted-foreground">{rows.length ? 'All of these must match.' : 'Add a filter to narrow the table.'}</p>
          <div className="flex flex-col gap-3">
            {rows.map((column) => (
              <div key={column.id} className="rounded-md border p-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <Select value={column.id} onValueChange={(to) => changeColumn(column.id, to)}>
                    <SelectTrigger size="sm" className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[column, ...unused].map((c) => (
                        <SelectItem key={c.id} value={c.id}>{columnTitle(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${columnTitle(column)} filter`} onClick={() => removeRow(column.id)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
                <FilterControl column={column} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={unused.length === 0} onClick={() => setPending((prev) => [...prev, unused[0].id])}>
              <Plus /> Add filter
            </Button>
            {rows.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  active.forEach((c) => c.setFilterValue(undefined));
                  setPending([]);
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {active.map((column) => (
        <Badge key={column.id} variant="secondary" className="h-8 gap-1.5 rounded-md pr-1 pl-2.5 font-normal">
          <span className="text-muted-foreground">{columnTitle(column)}</span>
          <span className="max-w-40 truncate font-medium">{describeFilter(column.columnDef.meta!.filter!, column.getFilterValue(), column.columnDef.meta?.format)}</span>
          <button type="button" aria-label={`Clear ${columnTitle(column)} filter`} className="rounded p-0.5 hover:bg-background/60" onClick={() => removeRow(column.id)}>
            <X className="size-3.5" />
          </button>
        </Badge>
      ))}
    </>
  );
}
