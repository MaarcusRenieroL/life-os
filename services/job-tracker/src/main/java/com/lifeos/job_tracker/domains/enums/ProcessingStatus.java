package com.lifeos.job_tracker.domains.enums;

/** Shared lifecycle for async Claude-backed work: resume extraction and job-description parsing. */
public enum ProcessingStatus {
  PENDING,
  PROCESSING,
  COMPLETED,
  FAILED
}
