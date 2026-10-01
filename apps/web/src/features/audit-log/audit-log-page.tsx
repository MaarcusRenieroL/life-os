import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { DataGrid } from '@/components/data-table/data-grid';
import { Button } from '@/components/ui/button';

import { auditLogApi } from './audit-log-api';
import type { AuditEventResponse, AuditEventType } from './types';

type UiType = 'login' | 'change' | 'alert' | 'add';
type DotTone = 'primary' | 'destructive' | 'muted';

interface AuditRow {
  type: UiType;
  dot: DotTone;
  text: string;
  occurredAt: string;
  eventCode: string;
  device: string;
  location: string;
}

const TYPE_LABELS: Record<UiType, string> = {
  login: 'Sign-ins',
  change: 'Changes',
  alert: 'Alerts',
  add: 'New items',
};

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

function toAuditEvent(response: AuditEventResponse): AuditRow {
  const { type, dot } = EVENT_TYPE_MAP[response.eventType as AuditEventType] ?? UNKNOWN_EVENT;
  return {
    type,
    dot,
    text: response.description,
    occurredAt: response.occurredAt,
    eventCode: response.eventType,
    device: response.metadata?.device ?? '',
    location: response.metadata?.location ?? '',
  };
}

const dayOffset = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const RANGES: { label: string; days: number | null }[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'All time', days: null },
];

export function AuditLogPage() {
  // The endpoint is paginated. Search and every filter run client-side over the fetched set, so this
  // takes one large page rather than the server's 50-row default - that keeps the filters working
  // over a useful window while still bounding what used to be the entire (unbounded, Kafka-fed)
  // audit_events table.
  const { data: page, isLoading } = useQuery({
    queryKey: ['vault', 'audit-log'],
    queryFn: () => auditLogApi.getEvents(),
  });
  const truncated = page ? page.totalElements > page.numberOfElements : false;
  const rows = useMemo(() => (page?.content ?? []).map(toAuditEvent), [page?.content]);

  // Surfaced so a user looking at a filtered view knows the window is capped rather than
  // silently believing they're seeing their whole history.
  const truncationNotice = truncated
    ? `Showing the ${page?.numberOfElements ?? 0} most recent of ${page?.totalElements ?? 0} events.`
    : null;

  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        accessorKey: 'occurredAt',
        meta: { title: 'When', filter: { type: 'date' } },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.occurredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        ),
      },
      {
        accessorKey: 'text',
        meta: { title: 'Event', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS[row.original.dot]}`} />
            {row.original.text}
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (r) => TYPE_LABELS[r.type],
        meta: { title: 'Category', filter: { type: 'select' } },
      },
      {
        accessorKey: 'eventCode',
        meta: { title: 'Event type', filter: { type: 'select' } },
      },
      {
        accessorKey: 'device',
        meta: { title: 'Device', filter: { type: 'select' } },
        cell: ({ row }) => row.original.device || '—',
      },
      {
        accessorKey: 'location',
        meta: { title: 'Location', filter: { type: 'select' } },
        cell: ({ row }) => row.original.location || '—',
      },
    ],
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>

      {truncationNotice && <p className="mt-3 text-xs text-muted-foreground">{truncationNotice}</p>}

      <div className="mt-4">
        <DataGrid
          tableId="vault.audit-log"
          data={rows}
          columns={columns}
          loading={isLoading}
          initialSorting={[{ id: 'occurredAt', desc: true }]}
          initialFilters={[{ id: 'occurredAt', value: [dayOffset(30), ''] }]}
          initialVisibility={{ eventCode: false, device: false, location: false }}
          exportName="audit-log"
          searchPlaceholder="Search events…"
          emptyMessage="No events match."
          toolbarStart={(table) => (
            <div className="flex flex-wrap items-center gap-1">
              {RANGES.map(({ label, days }) => {
                const current = table.getColumn('occurredAt')?.getFilterValue() as [string, string] | undefined;
                const active = days === null ? !current : current?.[0] === dayOffset(days) && !current[1];
                return (
                  <Button
                    key={label}
                    size="sm"
                    variant={active ? 'secondary' : 'ghost'}
                    onClick={() => table.getColumn('occurredAt')?.setFilterValue(days === null ? undefined : [dayOffset(days), ''])}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
