package com.lifeos.vault.exception;

/** Too many wrong master passwords or recovery codes in a row; try again after {@code retryAfterSeconds}. */
public class TooManyAttemptsException extends RuntimeException {
  private final long retryAfterSeconds;

  public TooManyAttemptsException(long retryAfterSeconds) {
    super("Too many failed attempts. Try again in " + Math.max(1, (retryAfterSeconds + 59) / 60) + " minute(s).");
    this.retryAfterSeconds = retryAfterSeconds;
  }

  public long getRetryAfterSeconds() {
    return retryAfterSeconds;
  }
}
