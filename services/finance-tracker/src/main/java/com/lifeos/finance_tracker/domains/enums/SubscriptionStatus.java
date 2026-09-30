package com.lifeos.finance_tracker.domains.enums;

/** PAUSED stops billing and reminders but keeps the subscription (and its next date is left
 * where it was); CANCELLED is the same but final - it stays listed as history. */
public enum SubscriptionStatus {
  ACTIVE,
  PAUSED,
  CANCELLED
}
