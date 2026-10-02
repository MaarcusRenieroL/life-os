import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import { Fragment, type ReactNode } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { columnTitle } from './column-utils';

export type Density = 'comfortable' | 'compact';

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  emptyMessage?: ReactNode;
  density?: Density;
  /** Table rows (not a card) shown right under a row while it is expanded. */
  renderExpanded?: (row: TData) => ReactNode;
}

function aggregate<TData>(table: TanstackTable<TData>, columnId: string, kind: 'sum' | 'avg' | 'count'): number {
  const rows = table.getFilteredRowModel().rows;
  if (kind === 'count') return rows.length;
  const numbers = rows.map((r) => Number(r.getValue(columnId))).filter((n) => !Number.isNaN(n));
  const sum = numbers.reduce((a, b) => a + b, 0);
  return kind === 'avg' ? (numbers.length ? sum / numbers.length : 0) : sum;
}

/** The actual `<table>` render for a TanStack Table instance - toolbar and pagination are
 * composed separately so each page can carry its own filters/bulk actions. */
export function DataTable<TData>({ table, onRowClick, emptyMessage = 'No results.', density = 'comfortable', renderExpanded }: DataTableProps<TData>) {
  const columnCount = table.getVisibleLeafColumns().length;
  const sized = table.getState().columnSizing;
  const hasFooter = table.getVisibleLeafColumns().some((c) => c.columnDef.meta?.aggregate);
  const compact = density === 'compact';

  return (
    <div className="hud-panel">
    <div className="hud-table overflow-x-auto">
      <Table className={cn(compact && '[&_td]:py-1 [&_td]:text-[13px] [&_th]:h-8')}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const column = header.column;
                const width = sized[column.id] !== undefined || column.columnDef.size !== undefined ? header.getSize() : undefined;
                return (
                  <TableHead
                    key={header.id}
                    className={cn('relative', column.columnDef.meta?.align === 'right' && 'text-right', column.columnDef.meta?.className)}
                    style={width ? { width, minWidth: width } : undefined}
                    aria-sort={column.getIsSorted() === 'asc' ? 'ascending' : column.getIsSorted() === 'desc' ? 'descending' : undefined}
                  >
                    {header.isPlaceholder ? null : flexRender(column.columnDef.header, header.getContext())}
                    {column.getCanResize() && (
                      <div
                        role="separator"
                        aria-label={`Resize ${columnTitle(column)}`}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => column.resetSize()}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none opacity-0 transition-opacity hover:bg-primary/60 hover:opacity-100',
                          column.getIsResizing() && 'bg-primary opacity-100',
                        )}
                      />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn('max-w-72 truncate', cell.column.columnDef.meta?.align === 'right' && 'text-right tabular-nums', cell.column.columnDef.meta?.className)}
                      title={typeof cell.getValue() === 'string' ? (cell.getValue() as string) : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {renderExpanded && row.getIsExpanded() && renderExpanded(row.original)}
              </Fragment>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="h-24 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {hasFooter && table.getRowModel().rows.length > 0 && (
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              {table.getVisibleLeafColumns().map((column, index) => {
                const kind = column.columnDef.meta?.aggregate;
                const format = column.columnDef.meta?.format;
                return (
                  <TableCell key={column.id} className={cn('font-medium', column.columnDef.meta?.align === 'right' && 'text-right tabular-nums', column.columnDef.meta?.className)}>
                    {kind ? (
                      <>
                        {index > 0 && <span className="mr-1 text-xs font-normal text-muted-foreground">{kind === 'sum' ? 'Total' : kind === 'avg' ? 'Average' : 'Count'}</span>}
                        {format ? format(aggregate(table, column.id, kind)) : aggregate(table, column.id, kind).toLocaleString()}
                      </>
                    ) : index === 0 ? (
                      <span className="text-xs font-normal text-muted-foreground">{table.getFilteredRowModel().rows.length} rows</span>
                    ) : null}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
    </div>
  );
}
