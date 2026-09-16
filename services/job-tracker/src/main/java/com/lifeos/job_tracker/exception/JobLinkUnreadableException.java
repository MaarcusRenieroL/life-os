package com.lifeos.job_tracker.exception;

/**
 * Thrown when a pasted job URL couldn't be fetched or held no readable posting (login wall, bot
 * check, JS-only page). The caller should ask the user to paste the job description text instead.
 */
public class JobLinkUnreadableException extends RuntimeException {

  public JobLinkUnreadableException(String message) {
    super(message);
  }
}
