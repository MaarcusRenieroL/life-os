import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

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

// TODO(backend): no audit-log API yet, this event list is 100% mock/in-memory.
const EVENTS: AuditEvent[] = [
  { type: 'change', dot: 'primary', text: 'Password changed for Chase Bank', meta: 'Today, 9:42 AM - from MacBook Pro', days: 0 },
  { type: 'login', dot: 'muted', text: 'Signed in from new device iPhone 15', meta: 'Yesterday, 6:10 PM - San Francisco, CA', days: 1 },
  { type: 'alert', dot: 'destructive', text: 'Compromised alert for Figma', meta: '2 days ago - found in third-party breach', days: 2 },
  { type: 'add', dot: 'primary', text: 'New entry added: Stripe Dashboard', meta: '4 days ago - from MacBook Pro', days: 4 },
  { type: 'login', dot: 'muted', text: 'Signed in from MacBook Pro', meta: '6 days ago - San Francisco, CA', days: 6 },
  { type: 'change', dot: 'primary', text: 'Password changed for Google Workspace', meta: '12 days ago - from MacBook Pro', days: 12 },
  { type: 'alert', dot: 'destructive', text: 'Weak password detected for AWS Root', meta: '18 days ago - health scan', days: 18 },
  { type: 'change', dot: 'muted', text: 'Master password changed', meta: '4 months ago - from MacBook Pro', days: 120 },
];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.scss',
})
export class AuditLogPage {
  protected readonly typeChipDefs = TYPE_CHIPS;
  protected readonly rangeOptions = RANGE_OPTIONS;

  protected readonly search = signal('');
  protected readonly selectedType = signal<TypeChip['id']>('all');
  protected readonly range = signal(9999);

  protected readonly filteredEvents = computed(() => {
    const query = this.search().trim().toLowerCase();
    const type = this.selectedType();
    const range = this.range();

    return EVENTS.filter(
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

  protected setRange(value: string): void {
    this.range.set(parseInt(value, 10));
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
