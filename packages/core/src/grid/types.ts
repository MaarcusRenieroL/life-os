// The data grid's model, shared by the web, desktop and mobile apps. Nothing here knows about React,
// the DOM or React Native: each app renders it its own way, and this decides what rows it shows.

export type ColumnFilterMeta =
  | { type: 'text' }
  | { type: 'select'; options?: { label: string; value: string }[] }
  | { type: 'number' }
  | { type: 'date' }
  | { type: 'boolean'; labels?: [string, string] };

export interface GridColumnDef<T> {
  id: string;
  /** The column's human name: header, column menu, filter chips, CSV header. */
  title: string;
  /** The raw value, used for sorting, filtering, search, totals and export. */
  value: (row: T) => unknown;
  /** Makes the column filterable, and picks the control. */
  filter?: ColumnFilterMeta;
  /** Sortable unless set to false. */
  sortable?: boolean;
  align?: 'right';
  /** Total shown in the footer over every filtered row. */
  aggregate?: 'sum' | 'avg' | 'count';
  /** How a raw value reads in chips and totals. */
  format?: (value: unknown) => string;
  /** The value written to CSV when it differs from the raw value. */
  exportValue?: (row: T) => string | number | null;
  /** Starts hidden (the user can show it from the column menu). */
  hidden?: boolean;
  /** Left out of the free-text search box. */
  noSearch?: boolean;
}

export interface SortState {
  id: string;
  desc: boolean;
}

export type Density = 'comfortable' | 'compact';

export interface GridState {
  search: string;
  /** Active filters by column id: string[] for select/boolean, [from, to] for number/date, string for text. */
  filters: Record<string, unknown>;
  sorting: SortState[];
  hidden: Record<string, boolean>;
  order: string[];
  widths: Record<string, number>;
  page: number;
  pageSize: number;
  density: Density;
  /** The active view's id; 'all' when none. */
  view: string;
}

/** The part of the state worth keeping across launches. Filters and search are deliberately session-only. */
export interface GridLayout {
  sorting: SortState[];
  hidden: Record<string, boolean>;
  order: string[];
  widths: Record<string, number>;
  pageSize: number;
  density: Density;
}

/** Everything a view remembers about a table. Every part is optional: a view only sets what it names. */
export interface GridView {
  id: string;
  name: string;
  search?: string;
  filters?: Record<string, unknown>;
  sorting?: SortState[];
  hidden?: Record<string, boolean>;
}

export const PAGE_SIZES = [10, 20, 30, 50, 100] as const;
