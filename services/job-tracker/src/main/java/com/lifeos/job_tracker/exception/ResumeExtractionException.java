package com.lifeos.job_tracker.exception;

/**
 * Thrown when resume-skill extraction comes back empty after every retry/fallback attempt. A
 * resume of non-trivial length legitimately having zero extractable skills is implausible, so
 * this is treated as a failed extraction rather than persisted as a real (empty) result -
 * everything downstream (matching, scoring, tailoring) depends on this list being real.
 */
public class ResumeExtractionException extends RuntimeException {

  public ResumeExtractionException(String message) {
    super(message);
  }
}
