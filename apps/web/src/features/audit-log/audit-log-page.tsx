import { useQuery } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { auditLogApi } from './audit-log-api';
import type { AuditEventResponse, AuditEventType } from './types';

type UiType = 'login' | 'change' | 'alert' | 'add';
type DotTone = 'primary' | 'destructive' | 'muted';

interface AuditRow {
  type: UiType;
  dot: DotTone;
  text: string;
  meta: string;
  days: number;
}

const EVENT_TYPE_MAP: Record<AuditEventType, { type: UiType; dot: DotTone }> = {
  LOGIN_SUCCESS: { type: 'login', dot: 'muted' },
  SESSION_REVOKED: { type: 'login', dot: 'muted' },
  ENTRY_CREATED: { type: 'add', dot: 'primary' },
  CARD_ADDED: { type: 'add', dot: 'primary' },
  ENTRY_UPDATED: { type: 'change', dot: 'primary' },
  ENTRY_DELETED: { type: 'change', dot: 'primary' },
  CARD_DELETED: { type: 'change', dot: 'primary' },
  MASTER_PASSWORD_CHANGED: { type: 'change', dot: 'muted' },
  RECOVERY_CODE_GENERATED: { type: 'change', dot: 'muted' },
  RECOVERY_CODE_REDEEMED: { type: 'change', dot: 'muted' },
  RECOVERY_CODE_RESET: { type: 'change', dot: 'muted' },
  BREACH_ALERT: { type: 'alert', dot: 'destructive' },
  WEAK_PASSWORD_ALERT: { type: 'alert', dot: 'destructive' },
  RECURRING_DETECTED: { type: 'add', dot: 'muted' },
  BUDGET_EXCEEDED: { type: 'alert', dot: 'destructive' },
  HABIT_COMPLETED: { type: 'add', dot: 'primary' },
  HABIT_STREAK_MILESTONE: { type: 'add', dot: 'primary' },
  HABIT_REMINDER_DUE: { type: 'login', dot: 'muted' },
};

// The backend enum is shared across every service and can grow without this page being
// touched (see AuditEventResponse.eventType's comment) - fall back instead of crashing the
// whole page on an event type this map hasn't been taught yet.
const UNKNOWN_EVENT: { type: UiType; dot: DotTone } = { type: 'change', dot: 'muted' };

const DOT_CLASS: Record<DotTone, string> = {
  primary: 'bg-primary',
  destructive: 'bg-destructive',
  muted: 'bg-foreground/35',
};

function formatMeta(occurredAt: string, metadata: Record<string, string> | null): string {
  const date = new Date(occurredAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const context = [metadata?.device, metadata?.location].filter(Boolean).join(', ');
  return context ? `${dateLabel}, ${timeLabel} - from ${context}` : `${dateLabel}, ${timeLabel}`;
}

function toAuditEvent(response: AuditEventResponse): AuditRow {
  const { type, dot } = EVENT_TYPE_MAP[response.eventType as AuditEventType] ?? UNKNOWN_EVENT;
  const days = Math.floor((Date.now() - new Date(response.occurredAt).getTime()) / 86_400_000);
  return { type, dot, text: response.description, meta: formatMeta(response.occurredAt, response.metadata), days };
}

const FILTER_CHIPS: { label: string; type: UiType | 'all' }[] = [
  { label: 'All', type: 'all' },
  { label: 'Logins', type: 'login' },
  { label: 'Password changes', type: 'change' },
  { label: 'Alerts', type: 'alert' },
  { label: 'New entries', type: 'add' },
];

export function AuditLogPage() {
  const { data: events = [] } = useQuery({ queryKey: ['vault', 'audit-log'], queryFn: auditLogApi.getEvents });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<UiType | 'all'>('all');
  const [dateRange, setDateRange] = useState<7 | 30 | 9999>(30);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const rows = useMemo(() => events.map(toAuditEvent), [events]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (r.days > dateRange) return false;
      if (search.trim() && !`${r.text} ${r.meta}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, typeFilter, dateRange, search]);

  function exportCsv() {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['text,meta,type', ...filtered.map((r) => [escape(r.text), escape(r.meta), r.type].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        accessorKey: 'text',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Event" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS[row.original.dot]}`} />
            {row.original.text}
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      },
      {
        accessorKey: 'meta',
        header: ({ column }) => <DataTableColumnHeader column={column} title="When" />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.meta}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <Button variant="ghost" size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="max-w-xs" />
        {FILTER_CHIPS.map((chip) => (
          <Button
            key={chip.type}
            size="sm"
            variant={typeFilter === chip.type ? 'secondary' : 'ghost'}
            onClick={() => setTypeFilter(chip.type)}
          >
            {chip.label}
          </Button>
        ))}
        <Select value={String(dateRange)} onValueChange={(v) => setDateRange(Number(v) as 7 | 30 | 9999)}>
          <SelectTrigger size="sm" className="text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="9999">All time</SelectItem>
          </SelectContent>
        </Select>
        <DataTableViewOptions table={table} />
      </div>

      <div className="mt-4">
        <DataTable table={table} emptyMessage="No events match." />
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
