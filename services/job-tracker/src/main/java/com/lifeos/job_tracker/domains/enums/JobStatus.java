package com.lifeos.job_tracker.domains.enums;

/** Where a tracked job sits in the candidate's own pipeline. */
public enum JobStatus {
  INTERESTED,
  WAITING_FOR_REFERRAL,
  REFERRED,
  APPLIED,
  INTERVIEWING,
  WAITING_FOR_HR,
  OFFER_ACCEPTED,
  OFFER_REJECTED,
  REJECTED,
  WITHDRAWN
}
