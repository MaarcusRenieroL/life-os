package com.lifeos.job_tracker.domains.enums;

/** What happened with a detected email event once it was processed. */
public enum EmailEventStatus {
  /** Matched a job with high confidence and applied the status change automatically. */
  APPLIED_AUTOMATICALLY,
  /** Detected something actionable, but needs the candidate to confirm (low-confidence match,
   * ambiguous job, or an offer - accept/reject is always a manual call). */
  NEEDS_REVIEW,
  /** Classified as unrelated to job tracking - never shown to the user. */
  IGNORED,
  /** The candidate reviewed it and dismissed it. */
  DISMISSED
}
