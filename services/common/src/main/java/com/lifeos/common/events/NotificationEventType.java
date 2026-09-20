package com.lifeos.common.events;

/** Every kind of notification any module can raise. Grouped by module in comment blocks only -
 * this is a flat enum shared across services via {@link NotificationEventRecord}, same pattern
 * as {@link AuditEventType}. Add new values here as new notification-worthy conditions are
 * built; this list is expected to grow as more modules wire in. */
public enum NotificationEventType {

  // vault
  VAULT_MASTER_PASSWORD_CHANGED,
  VAULT_RECOVERY_CODE_USED,
  VAULT_UNLOCKED_NEW_LOCATION,

  // finance-tracker
  FINANCE_BUDGET_EXCEEDED,
  FINANCE_LARGE_TRANSACTION,
  FINANCE_RECURRING_BILL_DUE,

  // job-tracker
  JOB_INTERVIEW_UPCOMING,
  JOB_STATUS_AUTO_CHANGED,
  JOB_REFERRAL_FOLLOWUP_DUE,

  // habit-tracker
  HABIT_REMINDER_DUE,
  HABIT_STREAK_AT_RISK,
  HABIT_STREAK_MILESTONE,

  // batches
  GMAIL_SYNC_FAILED,
  BACKUP_FAILED,

  // core - proactive "you forgot about this" scanner (module-agnostic)
  ATTENTION_NEEDED,

  // system-wide - AI routing fell back and needs the user's sign-off before spending on Claude
  AI_FALLBACK_APPROVAL_NEEDED,

  // system-wide - a background job (export, etc.) finished and is ready
  BACKGROUND_JOB_COMPLETE
}
