import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from '@tanstack/react-table';
import { Download, Filter, Rows3, Search, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { columnTitle, describeFilter, FILTER_FNS, filterFnFor } from './column-utils';
import { DataTable } from './data-table';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTablePagination } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';
import { FilterList } from './data-grid-filters';
import { selectionColumn } from './selection-column';
import { usePersistedGrid } from './use-persisted-grid';

export interface DataGridProps<TData> {
  /** Stable id, e.g. `finance.accounts` - the key the layout is saved under. */
  tableId: string;
  data: TData[];
  /** Give columns `meta.title` (and `meta.filter` to make them filterable); the header is built for you. */
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  emptyMessage?: ReactNode;
  initialSorting?: SortingState;
  /** Filters applied on first load (not saved), e.g. a default date window. */
  initialFilters?: ColumnFiltersState;
  /** Columns that start hidden, e.g. `{ notes: false }`. */
  initialVisibility?: VisibilityState;
  initialPageSize?: number;
  enableSelection?: boolean;
  /** Shown when rows are selected - buttons that act on them. */
  bulkActions?: (selected: TData[], clear: () => void) => ReactNode;
  /** Quick filters / chips, placed right after the search box. A function gets the table, to set filters. */
  toolbarStart?: ReactNode | ((table: Table<TData>) => ReactNode);
  /** Page-level buttons, placed at the end of the toolbar. */
  toolbarEnd?: ReactNode;
  /** Enables the CSV export button; the file is named after this. */
  exportName?: string;
  searchPlaceholder?: string;
  /** For short, fixed lists where paging is noise. */
  hidePagination?: boolean;
  /** Below the md breakpoint a wide table can't fit, so each row renders as this card instead. */
  mobileCard?: (row: TData) => ReactNode;
  /** Rows that can open to show more table rows beneath them (e.g. subtasks). Controlled by the page. */
  renderExpanded?: (row: TData) => ReactNode;
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
}

const PAGE_SIZES = [10, 20, 30, 50, 100];

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join('; ') : value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The app's one table: search, per-column typed filters with chips, sortable/hideable/reorderable/
 * resizable columns (by their real names), density, row selection with bulk actions, footer totals,
 * CSV export and a saved layout. Pages describe columns; this does the rest.
 */
export function DataGrid<TData>({
  tableId,
  data,
  columns,
  getRowId,
  onRowClick,
  loading,
  emptyMessage,
  initialSorting = [],
  initialFilters = [],
  initialVisibility = {},
  initialPageSize = 20,
  enableSelection,
  bulkActions,
  toolbarStart,
  toolbarEnd,
  exportName,
  searchPlaceholder = 'Search…',
  hidePagination,
  mobileCard,
  renderExpanded,
  expanded,
  onExpandedChange,
}: DataGridProps<TData>) {
  const { layout, patch, reset } = usePersistedGrid(tableId, {
    sorting: initialSorting,
    visibility: initialVisibility,
    order: [],
    sizing: {},
    pageSize: PAGE_SIZES.includes(initialPageSize) ? initialPageSize : 20,
    density: 'comfortable',
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialFilters);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: layout.pageSize });

  const preparedColumns = useMemo<ColumnDef<TData>[]>(() => {
    const prepared = columns.map((column) => {
      const meta = column.meta;
      const filter = meta?.filter;
      return {
        ...column,
        header:
          column.header ??
          (({ column: c }) => <DataTableColumnHeader column={c} title={columnTitle(c)} className={meta?.align === 'right' ? 'justify-end' : undefined} />),
        enableColumnFilter: !!filter,
        filterFn: filter ? filterFnFor(filter) : undefined,
        enableResizing: column.enableResizing ?? true,
      } as ColumnDef<TData>;
    });
    return enableSelection ? [selectionColumn<TData>(), ...prepared] : prepared;
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: preparedColumns,
    filterFns: FILTER_FNS,
    state: {
      sorting: layout.sorting,
      columnVisibility: layout.visibility,
      columnOrder: layout.order,
      columnSizing: layout.sizing,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination,
      ...(expanded ? { expanded } : {}),
    },
    getRowCanExpand: renderExpanded ? () => true : undefined,
    onExpandedChange,
    getRowId,
    columnResizeMode: 'onChange',
    enableRowSelection: !!enableSelection,
    autoResetPageIndex: true,
    onSortingChange: (updater) => patch('sorting', updater as never),
    onColumnVisibilityChange: (updater) => patch('visibility', updater as never),
    onColumnOrderChange: (updater) => patch('order', updater as never),
    onColumnSizingChange: (updater) => patch('sizing', updater as never),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) =>
      setPagination((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next.pageSize !== prev.pageSize) patch('pageSize', next.pageSize);
        return next;
      }),
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const activeFilters = columnFilters.filter((f) => table.getColumn(f.id)?.columnDef.meta?.filter);
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const filtering = activeFilters.length > 0 || globalFilter.trim() !== '';

  function clearFilters() {
    setColumnFilters([]);
    setGlobalFilter('');
  }

  function exportCsv() {
    const exportable = table
      .getVisibleLeafColumns()
      .filter((c) => c.columnDef.meta?.exportValue || (c.accessorFn && c.id !== 'select'));
    const source = selectedRows.length
      ? table.getSortedRowModel().rows.filter((r) => r.getIsSelected())
      : table.getSortedRowModel().rows.filter((r) => table.getFilteredRowModel().rowsById[r.id]);
    const lines = [
      exportable.map((c) => csvCell(columnTitle(c))).join(','),
      ...source.map((row) =>
        exportable.map((c) => csvCell(c.columnDef.meta?.exportValue ? c.columnDef.meta.exportValue(row.original) : row.getValue(c.id))).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportName ?? tableId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const emptyText = loading ? 'Loading…' : filtering ? 'Nothing matches these filters.' : (emptyMessage ?? 'No results.');
  const filterable = table.getAllLeafColumns().some((c) => c.columnDef.meta?.filter);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs min-w-48">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search table"
            className="pl-8"
          />
        </div>
        {typeof toolbarStart === 'function' ? toolbarStart(table) : toolbarStart}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {filterable && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter /> Filters
                  {activeFilters.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5">{activeFilters.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <FilterList table={table} />
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => patch('density', layout.density === 'compact' ? 'comfortable' : 'compact')}
            aria-pressed={layout.density === 'compact'}
            title="Toggle compact rows"
          >
            <Rows3 /> {layout.density === 'compact' ? 'Compact' : 'Comfortable'}
          </Button>
          <DataTableViewOptions table={table} onReset={reset} />
          {exportName !== undefined && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={table.getFilteredRowModel().rows.length === 0}>
              <Download /> Export CSV
            </Button>
          )}
          {toolbarEnd}
        </div>
      </div>

      {filtering && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {globalFilter.trim() !== '' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: “{globalFilter}”
              <button type="button" aria-label="Clear search" onClick={() => setGlobalFilter('')}><X className="size-3" /></button>
            </Badge>
          )}
          {activeFilters.map((filter) => {
            const column = table.getColumn(filter.id)!;
            const meta = column.columnDef.meta!;
            return (
              <Badge key={filter.id} variant="secondary" className="gap-1 pr-1">
                {columnTitle(column)}: {describeFilter(meta.filter!, filter.value, meta.format)}
                <button type="button" aria-label={`Clear ${columnTitle(column)} filter`} onClick={() => column.setFilterValue(undefined)}><X className="size-3" /></button>
              </Badge>
            );
          })}
          <button type="button" className="ml-1 text-muted-foreground underline-offset-2 hover:underline" onClick={clearFilters}>
            Clear all
          </button>
          <span className="text-muted-foreground">
            · {table.getFilteredRowModel().rows.length} of {data.length}
          </span>
        </div>
      )}

      {enableSelection && selectedRows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span>{selectedRows.length} selected</span>
          {bulkActions?.(selectedRows, () => setRowSelection({}))}
          <button className="ml-auto hover:underline" onClick={() => setRowSelection({})}>Clear</button>
        </div>
      )}

      <div className={mobileCard ? 'mt-3 hidden md:block' : 'mt-3'}>
        <DataTable
          table={table}
          onRowClick={onRowClick}
          density={layout.density}
          emptyMessage={emptyText}
          renderExpanded={renderExpanded}
        />
      </div>

      {mobileCard && (
        <ul className="mt-3 flex flex-col gap-2 md:hidden">
          {table.getRowModel().rows.length === 0 && (
            <li className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          )}
          {table.getRowModel().rows.map((row) => (
            <li key={row.id}>{mobileCard(row.original)}</li>
          ))}
        </ul>
      )}

      {!hidePagination && <DataTablePagination table={table} pageSizes={PAGE_SIZES} totalUnfiltered={data.length} />}
    </div>
  );
}
