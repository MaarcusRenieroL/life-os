package com.lifeos.job_tracker.domains.enums;

/** What a Gmail message forwarded by batches turned out to be, per Claude's classification. */
public enum EmailEventType {
  JOB_ALERT_DIGEST,
  APPLICATION_CONFIRMATION,
  INTERVIEW_INVITE,
  REJECTION,
  OFFER,
  UNRELATED
}
