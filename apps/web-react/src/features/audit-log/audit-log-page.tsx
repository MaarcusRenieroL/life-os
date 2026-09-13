import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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
};

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

function toAuditEvent(response: AuditEventResponse) {
  const { type, dot } = EVENT_TYPE_MAP[response.eventType];
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

  return (
    <div className="mx-auto max-w-2xl">
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
      </div>

      <ul className="mt-4 flex flex-col gap-0.5">
        {filtered.map((event, i) => (
          <li key={i} className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
            <span className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS[event.dot]}`} />
            <span className="flex-1 text-sm">{event.text}</span>
            <span className="text-xs text-muted-foreground">{event.meta}</span>
          </li>
        ))}
        {filtered.length === 0 && <p className="py-4 text-sm text-muted-foreground">No events match.</p>}
      </ul>
    </div>
  );
}
