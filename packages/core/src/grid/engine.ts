import type { ColumnFilterMeta, GridColumnDef, GridLayout, GridState, GridView, SortState } from './types';
import { PAGE_SIZES } from './types';

/** `currentBalance` -> `Current balance`; the fallback title for a column without one. */
export function humanize(id: string): string {
  const spaced = id
    .replace(/[_.-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const asText = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);

const asDay = (value: unknown): string => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10));

/** True when a filter value means "no filter" (nothing chosen, blank range, empty text). */
export function isEmptyFilter(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0 || (value.length === 2 && value.every((v) => v === '' || v === undefined || v === null));
  return false;
}

/** Whether one raw cell value passes a column's filter. */
export function matchesFilter(meta: ColumnFilterMeta, filter: unknown, raw: unknown): boolean {
  if (isEmptyFilter(filter)) return true;
  switch (meta.type) {
    case 'select':
    case 'boolean': {
      const chosen = filter as string[];
      return Array.isArray(raw) ? raw.some((v) => chosen.includes(String(v))) : chosen.includes(String(raw));
    }
    case 'date': {
      const [from, to] = filter as [string, string];
      const day = asDay(raw);
      if (!day) return !from && !to;
      return (!from || day >= from) && (!to || day <= to);
    }
    case 'number': {
      const [min, max] = filter as [string, string];
      const value = Number(raw);
      if (raw === null || raw === undefined || raw === '' || Number.isNaN(value)) return false;
      return (min === '' || min === undefined || value >= Number(min)) && (max === '' || max === undefined || value <= Number(max));
    }
    default:
      return asText(raw).toLowerCase().includes(String(filter).toLowerCase());
  }
}

/** A short human summary of an active filter, for chips. */
export function describeFilter(meta: ColumnFilterMeta, value: unknown, format?: (v: unknown) => string): string {
  const show = (v: unknown) => (format ? format(v) : String(v));
  if (meta.type === 'select' || meta.type === 'boolean') {
    const chosen = (value as string[]) ?? [];
    const labelOf = (v: string) =>
      meta.type === 'boolean' ? (v === 'true' ? (meta.labels?.[0] ?? 'Yes') : (meta.labels?.[1] ?? 'No')) : (meta.options?.find((o) => o.value === v)?.label ?? v);
    return chosen.length > 2 ? `${chosen.length} selected` : chosen.map(labelOf).join(', ');
  }
  if (meta.type === 'number' || meta.type === 'date') {
    const [a, b] = (value as [string, string]) ?? ['', ''];
    if (a && b) return `${show(a)} - ${show(b)}`;
    return a ? `from ${show(a)}` : `up to ${show(b)}`;
  }
  return `contains "${String(value)}"`;
}

function searchHaystack<T>(row: T, columns: GridColumnDef<T>[]): string {
  return columns
    .filter((c) => !c.noSearch)
    .map((c) => asText(c.value(row)))
    .join(' ')
    .toLowerCase();
}

/** Rows that pass the search box and every column filter (except `skip`, used to count a column's own options). */
export function filterRows<T>(rows: T[], columns: GridColumnDef<T>[], state: Pick<GridState, 'search' | 'filters'>, skip?: string): T[] {
  const needle = state.search.trim().toLowerCase();
  const active = columns.filter((c) => c.filter && c.id !== skip && !isEmptyFilter(state.filters[c.id]));
  if (!needle && active.length === 0) return rows;
  return rows.filter((row) => {
    if (needle && !searchHaystack(row, columns).includes(needle)) return false;
    return active.every((c) => matchesFilter(c.filter!, state.filters[c.id], c.value(row)));
  });
}

export function compareValues(a: unknown, b: unknown): number {
  const blankA = a === null || a === undefined || a === '';
  const blankB = b === null || b === undefined || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return asText(a).localeCompare(asText(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortRows<T>(rows: T[], columns: GridColumnDef<T>[], sorting: SortState[]): T[] {
  const keys = sorting.map((s) => ({ col: columns.find((c) => c.id === s.id), desc: s.desc })).filter((k) => k.col);
  if (keys.length === 0) return rows;
  return [...rows].sort((x, y) => {
    for (const { col, desc } of keys) {
      const a = col!.value(x);
      const b = col!.value(y);
      const blankA = a === null || a === undefined || a === '';
      const blankB = b === null || b === undefined || b === '';
      // Blanks stay last whichever way the column sorts.
      if (blankA || blankB) {
        if (blankA !== blankB) return blankA ? 1 : -1;
        continue;
      }
      const result = compareValues(a, b);
      if (result !== 0) return desc ? -result : result;
    }
    return 0;
  });
}

/** The values a select column can be filtered by, with how many rows each would leave. */
export function facetOptions<T>(rows: T[], columns: GridColumnDef<T>[], state: Pick<GridState, 'search' | 'filters'>, columnId: string): { value: string; label: string; count: number }[] {
  const column = columns.find((c) => c.id === columnId);
  if (!column?.filter) return [];
  const meta = column.filter;
  const base = filterRows(rows, columns, state, columnId);
  const counts = new Map<string, number>();
  for (const row of base) {
    const raw = column.value(row);
    for (const v of Array.isArray(raw) ? raw : [raw]) {
      if (v === null || v === undefined || v === '') continue;
      counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    }
  }
  if (meta.type === 'boolean') {
    return ['true', 'false'].map((v) => ({ value: v, label: v === 'true' ? (meta.labels?.[0] ?? 'Yes') : (meta.labels?.[1] ?? 'No'), count: counts.get(v) ?? 0 }));
  }
  if (meta.type === 'select' && meta.options) {
    return meta.options.map((o) => ({ value: o.value, label: o.label, count: counts.get(o.value) ?? 0 }));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: column.format ? column.format(value) : value, count }));
}

export function aggregateOf<T>(rows: T[], column: GridColumnDef<T>): number | null {
  if (!column.aggregate) return null;
  if (column.aggregate === 'count') return rows.length;
  const nums = rows.map((r) => Number(column.value(r))).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return column.aggregate === 'sum' ? sum : sum / nums.length;
}

export function defaultState<T>(columns: GridColumnDef<T>[], init: Partial<GridState> = {}): GridState {
  return {
    search: '',
    filters: {},
    sorting: [],
    hidden: Object.fromEntries(columns.filter((c) => c.hidden).map((c) => [c.id, true])),
    order: [],
    widths: {},
    page: 0,
    pageSize: 20,
    density: 'comfortable',
    view: 'all',
    ...init,
  };
}

/** Columns in the user's order, minus hidden ones. Columns the order doesn't name keep their place at the end. */
export function visibleColumns<T>(columns: GridColumnDef<T>[], state: Pick<GridState, 'hidden' | 'order'>): GridColumnDef<T>[] {
  return orderedColumns(columns, state.order).filter((c) => !state.hidden[c.id]);
}

export function orderedColumns<T>(columns: GridColumnDef<T>[], order: string[]): GridColumnDef<T>[] {
  if (order.length === 0) return columns;
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length + columns.findIndex((c) => c.id === id) : i;
  };
  return [...columns].sort((a, b) => rank(a.id) - rank(b.id));
}

/** Click on a header: ascending, then descending, then off. `multi` (shift-click) keeps the other sorts. */
export function cycleSort(sorting: SortState[], id: string, multi = false): SortState[] {
  const current = sorting.find((s) => s.id === id);
  const others = multi ? sorting.filter((s) => s.id !== id) : [];
  if (!current) return [...others, { id, desc: false }];
  if (!current.desc) return [...others, { id, desc: true }];
  return others;
}

export function setFilter(filters: Record<string, unknown>, id: string, value: unknown): Record<string, unknown> {
  const next = { ...filters };
  if (isEmptyFilter(value)) delete next[id];
  else next[id] = value;
  return next;
}

export function activeFilterIds<T>(columns: GridColumnDef<T>[], filters: Record<string, unknown>): string[] {
  return columns.filter((c) => c.filter && !isEmptyFilter(filters[c.id])).map((c) => c.id);
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export interface GridResult<T> {
  /** After search and filters, before paging. */
  filtered: T[];
  /** The current page of the sorted rows. */
  pageRows: T[];
  sorted: T[];
  pages: number;
  page: number;
}

export function runGrid<T>(rows: T[], columns: GridColumnDef<T>[], state: GridState): GridResult<T> {
  const filtered = filterRows(rows, columns, state);
  const sorted = sortRows(filtered, columns, state.sorting);
  const pages = pageCount(sorted.length, state.pageSize);
  const page = Math.min(state.page, pages - 1);
  return { filtered, sorted, pages, page, pageRows: sorted.slice(page * state.pageSize, (page + 1) * state.pageSize) };
}

export function csvCell(value: unknown): string {
  const text = asText(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV of `rows` over the visible columns, using each column's export value when it has one. */
export function toCsv<T>(rows: T[], columns: GridColumnDef<T>[]): string {
  return [columns.map((c) => csvCell(c.title)).join(','), ...rows.map((row) => columns.map((c) => csvCell(c.exportValue ? c.exportValue(row) : c.value(row))).join(','))].join('\n');
}

export function layoutOf(state: GridState): GridLayout {
  return { sorting: state.sorting, hidden: state.hidden, order: state.order, widths: state.widths, pageSize: state.pageSize, density: state.density };
}

/** Merge a saved layout over the defaults, dropping anything that names a column that no longer exists. */
export function restoreLayout<T>(columns: GridColumnDef<T>[], base: GridState, saved: Partial<GridLayout> | null | undefined): GridState {
  if (!saved) return base;
  const ids = new Set(columns.map((c) => c.id));
  const only = <V,>(rec: Record<string, V> | undefined) => (rec ? Object.fromEntries(Object.entries(rec).filter(([k]) => ids.has(k))) : undefined);
  return {
    ...base,
    sorting: (saved.sorting ?? base.sorting).filter((s) => ids.has(s.id)),
    hidden: only(saved.hidden) ?? base.hidden,
    order: (saved.order ?? []).filter((id) => ids.has(id)),
    widths: only(saved.widths) ?? {},
    pageSize: (PAGE_SIZES as readonly number[]).includes(saved.pageSize ?? 0) ? saved.pageSize! : base.pageSize,
    density: saved.density ?? base.density,
  };
}

/** A view applied to a state. A view that names `hidden` starts from the page's defaults, then applies it. */
export function applyView(state: GridState, view: GridView, allDefaults: GridState): GridState {
  return {
    ...state,
    view: view.id,
    page: 0,
    filters: view.filters ?? {},
    search: view.search ?? '',
    sorting: view.sorting ?? state.sorting,
    hidden: view.hidden ? { ...allDefaults.hidden, ...view.hidden } : state.hidden,
  };
}

export function viewOf(id: string, name: string, state: GridState): GridView {
  return { id, name, search: state.search, filters: state.filters, sorting: state.sorting, hidden: state.hidden };
}
