export type AuditEventType =
  | 'ENTRY_CREATED'
  | 'ENTRY_UPDATED'
  | 'ENTRY_DELETED'
  | 'MASTER_PASSWORD_CHANGED'
  | 'RECOVERY_CODE_GENERATED'
  | 'RECOVERY_CODE_REDEEMED'
  | 'RECOVERY_CODE_RESET'
  | 'CARD_ADDED'
  | 'CARD_DELETED'
  | 'LOGIN_SUCCESS'
  | 'SESSION_REVOKED'
  | 'BREACH_ALERT'
  | 'WEAK_PASSWORD_ALERT'
  | 'RECURRING_DETECTED'
  | 'BUDGET_EXCEEDED'
  | 'HABIT_COMPLETED'
  | 'HABIT_STREAK_MILESTONE'
  | 'HABIT_REMINDER_DUE';

export interface AuditEventResponse {
  eventId: string;
  service: string;
  // Mirrors services/common's AuditEventType enum, which every service can append to - this
  // union WILL drift behind the backend again, so callers must not assume every value here is
  // one this page has a mapping for (see EVENT_TYPE_MAP's fallback in audit-log-page.tsx).
  eventType: AuditEventType | (string & {});
  description: string;
  metadata: Record<string, string> | null;
  occurredAt: string;
}
