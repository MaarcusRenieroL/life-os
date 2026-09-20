package com.lifeos.job_tracker.domains.enums;

/** What the job's current fit score was computed against - shown in the UI so a single "Re-score"
 * button doesn't leave the candidate guessing which resume produced the number. */
public enum FitScoreSource {
  LIBRARY,
  OVERRIDE_RESUME
}
