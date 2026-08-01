package com.lifeos.vault.exception;

public class InvalidRecoveryCodeException extends RuntimeException {
  public InvalidRecoveryCodeException() {
    super("Invalid or already used recovery code");
  }
}
