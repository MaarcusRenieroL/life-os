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
import { Search, X } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { columnTitle, FILTER_FNS, filterFnFor } from './column-utils';
import { DataChip, toneFor } from './data-chip';
import { DataTable } from './data-table';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTablePagination } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';
import { FacetFilters } from './data-grid-facet-filters';
import { DataGridSort } from './data-grid-sort';
import { DataGridRowDrawer } from './data-grid-row-drawer';
import { useSavedViews, type GridView } from './data-grid-views';
import { selectionColumn } from './selection-column';
import { usePersistedFilters, usePersistedGrid } from './use-persisted-grid';

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
  /** Filters applied on a first visit in a browser session (later ones are remembered), e.g. a default date window. */
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
  /** Click a row to open its record in a side drawer (default on). Turn off for tables whose rows do something else. */
  rowDrawer?: boolean;
  /** The drawer's heading for a row; defaults to the first column. */
  drawerTitle?: (row: TData) => ReactNode;
  /** The label on the drawer's button that runs `onRowClick` (a full page, an edit form). */
  drawerOpenLabel?: string;
  /** Extra content under the fields in the drawer. */
  drawerExtra?: (row: TData) => ReactNode;
  /** Saves edits made in the record drawer (columns opt in with `meta.edit`). */
  onEditRow?: (row: TData, changes: Record<string, string | number | null>) => Promise<unknown>;
  /** Ready-made views shown first in the Views side list, e.g. "Open" or "This month". "All" is always there. */
  views?: GridView[];
}

const PAGE_SIZES = [10, 20, 30, 50, 100];

/** Below this width (the grid's own, not the screen's) a table gives way to cards. */
const CARD_BELOW = 672;

/** True while the element is narrower than `limit`, so only one of table / cards is ever in the page. */
function useNarrow(ref: React.RefObject<HTMLElement | null>, limit: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < limit));
    observer.observe(el);
    setNarrow(el.getBoundingClientRect().width < limit);
    return () => observer.disconnect();
  }, [ref, limit]);
  return narrow;
}

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
  views: builtInViews = [],
  rowDrawer = true,
  drawerTitle,
  drawerOpenLabel,
  drawerExtra,
  onEditRow,
}: DataGridProps<TData>) {
  const { layout, patch, reset } = usePersistedGrid(tableId, {
    sorting: initialSorting,
    visibility: initialVisibility,
    order: [],
    sizing: {},
    pageSize: PAGE_SIZES.includes(initialPageSize) ? initialPageSize : 20,
    density: 'comfortable',
  });
  const {
    filters: columnFilters,
    search: globalFilter,
    view: activeView,
    setFilters: setColumnFilters,
    setSearch: setGlobalFilter,
    setView: setActiveView,
  } = usePersistedFilters(tableId, { filters: initialFilters, search: '', view: 'all' });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: layout.pageSize });
  const saved = useSavedViews(tableId);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(gridRef, CARD_BELOW);

  const preparedColumns = useMemo<ColumnDef<TData>[]>(() => {
    const prepared = columns.map((column) => {
      const meta = column.meta;
      const filter = meta?.filter;
      // A plain filterable status column ("Active", "Needs review", "Failed") becomes a coloured chip; text
      // that is not a status (names, places) stays as it is.
      const chipCell =
        !column.cell && (filter?.type === 'select')
          ? ({ getValue }: { getValue: () => unknown }) => {
              const value = getValue();
              const text = Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value);
              return text && toneFor(text) !== 'neutral' ? <DataChip>{text}</DataChip> : text || '—';
            }
          : undefined;
      return {
        ...column,
        ...(chipCell ? { cell: chipCell } : {}),
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

  const allView: GridView = useMemo(
    () => ({ id: 'all', name: 'All', filters: initialFilters, sorting: initialSorting, visibility: initialVisibility, search: '' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function applyView(view: GridView) {
    setActiveView(view.id);
    setColumnFilters(view.filters ?? []);
    setGlobalFilter(view.search ?? '');
    if (view.sorting) patch('sorting', view.sorting);
    // A view that names visibility starts from "everything the page shows by default", then applies it.
    if (view.visibility) patch('visibility', { ...initialVisibility, ...view.visibility });
  }

  function saveCurrentView(name: string) {
    const id = `v-${Date.now().toString(36)}`;
    saved.save({ id, name, search: globalFilter, filters: columnFilters, sorting: layout.sorting, visibility: layout.visibility });
    setActiveView(id);
  }

  const emptyText = loading ? 'Loading…' : filtering ? 'Nothing matches these filters.' : (emptyMessage ?? 'No results.');

  return (
    <div className="@container" ref={gridRef}>
    <div>
      <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-56 min-w-40 flex-1">
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
        <FacetFilters
          table={table}
          total={data.length}
          presets={[allView, ...builtInViews]}
          saved={saved.views}
          activeId={activeView}
          onApply={applyView}
          onSave={saveCurrentView}
          onRemove={(id) => {
            saved.remove(id);
            if (activeView === id) setActiveView('all');
          }}
        />
        {filtering && (
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
            Reset <X />
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DataGridSort table={table} />
          <DataTableViewOptions
            table={table}
            onReset={reset}
            compact={layout.density === 'compact'}
            onToggleDensity={() => patch('density', layout.density === 'compact' ? 'comfortable' : 'compact')}
            onExport={exportName !== undefined && table.getFilteredRowModel().rows.length > 0 ? exportCsv : undefined}
          />
          {toolbarEnd}
        </div>
      </div>

      {filtering && (
        <p className="mt-2 text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {data.length} rows
        </p>
      )}

      {enableSelection && selectedRows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span>{selectedRows.length} selected</span>
          {bulkActions?.(selectedRows, () => setRowSelection({}))}
          <button className="ml-auto hover:underline" onClick={() => setRowSelection({})}>Clear</button>
        </div>
      )}

      {!narrow && (
      <div className="mt-3">
        <DataTable
          table={table}
          onRowClick={
            rowDrawer
              ? (original) => {
                  const hit = table.getPrePaginationRowModel().rows.find((r) => r.original === original);
                  if (hit) setDrawerId(hit.id);
                }
              : onRowClick
          }
          onRowDoubleClick={rowDrawer && onRowClick ? (row) => { setDrawerId(null); onRowClick(row); } : undefined}
          density={layout.density}
          emptyMessage={emptyText}
          renderExpanded={renderExpanded}
        />
      </div>
      )}

      {narrow && (
      <ul className="mt-3 flex flex-col gap-2">
        {table.getRowModel().rows.length === 0 && (
          <li className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{emptyText}</li>
        )}
        {table.getRowModel().rows.map((row) => (
          <li key={row.id}>
            {mobileCard ? (
              mobileCard(row.original)
            ) : (
              // No hand-made card for this table: show its first column as the heading and the next few
              // visible ones as label / value lines, so every table works on a phone without extra work.
              <button type="button" className="w-full rounded-lg border bg-card p-3 text-left active:bg-muted/50" onClick={() => (rowDrawer ? setDrawerId(row.id) : onRowClick?.(row.original))}>
                {(() => {
                  const cells = row.getVisibleCells().filter((c) => c.column.id !== 'select' && c.column.id !== 'actions');
                  const [lead, ...rest] = cells;
                  return (
                    <>
                      {lead && <div className="font-medium break-words">{flexRender(lead.column.columnDef.cell, lead.getContext())}</div>}
                      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                        {rest.slice(0, 4).map((cell) => (
                          <div key={cell.id} className="contents">
                            <dt className="text-xs text-muted-foreground">{columnTitle(cell.column)}</dt>
                            <dd className="min-w-0 truncate text-right">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  );
                })()}
              </button>
            )}
          </li>
        ))}
      </ul>
      )}

      {rowDrawer && (
        <DataGridRowDrawer
          rows={table.getPrePaginationRowModel().rows}
          rowId={drawerId}
          onClose={() => setDrawerId(null)}
          onSelect={setDrawerId}
          onOpen={onRowClick ? (row) => { setDrawerId(null); onRowClick(row); } : undefined}
          openLabel={drawerOpenLabel}
          title={drawerTitle}
          extra={drawerExtra}
          onEditRow={onEditRow}
        />
      )}

      {!hidePagination && <DataTablePagination table={table} pageSizes={PAGE_SIZES} totalUnfiltered={data.length} />}
      </div>
    </div>
    </div>
  );
}
