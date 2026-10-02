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
  WITHDRAWN,
  /** The company has closed the role to new applications. */
  NO_LONGER_ACCEPTING,
  /** Not a role the candidate wants any more. */
  NOT_INTERESTED
}
