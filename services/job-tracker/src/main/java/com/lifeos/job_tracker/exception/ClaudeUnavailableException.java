package com.lifeos.job_tracker.exception;

/** Raised when the Anthropic API is not configured or a call to it fails. */
public class ClaudeUnavailableException extends RuntimeException {

  public ClaudeUnavailableException(String message) {
    super(message);
  }

  public ClaudeUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
