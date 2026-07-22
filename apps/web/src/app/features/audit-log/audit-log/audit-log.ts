import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import { AuditLogApiService } from '../../../core/services/audit-log-api.service';
import { AuditEventResponse, AuditEventType as BackendEventType } from '../../../core/models/audit-event.model';

type AuditEventType = 'login' | 'change' | 'alert' | 'add';
type AuditDotTone = 'primary' | 'destructive' | 'muted';

interface AuditEvent {
  type: AuditEventType;
  dot: AuditDotTone;
  text: string;
  meta: string;
  days: number;
}

interface TypeChip {
  id: 'all' | AuditEventType;
  label: string;
}

interface RangeOption {
  label: string;
  value: number;
}

const TYPE_CHIPS: TypeChip[] = [
  { id: 'all', label: 'All' },
  { id: 'login', label: 'Logins' },
  { id: 'change', label: 'Password changes' },
  { id: 'alert', label: 'Alerts' },
  { id: 'add', label: 'New entries' },
];

const RANGE_OPTIONS: RangeOption[] = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'All time', value: 9999 },
];

// Bucket + dot tone per backend event type. `primary` = a concrete vault item
// (entry/card) was touched, `muted` = an account-level security action or
// login/session activity, `destructive` = an alert. Matches the tone pattern
// already used across the (formerly hardcoded) event rows.
const EVENT_TYPE_MAP: Record<BackendEventType, { type: AuditEventType; dot: AuditDotTone }> = {
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

function formatMeta(occurredAt: string, metadata: Record<string, string> | null): string {
  const date = new Date(occurredAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const context = [metadata?.['device'], metadata?.['location']].filter(Boolean).join(', ');

  return context ? `${dateLabel}, ${timeLabel} - from ${context}` : `${dateLabel}, ${timeLabel}`;
}

function toAuditEvent(response: AuditEventResponse): AuditEvent {
  const { type, dot } = EVENT_TYPE_MAP[response.eventType];
  const occurredAtMs = new Date(response.occurredAt).getTime();
  const days = Math.floor((Date.now() - occurredAtMs) / 86_400_000);

  return {
    type,
    dot,
    text: response.description,
    meta: formatMeta(response.occurredAt, response.metadata),
    days,
  };
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, ButtonModule, SelectModule],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.scss',
})
export class AuditLogPage implements OnInit {
  private readonly auditLogApi = inject(AuditLogApiService);

  protected readonly typeChipDefs = TYPE_CHIPS;
  protected readonly rangeOptions = RANGE_OPTIONS;

  protected readonly events = signal<AuditEvent[]>([]);
  protected readonly loading = signal(true);

  protected readonly search = signal('');
  protected readonly selectedType = signal<TypeChip['id']>('all');
  protected readonly range = signal(9999);

  ngOnInit(): void {
    this.auditLogApi.getEvents().subscribe({
      next: (responses) => {
        this.events.set(responses.map(toAuditEvent));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected readonly filteredEvents = computed(() => {
    const query = this.search().trim().toLowerCase();
    const type = this.selectedType();
    const range = this.range();

    return this.events().filter(
      (event) =>
        event.days <= range &&
        (type === 'all' || event.type === type) &&
        (!query || event.text.toLowerCase().includes(query) || event.meta.toLowerCase().includes(query)),
    );
  });

  protected readonly resultCount = computed(() => this.filteredEvents().length);
  protected readonly hasResults = computed(() => this.filteredEvents().length > 0);

  protected selectType(id: TypeChip['id']): void {
    this.selectedType.set(id);
  }

  protected exportCsv(): void {
    const rows = [
      ['text', 'meta', 'type'],
      ...this.filteredEvents().map((event) => [event.text, event.meta, event.type]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log.csv';
    link.click();

    URL.revokeObjectURL(url);
  }
}
