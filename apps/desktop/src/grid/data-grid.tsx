import {
  activeFilterIds,
  aggregateOf,
  describeFilter,
  facetOptions,
  filterRows,
  isEmptyFilter,
  orderedColumns,
  PAGE_SIZES,
  runGrid,
  toCsv,
  toneFor,
  visibleColumns,
  type GridColumnDef,
  type GridView,
  type SortState,
} from '@life-os/core';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

import { useGrid } from './use-grid';
import './grid.css';

/** A column: the shared definition plus how this app draws a cell. */
export interface Col<T> extends GridColumnDef<T> {
  /** Custom cell; defaults to the formatted value (status words become coloured chips). */
  cell?: (row: T) => ReactNode;
  /** Width hint in px for the first paint; the user can still resize. */
  width?: number;
}

export interface DataGridProps<T> {
  /** Stable id, e.g. `finance.accounts` - the key the layout is saved under. */
  tableId: string;
  data: T[];
  columns: Col<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyMessage?: ReactNode;
  initialSorting?: SortState[];
  initialFilters?: Record<string, unknown>;
  initialPageSize?: number;
  hidePagination?: boolean;
  searchPlaceholder?: string;
  /** Click a row. Without it a click opens the record drawer. */
  onRowClick?: (row: T) => void;
  /** Buttons at the end of each row (and in the drawer). */
  rowActions?: (row: T) => ReactNode;
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** Quick filters next to the search box. */
  toolbarStart?: ReactNode;
  /** Page-level buttons at the end of the toolbar. */
  toolbarEnd?: ReactNode;
  /** Shows the CSV export, named after this. */
  exportName?: string;
  /** Ready-made views in the Views menu; "All" is always there. */
  views?: GridView[];
  /** Row opens a record drawer on click (default true unless `onRowClick` is given). */
  drawer?: boolean;
  drawerTitle?: (row: T) => ReactNode;
  drawerExtra?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
}

const CARD_BELOW = 640;

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function useDismiss(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onClose, ref]);
}

function Menu({ label, count, children, align }: { label: ReactNode; count?: number; children: (close: () => void) => ReactNode; align?: 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  return (
    <div className="g-menu" ref={ref}>
      <button className={`ghost g-btn${open ? ' on' : ''}`} onClick={() => setOpen(!open)}>
        {label}
        {count ? <span className="g-count">{count}</span> : null}
      </button>
      {open && <div className={`g-pop${align === 'right' ? ' right' : ''}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

const asText = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined ? '' : String(v));

function StatusChip({ text }: { text: string }) {
  return <span className={`g-chip ${toneFor(text)}`}>{text}</span>;
}

function defaultCell<T>(col: Col<T>, row: T): ReactNode {
  if (col.cell) return col.cell(row);
  const raw = col.value(row);
  if (col.filter?.type === 'boolean') return raw ? (col.filter.labels?.[0] ?? 'Yes') : (col.filter.labels?.[1] ?? 'No');
  const text = col.format ? col.format(raw) : asText(raw);
  if (!text) return <span className="muted">—</span>;
  if (col.filter?.type === 'select' && toneFor(text) !== 'neutral') return <StatusChip text={text} />;
  return text;
}

const NO_ROWS: never[] = [];

export function DataGrid<T>(props: DataGridProps<T>) {
  const { tableId, columns, getRowId, loading, emptyMessage, onRowClick, rowActions, selectable, bulkActions, exportName, views: builtIn = [], hidePagination } = props;
  // A failed or odd response (not a list) shows as an empty table instead of crashing the screen.
  const data = Array.isArray(props.data) ? props.data : (NO_ROWS as T[]);
  const g = useGrid(tableId, columns, { sorting: props.initialSorting, filters: props.initialFilters, pageSize: props.initialPageSize });
  const { state } = g;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useWidth(wrapRef);
  const narrow = width < CARD_BELOW;
  const useDrawer = props.drawer ?? !onRowClick;

  const result = useMemo(() => runGrid(data, columns, state), [data, columns, state]);
  const shown = visibleColumns(columns, state) as Col<T>[];
  const filterIds = activeFilterIds(columns, state.filters);
  const filtering = filterIds.length > 0 || state.search.trim() !== '';
  const selectedRows = selectable ? result.sorted.filter((r) => selected.has(getRowId(r))) : [];
  const cellPad = state.density === 'compact' ? 'compact' : '';
  const emptyText = loading ? 'Loading…' : filtering ? 'Nothing matches these filters.' : (emptyMessage ?? 'No results.');
  const hasTotals = shown.some((c) => c.aggregate);

  const open = (row: T, e?: React.MouseEvent) => {
    // A button, select or link inside a cell does its own thing; it must not also open the record.
    if (e && (e.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;
    if (useDrawer) setDrawerId(getRowId(row));
    else onRowClick?.(row);
  };
  const drawerRow = drawerId ? result.sorted.find((r) => getRowId(r) === drawerId) : undefined;
  const drawerIndex = drawerRow ? result.sorted.indexOf(drawerRow) : -1;
  useEffect(() => {
    if (drawerId && !drawerRow) setDrawerId(null);
  }, [drawerId, drawerRow]);

  function exportCsv() {
    const rows = selectedRows.length ? selectedRows : result.sorted;
    const blob = new Blob([toCsv(rows, shown)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportName ?? tableId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function startResize(e: React.MouseEvent, id: string, current: number) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const move = (ev: MouseEvent) => g.patch({ widths: { ...state.widths, [id]: Math.max(60, Math.round(current + ev.clientX - startX)) } });
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  const allOnPage = result.pageRows.length > 0 && result.pageRows.every((r) => selected.has(getRowId(r)));
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of result.pageRows) allOnPage ? next.delete(getRowId(r)) : next.add(getRowId(r));
      return next;
    });

  const sortOf = (id: string) => state.sorting.findIndex((s) => s.id === id);

  return (
    <div className="g" ref={wrapRef}>
      <div className="g-toolbar">
        <input className="g-search" value={state.search} onChange={(e) => g.setSearch(e.target.value)} placeholder={props.searchPlaceholder ?? 'Search…'} aria-label="Search table" />
        {props.toolbarStart}
        <FiltersMenu grid={g} data={data} columns={columns} filterIds={filterIds} builtIn={builtIn} />
        {filtering && <button className="link" onClick={g.clearFilters}>Reset ✕</button>}
        <div className="g-end">
          <SortMenu columns={columns} sorting={state.sorting} onChange={(sorting) => g.patch({ sorting })} />
          <ColumnsMenu grid={g} columns={columns} onExport={exportName !== undefined && result.sorted.length > 0 ? exportCsv : undefined} />
          {props.toolbarEnd}
        </div>
      </div>

      {filtering && <p className="g-note">{result.sorted.length} of {data.length} rows</p>}

      {filterIds.length > 0 && (
        <div className="g-chips">
          {filterIds.map((id) => {
            const col = columns.find((c) => c.id === id)!;
            return (
              <button key={id} className="g-fchip" onClick={() => g.setColumnFilter(id, undefined)} title="Remove filter">
                <b>{col.title}</b> {describeFilter(col.filter!, state.filters[id], col.format)} ✕
              </button>
            );
          })}
        </div>
      )}

      {selectable && selectedRows.length > 0 && (
        <div className="g-bulk">
          <span>{selectedRows.length} selected</span>
          {bulkActions?.(selectedRows, () => setSelected(new Set()))}
          <button className="link" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {!narrow ? (
        <div className="g-scroll">
          <table className={`g-table ${cellPad}`}>
            <thead>
              <tr>
                {selectable && <th className="g-sel"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on page" /></th>}
                {shown.map((c) => {
                  const idx = sortOf(c.id);
                  const sort = idx >= 0 ? state.sorting[idx] : undefined;
                  const w = state.widths[c.id] ?? c.width;
                  return (
                    <th key={c.id} style={w ? ({ width: w, minWidth: w } as CSSProperties) : undefined} className={c.align === 'right' ? 'r' : undefined} aria-sort={sort ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                      {c.sortable === false ? (
                        <span>{c.title}</span>
                      ) : (
                        <button className="g-th" onClick={(e) => g.toggleSort(c.id, e.shiftKey)} title="Click to sort · shift-click to add a sort">
                          {c.title}
                          <i>{sort ? (sort.desc ? '↓' : '↑') : '↕'}{state.sorting.length > 1 && sort ? idx + 1 : ''}</i>
                        </button>
                      )}
                      <span className="g-resize" onMouseDown={(e) => startResize(e, c.id, (e.currentTarget.parentElement as HTMLElement).offsetWidth)} />
                    </th>
                  );
                })}
                {rowActions && <th className="g-act" />}
              </tr>
            </thead>
            <tbody>
              {result.pageRows.length === 0 && (
                <tr><td colSpan={shown.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="g-empty">{emptyText}</td></tr>
              )}
              {result.pageRows.map((row) => {
                const id = getRowId(row);
                return (
                  <tr key={id} className={`${useDrawer || onRowClick ? 'clickable' : ''} ${selected.has(id) ? 'on' : ''} ${props.rowClassName?.(row) ?? ''}`} onClick={(e) => open(row, e)}>
                    {selectable && <td className="g-sel" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(id)} onChange={() => toggleRow(id)} aria-label="Select row" /></td>}
                    {shown.map((c) => <td key={c.id} className={c.align === 'right' ? 'r' : undefined}>{defaultCell(c, row)}</td>)}
                    {rowActions && <td className="g-act" onClick={(e) => e.stopPropagation()}>{rowActions(row)}</td>}
                  </tr>
                );
              })}
            </tbody>
            {hasTotals && result.sorted.length > 0 && (
              <tfoot>
                <tr>
                  {selectable && <td />}
                  {shown.map((c, i) => {
                    const total = aggregateOf(result.sorted, c);
                    return <td key={c.id} className={c.align === 'right' ? 'r' : undefined}>{total === null ? (i === 0 ? 'Total' : '') : (c.format ? c.format(total) : Math.round(total * 100) / 100)}</td>;
                  })}
                  {rowActions && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <ul className="g-cards">
          {result.pageRows.length === 0 && <li className="g-empty">{emptyText}</li>}
          {result.pageRows.map((row) => {
            const id = getRowId(row);
            const [lead, ...rest] = shown;
            return (
              <li key={id}>
                <div className="g-card" onClick={(e) => open(row, e)}>
                  {selectable && <input type="checkbox" checked={selected.has(id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRow(id)} aria-label="Select row" />}
                  <div className="grow">
                    {lead && <b>{defaultCell(lead, row)}</b>}
                    <dl>
                      {rest.slice(0, 4).map((c) => <div key={c.id}><dt>{c.title}</dt><dd>{defaultCell(c, row)}</dd></div>)}
                    </dl>
                  </div>
                  {rowActions && <div onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!hidePagination && (
        <div className="g-pager">
          <small className="muted">{selectable && selectedRows.length > 0 ? `${selectedRows.length} of ` : ''}{result.sorted.length} row{result.sorted.length === 1 ? '' : 's'}</small>
          <div className="g-pager-end">
            <label>
              <small className="muted">Rows per page</small>
              <select value={state.pageSize} onChange={(e) => g.patch({ pageSize: Number(e.target.value), page: 0 })}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <small className="muted">Page {result.page + 1} of {result.pages}</small>
            <button className="ghost g-btn" disabled={result.page === 0} onClick={() => g.patch({ page: result.page - 1 })}>‹</button>
            <button className="ghost g-btn" disabled={result.page >= result.pages - 1} onClick={() => g.patch({ page: result.page + 1 })}>›</button>
          </div>
        </div>
      )}

      {drawerRow && (
        <Drawer
          row={drawerRow}
          columns={orderedColumns(columns, state.order) as Col<T>[]}
          title={props.drawerTitle?.(drawerRow) ?? defaultCell(columns[0] as Col<T>, drawerRow)}
          position={`${drawerIndex + 1} of ${result.sorted.length}`}
          onPrev={drawerIndex > 0 ? () => setDrawerId(getRowId(result.sorted[drawerIndex - 1])) : undefined}
          onNext={drawerIndex < result.sorted.length - 1 ? () => setDrawerId(getRowId(result.sorted[drawerIndex + 1])) : undefined}
          onClose={() => setDrawerId(null)}
          onOpen={onRowClick ? () => { setDrawerId(null); onRowClick(drawerRow); } : undefined}
          actions={rowActions?.(drawerRow)}
          extra={props.drawerExtra?.(drawerRow)}
        />
      )}
    </div>
  );
}

type Grid = ReturnType<typeof useGrid>;

function FiltersMenu<T>({ grid, data, columns, filterIds, builtIn }: { grid: Grid; data: T[]; columns: GridColumnDef<T>[]; filterIds: string[]; builtIn: GridView[] }) {
  const { state } = grid;
  const filterable = columns.filter((c) => c.filter);
  const [name, setName] = useState('');
  const allView: GridView = { id: 'all', name: 'All', filters: grid.defaults.filters, sorting: grid.defaults.sorting, search: '' };
  const viewName = [allView, ...builtIn, ...grid.saved].find((v) => v.id === state.view)?.name;
  return (
    <>
      <Menu label={<>Views{viewName && viewName !== 'All' ? `: ${viewName}` : ''}</>}>
        {(close) => (
          <div className="g-panel">
            {[allView, ...builtIn].map((v) => (
              <button key={v.id} className={`g-item${state.view === v.id ? ' on' : ''}`} onClick={() => { grid.applyView(v); close(); }}>{v.name}</button>
            ))}
            {grid.saved.length > 0 && <small className="g-sub">Saved</small>}
            {grid.saved.map((v) => (
              <div key={v.id} className="g-item-row">
                <button className={`g-item${state.view === v.id ? ' on' : ''}`} onClick={() => { grid.applyView(v); close(); }}>{v.name}</button>
                <button className="link" onClick={() => grid.removeView(v.id)} aria-label={`Delete view ${v.name}`}>✕</button>
              </div>
            ))}
            <form className="g-save" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { grid.saveView(name.trim()); setName(''); close(); } }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Save current as…" />
              <button className="ghost g-btn" disabled={!name.trim()}>Save</button>
            </form>
          </div>
        )}
      </Menu>
      {filterable.length > 0 && (
        <Menu label="Filter" count={filterIds.length}>
          {() => (
            <div className="g-panel wide">
              {filterable.map((c) => (
                <FilterSection key={c.id} grid={grid} data={data} columns={columns} column={c} />
              ))}
            </div>
          )}
        </Menu>
      )}
    </>
  );
  void state;
}

function FilterSection<T>({ grid, data, columns, column }: { grid: Grid; data: T[]; columns: GridColumnDef<T>[]; column: GridColumnDef<T> }) {
  const value = grid.state.filters[column.id];
  const active = !isEmptyFilter(value);
  const [open, setOpen] = useState(active);
  const meta = column.filter!;
  return (
    <div className="g-fsec">
      <button className="g-fhead" onClick={() => setOpen(!open)}>
        <span>{column.title}</span>
        {active && <i>{describeFilter(meta, value, column.format)}</i>}
        <em>{open ? '▾' : '▸'}</em>
      </button>
      {open && (
        <div className="g-fbody">
          {(meta.type === 'select' || meta.type === 'boolean') && (
            <FacetList grid={grid} data={data} columns={columns} column={column} />
          )}
          {meta.type === 'text' && <input value={(value as string) ?? ''} onChange={(e) => grid.setColumnFilter(column.id, e.target.value)} placeholder={`${column.title} contains…`} />}
          {(meta.type === 'number' || meta.type === 'date') && (
            <div className="g-range">
              <input type={meta.type === 'date' ? 'date' : 'number'} value={((value as [string, string]) ?? ['', ''])[0]} onChange={(e) => grid.setColumnFilter(column.id, [e.target.value, ((value as [string, string]) ?? ['', ''])[1]])} aria-label={`${column.title} from`} />
              <span className="muted">–</span>
              <input type={meta.type === 'date' ? 'date' : 'number'} value={((value as [string, string]) ?? ['', ''])[1]} onChange={(e) => grid.setColumnFilter(column.id, [((value as [string, string]) ?? ['', ''])[0], e.target.value])} aria-label={`${column.title} to`} />
            </div>
          )}
          {active && <button className="link" onClick={() => grid.setColumnFilter(column.id, undefined)}>Clear</button>}
        </div>
      )}
    </div>
  );
}

function FacetList<T>({ grid, data, columns, column }: { grid: Grid; data: T[]; columns: GridColumnDef<T>[]; column: GridColumnDef<T> }) {
  const chosen = (grid.state.filters[column.id] as string[] | undefined) ?? [];
  const options = facetOptions(data, columns, grid.state, column.id);
  return (
    <div className="g-facets">
      {options.length === 0 && <small className="muted">No values yet.</small>}
      {options.map((o) => (
        <label key={o.value} className="g-facet">
          <input type="checkbox" checked={chosen.includes(o.value)} onChange={() => grid.setColumnFilter(column.id, chosen.includes(o.value) ? chosen.filter((v) => v !== o.value) : [...chosen, o.value])} />
          <span>{o.label}</span>
          <small className="muted">{o.count}</small>
        </label>
      ))}
    </div>
  );
}

function SortMenu<T>({ columns, sorting, onChange }: { columns: GridColumnDef<T>[]; sorting: SortState[]; onChange: (s: SortState[]) => void }) {
  const sortable = columns.filter((c) => c.sortable !== false);
  const first = sorting[0];
  return (
    <Menu label={<>Sort{first ? `: ${columns.find((c) => c.id === first.id)?.title ?? ''} ${first.desc ? '↓' : '↑'}` : ''}</>} align="right">
      {() => (
        <div className="g-panel">
          {sortable.map((c) => {
            const s = sorting.find((x) => x.id === c.id);
            return (
              <div key={c.id} className="g-item-row">
                <span className="grow">{c.title}</span>
                <button className={`g-mini${s && !s.desc ? ' on' : ''}`} onClick={() => onChange(s && !s.desc ? sorting.filter((x) => x.id !== c.id) : [{ id: c.id, desc: false }])}>↑</button>
                <button className={`g-mini${s?.desc ? ' on' : ''}`} onClick={() => onChange(s?.desc ? sorting.filter((x) => x.id !== c.id) : [{ id: c.id, desc: true }])}>↓</button>
              </div>
            );
          })}
          {sorting.length > 0 && <button className="link" onClick={() => onChange([])}>Clear sort</button>}
        </div>
      )}
    </Menu>
  );
}

function ColumnsMenu<T>({ grid, columns, onExport }: { grid: Grid; columns: GridColumnDef<T>[]; onExport?: () => void }) {
  const { state } = grid;
  const ordered = orderedColumns(columns, state.order);
  const move = (id: string, by: number) => {
    const ids = ordered.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + by;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    grid.patch({ order: ids });
  };
  return (
    <Menu label="View" align="right">
      {() => (
        <div className="g-panel">
          <small className="g-sub">Columns</small>
          {ordered.map((c, i) => (
            <div key={c.id} className="g-item-row">
              <label className="g-facet grow">
                <input type="checkbox" checked={!state.hidden[c.id]} onChange={() => grid.patch({ hidden: { ...state.hidden, [c.id]: !state.hidden[c.id] } })} disabled={!state.hidden[c.id] && ordered.filter((x) => !state.hidden[x.id]).length === 1} />
                <span>{c.title}</span>
              </label>
              <button className="g-mini" disabled={i === 0} onClick={() => move(c.id, -1)} aria-label={`Move ${c.title} left`}>↑</button>
              <button className="g-mini" disabled={i === ordered.length - 1} onClick={() => move(c.id, 1)} aria-label={`Move ${c.title} right`}>↓</button>
            </div>
          ))}
          <small className="g-sub">Density</small>
          <div className="seg">
            <button className={state.density === 'comfortable' ? 'on' : ''} onClick={() => grid.patch({ density: 'comfortable' })}>Comfortable</button>
            <button className={state.density === 'compact' ? 'on' : ''} onClick={() => grid.patch({ density: 'compact' })}>Compact</button>
          </div>
          <div className="g-menu-foot">
            {onExport && <button className="link" onClick={onExport}>Export CSV</button>}
            <button className="link" onClick={grid.resetLayout}>Reset layout</button>
          </div>
        </div>
      )}
    </Menu>
  );
}

function Drawer<T>({ row, columns, title, position, onPrev, onNext, onClose, onOpen, actions, extra }: { row: T; columns: Col<T>[]; title: ReactNode; position: string; onPrev?: () => void; onNext?: () => void; onClose: () => void; onOpen?: () => void; actions?: ReactNode; extra?: ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown' && (e.target as HTMLElement).tagName !== 'INPUT') onNext?.();
      else if (e.key === 'ArrowUp' && (e.target as HTMLElement).tagName !== 'INPUT') onPrev?.();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose, onNext, onPrev]);
  return (
    <div className="g-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="panel g-drawer">
        <div className="panel-head">
          <span className="label">{title}</span>
          <button className="link" onClick={onClose}>Close</button>
        </div>
        <dl className="g-fields">
          {columns.map((c) => <div key={c.id}><dt>{c.title}</dt><dd>{defaultCell(c, row)}</dd></div>)}
        </dl>
        {extra}
        <div className="g-drawer-foot">
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            {onOpen && <button className="primary" onClick={onOpen}>Open</button>}
            {actions}
          </div>
          <div className="actions">
            <small className="muted">{position}</small>
            <button className="ghost g-btn" disabled={!onPrev} onClick={onPrev} aria-label="Previous row">↑</button>
            <button className="ghost g-btn" disabled={!onNext} onClick={onNext} aria-label="Next row">↓</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export { filterRows };
