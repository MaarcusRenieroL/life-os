package com.lifeos.batches.exception;

/** The Google callback carried no valid state: the flow was not started from this app, or it expired. */
public class InvalidOAuthStateException extends RuntimeException {
  public InvalidOAuthStateException() {
    super("This Gmail connection link is invalid or has expired. Start again from Settings.");
  }
}
