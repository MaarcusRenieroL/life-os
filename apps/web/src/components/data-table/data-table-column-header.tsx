import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

/** Sortable + hideable column header, matching the standard shadcn data-table pattern. */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn('text-xs', className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 data-[state=open]:bg-accent">
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp />
            ) : (
              <ChevronsUpDown />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUp className="text-muted-foreground/70" /> Asc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDown className="text-muted-foreground/70" /> Desc
              </DropdownMenuItem>
            </>
          )}
          {column.getCanSort() && column.getCanHide() && <DropdownMenuSeparator />}
          {column.getCanHide() && (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff className="text-muted-foreground/70" /> Hide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
