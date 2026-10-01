package com.lifeos.finance_tracker.exception;

// Thrown by TransactionService.createFromQuickCapture when there's no sensible account to
// attribute a quick-capture transaction to - either the user has zero active accounts, or they
// have several and none is marked isPrimary, so guessing would silently misattribute the spend
// rather than fail loudly. Mapped to 422 in GlobalExceptionHandler (the request itself is
// well-formed, the account state just doesn't support this operation).
public class NoDefaultAccountException extends RuntimeException {

  public NoDefaultAccountException() {
    super("Add an account before using quick-capture");
  }
}
