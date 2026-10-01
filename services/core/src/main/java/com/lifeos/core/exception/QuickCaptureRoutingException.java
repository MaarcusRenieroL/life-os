package com.lifeos.core.exception;

/** The downstream module rejected the quick-capture request (e.g. finance-tracker has no
 * account to attach a transaction to) - a real, expected failure mode, not a bug, so it should
 * reach the user as a clear message instead of a raw 500. */
public class QuickCaptureRoutingException extends RuntimeException {

  public QuickCaptureRoutingException(String message) {
    super(message);
  }
}
