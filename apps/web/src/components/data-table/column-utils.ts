import { describeFilter, humanize, type ColumnFilterMeta } from '@life-os/core';
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
    /** Lets the record drawer edit this field. The page's `onEditRow` receives the change keyed by column id. */
    edit?: ColumnEditMeta<TData>;
  }
}

export type ColumnEditMeta<TData> =
  | { type: 'text' | 'textarea' | 'number' | 'date'; value?: (row: TData) => string | number | null }
  | { type: 'select'; options: { label: string; value: string }[]; value?: (row: TData) => string | null };

export type { ColumnFilterMeta };

export { describeFilter, humanize };

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
