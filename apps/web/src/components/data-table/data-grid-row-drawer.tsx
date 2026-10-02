import { flexRender, type Row } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Pencil } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  onEditRow,
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
  /** Saves edits made in the drawer: the changed fields, keyed by column id. Omit to make the drawer read-only. */
  onEditRow?: (row: TData, changes: Record<string, string | number | null>) => Promise<unknown>;
}) {
  const index = rows.findIndex((r) => r.id === rowId);
  const row = index >= 0 ? rows[index] : undefined;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Moving to another record, or closing, leaves edit mode.
  useEffect(() => {
    setEditing(false);
    setDraft({});
  }, [rowId]);

  const cells = row?.getAllCells().filter((c) => c.column.id !== 'select') ?? [];
  const actions = cells.find((c) => c.column.id === 'actions');
  const fields = cells.filter((c) => c.column.id !== 'actions' && !!c.column.columnDef.meta?.title);
  const editable = !!onEditRow && fields.some((c) => c.column.columnDef.meta?.edit);

  const original = (cell: (typeof fields)[number]): string => {
    const edit = cell.column.columnDef.meta?.edit;
    const value = edit?.value && row ? edit.value(row.original) : cell.getValue();
    return value === null || value === undefined ? '' : String(value);
  };

  async function save() {
    if (!row || !onEditRow) return;
    const changes: Record<string, string | number | null> = {};
    for (const cell of fields) {
      const edit = cell.column.columnDef.meta?.edit;
      const next = draft[cell.column.id];
      if (!edit || next === undefined || next === original(cell)) continue;
      changes[cell.column.id] = edit.type === 'number' ? (next === '' ? null : Number(next)) : next === '' ? null : next;
    }
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEditRow(row.original, changes);
      toast.success('Saved');
      setEditing(false);
      setDraft({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save that');
    } finally {
      setSaving(false);
    }
  }

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
      <div className="ml-auto flex items-center gap-1.5">
        {editable && !editing && (
          <Button size="sm" variant="outline" className="h-7" onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </Button>
        )}
        {onOpen && row && (
          <Button size="sm" variant="ghost" className="h-7" onClick={() => onOpen(row.original)} title={openLabel}>
            <ExternalLink /> {openLabel}
          </Button>
        )}
      </div>
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
        row && editing ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setEditing(false); setDraft({}); }}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </div>
        ) : row && actions ? (
          <div className="min-w-0 overflow-x-auto text-sm">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div>
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
                    {editing && cell.column.columnDef.meta?.edit ? (
                      <FieldEditor
                        edit={cell.column.columnDef.meta.edit}
                        label={columnTitle(cell.column)}
                        value={draft[cell.column.id] ?? original(cell)}
                        onChange={(v) => setDraft((prev) => ({ ...prev, [cell.column.id]: v }))}
                      />
                    ) : empty && !cell.column.columnDef.meta?.exportValue ? (
                      '—'
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
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

function FieldEditor<TData>({
  edit,
  label,
  value,
  onChange,
}: {
  edit: NonNullable<import('@tanstack/react-table').ColumnMeta<TData, unknown>['edit']>;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (edit.type === 'select') {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-full" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {edit.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (edit.type === 'textarea') {
    return <Textarea value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} rows={3} />;
  }
  return (
    <Input
      type={edit.type === 'number' ? 'number' : edit.type === 'date' ? 'date' : 'text'}
      step={edit.type === 'number' ? 'any' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-8"
    />
  );
}
