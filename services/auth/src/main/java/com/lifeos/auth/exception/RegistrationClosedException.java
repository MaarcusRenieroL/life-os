package com.lifeos.auth.exception;

/** Thrown when someone tries to sign up on an instance that already has its owner. */
public class RegistrationClosedException extends RuntimeException {
  public RegistrationClosedException() {
    super("Registration is closed on this instance");
  }
}
