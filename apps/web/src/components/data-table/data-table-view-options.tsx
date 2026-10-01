import type { Table } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { columnTitle } from './column-utils';

/**
 * Show/hide columns, by their real names, and reorder them. `onReset` (when given) restores the
 * table's default layout.
 */
export function DataTableViewOptions<TData>({ table, onReset }: { table: Table<TData>; onReset?: () => void }) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const order = table.getState().columnOrder;

  function move(id: string, delta: -1 | 1) {
    const ids = order.length ? [...order] : table.getAllLeafColumns().map((c) => c.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    table.setColumnOrder(ids);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal /> View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          Columns
          <span className="text-xs font-normal text-muted-foreground">
            {columns.filter((c) => c.getIsVisible()).length} of {columns.length}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column, index) => (
          <div key={column.id} className="flex items-center gap-0.5">
            <DropdownMenuCheckboxItem
              className="flex-1"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              onSelect={(e) => e.preventDefault()}
            >
              {columnTitle(column)}
            </DropdownMenuCheckboxItem>
            <Button variant="ghost" size="icon-sm" className="size-6" disabled={index === 0} aria-label={`Move ${columnTitle(column)} left`} onClick={() => move(column.id, -1)}>
              <ArrowUp className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="size-6" disabled={index === columns.length - 1} aria-label={`Move ${columnTitle(column)} right`} onClick={() => move(column.id, 1)}>
              <ArrowDown className="size-3.5" />
            </Button>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => table.toggleAllColumnsVisible(true)} onSelect={(e) => e.preventDefault()}>
          Show all columns
        </DropdownMenuItem>
        {onReset && (
          <DropdownMenuItem onClick={onReset}>
            <RotateCcw /> Reset layout
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
