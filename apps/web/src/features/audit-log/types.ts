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
  | 'WEAK_PASSWORD_ALERT';

export interface AuditEventResponse {
  eventId: string;
  service: string;
  eventType: AuditEventType;
  description: string;
  metadata: Record<string, string> | null;
  occurredAt: string;
}
