import type { Column, Table } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

import { columnTitle } from './column-utils';

/** The control for one filterable column, chosen by `meta.filter.type`. */
export function FilterControl<TData>({ column }: { column: Column<TData, unknown> }) {
  const meta = column.columnDef.meta?.filter;
  const value = column.getFilterValue();
  if (!meta) return null;

  if (meta.type === 'text') {
    return (
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        placeholder={`Contains…`}
        className="h-8"
      />
    );
  }

  if (meta.type === 'number' || meta.type === 'date') {
    const [from, to] = (value as [string, string] | undefined) ?? ['', ''];
    const type = meta.type === 'date' ? 'date' : 'number';
    const set = (a: string, b: string) => column.setFilterValue(a || b ? [a, b] : undefined);
    return (
      <div className="flex items-center gap-2">
        <Input type={type} value={from} onChange={(e) => set(e.target.value, to)} placeholder={meta.type === 'number' ? 'Min' : undefined} aria-label={`${columnTitle(column)} from`} className="h-8" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type={type} value={to} onChange={(e) => set(from, e.target.value)} placeholder={meta.type === 'number' ? 'Max' : undefined} aria-label={`${columnTitle(column)} to`} className="h-8" />
      </div>
    );
  }

  return <ChoiceFilter column={column} />;
}

function ChoiceFilter<TData>({ column }: { column: Column<TData, unknown> }) {
  const meta = column.columnDef.meta?.filter;
  const [query, setQuery] = useState('');
  const chosen = (column.getFilterValue() as string[] | undefined) ?? [];
  const facets = column.getFacetedUniqueValues();

  const options = useMemo(() => {
    if (meta?.type === 'boolean') {
      return [
        { value: 'true', label: meta.labels?.[0] ?? 'Yes' },
        { value: 'false', label: meta.labels?.[1] ?? 'No' },
      ];
    }
    const declared = meta?.type === 'select' ? meta.options : undefined;
    if (declared) return declared;
    return [...facets.keys()]
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => ({ value: String(v), label: String(v) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [facets, meta]);

  const shown = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const toggle = (value: string) => {
    const next = chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value];
    column.setFilterValue(next.length ? next : undefined);
  };

  return (
    <div>
      {options.length > 8 && (
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search options…" className="mb-2 h-8" />
      )}
      <div className="max-h-44 overflow-y-auto pr-1">
        {shown.length === 0 && <p className="py-1 text-xs text-muted-foreground">No options.</p>}
        {shown.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
            <Checkbox checked={chosen.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <span className="text-xs text-muted-foreground">{facets.get(option.value) ?? facets.get(option.value === 'true' ? true : option.value === 'false' ? false : option.value) ?? 0}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Every filterable column's control in one scrollable list. */
export function FilterList<TData>({ table }: { table: Table<TData> }) {
  const columns = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  if (columns.length === 0) return <p className="text-sm text-muted-foreground">Nothing to filter by.</p>;
  return (
    <div className="flex max-h-[26rem] flex-col gap-4 overflow-y-auto pr-1">
      {columns.map((column) => (
        <div key={column.id}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{columnTitle(column)}</p>
          <FilterControl column={column} />
        </div>
      ))}
    </div>
  );
}
