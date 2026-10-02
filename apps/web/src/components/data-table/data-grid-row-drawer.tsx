import { flexRender, type Row } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import { AdaptivePanel } from './adaptive-panel';
import { columnTitle } from './column-utils';

/**
 * The record drawer (like opening an issue in Jira): click a row and every column of that record
 * appears in a side panel, including the ones hidden in the table, with the row's own actions and
 * previous / next to step through the rows as filtered and sorted. "Open" runs the page's own row
 * action - a full page or an edit form - when it has one.
 */
export function DataGridRowDrawer<TData>({
  rows,
  rowId,
  onClose,
  onSelect,
  onOpen,
  openLabel = 'Open',
  title,
  extra,
}: {
  /** The rows being stepped through: filtered and sorted, across every page. */
  rows: Row<TData>[];
  rowId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpen?: (row: TData) => void;
  openLabel?: string;
  title?: (row: TData) => ReactNode;
  /** Anything the page wants under the fields: a log, related records, a mini chart. */
  extra?: (row: TData) => ReactNode;
}) {
  const index = rows.findIndex((r) => r.id === rowId);
  const row = index >= 0 ? rows[index] : undefined;

  const cells = row?.getAllCells().filter((c) => c.column.id !== 'select') ?? [];
  const actions = cells.find((c) => c.column.id === 'actions');
  const fields = cells.filter((c) => c.column.id !== 'actions');
  const heading = fields[0];
  const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);

  const lead = (
    <div className="flex items-center gap-1 pr-2 text-xs text-muted-foreground">
      <span>{index + 1} of {rows.length}</span>
      <Button variant="ghost" size="icon-sm" className="size-6" disabled={index <= 0} aria-label="Previous record" onClick={() => onSelect(rows[index - 1].id)}>
        <ChevronUp className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" className="size-6" disabled={index >= rows.length - 1} aria-label="Next record" onClick={() => onSelect(rows[index + 1].id)}>
        <ChevronDown className="size-4" />
      </Button>
      {onOpen && row && (
        <Button size="sm" className="ml-auto h-7" onClick={() => onOpen(row.original)}>
          <ExternalLink /> {openLabel}
        </Button>
      )}
    </div>
  );

  return (
    <AdaptivePanel
      open={!!row}
      onOpenChange={(next) => !next && onClose()}
      width="lg"
      lead={row ? lead : undefined}
      title={row ? (title ? title(row.original) : heading ? flexRender(heading.column.columnDef.cell, heading.getContext()) : 'Record') : ''}
      footer={
        row && (actions || onOpen) ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {actions ? <div className="min-w-0 flex-1 text-sm">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div> : <span />}
            {onOpen && (
              <Button size="sm" onClick={() => onOpen(row.original)}>
                <ExternalLink /> {openLabel}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {row && (
        <div className="px-4 py-3">
          <dl className="flex flex-col divide-y">
            {fields.slice(title ? 0 : 1).map((cell) => {
              const empty = !hasValue(cell.getValue());
              return (
                <div key={cell.id} className="grid grid-cols-[7rem_1fr] items-start gap-3 py-2.5 text-sm">
                  <dt className="pt-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{columnTitle(cell.column)}</dt>
                  <dd className={`min-w-0 break-words ${empty ? 'text-muted-foreground' : ''}`}>
                    {empty && !cell.column.columnDef.meta?.exportValue ? '—' : flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </dd>
                </div>
              );
            })}
          </dl>
          {extra?.(row.original)}
        </div>
      )}
    </AdaptivePanel>
  );
}
