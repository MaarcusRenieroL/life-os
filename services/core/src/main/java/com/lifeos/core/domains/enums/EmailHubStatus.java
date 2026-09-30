package com.lifeos.core.domains.enums;

public enum EmailHubStatus {
  /** The hub acted on it (created the task / event / subscription). Can be undone. */
  APPLIED,
  /** Worth acting on, but not sure enough (or a detail is missing) - waits for a yes. */
  NEEDS_REVIEW,
  DISMISSED,
  /** Was applied, then reverted by the candidate. */
  UNDONE,
  /** Nothing to do - or already handled (a subscription that was already tracked). */
  IGNORED,
  /** Approved or auto-applied, but the target module rejected it. */
  FAILED
}
