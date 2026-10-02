import type { SortingState, Table } from '@tanstack/react-table';
import { ArrowDownAZ, ArrowUpAZ, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { columnTitle } from './column-utils';

/** A sort builder (like tablecn's "Sort" button): any number of columns, each ascending or descending. */
export function DataGridSort<TData>({ table }: { table: Table<TData> }) {
  const sorting = table.getState().sorting;
  const sortable = table.getAllLeafColumns().filter((c) => c.getCanSort() && c.id !== 'select' && c.id !== 'actions');
  if (sortable.length === 0) return null;
  const free = sortable.filter((c) => !sorting.some((s) => s.id === c.id));

  const set = (next: SortingState) => table.setSorting(next);
  const change = (index: number, patch: Partial<SortingState[number]>) => set(sorting.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <ArrowDownAZ /> Sort
          {sorting.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 rounded-sm px-1 text-[10px] font-normal">{sorting.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <p className="text-sm font-medium">{sorting.length ? 'Sort by' : 'No sorting'}</p>
        <p className="mb-2 text-xs text-muted-foreground">{sorting.length ? 'Rows are ordered by these columns, top first.' : 'Add a column to order the rows.'}</p>
        <div className="flex flex-col gap-2">
          {sorting.map((sort, index) => (
            <div key={sort.id} className="flex items-center gap-1.5">
              <Select value={sort.id} onValueChange={(id) => change(index, { id })}>
                <SelectTrigger size="sm" className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sortable.filter((c) => c.id === sort.id || free.includes(c)).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{columnTitle(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort.desc ? 'desc' : 'asc'} onValueChange={(v) => change(index, { desc: v === 'desc' })}>
                <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc"><ArrowUpAZ className="size-3.5" /> Ascending</SelectItem>
                  <SelectItem value="desc"><ArrowDownAZ className="size-3.5" /> Descending</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon-sm" aria-label="Remove sort" onClick={() => set(sorting.filter((_, i) => i !== index))}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={free.length === 0} onClick={() => set([...sorting, { id: free[0].id, desc: false }])}>
            <Plus /> Add sort
          </Button>
          {sorting.length > 0 && <Button size="sm" variant="outline" onClick={() => set([])}>Reset</Button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
