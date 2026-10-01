import type { Column, FilterFn, Row } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Classes added to this column's header and cells - e.g. `hidden lg:table-cell` to drop a
     * low-priority column on narrow screens instead of forcing the table to scroll sideways. */
    className?: string;
    /** The column's human name: shown in the header, the View menu, filter chips and CSV export. */
    title?: string;
    /** Makes the column filterable, and picks the control. Omit for a column that can't be filtered. */
    filter?: ColumnFilterMeta;
    /** Right-align numbers and money. */
    align?: 'right';
    /** Total shown in the table footer over every filtered row. */
    aggregate?: 'sum' | 'avg' | 'count';
    /** How a raw value is shown in the footer and chips (defaults to the plain value). */
    format?: (value: unknown) => string;
    /** The value written to CSV when it differs from the raw cell value. */
    exportValue?: (row: TData) => string | number | null;
  }
}

export type ColumnFilterMeta =
  | { type: 'text' }
  | { type: 'select'; options?: { label: string; value: string }[] }
  | { type: 'number' }
  | { type: 'date' }
  | { type: 'boolean'; labels?: [string, string] };

/** `currentBalance` -> `Current balance`; the fallback when a column has no explicit title. */
export function humanize(id: string): string {
  const spaced = id
    .replace(/[_.-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function columnTitle<TData, TValue>(column: Column<TData, TValue>): string {
  const explicit = column.columnDef.meta?.title;
  if (explicit) return explicit;
  const header = column.columnDef.header;
  if (typeof header === 'string' && header.trim()) return header;
  return humanize(column.id);
}

const asDay = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
};

/** Multi-select: the cell must equal one of the chosen values (an array cell matches on any item). */
export const inSetFilter: FilterFn<unknown> = (row: Row<unknown>, columnId, chosen: string[]) => {
  if (!chosen?.length) return true;
  const value = row.getValue(columnId);
  return Array.isArray(value) ? value.some((v) => chosen.includes(String(v))) : chosen.includes(String(value));
};
inSetFilter.autoRemove = (value: unknown) => !Array.isArray(value) || value.length === 0;

/** Date range as [from, to] in yyyy-MM-dd; either end may be empty. */
export const dateRangeFilter: FilterFn<unknown> = (row: Row<unknown>, columnId, range: [string, string]) => {
  const [from, to] = range ?? ['', ''];
  const day = asDay(row.getValue(columnId));
  if (!day) return !from && !to;
  return (!from || day >= from) && (!to || day <= to);
};
dateRangeFilter.autoRemove = (value: unknown) => !Array.isArray(value) || (!value[0] && !value[1]);

/** Number range as [min, max]; either end may be empty. */
export const numberRangeFilter: FilterFn<unknown> = (row: Row<unknown>, columnId, range: [string, string]) => {
  const [min, max] = range ?? ['', ''];
  const value = Number(row.getValue(columnId));
  if (Number.isNaN(value)) return false;
  return (min === '' || value >= Number(min)) && (max === '' || value <= Number(max));
};
numberRangeFilter.autoRemove = (value: unknown) => !Array.isArray(value) || (value[0] === '' && value[1] === '');

export const containsFilter: FilterFn<unknown> = (row: Row<unknown>, columnId, needle: string) =>
  String(row.getValue(columnId) ?? '').toLowerCase().includes(String(needle ?? '').toLowerCase());
containsFilter.autoRemove = (value: unknown) => !value;

export const FILTER_FNS = {
  inSet: inSetFilter,
  dateRange: dateRangeFilter,
  numberRange: numberRangeFilter,
  contains: containsFilter,
};

export function filterFnFor(meta: ColumnFilterMeta): keyof typeof FILTER_FNS {
  switch (meta.type) {
    case 'select':
    case 'boolean':
      return 'inSet';
    case 'date':
      return 'dateRange';
    case 'number':
      return 'numberRange';
    default:
      return 'contains';
  }
}

/** A short human summary of an active filter, for the chips. */
export function describeFilter(meta: ColumnFilterMeta, value: unknown, format?: (v: unknown) => string): string {
  const show = (v: unknown) => (format ? format(v) : String(v));
  if (meta.type === 'select' || meta.type === 'boolean') {
    const chosen = (value as string[]) ?? [];
    const labelOf = (v: string) =>
      meta.type === 'boolean'
        ? v === 'true'
          ? (meta.labels?.[0] ?? 'Yes')
          : (meta.labels?.[1] ?? 'No')
        : (meta.options?.find((o) => o.value === v)?.label ?? v);
    return chosen.length > 2 ? `${chosen.length} selected` : chosen.map(labelOf).join(', ');
  }
  if (meta.type === 'number' || meta.type === 'date') {
    const [a, b] = (value as [string, string]) ?? ['', ''];
    if (a && b) return `${show(a)} - ${show(b)}`;
    return a ? `from ${show(a)}` : `up to ${show(b)}`;
  }
  return `contains "${String(value)}"`;
}
